import React, { useState, useEffect } from 'react';
import { Dish, ReportItem, AdminAuditLogItem, LocationSuggestion } from '../../types/index.js';
import { 
  approveDishCloud, 
  deleteDishCloud, 
  updateDishCloud, 
  deleteReviewCloud, 
  resolveReportCloud, 
  saveDishesCloud,
  subscribeReportsCloud,
  subscribeAdminAuditLogsCloud,
  subscribePendingLocationsCloud,
  approveLocationSuggestionCloud,
  rejectLocationSuggestionCloud,
  subscribeConfigCloud,
  setWritesEnabledCloud,
  logAdminActionCloud,
  cleanupExpiredAuditLogsCloud,
  AUDIT_LOG_TTL_MS,
  isCurrentUserAdmin
} from '../../services/firebase.js';
import { saveDishesLocally, normalizeDish } from '../../services/storage.js';
import { showToast } from '../../utils/helpers.js';

import { AdminOverview } from './AdminOverview.js';
import { AdminQueue } from './AdminQueue.js';
import { AdminDishes } from './AdminDishes.js';
import { AdminReviews } from './AdminReviews.js';
import { AdminBackup } from './AdminBackup.js';
import { AdminAuditLogs } from './AdminAuditLogs.js';

import { 
  ShieldCheck, 
  ArrowLeft, 
  LayoutDashboard, 
  Clock, 
  UtensilsCrossed, 
  MessageSquare, 
  HardDriveDownload, 
  History,
  Lock,
  Sun,
  Moon
} from 'lucide-react';

interface AdminDashboardProps {
  dishes: Dish[];
  pendingDishes: Dish[];
  setDishes: React.Dispatch<React.SetStateAction<Dish[]>>;
  onClose: () => void;
  isAdmin: boolean;
  isAuthLoading?: boolean;
}

/**
 * LƯU Ý BẢO MẬT & KIẾN TRÚC:
 * 1. Auth Guard này và việc ẩn/hiện trang Admin chỉ phục vụ trải nghiệm UI/UX phía Client để tránh nháy giao diện.
 * 2. Toàn bộ tính hợp lệ và quyền bảo vệ dữ liệu thực tế do Firebase Realtime Database Rules quyết định nghiêm ngặt.
 * 3. Mọi thao tác ghi dữ liệu tuân thủ AGENTS.md: Local-first, normalizeDish, ghi theo node con lẻ, không ghi đè node gốc shared_dishes.
 */
export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  dishes,
  pendingDishes,
  setDishes,
  onClose,
  isAdmin,
  isAuthLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'dishes' | 'reviews' | 'backup' | 'logs'>('overview');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [pendingLocations, setPendingLocations] = useState<LocationSuggestion[]>([]);
  const [writesEnabled, setWritesEnabled] = useState<boolean>(true);
  const [isTogglingKillSwitch, setIsTogglingKillSwitch] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>(() => {
    try {
      const raw: AdminAuditLogItem[] = JSON.parse(localStorage.getItem('admin_audit_logs') || '[]');
      const now = Date.now();
      const valid = raw.filter((l) => l && typeof l.timestamp === 'number' && (now - l.timestamp) <= AUDIT_LOG_TTL_MS);
      if (valid.length !== raw.length) {
        localStorage.setItem('admin_audit_logs', JSON.stringify(valid));
      }
      return valid;
    } catch (_) {
      return [];
    }
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const handleToggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('food_wheel_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('food_wheel_theme', 'light');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', next ? '#020617' : '#f8fafc');
    }
  };

  // 1. Quản lý thẻ meta robots noindex cho trang Admin
  useEffect(() => {
    let metaTag = document.querySelector('meta[name="robots"]');
    const originalContent = metaTag ? metaTag.getAttribute('content') : null;

    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'robots');
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute('content', 'noindex, nofollow');

    return () => {
      if (originalContent) {
        metaTag?.setAttribute('content', originalContent);
      } else {
        metaTag?.remove();
      }
    };
  }, []);

  // 2. Lắng nghe Reports, Audit Logs & Cấu hình Kill Switch thời gian thực
  useEffect(() => {
    if (!isAdmin) return;

    // Tự động dọn dẹp các bản ghi nhật ký quá hạn 3 ngày trên Cloud
    cleanupExpiredAuditLogsCloud().catch(() => {});

    const unsubReports = subscribeReportsCloud((cloudReports: ReportItem[]) => {
      setReports(cloudReports);
    });

    const unsubLocations = subscribePendingLocationsCloud((cloudLocs: LocationSuggestion[]) => {
      setPendingLocations(cloudLocs);
    });

    const unsubLogs = subscribeAdminAuditLogsCloud((cloudLogs: AdminAuditLogItem[]) => {
      if (Array.isArray(cloudLogs) && cloudLogs.length > 0) {
        setAuditLogs(cloudLogs);
        try {
          localStorage.setItem('admin_audit_logs', JSON.stringify(cloudLogs.slice(0, 100)));
        } catch (_) {}
      }
    });

    const unsubConfig = subscribeConfigCloud((cfg: { writesEnabled?: boolean }) => {
      setWritesEnabled(cfg?.writesEnabled !== false);
    });

    return () => {
      if (typeof unsubReports === 'function') unsubReports();
      if (typeof unsubLocations === 'function') unsubLocations();
      if (typeof unsubLogs === 'function') unsubLogs();
      if (typeof unsubConfig === 'function') unsubConfig();
    };
  }, [isAdmin]);

  // Auth Guard: Màn hình chờ trong lúc kiểm tra quyền Admin (tránh nháy nội dung)
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center animate-spin mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">Đang Xác Thực Quyền Quản Trị Viên...</h2>
        <p className="text-xs text-slate-400 mt-1">Vui lòng đợi trong giây lát.</p>
      </div>
    );
  }

  // Auth Guard: Nếu không phải Admin, từ chối truy cập và cung cấp nút quay về
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-white">Khu Vực Dành Riêng Cho Quản Trị Viên</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-sm text-center">
          Bạn cần đăng nhập tài khoản Google có quyền quản trị để truy cập trang này. Mọi truy cập trái phép đều bị Firebase chặn ở tầng database.
        </p>
        <button
          onClick={onClose}
          className="mt-6 px-6 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay Về Trang Chủ</span>
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // CÁC HÀNH ĐỘNG QUẢN TRỊ VIÊN (TUÂN THỦ AGENTS.MD)
  // ----------------------------------------------------

  // Helper ghi nhận nhật ký và cập nhật UI ngay lập tức
  const recordAdminAction = async (action: string, target: string, details: string) => {
    const logItem = await logAdminActionCloud({ action, target, details });
    if (logItem) {
      setAuditLogs((prev) => [logItem, ...prev.filter((l) => l.id !== logItem.id)]);
    }
  };

  // 1. Phê duyệt món
  const handleApproveDish = async (dish: Dish) => {
    const success = await approveDishCloud(dish);
    if (success) {
      const normalized = normalizeDish({ ...dish, status: 'approved' }) as Dish;
      setDishes((prev) => {
        const filtered = prev.filter((d) => d.id !== dish.id);
        const updated = [normalized, ...filtered];
        saveDishesLocally(updated);
        return updated;
      });
      await recordAdminAction(
        'APPROVE_DISH',
        dish.name,
        `Đã phê duyệt món "${dish.name}" vào thực đơn phục vụ.`
      );
      showToast(`Đã duyệt món "${dish.name}" thành công! 🎉`, 'success');
    }
  };

  // 2. Từ chối / Xóa món chờ duyệt
  const handleRejectDish = async (dishId: string, dishName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn từ chối và xóa món "${dishName}" khỏi hàng đợi?`)) {
      return;
    }
    const success = await deleteDishCloud(dishId);
    if (success) {
      setDishes((prev) => {
        const updated = prev.filter((d) => d.id !== dishId);
        saveDishesLocally(updated);
        return updated;
      });
      await recordAdminAction(
        'REJECT_DISH',
        dishName,
        `Đã từ chối món "${dishName}" khỏi hàng đợi chờ duyệt.`
      );
      showToast(`Đã từ chối món "${dishName}"`, 'info');
    }
  };

  // 3. Cập nhật món lẻ
  const handleUpdateDish = async (updatedDish: Dish) => {
    const success = await updateDishCloud(updatedDish);
    if (success) {
      const normalized = normalizeDish(updatedDish) as Dish;
      setDishes((prev) => {
        const updated = prev.map((d) => (d.id === normalized.id ? normalized : d));
        saveDishesLocally(updated);
        return updated;
      });
      await recordAdminAction(
        'UPDATE_DISH',
        updatedDish.name,
        `Cập nhật thông tin món "${updatedDish.name}".`
      );
      showToast(`Đã lưu thay đổi món "${updatedDish.name}"!`, 'success');
    }
  };

  // 4. Xóa món lẻ đang phục vụ
  const handleDeleteDish = async (dishId: string, dishName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa món "${dishName}" khỏi hệ thống?`)) {
      return;
    }
    const success = await deleteDishCloud(dishId);
    if (success) {
      setDishes((prev) => {
        const updated = prev.filter((d) => d.id !== dishId);
        saveDishesLocally(updated);
        return updated;
      });
      await recordAdminAction(
        'DELETE_DISH',
        dishName,
        `Đã xóa món "${dishName}" khỏi hệ thống.`
      );
      showToast(`Đã xóa món "${dishName}" thành công!`, 'success');
    }
  };

  // 5. Xóa review spam
  const handleDeleteReview = async (dishId: string, locationIndex: number | null, reviewId: string) => {
    const success = await deleteReviewCloud(dishId, locationIndex, reviewId);
    if (success) {
      setDishes((prev) => {
        const updated = prev.map((d) => {
          if (d.id !== dishId) return d;
          if (locationIndex != null && d.locations && d.locations[locationIndex]) {
            const copyLocs = [...d.locations];
            copyLocs[locationIndex] = {
              ...copyLocs[locationIndex],
              reviews: (copyLocs[locationIndex].reviews || []).filter((r) => r.id !== reviewId)
            };
            return { ...d, locations: copyLocs };
          } else {
            return {
              ...d,
              reviews: (d.reviews || []).filter((r) => r.id !== reviewId)
            };
          }
        });
        saveDishesLocally(updated);
        return updated;
      });
      await recordAdminAction(
        'DELETE_REVIEW',
        dishId,
        `Đã xóa đánh giá spam (ID: ${reviewId}).`
      );
      showToast('Đã xóa đánh giá spam thành công!', 'success');
    }
  };

  // 6. Xử lý báo cáo
  const handleResolveReport = async (reportId: string) => {
    await resolveReportCloud(reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    await recordAdminAction(
      'RESOLVE_REPORT',
      reportId,
      `Đã giải quyết và xóa báo cáo vi phạm #${reportId}.`
    );
    showToast('Đã đánh dấu xử lý xong báo cáo!', 'info');
  };

  // 6b. Duyệt đề xuất quán ăn mới vào món
  const handleApproveLocation = async (suggestion: LocationSuggestion) => {
    const targetDish = dishes.find((d) => d.id === suggestion.dishId);
    const existingLocations = targetDish?.locations || [];
    const success = await approveLocationSuggestionCloud(suggestion, existingLocations);
    if (success) {
      const newLoc = {
        id: `loc_${suggestion.dishId}_${Date.now()}`,
        name: suggestion.name,
        address: suggestion.address,
        directionUrl: suggestion.directionUrl || ''
      };
      setDishes((prev) => {
        const updated = prev.map((d) => {
          if (d.id !== suggestion.dishId) return d;
          const currentLocs = Array.isArray(d.locations) ? d.locations : [];
          return {
            ...d,
            locations: [...currentLocs, newLoc]
          };
        });
        saveDishesLocally(updated);
        return updated;
      });
      setPendingLocations((prev) => prev.filter((l) => l.id !== suggestion.id));
      await recordAdminAction(
        'APPROVE_LOCATION',
        suggestion.dishName,
        `Duyệt quán "${suggestion.name}" (${suggestion.address}) vào món "${suggestion.dishName}"`
      );
      showToast(`Đã duyệt quán "${suggestion.name}" vào món "${suggestion.dishName}"! 🎉`, 'success');
    }
  };

  // 6c. Từ chối đề xuất quán ăn
  const handleRejectLocation = async (suggestionId: string, dishName: string, locName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn từ chối đề xuất quán "${locName}"?`)) {
      return;
    }
    const success = await rejectLocationSuggestionCloud(suggestionId, dishName, locName);
    if (success) {
      setPendingLocations((prev) => prev.filter((l) => l.id !== suggestionId));
      await recordAdminAction(
        'REJECT_LOCATION',
        dishName,
        `Từ chối quán "${locName}" đề xuất cho món "${dishName}"`
      );
      showToast(`Đã từ chối quán "${locName}"`, 'info');
    }
  };

  // 7. Khôi phục thực đơn gốc
  const handleRestoreDefaultMenu = async (defaultDishes: Dish[]) => {
    try {
      const normalized = defaultDishes.map(normalizeDish) as Dish[];
      await saveDishesCloud(normalized);
      setDishes(normalized);
      saveDishesLocally(normalized);

      await recordAdminAction(
        'RESTORE_DEFAULT_MENU',
        'shared_dishes',
        `Khôi phục thực đơn dùng chung về ${defaultDishes.length} món mẫu ban đầu.`
      );
      showToast('Đã khôi phục thực đơn chuẩn 30 món Sài Gòn thành công! 🍜', 'success');
    } catch (err) {
      console.error('Lỗi khôi phục thực đơn:', err);
      showToast('Lỗi khi khôi phục thực đơn lên Cloud: ' + (err as Error).message, 'error');
    }
  };

  // 8. Bật/Tắt Kill Switch (Cờ ngắt ghi hệ thống)
  const handleToggleKillSwitch = async () => {
    if (isTogglingKillSwitch) return;
    const targetState = !writesEnabled;
    const confirmMsg = targetState
      ? 'Bạn có chắc chắn muốn MỞ LẠI quyền ghi dữ liệu cho người dùng toàn hệ thống?'
      : '⚠️ CẢNH BÁO KHẨN CẤP:\nBạn có chắc chắn muốn KÍCH HOẠT KILL SWITCH?\nToàn bộ khách và người dùng thường sẽ bị KHÓA quyền gửi món, đánh giá và báo cáo vi phạm ngay lập tức!';
    if (!window.confirm(confirmMsg)) return;

    setIsTogglingKillSwitch(true);
    try {
      const ok = await setWritesEnabledCloud(targetState);
      if (ok) {
        try {
          const fresh = JSON.parse(localStorage.getItem('admin_audit_logs') || '[]');
          setAuditLogs(fresh);
        } catch (_) {}
      }
    } finally {
      setIsTogglingKillSwitch(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs dark:shadow-lg transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Quay lại ứng dụng chính"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Quay Lại</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className="text-xl" role="img" aria-label="Shield">🛡️</span>
              <div>
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  Bảng Điều Khiển Quản Trị
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    Admin 👑
                  </span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              title={isDark ? 'Giao diện: ĐANG TỐI (Bấm để chuyển sang Sáng)' : 'Giao diện: ĐANG SÁNG (Bấm để chuyển sang Tối)'}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
            >
              {isDark ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            <button
              onClick={handleToggleKillSwitch}
              disabled={isTogglingKillSwitch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs ${
                writesEnabled
                  ? 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-500/50 hover:text-rose-600 dark:hover:text-rose-300'
                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/50 animate-pulse'
              } disabled:opacity-50`}
              title={writesEnabled ? 'Nhấn để ngắt quyền ghi toàn hệ thống (Kill Switch)' : 'Nhấn để mở lại quyền ghi toàn hệ thống'}
            >
              <span className={`w-2 h-2 rounded-full ${writesEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="hidden xs:inline">{writesEnabled ? 'Kill Switch: TẮT' : 'Kill Switch: BẬT'}</span>
            </button>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden md:block">
              Phiên bản: <strong className="text-slate-800 dark:text-white">v1.2 Admin</strong>
            </div>
          </div>
        </div>

        {/* Banner Cảnh Báo Khi Kill Switch Đang Bật */}
        {!writesEnabled && (
          <div className="bg-rose-500/15 border-t border-b border-rose-500/30 px-4 py-2.5 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-between">
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="text-base">🚨</span>
                <span><strong>CHẾ ĐỘ BẢO TRÌ ĐANG BẬT:</strong> Quyền ghi của khách và người dùng thường đang bị ngắt hoàn toàn. Admin vẫn có toàn quyền thao tác.</span>
              </span>
              <button
                onClick={handleToggleKillSwitch}
                className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-[11px] transition whitespace-nowrap cursor-pointer"
              >
                Mở lại quyền ghi
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-2 py-2 border-t border-slate-200/80 dark:border-slate-900 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Tổng Quan</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hàng Đợi Duyệt</span>
            {(pendingDishes.length > 0 || reports.length > 0 || pendingLocations.length > 0) && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 text-amber-400 font-extrabold">
                {pendingDishes.length + reports.length + pendingLocations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dishes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'dishes'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Quản Lý Thực Đơn</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Kiểm Duyệt Review</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900'
            }`}
          >
            <HardDriveDownload className="w-3.5 h-3.5" />
            <span>Sao Lưu & Gốc</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Nhật Ký Thao Tác</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'overview' && (
          <AdminOverview
            dishes={dishes}
            pendingDishes={pendingDishes}
            pendingLocations={pendingLocations}
            reports={reports}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'queue' && (
          <AdminQueue
            pendingDishes={pendingDishes}
            reports={reports}
            pendingLocations={pendingLocations}
            onApproveDish={handleApproveDish}
            onRejectDish={handleRejectDish}
            onApproveLocation={handleApproveLocation}
            onRejectLocation={handleRejectLocation}
            onResolveReport={handleResolveReport}
            onDeleteReportedDish={(id) => handleDeleteDish(id, 'Món bị báo cáo')}
          />
        )}

        {activeTab === 'dishes' && (
          <AdminDishes
            dishes={dishes}
            onUpdateDish={handleUpdateDish}
            onDeleteDish={handleDeleteDish}
          />
        )}

        {activeTab === 'reviews' && (
          <AdminReviews
            dishes={dishes}
            onDeleteReview={handleDeleteReview}
          />
        )}

        {activeTab === 'backup' && (
          <AdminBackup
            dishes={dishes}
            onRestoreDefaultMenu={handleRestoreDefaultMenu}
          />
        )}

        {activeTab === 'logs' && (
          <AdminAuditLogs logs={auditLogs} />
        )}
      </main>
    </div>
  );
};
