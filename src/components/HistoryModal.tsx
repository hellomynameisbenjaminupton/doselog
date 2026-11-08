import React, { useState } from 'react';
import { Dose, UserSettings, DayDoseSummary } from '../types';
import {
  getDateStringInTimezone,
  getTodayString,
  formatTimeInTimezone,
  formatDateInTimezone,
} from '../utils/timezone';
import { Calendar, ChevronDown, ChevronUp, Trash2, Plus, Clock } from 'lucide-react';

interface HistoryModalProps {
  doses: Dose[];
  timezone: string;
  settings: UserSettings;
  onDeleteDose: (id: string) => Promise<void>;
  onAddManualDose: (timestamp: string, volumeMl: number, notes?: string) => Promise<void>;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  doses,
  timezone,
  settings,
  onDeleteDose,
  onAddManualDose,
}) => {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showAddPastModal, setShowAddPastModal] = useState<boolean>(false);
  const [pastDate, setPastDate] = useState<string>(getTodayString(timezone));
  const [pastTime, setPastTime] = useState<string>('12:00');
  const [pastVolume, setPastVolume] = useState<number>(settings.defaultVolumeMl || 0.5);
  const [pastNotes, setPastNotes] = useState<string>('');

  const todayStr = getTodayString(timezone);

  // Group doses by date string
  const groupedByDate: { [dateStr: string]: Dose[] } = {};
  for (const dose of doses) {
    const dStr = getDateStringInTimezone(dose.timestamp, timezone);
    if (!groupedByDate[dStr]) {
      groupedByDate[dStr] = [];
    }
    groupedByDate[dStr].push(dose);
  }

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const summaries: DayDoseSummary[] = sortedDates.map((dStr) => {
    const dayDoses = groupedByDate[dStr];
    // Sort chronological within the day
    dayDoses.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let displayDate = dStr;
    if (dStr === todayStr) {
      displayDate = 'Today';
    } else {
      displayDate = formatDateInTimezone(`${dStr}T12:00:00`, timezone);
    }

    const totalVolumeMl = dayDoses.reduce((acc, d) => acc + d.volumeMl, 0);
    const totalThcMg = totalVolumeMl * (settings.thcMgPerMl || 10);
    const totalCbdMg = totalVolumeMl * (settings.cbdMgPerMl || 10);

    return {
      dateStr: dStr,
      displayDate,
      doses: dayDoses,
      totalVolumeMl: Math.round(totalVolumeMl * 100) / 100,
      totalThcMg: Math.round(totalThcMg * 10) / 10,
      totalCbdMg: Math.round(totalCbdMg * 10) / 10,
    };
  });

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastDate || !pastTime) return;

    // Combine date & time into ISO string in local timezone
    const combinedStr = `${pastDate}T${pastTime}:00`;
    const dt = new Date(combinedStr);
    const isoString = dt.toISOString();

    await onAddManualDose(isoString, pastVolume, pastNotes.trim() || undefined);
    setShowAddPastModal(false);
    setPastNotes('');
  };

  return (
    <div className="w-full space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#f4f5f7]">Dose History & Logs</h2>
          <p className="text-xs text-[#8d939e]">
            Review all logged doses grouped by day (midnight reset applied).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddPastModal(true)}
          className="flex items-center gap-1.5 rounded-lg border border-[#2b2e36] bg-[#16181c] px-3 py-1.5 text-xs font-medium text-[#f4f5f7] hover:bg-[#20232a] transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Log Past Dose</span>
        </button>
      </div>

      {/* Manual Entry Modal */}
      {showAddPastModal && (
        <div className="rounded-2xl border border-[#2d313a] bg-[#15171b] p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#23262c]">
            <h3 className="text-sm font-semibold text-[#f4f5f7]">Record a Past / Missed Dose</h3>
            <button
              onClick={() => setShowAddPastModal(false)}
              className="text-xs text-[#8d939e] hover:text-[#f4f5f7]"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveManual} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8d939e] mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={pastDate}
                  onChange={(e) => setPastDate(e.target.value)}
                  className="w-full rounded-lg border border-[#2c2f37] bg-[#111215] px-3 py-2 text-xs text-[#f4f5f7] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8d939e] mb-1">Time</label>
                <input
                  type="time"
                  required
                  value={pastTime}
                  onChange={(e) => setPastTime(e.target.value)}
                  className="w-full rounded-lg border border-[#2c2f37] bg-[#111215] px-3 py-2 text-xs text-[#f4f5f7] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8d939e] mb-1">Volume (mL)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  required
                  value={pastVolume}
                  onChange={(e) => setPastVolume(parseFloat(e.target.value) || 0.5)}
                  className="w-full rounded-lg border border-[#2c2f37] bg-[#111215] px-3 py-2 text-xs text-[#f4f5f7] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8d939e] mb-1">Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Afternoon dose"
                  value={pastNotes}
                  onChange={(e) => setPastNotes(e.target.value)}
                  className="w-full rounded-lg border border-[#2c2f37] bg-[#111215] px-3 py-2 text-xs text-[#f4f5f7] outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddPastModal(false)}
                className="px-3 py-1.5 text-xs text-[#8d939e] hover:text-[#f4f5f7]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#292c34] px-4 py-2 text-xs font-semibold text-[#f4f5f7] hover:bg-[#3b404d] transition"
              >
                Save Dose Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grouped Day Summaries */}
      {summaries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#23262c] bg-[#121316] p-8 text-center text-xs text-[#7e8492]">
          No dose logs found yet. Tap "Log Dose" on the main page to create your first entry.
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((summary) => {
            const isExpanded = expandedDate === summary.dateStr || summary.dateStr === todayStr;
            const isToday = summary.dateStr === todayStr;

            return (
              <div
                key={summary.dateStr}
                className={`overflow-hidden rounded-xl border transition-all ${
                  isToday
                    ? 'border-[#383c46] bg-[#16181d]'
                    : 'border-[#202227] bg-[#131417]'
                }`}
              >
                {/* Day Header Accordion Trigger */}
                <div
                  onClick={() => setExpandedDate(isExpanded ? null : summary.dateStr)}
                  className="flex cursor-pointer items-center justify-between p-4 hover:bg-[#1a1c22] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f2127] text-xs font-mono font-bold text-[#f4f5f7]">
                      {summary.doses.length}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#f4f5f7]">
                          {summary.displayDate}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#9ba1af]">
                            · Active Today
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#787e8b]">
                        {summary.totalVolumeMl} mL total · {summary.totalThcMg}mg THC / {summary.totalCbdMg}mg CBD
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[#787e8b]">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Expanded Dose Items for this day */}
                {isExpanded && (
                  <div className="border-t border-[#1f2127] bg-[#111215] p-3 space-y-2">
                    {summary.doses.map((dose, idx) => {
                      const doseNum = idx + 1;
                      const timeStr = formatTimeInTimezone(
                        dose.timestamp,
                        timezone,
                        settings.timeFormat === '24h'
                      );

                      return (
                        <div
                          key={dose.id}
                          className="flex items-center justify-between rounded-lg border border-[#202227] bg-[#15171b] px-3.5 py-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-semibold text-[#9da3b0]">
                              #{doseNum}
                            </span>
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-mono text-xs font-semibold tabular-nums text-[#f4f5f7]">
                                  {timeStr}
                                </span>
                                <span className="font-mono text-xs text-[#8d939e]">
                                  {dose.volumeMl} mL
                                </span>
                              </div>
                              {dose.notes && (
                                <p className="text-[11px] text-[#717684] mt-0.5">{dose.notes}</p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onDeleteDose(dose.id)}
                            aria-label="Delete entry"
                            className="p-1 text-[#5b606c] hover:text-[#f87171] transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
