import React, { useState } from 'react';
import { Download, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'header';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  if (variant === 'compact') {
    return (
      <>
        <button
          id="btn-pwa-install-compact"
          onClick={handleClick}
          title="Install Haven App"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold border border-rose-500/20 transition-all cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
        <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  if (variant === 'full') {
    return (
      <>
        <button
          id="btn-pwa-install-full"
          onClick={handleClick}
          className={`w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/15 via-purple-500/10 to-pink-500/15 hover:from-rose-500/25 hover:to-pink-500/25 border border-rose-500/20 text-left transition-all cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-1">
                Install Phone App & APK
                <Sparkles className="w-3 h-3 text-rose-500 inline" />
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                1-Tap Android/iOS install or download standalone APK
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg">
            Install / APK
          </span>
        </button>
        <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  // Header variant
  return (
    <>
      <button
        id="btn-pwa-install-header"
        onClick={handleClick}
        title="Install Phone App (1-Tap) or Download Android APK"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/15 to-purple-500/15 hover:from-rose-500/25 hover:to-purple-500/25 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>
      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
