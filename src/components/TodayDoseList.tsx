import React, { useState } from 'react';
import { Dose, UserSettings } from '../types';
import { formatTimeInTimezone, getTimeElapsed, getIntervalBetween } from '../utils/timezone';
import { Trash2, Edit3, Check, X, Clock, MessageSquare } from 'lucide-react';

interface TodayDoseListProps {
  doses: Dose[]; // Doses for today, sorted chronologically or reverse
  timezone: string;
  settings: UserSettings;
  onDeleteDose: (id: string) => Promise<void>;
  onUpdateDose: (id: string, updates: Partial<Dose>) => Promise<void>;
}

export const TodayDoseList: React.FC<TodayDoseListProps> = ({
  doses,
  timezone,
  settings,
  onDeleteDose,
  onUpdateDose,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVolume, setEditVolume] = useState<number>(0.5);
  const [editNotes, setEditNotes] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sort chronological for numbering (Dose #1, #2, #3...)
  const chronologicalDoses = [...doses].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const startEdit = (dose: Dose) => {
    setEditingId(dose.id);
    setEditVolume(dose.volumeMl);
    setEditNotes(dose.notes || '');
  };

  const saveEdit = async (id: string) => {
    await onUpdateDose(id, {
      volumeMl: editVolume,
      notes: editNotes.trim(),
    });
    setEditingId(null);
  };

  if (doses.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-dashed border-[#26282e] bg-[#121316]/60 p-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#1b1d22] text-[#6d727e]">
          <Clock className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-semibold text-[#d6d9e0]">No doses taken yet today</h4>
        <p className="mt-1 text-xs text-[#787e8b]">
          When you take your balanced oil, tap the button above to log your first dose.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7e8492]">
          Today's Doses ({chronologicalDoses.length})
        </h3>
        <span className="text-xs text-[#7e8492]">
          Total:{' '}
          <span className="font-mono tabular-nums text-[#d6d9e0]">
            {Math.round(chronologicalDoses.reduce((sum, d) => sum + d.volumeMl, 0) * 100) / 100} mL
          </span>
        </span>
      </div>

      <div className="space-y-2">
        {chronologicalDoses.map((dose, index) => {
          const doseNumber = index + 1;
          const isEditing = editingId === dose.id;
          const isDeleting = deleteConfirmId === dose.id;
          const timeFormatted = formatTimeInTimezone(
            dose.timestamp,
            timezone,
            settings.timeFormat === '24h'
          );
          const elapsed = getTimeElapsed(dose.timestamp);

          // Interval since previous dose
          const prevDose = index > 0 ? chronologicalDoses[index - 1] : null;
          const intervalFromPrev = prevDose
            ? getIntervalBetween(prevDose.timestamp, dose.timestamp)
            : null;

          const thcMg = Math.round(dose.volumeMl * (settings.thcMgPerMl || 10) * 10) / 10;
          const cbdMg = Math.round(dose.volumeMl * (settings.cbdMgPerMl || 10) * 10) / 10;

          return (
            <div
              key={dose.id}
              className="relative overflow-hidden rounded-xl border border-[#23262c] bg-[#15171b] p-4 transition-all hover:border-[#323640]"
            >
              {isEditing ? (
                /* Editing Mode */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#f4f5f7]">Edit Dose #{doseNumber}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(dose.id)}
                        className="flex items-center gap-1 rounded-md bg-[#292c34] px-2.5 py-1 text-xs text-[#f4f5f7] hover:bg-[#383d48]"
                      >
                        <Check className="h-3 w-3" />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-md border border-[#2b2e36] px-2 py-1 text-xs text-[#8d939e] hover:text-[#f4f5f7]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#7e8492]">Volume (mL)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        value={editVolume}
                        onChange={(e) => setEditVolume(parseFloat(e.target.value) || 0.5)}
                        className="mt-1 w-full rounded-lg border border-[#2b2e36] bg-[#121316] px-2.5 py-1.5 text-xs text-[#f4f5f7] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#7e8492]">Notes</label>
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Optional note"
                        className="mt-1 w-full rounded-lg border border-[#2b2e36] bg-[#121316] px-2.5 py-1.5 text-xs text-[#f4f5f7] outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : isDeleting ? (
                /* Delete Confirmation */
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-[#f4f5f7]">Remove Dose #{doseNumber}?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDeleteDose(dose.id)}
                      className="rounded-lg bg-[#3d2424] px-3 py-1.5 text-xs font-medium text-[#ffb0b0] hover:bg-[#522b2b]"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="rounded-lg border border-[#2a2d34] px-2.5 py-1.5 text-xs text-[#8d939e] hover:text-[#f4f5f7]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal Display */
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Dose number badge */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#282b32] bg-[#1a1d23] font-mono text-xs font-bold text-[#f4f5f7]">
                      0{doseNumber}
                    </div>

                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-base font-semibold tabular-nums text-[#f4f5f7]">
                          {timeFormatted}
                        </span>
                        <span className="text-xs text-[#737986] font-mono">
                          ({elapsed})
                        </span>
                      </div>

                      {/* Dose strength & volume */}
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#8d939e]">
                        <span className="font-mono font-medium text-[#c6cbd4]">
                          {dose.volumeMl} mL
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{thcMg}mg THC</span>
                        <span aria-hidden="true">/</span>
                        <span>{cbdMg}mg CBD</span>

                        {intervalFromPrev && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#9da3af]">
                              +{intervalFromPrev} after dose #{index}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Note if present */}
                      {dose.notes && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-[#9ea4b1] bg-[#1b1d23] px-2.5 py-1 rounded-md border border-[#26282f] inline-flex">
                          <MessageSquare className="h-3 w-3 text-[#717684]" />
                          <span>{dose.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(dose)}
                      aria-label="Edit dose"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6f7582] hover:bg-[#20232a] hover:text-[#d1d5db] transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(dose.id)}
                      aria-label="Delete dose"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6f7582] hover:bg-[#2c1d1d] hover:text-[#f87171] transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
