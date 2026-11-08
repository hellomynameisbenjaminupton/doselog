import React, { useState } from 'react';
import { Dose, UserSettings } from '../types';
import {
  Copy,
  Check,
  Download,
  Upload,
  Server,
  HardDrive,
  Github,
  FolderArchive,
  Terminal,
  ShieldCheck,
  FileCode,
} from 'lucide-react';
import { importData } from '../services/api';

interface CasaOSModalProps {
  doses: Dose[];
  settings: UserSettings;
  mongoConnected: boolean;
  engine: 'mongodb' | 'file_store';
  onReloadData: () => Promise<void>;
}

export const CasaOSModal: React.FC<CasaOSModalProps> = ({
  doses,
  settings,
  mongoConnected,
  engine,
  onReloadData,
}) => {
  const [copiedCompose, setCopiedCompose] = useState(false);
  const [copiedGitCmd, setCopiedGitCmd] = useState(false);
  const [copiedSSH, setCopiedSSH] = useState(false);
  const [installMethod, setInstallMethod] = useState<'direct' | 'github'>('direct');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const dockerComposeContent = `name: doselog-casaos

services:
  # DoseLog Web App (Built locally on ZimaBoard)
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: doselog:latest
    container_name: doselog-app
    restart: unless-stopped
    ports:
      - "3080:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MONGODB_URI=mongodb://mongo:27017/doselog
    volumes:
      - ./data:/app/data
    depends_on:
      - mongo
    networks:
      - doselog-net

  # MongoDB 4.4 (Essential for ZimaBoard 1st Gen Celeron CPU without AVX)
  mongo:
    image: mongo:4.4
    container_name: doselog-mongo
    restart: unless-stopped
    volumes:
      - ./mongo-data:/data/db
    networks:
      - doselog-net

networks:
  doselog-net:
    driver: bridge

x-casaos:
  architectures:
    - amd64
  main: app
  title:
    en_us: "DoseLog"
  tagline:
    en_us: "Medical Oil Dose Tracker"
  description:
    en_us: "Minimalist monotone medical marijuana balanced oil dose tracker with local timezone resets."
  icon: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/cannabis.svg"
  port_map: "3080"
  scheme: "http"
  index: "/"`;

  const gitPushScript = `# 1. Initialize and commit your local copy:
git init
git add .
git commit -m "DoseLog CasaOS build"
git branch -M main

# 2. Add your GitHub repository and push:
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/doselog.git
git push -u origin main

# 3. On your ZimaBoard terminal:
cd /DATA/AppData
git clone https://github.com/YOUR-GITHUB-USERNAME/doselog.git
cd doselog
docker compose up -d --build`;

  const copyCompose = () => {
    navigator.clipboard.writeText(dockerComposeContent);
    setCopiedCompose(true);
    setTimeout(() => setCopiedCompose(false), 2000);
  };

  const copyGitCommands = () => {
    navigator.clipboard.writeText(gitPushScript);
    setCopiedGitCmd(true);
    setTimeout(() => setCopiedGitCmd(false), 2000);
  };

  const sshCommands = `# Step 1: On your computer, transfer the downloaded tar file to your ZimaBoard:
# (Replace with your actual ZimaBoard IP address)
scp ~/Downloads/doselog-zimaboard-source.tar.gz casaos@<zimaboard-ip>:/DATA/AppData/

# Step 2: SSH into your ZimaBoard:
ssh casaos@<zimaboard-ip>

# Step 3: Create the directory and move the file into it:
mkdir -p /DATA/AppData/doselog
mv /DATA/AppData/doselog-zimaboard-source.tar.gz /DATA/AppData/doselog/
cd /DATA/AppData/doselog

# Step 4: Extract the tar archive:
tar -xzvf doselog-zimaboard-source.tar.gz

# Step 5: Verify the extracted files:
ls -la

# Step 6: Build and start DoseLog with MongoDB:
docker compose up -d --build`;

  const copySSHCommands = () => {
    navigator.clipboard.writeText(sshCommands);
    setCopiedSSH(true);
    setTimeout(() => setCopiedSSH(false), 2000);
  };

  const exportJSON = () => {
    const backup = {
      exportDate: new Date().toISOString(),
      app: 'DoseLog',
      version: '1.0.0',
      settings,
      doses,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doselog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Date', 'Time', 'Volume_mL', 'Oil_Name', 'THC_mg', 'CBD_mg', 'Notes'];
    const rows = doses.map((d) => {
      const dt = new Date(d.timestamp);
      const dateStr = dt.toISOString().slice(0, 10);
      const timeStr = dt.toLocaleTimeString();
      const thc = Math.round(d.volumeMl * (settings.thcMgPerMl || 10) * 10) / 10;
      const cbd = Math.round(d.volumeMl * (settings.cbdMgPerMl || 10) * 10) / 10;
      return [
        d.timestamp,
        dateStr,
        `"${timeStr}"`,
        d.volumeMl,
        `"${d.oilName || 'Balanced Oil'}"`,
        thc,
        cbd,
        `"${(d.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doselog-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedDoses = Array.isArray(parsed.doses) ? parsed.doses : Array.isArray(parsed) ? parsed : [];
      if (importedDoses.length === 0) {
        setImportMessage('No valid doses found in file.');
        setImporting(false);
        return;
      }
      const count = await importData(importedDoses, parsed.settings);
      await onReloadData();
      setImportMessage(`Successfully imported ${count} doses!`);
    } catch (err: any) {
      setImportMessage(`Import error: ${err.message || 'Invalid JSON'}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-[#f4f5f7]">CasaOS & ZimaBoard Self-Hosting</h2>
        <p className="text-xs text-[#8d939e]">
          You have two easy ways to run DoseLog with MongoDB on your Debian ZimaBoard (First Edition).
        </p>
      </div>

      {/* Method Switcher Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-[#141518] p-1 border border-[#23252b]">
        <button
          type="button"
          onClick={() => setInstallMethod('direct')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
            installMethod === 'direct'
              ? 'bg-[#252830] text-[#f4f5f7] shadow-sm'
              : 'text-[#8d939e] hover:text-[#d1d5db]'
          }`}
        >
          <FolderArchive className="h-3.5 w-3.5 text-[#d1d5db]" />
          <span>Option 1: Direct File Copy (No GitHub Needed)</span>
        </button>

        <button
          type="button"
          onClick={() => setInstallMethod('github')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
            installMethod === 'github'
              ? 'bg-[#252830] text-[#f4f5f7] shadow-sm'
              : 'text-[#8d939e] hover:text-[#d1d5db]'
          }`}
        >
          <Github className="h-3.5 w-3.5 text-[#d1d5db]" />
          <span>Option 2: Push to Your GitHub Account</span>
        </button>
      </div>

      {/* Option 1: Direct File Copy */}
      {installMethod === 'direct' && (
        <div className="space-y-4 rounded-xl border border-[#23262c] bg-[#141518] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#202227]">
            <div>
              <h3 className="text-sm font-semibold text-[#f4f5f7]">Direct Download to ZimaBoard</h3>
              <p className="text-xs text-[#8d939e]">
                No GitHub account required. Directly extract to your ZimaBoard CasaOS storage.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/api/download-zip"
                download="doselog-zimaboard-source.zip"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f4f5f7] px-3.5 py-2 text-xs font-bold text-[#0e0f11] hover:bg-white transition whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .ZIP (Recommended)</span>
              </a>

              <a
                href="/api/download-source"
                download="doselog-zimaboard-source.tar.gz"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2e323b] bg-[#1a1d22] px-3 py-2 text-xs font-semibold text-[#f4f5f7] hover:bg-[#252830] transition whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>.tar.gz</span>
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#797f8d]">Two Ways to Deploy the Tar File:</h4>

            {/* Approach A: Via CasaOS Web Files */}
            <div className="rounded-lg border border-[#23262c] bg-[#121316] p-3 text-xs text-[#a6abb7] space-y-1.5">
              <span className="font-semibold text-[#f4f5f7]">Via CasaOS Web Files App:</span>
              <p>
                1. Open CasaOS (<code className="bg-[#1b1d22] text-[#e6e8eb] px-1 rounded font-mono">http://casaos.local</code>) &rarr; <strong className="text-white">Files</strong> &rarr; <code className="bg-[#1b1d22] text-[#e6e8eb] px-1 rounded font-mono">/DATA/AppData/</code>.
              </p>
              <p>
                2. Create a folder named <code className="bg-[#1b1d22] text-[#e6e8eb] px-1 rounded font-mono">doselog</code>, upload the <code className="bg-[#1b1d22] text-[#e6e8eb] px-1 rounded font-mono">doselog-zimaboard-source.tar.gz</code>, right-click and click <strong className="text-white">Extract</strong>.
              </p>
            </div>

            {/* Approach B: Via SSH Terminal Walkthrough */}
            <div className="rounded-lg border border-[#2a2d35] bg-[#111215] p-3 text-xs text-[#a6abb7] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#f4f5f7] flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-[#d1d5db]" />
                  <span>Via SSH Terminal (Command Line):</span>
                </span>
                <button
                  type="button"
                  onClick={copySSHCommands}
                  className="flex items-center gap-1 text-[11px] text-[#d1d5db] hover:text-white"
                >
                  {copiedSSH ? (
                    <>
                      <Check className="h-3 w-3 text-white" />
                      <span className="text-white font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy SSH Commands</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3 bg-[#0a0a0c] text-[#d1d5db] font-mono text-[11px] rounded-lg border border-[#202227] overflow-x-auto leading-relaxed">
{sshCommands}
              </pre>

              <div className="text-[11px] text-[#717684] pt-1 border-t border-[#1d1f25]">
                <strong className="text-[#a6abb7]">tar command breakdown:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li><code className="text-[#e6e8eb] font-mono">-x</code> : extract files from archive</li>
                  <li><code className="text-[#e6e8eb] font-mono">-z</code> : decompress gzip archive (<code className="font-mono">.gz</code>)</li>
                  <li><code className="text-[#e6e8eb] font-mono">-v</code> : (optional) verbose output showing each file extracted</li>
                  <li><code className="text-[#e6e8eb] font-mono">-f</code> : specify archive filename to extract</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Option 2: Push to GitHub */}
      {installMethod === 'github' && (
        <div className="space-y-4 rounded-xl border border-[#23262c] bg-[#141518] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#202227]">
            <div>
              <h3 className="text-sm font-semibold text-[#f4f5f7]">Push to Your GitHub Account</h3>
              <p className="text-xs text-[#8d939e]">
                Great if you want automated version control and git clone on your home server.
              </p>
            </div>

            <button
              type="button"
              onClick={copyGitCommands}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2e323b] bg-[#1a1d22] px-3.5 py-2 text-xs font-semibold text-[#f4f5f7] hover:bg-[#252830] transition whitespace-nowrap shrink-0"
            >
              {copiedGitCmd ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span>Copied Commands!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Git Commands</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-2 text-xs text-[#a6abb7] leading-relaxed">
            <p>
              1. First, create a new repository on <strong className="text-[#f4f5f7]">GitHub</strong> (e.g. named <code className="bg-[#1b1d22] text-[#e6e8eb] px-1 rounded font-mono">doselog</code>).
            </p>
            <p>
              2. Download the source archive (<a href="/api/download-source" className="text-white underline">click here to download</a>) and unzip it on your laptop/computer.
            </p>
            <p>
              3. Open your computer's terminal inside that extracted folder and run:
            </p>
            <pre className="p-3 bg-[#0e0f11] text-[#d1d5db] font-mono text-[11px] rounded-lg border border-[#23262c] overflow-x-auto leading-relaxed">
              {gitPushScript}
            </pre>
          </div>
        </div>
      )}

      {/* Docker Compose YAML Box */}
      <div className="rounded-xl border border-[#23262c] bg-[#141518] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-[#f4f5f7]" />
            <h3 className="text-sm font-semibold text-[#f4f5f7]">docker-compose.yml for ZimaBoard & CasaOS</h3>
          </div>

          <button
            type="button"
            onClick={copyCompose}
            className="flex items-center gap-1.5 text-xs text-[#d1d5db] hover:text-white transition"
          >
            {copiedCompose ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span className="text-white font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Compose</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-3 bg-[#111215] text-[#a6acba] font-mono text-[11px] overflow-x-auto rounded-lg border border-[#23262c] max-h-56 leading-relaxed">
          {dockerComposeContent}
        </pre>
      </div>

      {/* Data Backup & Migration Section */}
      <div className="rounded-xl border border-[#23262c] bg-[#141518] p-5">
        <h3 className="text-sm font-semibold text-[#f4f5f7] mb-1">Export / Transfer Your Data</h3>
        <p className="text-xs text-[#8d939e] mb-4">
          Transfer your doses between this preview app and your ZimaBoard anytime.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportJSON}
            className="flex items-center gap-1.5 rounded-lg border border-[#2d3038] bg-[#1a1c22] px-3.5 py-2 text-xs font-medium text-[#f4f5f7] hover:bg-[#252830] transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-[#2d3038] bg-[#1a1c22] px-3.5 py-2 text-xs font-medium text-[#f4f5f7] hover:bg-[#252830] transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV Spreadsheet</span>
          </button>

          <label className="flex items-center gap-1.5 rounded-lg border border-[#2d3038] bg-[#1a1c22] px-3.5 py-2 text-xs font-medium text-[#f4f5f7] hover:bg-[#252830] transition cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            <span>{importing ? 'Importing...' : 'Restore from JSON'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>

        {importMessage && (
          <p className="mt-3 text-xs text-[#d1d5db] font-mono">{importMessage}</p>
        )}
      </div>
    </div>
  );
};
