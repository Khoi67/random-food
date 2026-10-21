import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, RefreshCw, LogOut } from 'lucide-react';
import { showToast } from '../utils/helpers.js';
import { 
  signInAdminGoogle, 
  signOutAdminGoogle, 
  getCurrentUser, 
  getAdminEmail, 
  setAdminEmail,
  isCurrentUserAdmin 
} from '../services/firebase.js';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onAdminStatusChange: (status: boolean) => void;
  onRestoreDefaults: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onAdminStatusChange,
  onRestoreDefaults,
}) => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [adminEmail, setAdminEmailState] = useState(() => getAdminEmail());

  useEffect(() => {
    if (!isOpen) return;
    const current = getAdminEmail();
    if (current) setAdminEmailState(current);

    fetch('/api/config')
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data && data.adminEmail) {
          setAdminEmail(data.adminEmail);
          setAdminEmailState(data.adminEmail);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUser = getCurrentUser();
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
              {isAdmin ? 'Đang hoạt động với quyền Admin 🔓' : 'Đăng nhập Google tài khoản Admin để mở khóa 🔒'}
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
            <div className="space-y-3">
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

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Email quản trị được cấp quyền:</span>
                  <span className="text-amber-300 font-mono font-semibold">{adminEmail || 'Đang tải...'}</span>
                </div>
                {currentUser && !currentUser.isAnonymous && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span>Tài khoản hiện tại:</span>
                    <span className={`font-mono font-semibold ${isGoogleAdmin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {currentUser.email} {isGoogleAdmin ? '👑 (Admin)' : '❌ (Chưa phải Admin)'}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 pt-1">
                  Chỉ tài khoản Google trùng khớp với Email quản trị trên mới có quyền xóa món ăn và khôi phục thực đơn.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>👑</span>
                  <span>Đã xác thực Quản Trị Viên thành công!</span>
                </div>
                <p className="text-[11px] text-emerald-400/80">
                  Tài khoản: <span className="font-mono font-semibold text-white">{currentUser?.email || adminEmail}</span>. Bạn có toàn quyền xóa món ăn và khôi phục thực đơn gốc.
                </p>
              </div>

              {/* Restore Defaults */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
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
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất tài khoản Quản trị viên</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
