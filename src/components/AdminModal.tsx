import React, { useState } from 'react';
import { X, ShieldCheck, Lock, KeyRound, RefreshCw, LogOut } from 'lucide-react';
import { ADMIN_PIN_HASH_KEY } from '../utils/constants.js';
import { showToast } from '../utils/helpers.js';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onAdminStatusChange: (status: boolean) => void;
  onRestoreDefaults: () => void;
}

// Simple hash utility matching existing adminModal.js
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onAdminStatusChange,
  onRestoreDefaults,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput) return;

    const currentHash = localStorage.getItem(ADMIN_PIN_HASH_KEY);
    const inputHash = await hashPin(pinInput);

    // Default PIN: 123456 or match hash
    const defaultHash = await hashPin('123456');

    if (inputHash === currentHash || (!currentHash && inputHash === defaultHash)) {
      onAdminStatusChange(true);
      showToast('Đăng nhập Quản trị viên thành công! 🔓', 'success');
      setPinInput('');
    } else {
      showToast('Mã PIN không chính xác. Vui lòng thử lại!', 'error');
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput || newPinInput.length < 4) {
      showToast('Mã PIN mới phải có ít nhất 4 ký tự!', 'warning');
      return;
    }

    const hashed = await hashPin(newPinInput);
    localStorage.setItem(ADMIN_PIN_HASH_KEY, hashed);
    showToast('Đã đổi mã PIN thành công! 🔑', 'success');
    setNewPinInput('');
  };

  const handleLogout = () => {
    onAdminStatusChange(false);
    showToast('Đã đăng xuất quyền Quản trị viên.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Quản Trị Viên (Admin)</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {isAdmin ? 'Đang hoạt động với quyền Admin 🔓' : 'Nhập mã PIN để mở khóa quyền 🔒'}
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

        {/* Content */}
        <div className="py-4 space-y-4">
          {!isAdmin ? (
            /* PIN Login Form */
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nhập mã PIN Quản trị (Mặc định: 123456)</span>
                </label>
                <input
                  type="password"
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Nhập mã PIN..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none text-xs text-white placeholder-slate-500 text-center tracking-widest text-lg font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Xác Nhận Mở Khóa
              </button>
            </form>
          ) : (
            /* Admin Control Panel */
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                ✅ Bạn đang có toàn quyền quản trị: xóa món ăn, khôi phục thực đơn gốc và kiểm duyệt.
              </div>

              {/* Change PIN Form */}
              <form onSubmit={handleChangePin} className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Đổi mã PIN mới</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="Mã PIN mới..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition cursor-pointer"
                  >
                    Đổi PIN
                  </button>
                </div>
              </form>

              {/* Restore Defaults */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    onRestoreDefaults();
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Khôi phục toàn bộ thực đơn gốc TP.HCM</span>
                </button>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Thoát chế độ Quản trị viên</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
