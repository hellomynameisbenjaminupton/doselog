# DoseLog — Architecture & Deployment Guide (Antigravity Context)

## 1. Application Overview

**DoseLog** is a minimalist, monotone medical marijuana balanced oil dose tracker built with **React 19**, **Tailwind CSS v4**, **Express**, and **MongoDB**.

### Core Purpose
- Allow 1-tap logging of medical balanced oil doses (THC:CBD) with tactile/haptic and audio feedback.
- Display on the primary screen **how many doses have been taken today**, **when the last dose was taken**, and a chronological timeline of today's doses (`#01`, `#02`, `#03`) with exact intervals between doses.
- Automatically reset the daily counter at **00:00 (midnight)** in the user's local timezone.
- Track remaining liquid volume (mL) and estimated remaining doses in the current prescription bottle.
- Provide full historical logs grouped by day, manual backfill for missed doses, and JSON/CSV export & restore.

---

## 2. Tech Stack & Architecture

- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 (`@tailwindcss/vite`) + `lucide-react`.
- **Backend (`server.ts`)**: Single-entry-point Express server running on port `3000`.
  - **Development Mode (`NODE_ENV !== 'production'`)**: Mounts Vite middleware (`vite.middlewares`) directly inside Express via `tsx server.ts`.
  - **Production Mode (`NODE_ENV === 'production'`)**: Serves the compiled frontend from `./dist` and exposes all `/api/*` REST routes.
- **Database Dual-Engine Architecture**:
  1. **Primary (Production on ZimaBoard)**: Connects to MongoDB via `MONGODB_URI` (`mongodb://mongo:27017/doselog`). Uses two collections: `doses` and `settings`.
  2. **Automatic Fallback (Local Dev on Windows/Laptop)**: If MongoDB is unreachable at startup (2-second timeout), `server.ts` gracefully falls back to a local JSON file (`./data/doselog.json`). This allows local development in Antigravity with zero database setup required.
  3. **Client Offline Cache**: `src/services/api.ts` caches doses and settings in `localStorage` so the UI responds instantaneously even if offline.

---

## 3. Project File Structure

```text
├── Dockerfile                  # Multi-stage Node 22 build for ZimaBoard container
├── docker-compose.yml          # CasaOS + ZimaBoard stack (DoseLog app + Mongo 4.4)
├── update.sh                   # 1-command pull, rebuild & prune script for ZimaBoard
├── README.md                   # Comprehensive architecture, git, CasaOS & Docker guide
├── server.ts                   # Full-stack Express API + MongoDB / File fallback + Vite middleware
├── package.json                # Scripts and dependencies (uses --legacy-peer-deps)
├── index.html                  # PWA meta tags, Plus Jakarta Sans & JetBrains Mono fonts
├── public/
│   ├── icon.svg                # Minimalist calibrated dropper brand icon
│   └── manifest.json           # Installable PWA manifest
└── src/
    ├── main.tsx                # React DOM root
    ├── App.tsx                 # Main application state, live clock, midnight reset, tabs
    ├── index.css               # Tailwind v4 import, monotone dark theme (#0e0f11), tabular-nums
    ├── types.ts                # TypeScript interfaces (Dose, UserSettings, DayDoseSummary)
    ├── services/
    │   └── api.ts              # REST API client + localStorage offline resilience
    ├── utils/
    │   └── timezone.ts         # Intl.DateTimeFormat timezone helpers & midnight countdown
    └── components/
        ├── Header.tsx          # 3-zone top bar navigation (Today, History, Bottle, Settings)
        ├── DoseButton.tsx      # Tactile 1-tap dose button, volume presets, haptics, Web Audio click
        ├── TodayDoseList.tsx   # Chronological today timeline, inline edit/delete, dose intervals
        ├── BottleTracker.tsx   # Remaining mL progress bar, dose estimates, new bottle reset
        ├── HistoryModal.tsx    # Day-by-day accordion history & manual past dose entry
        ├── SettingsModal.tsx   # Oil concentration (THC/CBD mg/mL), bottle size, timezone, 12h/24h
        └── PWAInstallButton.tsx# In-app install prompt + iOS Safari home screen guide
```

---

## 4. Production Environment: ZimaBoard (1st Gen) + CasaOS + External SSD

### Hardware & OS Constraints (CRITICAL DO-NOT-BREAK RULES)
1. **CPU Non-AVX Constraint (MongoDB 4.4 Required)**:
   - The ZimaBoard 1st Edition runs an **Intel Celeron N3350/N3450** x86_64 processor, which **does not support AVX instructions**.
   - MongoDB `5.0+` (`5.0`, `6.0`, `7.0`) requires AVX and will crash immediately with an `Illegal instruction` error.
   - **Rule**: Always keep `image: mongo:4.4` and the `mongo` (not `mongosh`) healthcheck in `docker-compose.yml`.
2. **External SSD Storage**:
   - The ZimaBoard's internal eMMC storage is small, so the application and its persistent volumes (`./mongo-data` and `./data`) are hosted on the **external SSD** attached to the ZimaBoard.
   - **Rule**: Always prune dangling Docker build layers (`sudo docker image prune -f`) after rebuilding so the disk never fills up.
3. **NPM Peer Dependencies**:
   - Vite 8 and `esbuild` require `--legacy-peer-deps` when running `npm install` without a lockfile inside Docker.
   - **Rule**: Keep `RUN npm install --legacy-peer-deps` in `Dockerfile`.
4. **Custom Subdomain**:
   - The app container maps host port `3080` to container port `3000` (`"3080:3000"`) and is reverse-proxied to a custom subdomain. Do not change the container port mapping (`3080:3000`) unless updating the reverse proxy.

---

## 5. Development & Deployment Workflow (Antigravity → GitHub → ZimaBoard)

### Step 1: Local Development in Antigravity (Windows)
1. Run the local dev server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000`.
   - Locally, `server.ts` will detect that MongoDB is not running and automatically store test data in `./data/doselog.json` (which is ignored by Git/Docker so test data never overwrites production).
3. Before committing changes, verify TypeScript and the production Vite bundle:
   ```bash
   npm run lint
   npm run build
   ```

### Step 2: Push Changes to GitHub
From the Antigravity terminal (or Source Control panel):
```bash
git add .
git commit -m "Describe your bug fix or feature"
git push origin main
```

### Step 3: Update the App on ZimaBoard (via SSH)
1. SSH into the ZimaBoard and navigate to the `doselog` folder on the SSD:
   ```bash
   ssh casaos@<ZIMABOARD_IP>
   cd /path/to/ssd/doselog
   ```
2. Run the 1-command update script:
   ```bash
   ./update.sh
   ```

#### What `./update.sh` does under the hood:
```bash
#!/bin/bash
set -e
# 1. Pull latest commits from GitHub
git pull origin main

# 2. Rebuild and restart ONLY the 'app' container (leaves doselog-mongo running untouched)
sudo docker compose up -d --build app

# 3. Clean up old Docker build images to protect disk space
sudo docker image prune -f
```

> **Note**: If `git pull` ever complains about local changes on the ZimaBoard (for example, edits made via `sed` during initial setup), run:
> ```bash
> git fetch origin
> git reset --hard origin/main
> chmod +x update.sh
> ./update.sh
> ```
> Your database inside `./mongo-data` and `./data` is untracked by Git and will remain 100% safe.

---

## 6. Design & UI Guidelines for Future Edits

- **Strict Monotone Palette**:
  - Background Canvas: `#0e0f11`
  - Elevated Card Surface: `#141518` / `#15171b`
  - Hairline Borders: `#202227` / `#23262c`
  - Primary Text & Active Controls: `#f4f5f7`
  - Muted Secondary Metadata: `#8d939e` / `#717684`
- **Typography**:
  - Sans-serif UI: `'Plus Jakarta Sans'`
  - Timestamps, counters, and mL volumes: `'JetBrains Mono'` with `.tabular-nums` (`font-variant-numeric: tabular-nums`) so digits align vertically.
- **Timezone Safety**:
  - Always store timestamps in UTC ISO-8601 (`new Date().toISOString()`) in MongoDB.
  - Always compute "Today" and format display times using the helpers in `src/utils/timezone.ts` (`getDateStringInTimezone`, `getTodayString`, `formatTimeInTimezone`) so midnight resets occur accurately at `00:00` local time.