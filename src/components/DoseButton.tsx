import React, { useState } from 'react';
import { Plus, Check, Volume2, Sparkles, MessageSquare } from 'lucide-react';
import { UserSettings } from '../types';

interface DoseButtonProps {
  onLogDose: (volumeMl: number, notes?: string) => Promise<void>;
  settings: UserSettings;
  isLogging: boolean;
  dosesCountToday: number;
}

export const DoseButton: React.FC<DoseButtonProps> = ({
  onLogDose,
  settings,
  isLogging,
  dosesCountToday,
}) => {
  // Quick preset volumes in mL
  const presets = [0.4, 0.3, 0.2];

  const [selectedVolume, setSelectedVolume] = useState<number>(
    presets.includes(settings.defaultVolumeMl) ? settings.defaultVolumeMl : 0.4
  );
  const [customVolumeInput, setCustomVolumeInput] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [showNoteField, setShowNoteField] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');
  const [justLogged, setJustLogged] = useState<boolean>(false);

  // Soft subtle click sound via Web Audio API
  const playClickSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio not permitted or not supported
    }
  };

  const handlePress = async () => {
    if (isLogging) return;

    // Haptics
    if (settings.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([20, 30]);
      } catch {}
    }

    playClickSound();

    const vol = showCustomInput && parseFloat(customVolumeInput) > 0
      ? parseFloat(customVolumeInput)
      : selectedVolume;

    const notes = noteText.trim() !== '' ? noteText.trim() : undefined;

    setJustLogged(true);
    await onLogDose(vol, notes);

    // Reset notes after logging
    setNoteText('');
    setShowNoteField(false);

    setTimeout(() => {
      setJustLogged(false);
    }, 1800);
  };

  const nextDoseNumber = dosesCountToday + 1;
  const nextDoseLabel = dosesCountToday === 0 ? 'First Dose' : `Dose #${nextDoseNumber}`;

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Volume selector tabs */}
      <div className="mb-4 flex items-center justify-center gap-1.5 p-1 rounded-xl bg-[#141518] border border-[#23252b]">
        {presets.map((vol) => {
          const isSelected = !showCustomInput && selectedVolume === vol;
          return (
            <button
              key={vol}
              type="button"
              onClick={() => {
                setSelectedVolume(vol);
                setShowCustomInput(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isSelected
                  ? 'bg-[#292c34] text-[#f4f5f7] shadow-sm'
                  : 'text-[#8d939e] hover:text-[#d1d5db]'
              }`}
            >
              {vol} mL
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
            showCustomInput
              ? 'bg-[#292c34] text-[#f4f5f7]'
              : 'text-[#8d939e] hover:text-[#d1d5db]'
          }`}
        >
          Custom
        </button>
      </div>

      {showCustomInput && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="number"
            step="0.05"
            min="0.05"
            max="10"
            placeholder="e.g. 0.35"
            value={customVolumeInput}
            onChange={(e) => setCustomVolumeInput(e.target.value)}
            className="w-28 rounded-lg border border-[#2b2e36] bg-[#141518] px-3 py-1.5 text-center text-sm font-medium text-[#f4f5f7] outline-none focus:border-[#4c515f]"
          />
          <span className="text-xs text-[#8d939e]">mL per dropper</span>
        </div>
      )}

      {/* Giant Tactile Dose Button */}
      <div className="relative w-full px-2">
        <button
          type="button"
          onClick={handlePress}
          disabled={isLogging}
          className={`group relative w-full overflow-hidden rounded-2xl border p-6 transition-all duration-150 active:scale-[0.98] ${
            justLogged
              ? 'border-[#555a66] bg-[#22252c]'
              : 'border-[#2e323b] bg-[#17191e] hover:border-[#414652] hover:bg-[#1b1e24]'
          }`}
          style={{
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.4)',
          }}
        >
          {/* Subtle inner highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="flex flex-col items-center justify-center text-center">
            {/* Visual Icon circle */}
            <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full border transition-all ${
              justLogged
                ? 'border-[#717684] bg-[#2f333c] text-white scale-110'
                : 'border-[#333742] bg-[#20232a] text-[#f4f5f7] group-hover:scale-105'
            }`}>
              {justLogged ? (
                <Check className="h-7 w-7 stroke-[2.5]" />
              ) : (
                <Plus className="h-7 w-7 stroke-[2.5]" />
              )}
            </div>

            {/* Main Action Label */}
            <div className="text-lg font-semibold tracking-tight text-[#f4f5f7]">
              {justLogged ? 'Dose Logged!' : `Log ${nextDoseLabel}`}
            </div>

            {/* Sub-label with exact volume & strength calculation */}
            <div className="mt-1 flex items-center gap-2 text-xs text-[#8d939e]">
              <span className="tabular-nums font-mono font-medium text-[#c0c5ce]">
                {showCustomInput && customVolumeInput ? customVolumeInput : selectedVolume} mL
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {Math.round(((showCustomInput && customVolumeInput ? parseFloat(customVolumeInput) : selectedVolume) || 0.5) * (settings.thcMgPerMl || 10) * 10) / 10}mg THC
              </span>
              <span aria-hidden="true">/</span>
              <span>
                {Math.round(((showCustomInput && customVolumeInput ? parseFloat(customVolumeInput) : selectedVolume) || 0.5) * (settings.cbdMgPerMl || 10) * 10) / 10}mg CBD
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Optional Note toggle */}
      <div className="mt-3 flex flex-col items-center w-full px-2">
        {!showNoteField ? (
          <button
            type="button"
            onClick={() => setShowNoteField(true)}
            className="flex items-center gap-1.5 text-xs text-[#737985] hover:text-[#a0a6b4] transition py-1"
          >
            <MessageSquare className="h-3 w-3" />
            <span>Add optional note for this dose</span>
          </button>
        ) : (
          <div className="w-full mt-1 flex gap-2">
            <input
              type="text"
              placeholder="e.g. Took with food, morning routine..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="flex-1 rounded-xl border border-[#2b2e36] bg-[#141518] px-3.5 py-2 text-xs text-[#f4f5f7] placeholder-[#575c67] outline-none focus:border-[#464b58]"
            />
            <button
              type="button"
              onClick={() => setShowNoteField(false)}
              className="px-3 py-2 text-xs text-[#8d939e] hover:text-[#f4f5f7] rounded-xl border border-[#2b2e36] bg-[#141518]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
