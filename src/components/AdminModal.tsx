import React, { useState } from 'react';
import { X, ShieldCheck, RefreshCw, LogOut, Check, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { Dish } from '../types/index.js';
import { showToast } from '../utils/helpers.js';
import { 
  signInAdminGoogle, 
  signOutAdminGoogle, 
  getCurrentUser 
} from '../services/firebase.js';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onAdminStatusChange: (status: boolean) => void;
  onRestoreDefaults: () => void;
  pendingDishes?: Dish[];
  onApproveDish?: (dish: Dish) => void;
  onRejectDish?: (dish: Dish) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onAdminStatusChange,
  onRestoreDefaults,
  pendingDishes = [],
  onApproveDish,
  onRejectDish,
}) => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'settings'>('pending');

  if (!isOpen) return null;

  // Nếu đã đăng nhập Admin, không còn hiện modal duyệt món cũ này nữa (đã chuyển sang Icon Thông Báo trên Header & Trang Quản Trị #/admin)
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

  const handleLogout = async () => {
    if (currentUser && !currentUser.isAnonymous) {
      await signOutAdminGoogle();
    }
    onAdminStatusChange(false);
    showToast('Đã đăng xuất quyền Quản trị viên.', 'info');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-800 dark:text-slate-100 transition-colors"
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
              {isAdmin ? 'Đang hoạt động với quyền Admin 🔓' : 'Đăng nhập Google tài khoản Admin để mở khóa 🔒'}
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

        {/* Admin Navigation Tabs */}
        {isAdmin && (
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800/80 px-4 pt-2 bg-slate-50 dark:bg-slate-950/40 flex-shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-3 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
                activeTab === 'pending'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-slate-100 dark:bg-slate-800/60'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Duyệt món chờ</span>
              {pendingDishes.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] font-extrabold animate-pulse">
                  {pendingDishes.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-3 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
                activeTab === 'settings'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-300 bg-slate-100 dark:bg-slate-800/60'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>⚙️ Cài đặt & Dữ liệu</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {!isAdmin ? (
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
                  Chỉ tài khoản Google quản trị viên được phân quyền mới có thể xóa món, duyệt đề xuất hoặc khôi phục dữ liệu gốc.
                </p>
              </div>
            </div>
          ) : activeTab === 'pending' ? (
            /* TAB 1: DUYỆT MÓN CHỜ */
            <div className="space-y-3">
              {pendingDishes.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
                  <p className="font-bold text-slate-200 text-sm">Không có món nào đang chờ duyệt! 🎉</p>
                  <p className="text-xs text-slate-500">Tất cả đề xuất món ăn từ người dùng đều đã được xử lý.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Danh sách món người dùng đóng góp cần phê duyệt:</span>
                    <span className="font-bold text-amber-300">{pendingDishes.length} món</span>
                  </p>

                  {pendingDishes.map((dish) => {
                    const locationsList = Array.isArray(dish.locations) ? dish.locations : [];
                    const locPreview = locationsList
                      .map((l: any) => (typeof l === 'string' ? l : l?.name || l?.address || ''))
                      .filter(Boolean)
                      .join(', ') || 'TP. Hồ Chí Minh';

                    const mealLabels: Record<string, string> = {
                      sang: 'Sáng',
                      trua: 'Trưa',
                      toi: 'Chiều / Tối',
                    };
                    const meals = Array.isArray(dish.mealTypes)
                      ? dish.mealTypes.map((m) => mealLabels[m] || m).join(', ')
                      : 'Cả ngày';

                    return (
                      <div
                        key={dish.id}
                        className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2.5 shadow-md hover:border-amber-500/50 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-extrabold text-white text-sm sm:text-base leading-snug">
                                {dish.name}
                              </h4>
                              {dish.shortName && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-300 border border-brand-500/20 font-medium">
                                  🏷️ {dish.shortName}
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                ⏳ Chờ duyệt
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Bữa ăn: <span className="text-slate-200 font-semibold">{meals}</span> • Kiểu:{' '}
                              <span className="text-slate-200 font-semibold">
                                {dish.type === 'nuoc' ? 'Món nước' : 'Món khô'}
                              </span>{' '}
                              {dish.vegetarian ? '• 🌱 Chay' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Location Preview */}
                        <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                          <span className="text-slate-300 font-medium">Quán gợi ý: </span>
                          <span>{locPreview}</span>
                        </div>

                        {/* Action Buttons: Approve & Reject */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onApproveDish && onApproveDish(dish)}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Duyệt & Đưa lên vòng quay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectDish && onRejectDish(dish)}
                            className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                            title="Từ chối hoặc xóa đề xuất này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Từ chối</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: CÀI ĐẶT & DỮ LIỆU */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>👑</span>
                  <span>Đã xác thực Quản Trị Viên thành công!</span>
                </div>
                <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                  Tài khoản: <span className="font-mono font-semibold text-white break-all">{currentUser?.email}</span>. Bạn có toàn quyền duyệt món, xóa món và khôi phục thực đơn gốc.
                </p>
              </div>

              {/* Restore Defaults */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <p className="text-[11px] text-slate-400 leading-relaxed">
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
                  <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Khôi phục toàn bộ thực đơn gốc TP.HCM (29 món)</span>
                </button>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Đăng xuất tài khoản Quản trị viên</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
