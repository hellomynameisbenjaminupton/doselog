# DoseLog — Medical Balanced Oil Dose Tracker

**DoseLog** is a minimalist, monotone medical marijuana balanced oil (THC:CBD) dose tracker built with **React 19**, **Tailwind CSS v4**, **Express**, and **MongoDB**. It is purpose-built for fast, 1-tap daily logging with automatic local-timezone midnight (`00:00`) counter resets and self-hosted deployment on a **ZimaBoard (CasaOS / Debian)** via Docker.

---

## Table of Contents

1. [Core Features](#1-core-features)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Project Structure](#3-project-structure)
4. [React Frontend & UI Design System](#4-react-frontend--ui-design-system)
5. [Backend API & MongoDB Dual-Engine Storage](#5-backend-api--mongodb-dual-engine-storage)
6. [Local Development Setup](#6-local-development-setup)
7. [CasaOS & ZimaBoard Docker Deployment](#7-casaos--zimaboard-docker-deployment)
8. [Git & GitHub Update Workflow](#8-git--github-update-workflow)
9. [Data Backup, Export & Restore](#9-data-backup-export--restore)

---

## 1. Core Features

- **1-Tap Tactile Dose Logging**:
  - Instant dose recording with Web Audio click feedback, mobile haptic vibration (`navigator.vibrate`), and a 6-second floating **Undo** toast.
  - Quick volume presets (`0.25 mL`, `0.5 mL`, `0.75 mL`, `1.0 mL`) plus custom mL input and optional per-dose notes.
- **Today Dashboard**:
  - Displays total doses taken today against your daily target, live local clock, time elapsed since your last dose, and total mL / THC mg / CBD mg consumed today.
  - Chronological timeline of today's doses (`#01`, `#02`, `#03`...) with exact time intervals between consecutive doses (`+4h 20m after dose #1`), inline editing, and deletion.
- **Automatic Local-Timezone Midnight Reset (`00:00`)**:
  - All timestamps are stored in UTC ISO-8601 format (`new Date().toISOString()`) and dynamically grouped by the user's local or custom IANA timezone (via `Intl.DateTimeFormat`), ensuring the daily counter resets accurately at `00:00` local time with a live countdown.
- **Prescription Bottle Inventory Tracker**:
  - Tracks remaining liquid volume (`mL`), percentage full, and estimated doses left in the current bottle based on all doses logged since the bottle was opened.
  - Includes a low-volume refill alert (`<= 5 mL`) and a 1-click **New Bottle** reset.
- **Full Dose History & Manual Backfill**:
  - Day-by-day collapsible accordion history showing daily mL and THC/CBD totals, plus a **Log Past Dose** form to backfill missed entries at any past date/time.
- **Installable PWA**:
  - Includes `manifest.json`, vector dropper icon, and an in-app install prompt (with iOS Safari "Add to Home Screen" instructions).

---

## 2. Tech Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), `lucide-react` |
| **Backend Server** | Node.js 22, Express 4 (`server.ts` executed via `tsx`) |
| **Primary Database** | MongoDB `4.4` (`mongodb` Node driver v7) — compatible with non-AVX CPUs |
| **Fallback Storage** | Automatic local JSON file store (`./data/doselog.json`) + browser `localStorage` cache |
| **Containerization** | Docker Multi-Stage Build (`node:22-bookworm-slim`) + Docker Compose (`docker-compose.yml`) |

---

## 3. Project Structure

```text
├── Dockerfile                  # Multi-stage Node 22 production build for ZimaBoard / Docker
├── docker-compose.yml          # CasaOS + ZimaBoard stack (DoseLog app + MongoDB 4.4)
├── update.sh                   # 1-command Git pull, container rebuild & image prune script
├── server.ts                   # Express API server + MongoDB/File dual storage + Vite middleware
├── package.json                # Dependencies & scripts (uses --legacy-peer-deps in Docker)
├── index.html                  # App shell, PWA metadata, Plus Jakarta Sans & JetBrains Mono fonts
├── public/
│   ├── icon.svg                # Calibrated dropper SVG app icon
│   └── manifest.json           # PWA Web App Manifest
└── src/
    ├── main.tsx                # React 19 entry point
    ├── App.tsx                 # Root state, live clock, midnight reset logic & tab layout
    ├── index.css               # Tailwind CSS v4 import, monotone theme & tabular-nums utilities
    ├── types.ts                # TypeScript interfaces (Dose, UserSettings, DayDoseSummary)
    ├── services/
    │   └── api.ts              # REST client with automatic localStorage offline caching
    ├── utils/
    │   └── timezone.ts         # Timezone formatting, YYYY-MM-DD bucketing & midnight countdown
    └── components/
        ├── Header.tsx          # Sticky top navigation bar (Today, History, Bottle, Settings)
        ├── DoseButton.tsx      # 1-tap dose logger, mL presets, Web Audio & haptic feedback
        ├── TodayDoseList.tsx   # Chronological today timeline, dose intervals & inline edit/delete
        ├── BottleTracker.tsx   # Bottle volume progress bar, remaining dose estimate & reset
        ├── HistoryModal.tsx    # Day-by-day history accordion & manual past dose logger
        ├── SettingsModal.tsx   # Oil profile (THC/CBD mg/mL), bottle size, timezone & 12h/24h
        └── PWAInstallButton.tsx# Browser PWA install trigger & iOS Safari home screen guide
```

---

## 4. React Frontend & UI Design System

- **Monotone Dark Palette**:
  - Background Canvas: `#0e0f11`
  - Elevated Card Surfaces: `#141518` / `#15171b`
  - Hairline Borders: `#202227` / `#23262c`
  - Primary Text & Active Controls: `#f4f5f7`
  - Muted Secondary Metadata: `#8d939e` / `#717684`
- **Typography**:
  - UI Sans: `'Plus Jakarta Sans'`
  - Numeric Counters, Timestamps & Volumes: `'JetBrains Mono'` with `tabular-nums` (`font-variant-numeric: tabular-nums`) so live counters and timestamps never jitter horizontally.
- **Offline-Resilient State (`src/services/api.ts`)**:
  - Reads and writes immediately update `localStorage` (`doselog_doses_cache_v1` and `doselog_settings_cache_v1`) while syncing with the Express backend `/api/*` routes.

---

## 5. Backend API & MongoDB Dual-Engine Storage

`server.ts` runs an Express server on port `3000` (`0.0.0.0:3000`) with a **Dual-Engine Persistence Layer**:

1. **Primary Engine — MongoDB (`mongodb://mongo:27017/doselog`)**:
   - On startup, `server.ts` attempts to connect to `MONGODB_URI` with a 2-second timeout (`serverSelectionTimeoutMS: 2000`).
   - Uses two collections:
     - `doses`: Indexed by `{ timestamp: -1 }` and unique `{ id: 1 }`.
     - `settings`: Stores the singleton document `{ _id: 'user_settings' }`.
2. **Automatic Fallback Engine — Local JSON (`./data/doselog.json`)**:
   - If MongoDB is not running (e.g. during local development on Windows/macOS), `server.ts` automatically falls back to reading and writing `./data/doselog.json`.
   - Zero database setup is required to run or test the app locally.

### REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Returns server health and active storage engine (`mongodb` or `file_store`) |
| `GET` | `/api/doses` | Returns all logged doses sorted newest-first |
| `POST` | `/api/doses` | Creates or upserts a dose entry |
| `PUT` | `/api/doses/:id` | Updates a specific dose's volume or notes |
| `DELETE` | `/api/doses/:id` | Deletes a dose by `id` |
| `GET` | `/api/settings` | Fetches user oil profile, bottle capacity, and timezone settings |
| `POST` | `/api/settings` | Saves updated user settings |
| `GET` | `/api/export` | Downloads a complete JSON backup of `settings` and `doses` |
| `POST` | `/api/import` | Imports/restores a JSON backup payload into MongoDB or local file store |

---

## 6. Local Development Setup

### Prerequisites
- **Node.js** v20+ (Node 22 recommended)
- **npm**

### Install & Run Locally
```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start the full-stack development server (Express + Vite HMR middleware)
npm run dev
```
- Open `http://localhost:3000` in your browser.
- Local test doses and settings are stored automatically in `./data/doselog.json` (which is ignored by Git and Docker).

### Type-Check & Production Build Verification
Before committing changes, always verify TypeScript compilation and the Vite production bundle:
```bash
npm run lint
npm run build
```

---

## 7. CasaOS & ZimaBoard Docker Deployment

### Hardware & Architecture Notes (ZimaBoard 1st Gen)
1. **MongoDB 4.4 Requirement (Non-AVX CPU)**:
   - The ZimaBoard 1st Edition uses an **Intel Celeron N3350/N3450** processor, which **does not support AVX instructions**.
   - MongoDB `5.0+` requires AVX and will crash with `Illegal instruction (core dumped)`.
   - `docker-compose.yml` is pinned to `mongo:4.4` with the `mongo` healthcheck command (`["CMD", "mongo", "--eval", "db.adminCommand('ping')"]`). **Do not upgrade `mongo:4.4` to `5.0+` on 1st Gen ZimaBoard hardware.**
2. **Port Mapping**:
   - Host port `3080` maps to container port `3000` (`"3080:3000"`).
3. **Persistent Volumes**:
   - `./mongo-data:/data/db` — MongoDB database files on your ZimaBoard SSD.
   - `./data:/app/data` — Fallback JSON directory.
   - Both directories are excluded in `.gitignore` and `.dockerignore` so code updates never overwrite your data.

### First-Time Deployment on ZimaBoard (via SSH)

#### Method A: Clone Directly from GitHub
```bash
ssh casaos@<ZIMABOARD_IP>
cd /DATA/AppData
sudo git clone https://github.com/hellomynameisbenjaminupton/doselog.git
cd doselog
sudo chmod +x update.sh
sudo docker compose up -d --build
```

#### Method B: Link an Existing Extracted Folder to GitHub
If you originally created the `doselog` folder on your ZimaBoard by extracting a `.zip` or `.tar.gz` archive, link it to GitHub once from inside your `doselog` directory:
```bash
sudo git init
sudo git remote add origin https://github.com/hellomynameisbenjaminupton/doselog.git
sudo git fetch origin
sudo git reset --hard origin/main
sudo git branch -M main
sudo git branch -u origin/main
sudo chmod +x update.sh
```
*(If Git warns about dubious directory ownership when using `sudo`, run `sudo git config --system --add safe.directory '*'` once.)*

---

## 8. Git & GitHub Update Workflow

Whenever you make changes locally on your development machine and want to deploy them to your ZimaBoard:

### Step 1: Test, Commit & Push from Development Machine
```bash
# Verify TypeScript and production build
npm run lint
npm run build

# Stage, commit, and push to GitHub
git add .
git commit -m "Describe your update"
git push origin main
```

### Step 2: Pull & Rebuild on ZimaBoard
SSH into your ZimaBoard, navigate to your `doselog` folder, and run `./update.sh`:
```bash
ssh casaos@<ZIMABOARD_IP>
cd /path/to/doselog
sudo ./update.sh
```

#### What `update.sh` Does:
```bash
#!/bin/bash
set -e
# 1. Pull latest code from GitHub
git pull origin main

# 2. Rebuild and restart ONLY the DoseLog app container (leaves doselog-mongo untouched)
sudo docker compose up -d --build app

# 3. Prune dangling Docker build layers to keep ZimaBoard SSD storage clean
sudo docker image prune -f
```

---

## 9. Data Backup, Export & Restore

- **Direct JSON Backup Download**:
  Visit `http://<ZIMABOARD_IP>:3080/api/export` in any browser to download a timestamped `doselog-backup-YYYY-MM-DD.json` file containing all doses and settings from MongoDB.
- **Restore via API**:
  Send a `POST` request to `/api/import` with `{ "doses": [...], "settings": {...} }` to upsert historical records directly into MongoDB.

