import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { Dish } from '../types/index.js';
import { 
  signInAdminGoogle, 
  getCurrentUser 
} from '../services/firebase.js';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onAdminStatusChange: (status: boolean) => void;
  onRestoreDefaults?: () => void;
  pendingDishes?: Dish[];
  onApproveDish?: (dish: Dish) => void;
  onRejectDish?: (dish: Dish) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onAdminStatusChange,
}) => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isOpen) return null;

  // Nếu đã đăng nhập Admin, không còn hiện modal đăng nhập này nữa (đã chuyển sang Icon Thông Báo trên Header & Trang Quản Trị #/admin)
  if (isAdmin) {
    onClose();
    return null;
  }

  const currentUser = getCurrentUser();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const res = await signInAdminGoogle();
      if (res && res.isAdmin) {
        onAdminStatusChange(true);
        onClose(); // Tự động đóng modal đăng nhập ngay lập tức
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-800 dark:text-slate-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="truncate">Quản Trị Viên (Admin)</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Đăng nhập Google tài khoản Admin để mở khóa hệ thống 🔒
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:bg-white dark:hover:bg-slate-100 dark:border-transparent disabled:opacity-60 text-slate-900 font-bold text-xs flex items-center justify-center space-x-2.5 shadow-xs transition cursor-pointer"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{isGoogleLoading ? 'Đang kết nối Google...' : 'Đăng nhập bằng Google Admin'}</span>
            </button>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              {currentUser && !currentUser.isAnonymous ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">Trạng thái tài khoản:</span>
                  <span className={`font-semibold text-right truncate ${isAdmin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isAdmin ? 'Quản trị viên đã xác thực 👑' : 'Chưa được cấp quyền Admin ❌'}
                  </span>
                </div>
              ) : (
                <p className="text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>Xác thực an toàn qua Google Sign-In</span>
                </p>
              )}
              <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800/60 leading-relaxed">
                Chỉ tài khoản Google quản trị viên được phân quyền mới có thể xóa món, duyệt đề xuất, quản trị đánh giá hoặc khôi phục dữ liệu gốc tại Bảng điều khiển /#/admin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
