import React, { useState, useEffect } from 'react';
import { X, Cloud, Save, PowerOff } from 'lucide-react';
import { FIREBASE_CONFIG_KEY, CACHED_API_CONFIG_KEY, DEFAULT_FIREBASE_CONFIG } from '../utils/constants.js';
import { parseFirebaseConfig } from '../services/storage.js';
import { showToast } from '../utils/helpers.js';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [configText, setConfigText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (saved && saved !== 'DISABLED') {
      setConfigText(saved);
    } else if (!saved && DEFAULT_FIREBASE_CONFIG) {
      setConfigText(JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2));
    } else {
      setConfigText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const raw = configText.trim();
    if (!raw) {
      showToast('Vui lòng dán mã cấu hình Firebase!', 'warning');
      return;
    }

    try {
      const parsed = parseFirebaseConfig(raw);
      if (!parsed || !parsed.databaseURL) {
        showToast('Cấu hình thiếu trường databaseURL!', 'error');
        return;
      }

      localStorage.setItem(FIREBASE_CONFIG_KEY, raw);
      localStorage.removeItem(CACHED_API_CONFIG_KEY);
      showToast('Đang kết nối tới Firebase...', 'info');
      onConfigUpdated();
      onClose();
    } catch (e: any) {
      showToast('Lỗi định dạng cấu hình: ' + e.message, 'error');
    }
  };

  const handleDisconnect = () => {
    localStorage.setItem(FIREBASE_CONFIG_KEY, 'DISABLED');
    localStorage.removeItem(CACHED_API_CONFIG_KEY);
    showToast('Đã chuyển về chế độ LocalStorage trên máy (Ngoại tuyến)', 'info');
    onConfigUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-sky-400" />
              <span>Đồng Bộ Đám Mây (Firebase Realtime)</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Chia sẻ thực đơn dùng chung theo thời gian thực
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions & Textarea */}
        <div className="py-4 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            Dán đoạn mã cấu hình <code className="text-amber-300 font-mono">firebaseConfig</code> từ Firebase Console của bạn vào ô dưới đây:
          </p>

          <textarea
            rows={7}
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            placeholder='const firebaseConfig = { apiKey: "...", databaseURL: "...", ... };'
            className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-sky-500 focus:outline-none text-xs text-emerald-300 font-mono transition resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDisconnect}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <PowerOff className="w-3.5 h-3.5" />
            <span>Ngắt kết nối (Dùng Local)</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-brand-500 hover:from-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu & Kết Nối Ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
