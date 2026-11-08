import { Dose, UserSettings } from '../types';

const STORAGE_KEY_DOSES = 'doselog_doses_cache_v1';
const STORAGE_KEY_SETTINGS = 'doselog_settings_cache_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  oilName: 'BALANCED 25:25 (THC:CBD)',
  thcMgPerMl: 10,
  cbdMgPerMl: 10,
  defaultVolumeMl: 0.5,
  bottleCapacityMl: 30,
  dailyTargetDoses: 3,
  customTimezone: '',
  timeFormat: '12h',
  hapticsEnabled: true,
};

export async function fetchServerStatus(): Promise<{
  status: string;
  engine: 'mongodb' | 'file_store';
  mongoConnected: boolean;
}> {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Status error');
    return await res.json();
  } catch (e) {
    return { status: 'offline', engine: 'file_store', mongoConnected: false };
  }
}

export async function loadDoses(): Promise<Dose[]> {
  // Try server first
  try {
    const res = await fetch('/api/doses');
    if (res.ok) {
      const serverDoses: Dose[] = await res.json();
      localStorage.setItem(STORAGE_KEY_DOSES, JSON.stringify(serverDoses));
      return serverDoses;
    }
  } catch (e) {
    // offline or backend unreachable
  }

  // Fallback to local storage
  const cached = localStorage.getItem(STORAGE_KEY_DOSES);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }
  return [];
}

export async function saveDoseToServer(dose: Omit<Dose, 'id'> & { id?: string }): Promise<Dose> {
  const newDose: Dose = {
    id: dose.id || `dose_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: dose.timestamp || new Date().toISOString(),
    volumeMl: dose.volumeMl,
    oilName: dose.oilName,
    notes: dose.notes || '',
    timezone: dose.timezone,
  };

  // Immediate local cache update
  const cached = localStorage.getItem(STORAGE_KEY_DOSES);
  const doses: Dose[] = cached ? JSON.parse(cached) : [];
  doses.unshift(newDose);
  localStorage.setItem(STORAGE_KEY_DOSES, JSON.stringify(doses));

  // Asynchronous API call to persist to MongoDB/file
  try {
    const res = await fetch('/api/doses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDose),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Backend sync deferred (offline):', e);
  }

  return newDose;
}

export async function updateDoseOnServer(id: string, updates: Partial<Dose>): Promise<void> {
  // Update local cache
  const cached = localStorage.getItem(STORAGE_KEY_DOSES);
  if (cached) {
    const doses: Dose[] = JSON.parse(cached);
    const idx = doses.findIndex(d => d.id === id);
    if (idx !== -1) {
      doses[idx] = { ...doses[idx], ...updates };
      localStorage.setItem(STORAGE_KEY_DOSES, JSON.stringify(doses));
    }
  }

  try {
    await fetch(`/api/doses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch (e) {
    console.warn('Failed to update dose on server:', e);
  }
}

export async function deleteDoseOnServer(id: string): Promise<void> {
  // Update local cache
  const cached = localStorage.getItem(STORAGE_KEY_DOSES);
  if (cached) {
    const doses: Dose[] = JSON.parse(cached);
    const filtered = doses.filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEY_DOSES, JSON.stringify(filtered));
  }

  try {
    await fetch(`/api/doses/${id}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn('Failed to delete dose on server:', e);
  }
}

export async function loadSettings(): Promise<UserSettings> {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const serverSettings = await res.json();
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(serverSettings));
      return { ...DEFAULT_SETTINGS, ...serverSettings };
    }
  } catch {
    // offline
  }

  const cached = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (cached) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettingsToServer(settings: UserSettings): Promise<void> {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  } catch (e) {
    console.warn('Failed to save settings on server:', e);
  }
}

export async function importData(doses: Dose[], settings?: UserSettings): Promise<number> {
  localStorage.setItem(STORAGE_KEY_DOSES, JSON.stringify(doses));
  if (settings) {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }

  try {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doses, settings }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.count;
    }
  } catch (e) {
    console.warn('Imported to local storage only:', e);
  }
  return doses.length;
}
