import express, { Request, Response } from 'express';
import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/doselog';

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'doselog.json');

// In-memory / file fallback state
interface LocalStorageData {
  doses: Array<{
    id: string;
    timestamp: string;
    volumeMl: number;
    oilName: string;
    notes?: string;
    timezone: string;
  }>;
  settings: {
    oilName: string;
    thcMgPerMl: number;
    cbdMgPerMl: number;
    defaultVolumeMl: number;
    bottleCapacityMl: number;
    bottleOpenedDate?: string;
    dailyTargetDoses: number;
    customTimezone: string;
    timeFormat: '12h' | '24h';
    hapticsEnabled: boolean;
  };
}

const defaultSettings: LocalStorageData['settings'] = {
  oilName: 'BALANCED 25:25 (THC:CBD)',
  thcMgPerMl: 25,
  cbdMgPerMl: 25,
  defaultVolumeMl: 0.4,
  bottleCapacityMl: 30,
  dailyTargetDoses: 3,
  customTimezone: '',
  timeFormat: '12h',
  hapticsEnabled: true,
};

function ensureLocalFile(): LocalStorageData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial: LocalStorageData = {
      doses: [],
      settings: defaultSettings,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      doses: Array.isArray(parsed.doses) ? parsed.doses : [],
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
    };
  } catch (err) {
    console.error('Error reading doselog.json, initializing fallback:', err);
    return { doses: [], settings: defaultSettings };
  }
}

function saveLocalFile(data: LocalStorageData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save to local file:', err);
  }
}

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let isMongoConnected = false;

async function initMongo() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')}`);
    mongoClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db();
    isMongoConnected = true;
    console.log('Successfully connected to MongoDB!');

    // Initialize collections & indexes if needed
    await mongoDb.collection('doses').createIndex({ timestamp: -1 });
    await mongoDb.collection('doses').createIndex({ id: 1 }, { unique: true });
  } catch (err) {
    console.log('MongoDB is not currently available. Falling back gracefully to local file storage (data/doselog.json).');
    isMongoConnected = false;
  }
}

async function startServer() {
  await initMongo();
  const app = express();
  app.use(express.json());

  // API Routes
  app.get('/api/status', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      engine: isMongoConnected ? 'mongodb' : 'file_store',
      mongoConnected: isMongoConnected,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || 'development',
    });
  });

  // GET all doses
  app.get('/api/doses', async (req: Request, res: Response) => {
    try {
      if (isMongoConnected && mongoDb) {
        const doses = await mongoDb.collection('doses').find({}).sort({ timestamp: -1 }).toArray();
        return res.json(doses.map(d => ({ ...d, _id: undefined })));
      }
      const data = ensureLocalFile();
      res.json(data.doses);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch doses' });
    }
  });

  // POST new dose
  app.post('/api/doses', async (req: Request, res: Response) => {
    try {
      const { id, timestamp, volumeMl, oilName, notes, timezone } = req.body;
      const newDose = {
        id: id || `dose_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: timestamp || new Date().toISOString(),
        volumeMl: typeof volumeMl === 'number' ? volumeMl : 0.5,
        oilName: oilName || 'Balanced Oil',
        notes: notes || '',
        timezone: timezone || 'UTC',
      };

      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('doses').updateOne(
          { id: newDose.id },
          { $set: newDose },
          { upsert: true }
        );
      } else {
        const data = ensureLocalFile();
        data.doses.unshift(newDose);
        saveLocalFile(data);
      }

      res.status(201).json(newDose);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to record dose' });
    }
  });

  // PUT update dose
  app.put('/api/doses/:id', async (req: Request, res: Response) => {
    try {
      const doseId = req.params.id;
      const updates = req.body;
      delete updates._id;

      if (isMongoConnected && mongoDb) {
        const result = await mongoDb.collection('doses').findOneAndUpdate(
          { id: doseId },
          { $set: updates },
          { returnDocument: 'after' }
        );
        if (!result) {
          return res.status(404).json({ error: 'Dose not found' });
        }
        return res.json(result);
      }

      const data = ensureLocalFile();
      const index = data.doses.findIndex(d => d.id === doseId);
      if (index === -1) {
        return res.status(404).json({ error: 'Dose not found' });
      }
      data.doses[index] = { ...data.doses[index], ...updates };
      saveLocalFile(data);
      res.json(data.doses[index]);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update dose' });
    }
  });

  // DELETE dose
  app.delete('/api/doses/:id', async (req: Request, res: Response) => {
    try {
      const doseId = req.params.id;

      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('doses').deleteOne({ id: doseId });
      } else {
        const data = ensureLocalFile();
        data.doses = data.doses.filter(d => d.id !== doseId);
        saveLocalFile(data);
      }

      res.json({ success: true, id: doseId });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete dose' });
    }
  });

  // GET Settings
  app.get('/api/settings', async (req: Request, res: Response) => {
    try {
      if (isMongoConnected && mongoDb) {
        const doc = await mongoDb.collection('settings').findOne({ _id: 'user_settings' as any });
        if (doc) {
          return res.json({ ...defaultSettings, ...doc, _id: undefined });
        }
      }
      const data = ensureLocalFile();
      res.json(data.settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST Settings
  app.post('/api/settings', async (req: Request, res: Response) => {
    try {
      const newSettings = { ...defaultSettings, ...req.body };
      delete (newSettings as any)._id;

      if (isMongoConnected && mongoDb) {
        await mongoDb.collection('settings').updateOne(
          { _id: 'user_settings' as any },
          { $set: newSettings },
          { upsert: true }
        );
      } else {
        const data = ensureLocalFile();
        data.settings = newSettings;
        saveLocalFile(data);
      }

      res.json(newSettings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET Export full data
  app.get('/api/export', async (req: Request, res: Response) => {
    try {
      let doses = [];
      let settings = defaultSettings;

      if (isMongoConnected && mongoDb) {
        doses = await mongoDb.collection('doses').find({}).sort({ timestamp: -1 }).toArray();
        const settingsDoc = await mongoDb.collection('settings').findOne({ _id: 'user_settings' as any });
        if (settingsDoc) settings = { ...defaultSettings, ...settingsDoc };
      } else {
        const data = ensureLocalFile();
        doses = data.doses;
        settings = data.settings;
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=doselog-backup-${new Date().toISOString().slice(0, 10)}.json`);
      res.json({
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        settings,
        doses: doses.map((d: any) => ({ ...d, _id: undefined })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET Download complete application source tarball
  app.get('/api/download-source', (req: Request, res: Response) => {
    const archivePath = path.join(__dirname, 'public', 'doselog-source.tar.gz');
    if (fs.existsSync(archivePath)) {
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', 'attachment; filename="doselog-zimaboard-source.tar.gz"');
      fs.createReadStream(archivePath).pipe(res);
    } else {
      res.status(404).json({ error: 'Source archive not found' });
    }
  });

  // GET Download ZIP format archive
  app.get('/api/download-zip', (req: Request, res: Response) => {
    const zipPath = path.join(__dirname, 'public', 'doselog-source.zip');
    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="doselog-zimaboard-source.zip"');
      fs.createReadStream(zipPath).pipe(res);
    } else {
      res.status(404).json({ error: 'Zip archive not found' });
    }
  });

  // POST Import full data
  app.post('/api/import', async (req: Request, res: Response) => {
    try {
      const { doses, settings } = req.body;
      if (!Array.isArray(doses)) {
        return res.status(400).json({ error: 'Invalid import payload: doses array expected' });
      }

      if (isMongoConnected && mongoDb) {
        for (const dose of doses) {
          if (dose.id) {
            delete dose._id;
            await mongoDb.collection('doses').updateOne({ id: dose.id }, { $set: dose }, { upsert: true });
          }
        }
        if (settings) {
          await mongoDb.collection('settings').updateOne({ _id: 'user_settings' as any }, { $set: settings }, { upsert: true });
        }
      } else {
        const data = ensureLocalFile();
        // Merge or replace
        const existingIds = new Set(data.doses.map(d => d.id));
        for (const dose of doses) {
          if (dose.id && !existingIds.has(dose.id)) {
            data.doses.push(dose);
          }
        }
        data.doses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (settings) {
          data.settings = { ...data.settings, ...settings };
        }
        saveLocalFile(data);
      }

      res.json({ success: true, count: doses.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite development vs Production static serving
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DoseLog Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server boot error:', err);
});
