import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, MoreVertical, History, Cloud, ShieldCheck, RefreshCw, Clock } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled } from '../utils/audio.js';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenCloud: () => void;
  onOpenAdmin: () => void;
  onRestoreDefaults: () => void;
  historyCount: number;
  cloudStatus: 'connected' | 'connecting' | 'offline';
  isAdmin: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenCloud,
  onOpenAdmin,
  onRestoreDefaults,
  historyCount,
  cloudStatus,
  isAdmin,
}) => {
  const [sound, setSound] = useState(isSoundEnabled());
  const [menuOpen, setMenuOpen] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-500 via-orange-500 to-amber-400 p-0.5 shadow-md shadow-brand-500/20 flex-shrink-0 flex items-center justify-center">
            <span className="text-2xl" role="img" aria-label="Noodle bowl">🍜</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Hôm Nay Ăn Gì?
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 hidden sm:inline-block">
                  TP.HCM
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden xs:block truncate max-w-[200px] sm:max-w-none">
              Vòng quay ẩm thực Sài Gòn • Quán ngon gần bạn
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          
          {/* Live Clock (Desktop only) */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-slate-200">{timeStr}</span>
          </div>

          {/* Cloud Sync Status Badge */}
          <button
            onClick={onOpenCloud}
            title="Trạng thái đồng bộ đám mây"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cloudStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : cloudStatus === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-500'
              }`}
            />
            <span className="hidden sm:inline text-[11px] font-medium">
              {cloudStatus === 'connected' ? 'Cloud Sync' : cloudStatus === 'connecting' ? 'Đang kết nối' : 'Ngoại tuyến'}
            </span>
          </button>

          {/* Sound Toggle Button */}
          <button
            onClick={handleToggleSound}
            aria-label={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
            title={sound ? 'Âm thanh: ĐANG BẬT' : 'Âm thanh: ĐANG TẮT'}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
          >
            {sound ? <Volume2 className="w-4 h-4 text-brand-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Dropdown Menu "⋯" */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu chức năng mở rộng"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
            >
              <MoreVertical className="w-4 h-4" />
              {historyCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-md">
                  {historyCount}
                </span>
              )}
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenHistory();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <History className="w-4 h-4 text-amber-400" />
                      Lịch sử 14 ngày & Tránh lặp
                    </span>
                    {historyCount > 0 && (
                      <span className="text-[10px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded-md font-bold">
                        {historyCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenCloud();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Cloud className="w-4 h-4 text-sky-400" />
                    Đồng bộ Cloud (Firebase)
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAdmin();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Quản trị viên
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isAdmin ? 'Đã mở 🔓' : 'Khách 🔒'}
                    </span>
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRestoreDefaults();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Khôi phục mẫu gốc TP.HCM
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
