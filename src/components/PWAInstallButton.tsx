import React, { useState, useEffect } from 'react';
import { Download, Share2, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if running standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (isInstalled) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 rounded-lg border border-[#2b2e36] bg-[#16181c] px-3 py-1.5 text-xs font-medium text-[#f4f5f7] hover:border-[#3a3e4a] hover:bg-[#1e2026] transition"
      >
        <Download className="h-3.5 w-3.5 text-[#d1d5db]" />
        <span>Install App</span>
      </button>

      {/* iOS Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#26282f] bg-[#141518] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#212329]">
              <h3 className="text-sm font-semibold text-[#f4f5f7]">Install on iPhone / iPad</h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-[#8d939e] hover:text-[#f4f5f7]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-[#a0a6b4] leading-relaxed">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#202228] font-mono text-[10px] text-white">1</span>
                <span>Tap the <strong className="text-white">Share</strong> button <Share2 className="inline h-3.5 w-3.5 mx-1" /> at the bottom of Safari.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#202228] font-mono text-[10px] text-white">2</span>
                <span>Scroll down and select <strong className="text-white">Add to Home Screen</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#202228] font-mono text-[10px] text-white">3</span>
                <span>Open DoseLog from your home screen for instantaneous, 1-tap tracking!</span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-lg bg-[#292c34] py-2 text-xs font-medium text-white hover:bg-[#383d48]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
