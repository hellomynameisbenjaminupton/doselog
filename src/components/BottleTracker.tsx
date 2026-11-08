import React, { useState } from 'react';
import { Dose, UserSettings } from '../types';
import { Droplet, RotateCcw, AlertCircle } from 'lucide-react';

interface BottleTrackerProps {
  doses: Dose[];
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

export const BottleTracker: React.FC<BottleTrackerProps> = ({
  doses,
  settings,
  onUpdateSettings,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newCapacity, setNewCapacity] = useState(settings.bottleCapacityMl || 30);

  // Filter doses since bottle was opened (or last 30 days)
  const openedTime = settings.bottleOpenedDate ? new Date(settings.bottleOpenedDate).getTime() : 0;
  const dosesFromThisBottle = doses.filter(d => new Date(d.timestamp).getTime() >= openedTime);

  const totalUsedMl = Math.round(dosesFromThisBottle.reduce((sum, d) => sum + d.volumeMl, 0) * 100) / 100;
  const bottleCapacity = settings.bottleCapacityMl || 30;
  const remainingMl = Math.max(0, Math.round((bottleCapacity - totalUsedMl) * 100) / 100);
  const percentRemaining = Math.max(0, Math.min(100, Math.round((remainingMl / bottleCapacity) * 100)));

  const avgDoseSize = settings.defaultVolumeMl || 0.5;
  const estimatedDosesLeft = Math.floor(remainingMl / avgDoseSize);

  const handleResetBottle = async () => {
    await onUpdateSettings({
      bottleCapacityMl: newCapacity,
      bottleOpenedDate: new Date().toISOString(),
    });
    setShowResetConfirm(false);
  };

  return (
    <div className="w-full rounded-2xl border border-[#23262c] bg-[#15171b] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplet className="h-4 w-4 text-[#8d939e]" />
          <h3 className="text-sm font-semibold text-[#f4f5f7]">Current Bottle Status</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-1.5 text-xs text-[#8d939e] hover:text-[#d1d5db] transition"
        >
          <RotateCcw className="h-3 w-3" />
          <span>New Bottle</span>
        </button>
      </div>

      {showResetConfirm ? (
        <div className="mt-4 rounded-xl border border-[#2e323b] bg-[#121316] p-4">
          <h4 className="text-xs font-semibold text-[#f4f5f7]">Opened a new bottle?</h4>
          <p className="mt-1 text-xs text-[#787e8b]">
            This will reset the bottle volume counter starting from today.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-[#8d939e]">Bottle Volume:</label>
            <input
              type="number"
              step="5"
              min="10"
              max="200"
              value={newCapacity}
              onChange={(e) => setNewCapacity(parseFloat(e.target.value) || 30)}
              className="w-20 rounded-md border border-[#2c3038] bg-[#1a1d22] px-2 py-1 text-center font-mono text-xs text-[#f4f5f7] outline-none"
            />
            <span className="text-xs text-[#8d939e]">mL</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetBottle}
              className="rounded-lg bg-[#292c34] px-3 py-1.5 text-xs font-medium text-[#f4f5f7] hover:bg-[#393e4a]"
            >
              Reset Bottle Counter
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="rounded-lg border border-[#2b2e36] px-2.5 py-1.5 text-xs text-[#8d939e] hover:text-[#f4f5f7]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main metric row */}
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="font-mono text-2xl font-bold tabular-nums text-[#f4f5f7]">
                {remainingMl}
              </span>
              <span className="ml-1 text-xs text-[#8d939e]">/ {bottleCapacity} mL</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-semibold tabular-nums text-[#d1d5db]">
                ~{estimatedDosesLeft}
              </span>
              <span className="ml-1 text-xs text-[#8d939e]">doses left</span>
            </div>
          </div>

          {/* Minimalist monochrome progress bar */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#202227]">
            <div
              className="h-full rounded-full bg-[#f4f5f7] transition-all duration-300"
              style={{ width: `${percentRemaining}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#717684]">
            <span>Used: {totalUsedMl} mL ({dosesFromThisBottle.length} doses)</span>
            <span>{percentRemaining}% full</span>
          </div>

          {remainingMl <= 5 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#27201c] p-2.5 text-xs text-[#e6b98d] border border-[#3d3227]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Low bottle volume. Time to request a medical prescription refill.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
