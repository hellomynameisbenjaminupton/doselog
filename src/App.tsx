import React, { useState, useEffect } from 'react';
import { Dose, UserSettings } from './types';
import {
  loadDoses,
  saveDoseToServer,
  updateDoseOnServer,
  deleteDoseOnServer,
  loadSettings,
  saveSettingsToServer,
  fetchServerStatus,
  DEFAULT_SETTINGS,
} from './services/api';
import {
  getUserTimezone,
  getTodayString,
  getDateStringInTimezone,
  formatTimeInTimezone,
  formatDateInTimezone,
  getTimeUntilMidnight,
  getTimeElapsed,
} from './utils/timezone';
import { Header } from './components/Header';
import { DoseButton } from './components/DoseButton';
import { TodayDoseList } from './components/TodayDoseList';
import { BottleTracker } from './components/BottleTracker';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  Clock,
  Undo2,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  const [doses, setDoses] = useState<Dose[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'bottle'>('today');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [serverStatus, setServerStatus] = useState<{
    status: string;
    engine: 'mongodb' | 'file_store';
    mongoConnected: boolean;
  }>({
    status: 'checking',
    engine: 'file_store',
    mongoConnected: false,
  });

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    visible: boolean;
    doseId: string;
    message: string;
  } | null>(null);

  // Live timer for clock and midnight reset countdown
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial data load
  const reloadAllData = async () => {
    try {
      const [fetchedDoses, fetchedSettings, status] = await Promise.all([
        loadDoses(),
        loadSettings(),
        fetchServerStatus(),
      ]);
      setDoses(fetchedDoses);
      setSettings(fetchedSettings);
      setServerStatus(status);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    reloadAllData();
  }, []);

  const activeTimezone = getUserTimezone(settings.customTimezone);
  const todayStr = getTodayString(activeTimezone);

  // Filter doses for today in active timezone
  const todayDoses = doses.filter(
    (d) => getDateStringInTimezone(d.timestamp, activeTimezone) === todayStr
  );
  // Sort reverse-chronological for recent dose check, and chronological for numbers
  const chronologicalToday = [...todayDoses].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const mostRecentDose = chronologicalToday.length > 0 ? chronologicalToday[chronologicalToday.length - 1] : null;

  const totalVolumeToday = Math.round(todayDoses.reduce((sum, d) => sum + d.volumeMl, 0) * 100) / 100;
  const totalThcToday = Math.round(totalVolumeToday * (settings.thcMgPerMl || 10) * 10) / 10;
  const totalCbdToday = Math.round(totalVolumeToday * (settings.cbdMgPerMl || 10) * 10) / 10;

  const midnightInfo = getTimeUntilMidnight(activeTimezone);
  const formattedCurrentTime = formatTimeInTimezone(
    currentTime,
    activeTimezone,
    settings.timeFormat === '24h'
  );
  const formattedCurrentDate = formatDateInTimezone(currentTime, activeTimezone);

  // Handler for logging a dose
  const handleLogDose = async (volumeMl: number, notes?: string) => {
    setIsLogging(true);
    try {
      const newDose = await saveDoseToServer({
        timestamp: new Date().toISOString(),
        volumeMl,
        oilName: settings.oilName,
        notes,
        timezone: activeTimezone,
      });

      setDoses((prev) => [newDose, ...prev]);

      // Trigger Toast with Undo capability
      const doseNumber = todayDoses.length + 1;
      const timeStr = formatTimeInTimezone(newDose.timestamp, activeTimezone, settings.timeFormat === '24h');
      setUndoToast({
        visible: true,
        doseId: newDose.id,
        message: `Dose #${doseNumber} logged (${timeStr} · ${volumeMl} mL)`,
      });

      // Auto dismiss toast after 6 seconds
      setTimeout(() => {
        setUndoToast((current) => (current?.doseId === newDose.id ? null : current));
      }, 6000);
    } catch (err) {
      console.error('Error logging dose:', err);
    } finally {
      setIsLogging(false);
    }
  };

  // Handler for undoing recent dose
  const handleUndoRecent = async () => {
    if (!undoToast?.doseId) return;
    const idToUndo = undoToast.doseId;
    setUndoToast(null);
    await handleDeleteDose(idToUndo);
  };

  // Handler for deleting a dose
  const handleDeleteDose = async (id: string) => {
    setDoses((prev) => prev.filter((d) => d.id !== id));
    await deleteDoseOnServer(id);
  };

  // Handler for updating a dose
  const handleUpdateDose = async (id: string, updates: Partial<Dose>) => {
    setDoses((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
    await updateDoseOnServer(id, updates);
  };

  // Handler for adding manual past dose
  const handleAddManualDose = async (timestamp: string, volumeMl: number, notes?: string) => {
    const newDose = await saveDoseToServer({
      timestamp,
      volumeMl,
      oilName: settings.oilName,
      notes,
      timezone: activeTimezone,
    });
    setDoses((prev) => [newDose, ...prev]);
  };

  // Handler for saving settings or partial updates
  const handleSaveSettings = async (updates: Partial<UserSettings>) => {
    const merged: UserSettings = { ...settings, ...updates };
    setSettings(merged);
    await saveSettingsToServer(merged);
  };

  return (
    <div className="min-h-screen bg-[#0e0f11] text-[#e6e8eb] flex flex-col font-sans selection:bg-[#2e323b] selection:text-white">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        mongoConnected={serverStatus.mongoConnected}
        engine={serverStatus.engine}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 space-y-6">
        {/* TAB 1: TODAY (PRIMARY INTERFACE) */}
        {activeTab === 'today' && (
          <div className="space-y-6">
            {/* Top metadata ticker: Timezone & Midnight Reset Notice (Zero-pill clean text) */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8d939e] border-b border-[#1c1e23] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[#6c727f]" />
                <span className="font-medium text-[#d1d5db]">{formattedCurrentDate}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-[#f4f5f7] font-semibold">{formattedCurrentTime}</span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#717684]">
                <span>Timezone: <strong className="text-[#a6abb7] font-mono">{activeTimezone}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Midnight reset in <strong className="text-[#a6abb7] font-mono">{midnightInfo.formatted}</strong></span>
              </div>
            </div>

            {/* Central Focal Anchor: Dose Count Hero Card */}
            <div className="relative overflow-hidden rounded-2xl border border-[#23262c] bg-[#141518] p-6 text-center">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#787e8b]">
                {settings.oilName || 'Medical Oil'}
              </span>

              {/* Big bold dose count number */}
              <div className="my-2 flex items-baseline justify-center gap-2">
                <span className="font-mono text-6xl font-bold tracking-tight text-[#f4f5f7] tabular-nums">
                  0{todayDoses.length}
                </span>
                <span className="text-sm font-medium text-[#8d939e]">
                  / {settings.dailyTargetDoses || 3} target
                </span>
              </div>

              <div className="text-sm font-medium text-[#c4c9d4]">
                {todayDoses.length === 0
                  ? 'No doses logged today'
                  : todayDoses.length === 1
                  ? '1 dose taken today'
                  : `${todayDoses.length} doses taken today`}
              </div>

              {/* Last dose elapsed info */}
              <div className="mt-2 text-xs text-[#717684]">
                {mostRecentDose ? (
                  <span>
                    Last dose:{' '}
                    <strong className="text-[#d1d5db] font-mono">
                      {formatTimeInTimezone(mostRecentDose.timestamp, activeTimezone, settings.timeFormat === '24h')}
                    </strong>{' '}
                    ({getTimeElapsed(mostRecentDose.timestamp)})
                  </span>
                ) : (
                  <span>Ready for dose #1 when taken</span>
                )}
              </div>

              {/* Day totals if doses > 0 */}
              {todayDoses.length > 0 && (
                <div className="mt-4 inline-flex items-center gap-3 rounded-lg border border-[#202227] bg-[#0e0f11] px-3.5 py-1.5 text-xs text-[#8d939e]">
                  <span>Total today: <strong className="font-mono text-[#f4f5f7]">{totalVolumeToday} mL</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>{totalThcToday}mg THC</span>
                  <span aria-hidden="true">/</span>
                  <span>{totalCbdToday}mg CBD</span>
                </div>
              )}
            </div>

            {/* The Big One-Tap Dose Button */}
            <div className="py-2">
              <DoseButton
                onLogDose={handleLogDose}
                settings={settings}
                isLogging={isLogging}
                dosesCountToday={todayDoses.length}
              />
            </div>

            {/* Today's Chronological Dose Timeline */}
            <div className="pt-2">
              <TodayDoseList
                doses={todayDoses}
                timezone={activeTimezone}
                settings={settings}
                onDeleteDose={handleDeleteDose}
                onUpdateDose={handleUpdateDose}
              />
            </div>

            {/* Bottle Level Sneak Peek */}
            <div className="pt-2">
              <BottleTracker
                doses={doses}
                settings={settings}
                onUpdateSettings={handleSaveSettings}
              />
            </div>

            <div className="flex justify-center pt-1">
              <PWAInstallButton />
            </div>
          </div>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === 'history' && (
          <HistoryModal
            doses={doses}
            timezone={activeTimezone}
            settings={settings}
            onDeleteDose={handleDeleteDose}
            onAddManualDose={handleAddManualDose}
          />
        )}

        {/* TAB 3: BOTTLE MONITOR */}
        {activeTab === 'bottle' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#f4f5f7]">Balanced Oil Bottle Inventory</h2>
              <p className="text-xs text-[#8d939e]">
                Keep track of bottle volume, remaining doses, and prescription renewals.
              </p>
            </div>

            <BottleTracker
              doses={doses}
              settings={settings}
              onUpdateSettings={handleSaveSettings}
            />

            <div className="rounded-xl border border-[#202227] bg-[#141518] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-[#f4f5f7]">Bottle Configuration</h3>
              <div className="grid grid-cols-2 gap-4 text-xs text-[#8d939e]">
                <div>
                  <span className="block text-[#6f7584]">Bottle Size</span>
                  <span className="font-mono text-sm font-semibold text-[#f4f5f7]">
                    {settings.bottleCapacityMl || 30} mL
                  </span>
                </div>
                <div>
                  <span className="block text-[#6f7584]">Typical Dose</span>
                  <span className="font-mono text-sm font-semibold text-[#f4f5f7]">
                    {settings.defaultVolumeMl || 0.5} mL
                  </span>
                </div>
                <div>
                  <span className="block text-[#6f7584]">Formula</span>
                  <span className="text-[#f4f5f7] font-medium">
                    {settings.thcMgPerMl}mg THC : {settings.cbdMgPerMl}mg CBD / mL
                  </span>
                </div>
                <div>
                  <span className="block text-[#6f7584]">Doses per bottle</span>
                  <span className="font-mono text-sm font-semibold text-[#f4f5f7]">
                    ~{Math.floor((settings.bottleCapacityMl || 30) / (settings.defaultVolumeMl || 0.5))} doses
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="rounded-lg border border-[#2c2f37] bg-[#1a1c22] px-3 py-1.5 text-xs text-[#d1d5db] hover:text-white"
                >
                  Edit Oil Bottle Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Undo Toast (6 seconds) */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-[#373c47] bg-[#1b1e25] px-4 py-3 shadow-2xl text-xs text-[#f4f5f7] animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="h-4 w-4 text-[#d1d5db]" />
          <span>{undoToast.message}</span>
          <button
            type="button"
            onClick={handleUndoRecent}
            className="flex items-center gap-1 rounded-md bg-[#2d313c] px-2.5 py-1 font-medium text-white hover:bg-[#3d4352] transition ml-2"
          >
            <Undo2 className="h-3 w-3" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
