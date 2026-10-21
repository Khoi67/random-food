import React, { useState } from 'react';
import { X, ShieldCheck, Lock, KeyRound, RefreshCw, LogOut } from 'lucide-react';
import { ADMIN_PIN_HASH_KEY } from '../utils/constants.js';
import { showToast } from '../utils/helpers.js';
import { 
  signInAdminGoogle, 
  signOutAdminGoogle, 
  getCurrentUser, 
  getAdminEmail, 
  isCurrentUserAdmin 
} from '../services/firebase.js';

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const currentUser = getCurrentUser();
  const configuredAdminEmail = getAdminEmail();
  const isGoogleAdmin = isCurrentUserAdmin();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const res = await signInAdminGoogle();
      if (res && res.isAdmin) {
        onAdminStatusChange(true);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

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

  const handleLogout = async () => {
    if (currentUser && !currentUser.isAnonymous) {
      await signOutAdminGoogle();
    }
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
              {isAdmin ? 'Đang hoạt động với quyền Admin 🔓' : 'Đăng nhập Google hoặc nhập PIN để mở khóa 🔒'}
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
          {/* Google Sign-in Section */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-bold text-xs flex items-center justify-center space-x-2.5 shadow-md transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{isGoogleLoading ? 'Đang kết nối Google...' : 'Đăng nhập bằng Google Admin'}</span>
            </button>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span>Email quản trị:</span>
                <span className="text-amber-300 font-mono font-semibold">{configuredAdminEmail || 'Chưa thiết lập trong .env'}</span>
              </div>
              {currentUser && !currentUser.isAnonymous && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span>Tài khoản hiện tại:</span>
                  <span className={`font-mono font-semibold ${isGoogleAdmin ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {currentUser.email} {isGoogleAdmin ? '👑' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <div className="h-px bg-slate-800 flex-1" />
            <span>HOẶC DÙNG MÃ PIN</span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

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
                Xác Nhận Mở Khóa Bằng PIN
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
              <div className="pt-3 border-t border-slate-800 space-y-1.5">
                <p className="text-[11px] text-slate-400">
                  Dành riêng cho Quản trị viên: Đặt lại toàn bộ danh sách 29 món mẫu gốc chuẩn Sài Gòn.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onRestoreDefaults();
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Khôi phục toàn bộ thực đơn gốc TP.HCM (29 món)</span>
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
