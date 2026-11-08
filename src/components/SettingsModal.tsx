import React, { useState } from 'react';
import { UserSettings } from '../types';
import { getUserTimezone } from '../utils/timezone';
import { X, Check, Globe, Sliders, Smartphone, Droplets } from 'lucide-react';

interface SettingsModalProps {
  settings: UserSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: UserSettings) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<UserSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const detectedTz = getUserTimezone();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#26282f] bg-[#141518] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#212329]">
          <h2 className="text-base font-bold text-[#f4f5f7]">Dose & Profile Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8d939e] hover:bg-[#1d1f25] hover:text-[#f4f5f7]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Medical Oil Specification */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#797f8d]">
              <Droplets className="h-3.5 w-3.5 text-[#d1d5db]" />
              <span>Medical Balanced Oil Profile</span>
            </div>

            <div>
              <label className="block text-xs text-[#8d939e] mb-1">Prescription Oil Name</label>
              <input
                type="text"
                required
                value={formData.oilName}
                onChange={(e) => setFormData({ ...formData, oilName: e.target.value })}
                className="w-full rounded-lg border border-[#2b2e36] bg-[#0e0f11] px-3 py-2 text-xs text-[#f4f5f7] outline-none focus:border-[#424653]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8d939e] mb-1">THC Concentration (mg/mL)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={formData.thcMgPerMl}
                  onChange={(e) => setFormData({ ...formData, thcMgPerMl: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-[#2b2e36] bg-[#0e0f11] px-3 py-2 text-xs text-[#f4f5f7] outline-none focus:border-[#424653]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8d939e] mb-1">CBD Concentration (mg/mL)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={formData.cbdMgPerMl}
                  onChange={(e) => setFormData({ ...formData, cbdMgPerMl: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-[#2b2e36] bg-[#0e0f11] px-3 py-2 text-xs text-[#f4f5f7] outline-none focus:border-[#424653]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8d939e] mb-1">Default Dose Size (mL)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  required
                  value={formData.defaultVolumeMl}
                  onChange={(e) => setFormData({ ...formData, defaultVolumeMl: parseFloat(e.target.value) || 0.5 })}
                  className="w-full rounded-lg border border-[#2b2e36] bg-[#0e0f11] px-3 py-2 text-xs text-[#f4f5f7] outline-none focus:border-[#424653]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8d939e] mb-1">Bottle Capacity (mL)</label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  required
                  value={formData.bottleCapacityMl}
                  onChange={(e) => setFormData({ ...formData, bottleCapacityMl: parseFloat(e.target.value) || 30 })}
                  className="w-full rounded-lg border border-[#2b2e36] bg-[#0e0f11] px-3 py-2 text-xs text-[#f4f5f7] outline-none focus:border-[#424653]"
                />
              </div>
            </div>
          </div>

          {/* Timezone & Reset Configuration */}
          <div className="space-y-3 pt-3 border-t border-[#212329]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#797f8d]">
              <Globe className="h-3.5 w-3.5 text-[#d1d5db]" />
              <span>Timezone & Midnight Reset (00:00)</span>
            </div>

            <div>
              <label className="block text-xs text-[#8d939e] mb-1">
                Timezone for Midnight Daily Reset
              </label>
              <input
                type="text"
                placeholder={detectedTz}
                value={formData.customTimezone}
                onChange={(e) => setFormData({ ...formData, customTimezone: e.target.value })}
                className="w-full rounded-lg border border-[#2b2e36] bg-[#0e0f11] px-3 py-2 text-xs text-[#f4f5f7] outline-none focus:border-[#424653]"
              />
              <p className="mt-1 text-[11px] text-[#717684]">
                Detected from your browser:{' '}
                <span className="font-mono text-[#a5abb7]">{detectedTz}</span>. Leave blank to always auto-detect.
              </p>
            </div>

            <div>
              <label className="block text-xs text-[#8d939e] mb-1">Clock Display Format</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, timeFormat: '12h' })}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${
                    formData.timeFormat === '12h'
                      ? 'border-[#414652] bg-[#22252c] text-[#f4f5f7]'
                      : 'border-[#26282e] bg-[#111215] text-[#8d939e]'
                  }`}
                >
                  12-hour (e.g. 02:30 PM)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, timeFormat: '24h' })}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${
                    formData.timeFormat === '24h'
                      ? 'border-[#414652] bg-[#22252c] text-[#f4f5f7]'
                      : 'border-[#26282e] bg-[#111215] text-[#8d939e]'
                  }`}
                >
                  24-hour (e.g. 14:30)
                </button>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-3 pt-3 border-t border-[#212329]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#797f8d]">
              <Smartphone className="h-3.5 w-3.5 text-[#d1d5db]" />
              <span>Tactile Haptics</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-[#d1d5db]">Vibrate on tap (Mobile devices)</span>
              <input
                type="checkbox"
                checked={formData.hapticsEnabled}
                onChange={(e) => setFormData({ ...formData, hapticsEnabled: e.target.checked })}
                className="h-4 w-4 rounded accent-[#f4f5f7]"
              />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#212329]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#8d939e] hover:text-[#f4f5f7] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg bg-[#f4f5f7] px-4 py-2 text-xs font-semibold text-[#0e0f11] hover:bg-white transition"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
