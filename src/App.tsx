import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dish, MealType, FilterState, ReviewItem, ReportItem, LocationSuggestion } from './types/index.js';
import { DEFAULT_DISHES_HCM } from './data/defaultDishes.js';
import {
  loadDishesFromLocal,
  saveDishesLocally,
  normalizeDish,
} from './services/storage.js';
import {
  initFirebase,
  saveDishesCloud,
  addDishCloud,
  deleteDishCloud,
  updateDishStatusCloud,
  approveDishCloud,
  subscribePendingDishesCloud,
  subscribeReportsCloud,
  subscribePendingLocationsCloud,
  subscribeConfigCloud,
  getCurrentUser,
  isCurrentUserAdmin,
  addReviewCloud,
  signOutAdminGoogle,
} from './services/firebase.js';
import {
  getSpinHistory,
  recordSpinHistory,
  getAvoidDays,
  getRecentlyEatenDishIds,
  isFavoriteDish,
  toggleFavoriteDish,
} from './services/history.js';
import { filterDishes } from './utils/filterLogic.js';
import { detectMealByCurrentTime, showToast } from './utils/helpers.js';
import { initAnalytics, trackSpin, trackFilterUsed } from './services/analytics.js';
import { initPwa } from './services/pwa.js';

// React Components
import { Header } from './components/Header';
import { MealTabs } from './components/MealTabs';
import { QuickFilters } from './components/QuickFilters';
import { WheelCanvas } from './components/WheelCanvas';
import { DishList } from './components/DishList';
import { ResultModal } from './components/ResultModal';
import { AddDishModal } from './components/AddDishModal';
import { HistoryModal } from './components/HistoryModal';
import { ReviewModal } from './components/ReviewModal';
import { AdminModal } from './components/AdminModal';
import { SuggestLocationModal } from './components/SuggestLocationModal';

// Tối ưu hóa hiệu năng: Tải lười (Lazy-load) Bảng Điều Khiển Quản Trị để giảm kích thước bundle của người dùng thường
const AdminDashboard = React.lazy(() =>
  import('./components/admin/AdminDashboard.js').then((m) => ({ default: m.AdminDashboard }))
);

export const App: React.FC = () => {
  // Hash routing (#/admin)
  const [currentHash, setCurrentHash] = useState<string>(() => (typeof window !== 'undefined' ? window.location.hash : ''));
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Dishes state
  const [dishes, setDishes] = useState<Dish[]>(() => loadDishesFromLocal());

  // Meal state
  const [currentMeal, setCurrentMeal] = useState<MealType>(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('meal');
    if (m === 'sang' || m === 'trua' || m === 'toi') return m;
    const detected = detectMealByCurrentTime();
    return (detected === 'sang' || detected === 'trua' || detected === 'toi') ? detected : 'toi';
  });

  // Excluded & Favorites State
  const [excludedDishIds, setExcludedDishIds] = useState<Set<string>>(new Set());
  const [favRefreshKey, setFavRefreshKey] = useState(0);

  // Filters State
  const [currentFilters, setCurrentFilters] = useState<FilterState>({
    price: 'all',
    dishType: 'all',
    vegOnly: false,
  });

  // Modals state
  const [winnerDish, setWinnerDish] = useState<Dish | null>(null);
  const [selectedDishDetail, setSelectedDishDetail] = useState<Dish | null>(null);
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [reviewDish, setReviewDish] = useState<Dish | null>(null);
  const [reviewLocationIndex, setReviewLocationIndex] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [suggestLocationDish, setSuggestLocationDish] = useState<Dish | null>(null);
  const [isSuggestLocationOpen, setIsSuggestLocationOpen] = useState(false);

  // Status state
  const [isAdmin, setIsAdmin] = useState(false);
  const [reportsCount, setReportsCount] = useState(0);
  const [pendingLocationsCount, setPendingLocationsCount] = useState(0);
  const [writesEnabled, setWritesEnabled] = useState<boolean>(true);
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'connecting' | 'offline'>('offline');
  const [historyCount, setHistoryCount] = useState<number>(() => getSpinHistory().length);

  // Lắng nghe cờ ngắt ghi hệ thống (Kill Switch) thời gian thực
  useEffect(() => {
    const unsub = subscribeConfigCloud((cfg: { writesEnabled?: boolean }) => {
      setWritesEnabled(cfg?.writesEnabled !== false);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Lắng nghe số lượng báo cáo vi phạm & quán đề xuất thời gian thực khi có quyền Admin
  useEffect(() => {
    if (isAdmin) {
      const unsubReports = subscribeReportsCloud((cloudReports: ReportItem[]) => {
        setReportsCount(Array.isArray(cloudReports) ? cloudReports.length : 0);
      });
      const unsubLocations = subscribePendingLocationsCloud((cloudLocs: LocationSuggestion[]) => {
        setPendingLocationsCount(Array.isArray(cloudLocs) ? cloudLocs.length : 0);
      });
      return () => {
        if (typeof unsubReports === 'function') unsubReports();
        if (typeof unsubLocations === 'function') unsubLocations();
      };
    } else {
      setReportsCount(0);
      setPendingLocationsCount(0);
    }
  }, [isAdmin]);

  // Initialize Services (Analytics, PWA, Firebase)
  useEffect(() => {
    initAnalytics();
    initPwa();

    // Init Firebase Cloud Sync - Mặc định tự động kết nối Firebase Realtime Database
    initFirebase({
      onDishesSync: (cloudDishes: Dish[]) => {
        if (Array.isArray(cloudDishes) && cloudDishes.length > 0) {
          const normalized = cloudDishes.map(normalizeDish) as Dish[];
          setDishes(normalized);
          saveDishesLocally(normalized);
        }
      },
      onDataChange: (cloudDishes: Dish[]) => {
        if (Array.isArray(cloudDishes) && cloudDishes.length > 0) {
          const normalized = cloudDishes.map(normalizeDish) as Dish[];
          setDishes(normalized);
          saveDishesLocally(normalized);
        }
      },
      setDishes: (cloudDishes: Dish[]) => {
        if (Array.isArray(cloudDishes) && cloudDishes.length > 0) {
          const normalized = cloudDishes.map(normalizeDish) as Dish[];
          setDishes(normalized);
          saveDishesLocally(normalized);
        }
      },
      getDishes: () => dishes,
      onStatusChange: (status: 'connected' | 'connecting' | 'local' | 'offline') => {
        setCloudStatus(status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting' : 'offline');
        // Chỉ khi lỗi kết nối (offline hoặc local) thì mới tự apply localStorage
        if (status === 'local' || status === 'offline') {
          const localDishes = loadDishesFromLocal();
          if (localDishes && localDishes.length > 0) {
            setDishes(localDishes);
          }
        }
      },
      onAuthChange: ({ isAdmin: adminFlag }: { isAdmin: boolean }) => {
        setIsAdmin(adminFlag);
        setIsAuthLoading(false);
      },
    });

    // Deep link ?m=<dishId>
    const params = new URLSearchParams(window.location.search);
    const deepDishId = params.get('m');
    if (deepDishId) {
      const found = loadDishesFromLocal().find((d) => d.id === deepDishId);
      if (found) {
        setWinnerDish(found);
      }
    }
  }, []);

  // Lắng nghe thay đổi hash URL (#/admin)
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Lắng nghe danh sách món chờ duyệt từ Cloud cho Quản trị viên
  useEffect(() => {
    let unsubPending: (() => void) | undefined;
    if (isAdmin) {
      unsubPending = subscribePendingDishesCloud((cloudPending: Dish[]) => {
        if (Array.isArray(cloudPending)) {
          const norm = cloudPending.map(normalizeDish) as Dish[];
          setDishes((prev) => {
            const dishMap = new Map<string, Dish>();
            // Giữ lại toàn bộ món hiện có (bao gồm các món pending vừa thêm cục bộ)
            for (const d of prev) {
              dishMap.set(d.id, d);
            }
            // Gộp và cập nhật các món pending từ Cloud
            for (const d of norm) {
              dishMap.set(d.id, d);
            }
            return Array.from(dishMap.values());
          });
        }
      });
    }

    return () => {
      if (typeof unsubPending === 'function') unsubPending();
    };
  }, [isAdmin]);

  // Update SEO Title & Meta dynamically
  useEffect(() => {
    const seoMealInfo: Record<MealType, { title: string; desc: string }> = {
      sang: {
        title: 'Hôm Nay Ăn Gì Ở TP.HCM? - Vòng Quay Món Ăn Sáng Sài Gòn',
        desc: 'Quay may mắn chọn món ăn sáng Sài Gòn chuẩn vị (Cơm tấm Ba Ghiền, Bánh mì Huỳnh Hoa, Phở Lệ, Hủ tiếu Nam Vang) kèm địa chỉ và chỉ đường Google Maps.',
      },
      trua: {
        title: 'Hôm Nay Ăn Gì Ở TP.HCM? - Vòng Quay Món Ăn Trưa Sài Gòn',
        desc: 'Quay may mắn chọn bữa trưa Sài Gòn no bụng (Bún thịt nướng, Bún đậu mắm tôm, Cơm niêu, Cơm gà xối mỡ) kèm địa chỉ và chỉ đường Google Maps.',
      },
      toi: {
        title: 'Hôm Nay Ăn Gì Ở TP.HCM? - Vòng Quay Món Chiều / Tối & Ăn Vặt TP.HCM',
        desc: 'Khám phá ẩm thực chiều tối và ăn vặt Sài Gòn (Ốc Vĩnh Khánh, Lẩu bò Hồ Thị Kỷ, Lẩu dê 404, Phá lấu) kèm gợi ý quán ngon và chỉ đường Google Maps.',
      },
    };

    const currentSeo = seoMealInfo[currentMeal];
    if (currentSeo) {
      document.title = currentSeo.title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', currentSeo.desc);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', currentSeo.title);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', currentSeo.desc);
    }
  }, [currentMeal]);

  // Persist Dishes
  const persistDishes = (newDishes: Dish[]) => {
    setDishes(newDishes);
    saveDishesLocally(newDishes);
    if (isAdmin) {
      saveDishesCloud(newDishes);
    }
  };

  // Filtered Dishes for Active Meal (Strictly approved for the wheel)
  const activeDishes = useMemo(() => {
    const avoidDays = getAvoidDays();
    const recentlyEatenIds = avoidDays > 0 ? getRecentlyEatenDishIds(avoidDays) : null;

    return filterDishes(dishes, {
      currentMeal,
      excludedDishIds,
      recentlyEatenIds,
      filters: currentFilters,
    });
  }, [dishes, currentMeal, excludedDishIds, currentFilters, historyCount]);

  // Pending dishes waiting for admin review
  const pendingDishes = useMemo(() => {
    return dishes.filter((d) => d.status === 'pending');
  }, [dishes]);

  // Dishes displayed in DishList (approved + pending dishes belonging to current user or admin)
  const listDishes = useMemo(() => {
    const currentUser = getCurrentUser();
    const currentUid = currentUser?.uid;

    const userPending = dishes.filter((d) => {
      if (d.status !== 'pending') return false;
      const matchMeal = Array.isArray(d.mealTypes)
        ? d.mealTypes.includes(currentMeal)
        : (d.meal ? d.meal === currentMeal : true);
      if (!matchMeal) return false;
      return isAdmin || (currentUid && d.createdBy === currentUid);
    });

    return [...userPending, ...activeDishes];
  }, [dishes, currentMeal, activeDishes, isAdmin]);

  // Meal counts for Tab badges
  const mealCounts = useMemo(() => {
    const counts: Record<MealType, number> = { sang: 0, trua: 0, toi: 0 };
    dishes.forEach((d) => {
      if (d.status === 'approved' || !d.status) {
        if (Array.isArray(d.mealTypes)) {
          d.mealTypes.forEach((m) => {
            if (counts[m] !== undefined) counts[m]++;
          });
        } else if (d.meal && counts[d.meal] !== undefined) {
          counts[d.meal]++;
        }
      }
    });
    return counts;
  }, [dishes]);

  // Favorite checker callback
  const checkIsFavorite = useCallback(
    (id: string) => {
      return isFavoriteDish(id);
    },
    [favRefreshKey]
  );

  // Toggle favorite
  const handleToggleFavorite = (id: string) => {
    const nextState = toggleFavoriteDish(id);
    setFavRefreshKey((k) => k + 1);
    showToast(
      nextState
        ? 'Đã thêm vào Món Yêu Thích (2x tỉ lệ trúng)! ❤️'
        : 'Đã bỏ khỏi danh sách yêu thích.',
      'info'
    );
  };

  // Temporary exclude from wheel
  const handleToggleExclude = (id: string) => {
    const next = new Set(excludedDishIds);
    if (next.has(id)) {
      next.delete(id);
      showToast('Đã đưa món trở lại vòng quay! ✨', 'info');
    } else {
      next.add(id);
      showToast('Đã tạm loại món này khỏi vòng hôm nay! 🚫', 'info');
    }
    setExcludedDishIds(next);
  };

  const handleResetExcluded = () => {
    setExcludedDishIds(new Set());
    showToast('Đã khôi phục tất cả món ăn vào vòng quay! ✨', 'success');
  };

  // Add Dish
  const handleAddDish = (newDish: Dish) => {
    const updated = [newDish, ...dishes];
    setDishes(updated);
    saveDishesLocally(updated);
    addDishCloud(newDish);
  };

  // Delete Dish (Admin)
  const handleDeleteDish = (dish: Dish) => {
    if (!isAdmin) {
      setIsAdminOpen(true);
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${dish.name}" không?`)) {
      const updated = dishes.filter((d) => d.id !== dish.id);
      setDishes(updated);
      saveDishesLocally(updated);
      deleteDishCloud(dish.id);
      showToast(`Đã xóa món "${dish.name}".`, 'info');
    }
  };

  // Approve Dish (Admin)
  const handleApproveDish = async (dish: Dish) => {
    if (!isAdmin) {
      showToast('Chỉ Quản trị viên mới có quyền duyệt món!', 'warning');
      return;
    }
    const updated = dishes.map((d) => (d.id === dish.id ? { ...d, status: 'approved' as const } : d));
    setDishes(updated);
    saveDishesLocally(updated);
    await approveDishCloud(dish);
    showToast(`Đã duyệt món "${dish.name}" thành công! Món đã lên vòng quay 🎉`, 'success');
  };

  // Restore Default Dishes (Admin)
  const handleRestoreDefaults = () => {
    if (!isAdmin) {
      showToast('Chỉ Quản trị viên mới có quyền khôi phục dữ liệu gốc!', 'warning');
      return;
    }
    if (window.confirm('Khôi phục toàn bộ thực đơn chuẩn gốc TP.HCM? Mọi món tự thêm sẽ được thay thế.')) {
      const defaults = DEFAULT_DISHES_HCM.map(normalizeDish);
      setDishes(defaults);
      saveDishesLocally(defaults);
      saveDishesCloud(defaults);
      setExcludedDishIds(new Set());
      showToast('Đã khôi phục thực đơn gốc TP.HCM thành công! 🍜', 'success');
    }
  };

  // Spin Winning Dish
  const handleWinner = (dish: Dish) => {
    recordSpinHistory(dish, currentMeal);
    setHistoryCount(getSpinHistory().length);
    trackSpin({
      meal: currentMeal,
      dishesCount: activeDishes.length,
      isFiltered: currentFilters.price !== 'all' || currentFilters.dishType !== 'all' || currentFilters.vegOnly,
    });
    setWinnerDish(dish);
  };

  // Add Review (Location-specific or general dish review)
  const handleAddReview = (dishId: string, locationIndex: number | null, review: ReviewItem) => {
    const targetDish = dishes.find((d) => d.id === dishId);
    if (targetDish && targetDish.status === 'pending') {
      showToast('Món ăn đang chờ duyệt, chưa mở tính năng đánh giá!', 'warning');
      return;
    }
    const updated = dishes.map((d) => {
      if (d.id === dishId) {
        if (locationIndex != null && d.locations && d.locations[locationIndex]) {
          const updatedLocs = [...d.locations];
          const targetLoc = updatedLocs[locationIndex];
          const revs = targetLoc.reviews || [];
          updatedLocs[locationIndex] = {
            ...targetLoc,
            reviews: [review, ...revs],
          };
          return { ...d, locations: updatedLocs };
        } else {
          const revs = d.reviews || [];
          return { ...d, reviews: [review, ...revs] };
        }
      }
      return d;
    });
    setDishes(updated);
    saveDishesLocally(updated);

    // Đồng bộ đánh giá lên Firebase Cloud (hỗ trợ cả review theo quán lẫn review món)
    const targetLocId =
      locationIndex != null && targetDish?.locations && targetDish.locations[locationIndex]
        ? (targetDish.locations[locationIndex].id || locationIndex)
        : locationIndex;
    addReviewCloud(dishId, targetLocId, review);

    if (winnerDish && winnerDish.id === dishId) {
      if (locationIndex != null && winnerDish.locations && winnerDish.locations[locationIndex]) {
        const updatedLocs = [...winnerDish.locations];
        const targetLoc = updatedLocs[locationIndex];
        updatedLocs[locationIndex] = {
          ...targetLoc,
          reviews: [review, ...(targetLoc.reviews || [])],
        };
        setWinnerDish({ ...winnerDish, locations: updatedLocs });
      } else {
        setWinnerDish({
          ...winnerDish,
          reviews: [review, ...(winnerDish.reviews || [])],
        });
      }
    }

    if (selectedDishDetail && selectedDishDetail.id === dishId) {
      if (locationIndex != null && selectedDishDetail.locations && selectedDishDetail.locations[locationIndex]) {
        const updatedLocs = [...selectedDishDetail.locations];
        const targetLoc = updatedLocs[locationIndex];
        updatedLocs[locationIndex] = {
          ...targetLoc,
          reviews: [review, ...(targetLoc.reviews || [])],
        };
        setSelectedDishDetail({ ...selectedDishDetail, locations: updatedLocs });
      } else {
        setSelectedDishDetail({
          ...selectedDishDetail,
          reviews: [review, ...(selectedDishDetail.reviews || [])],
        });
      }
    }

    if (reviewDish && reviewDish.id === dishId) {
      if (locationIndex != null && reviewDish.locations && reviewDish.locations[locationIndex]) {
        const updatedLocs = [...reviewDish.locations];
        const targetLoc = updatedLocs[locationIndex];
        updatedLocs[locationIndex] = {
          ...targetLoc,
          reviews: [review, ...(targetLoc.reviews || [])],
        };
        setReviewDish({ ...reviewDish, locations: updatedLocs });
      } else {
        setReviewDish({
          ...reviewDish,
          reviews: [review, ...(reviewDish.reviews || [])],
        });
      }
    }
  };

  // Handle Quick Filters change
  const handleFilterChange = (newFilters: FilterState) => {
    setCurrentFilters(newFilters);
    trackFilterUsed('quick_filter', newFilters.price !== 'all' ? newFilters.price : newFilters.dishType);
  };

  // Hash Routing: Hiển thị Bảng Điều Khiển Quản Trị (#/admin)
  if (currentHash === '#/admin') {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center animate-spin mb-4">
              <span className="text-xl">🛡️</span>
            </div>
            <h2 className="text-base font-bold text-white">Đang tải Bảng Điều Khiển Quản Trị...</h2>
            <p className="text-xs text-slate-400 mt-1">Hệ thống đang chuẩn bị giao diện quản lý.</p>
          </div>
        }
      >
        <AdminDashboard
          dishes={dishes}
          pendingDishes={pendingDishes}
          setDishes={setDishes}
          onClose={() => {
            window.location.hash = '';
          }}
          isAdmin={isAdmin}
          isAuthLoading={isAuthLoading}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white pb-12 transition-colors duration-200">
      {/* Banner Bảo Trì Toàn Hệ Thống Khi Kill Switch Bật */}
      {!writesEnabled && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
          <span>⚠️ <strong>Thông báo bảo trì:</strong> Hệ thống đang tạm thời ngừng tiếp nhận món ăn và đánh giá mới. Bạn vẫn có thể quay và xem quán bình thường.</span>
        </div>
      )}

      {/* 1. Sticky Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onSignOut={async () => {
          await signOutAdminGoogle();
          setIsAdmin(false);
        }}
        historyCount={historyCount}
        cloudStatus={cloudStatus}
        isAdmin={isAdmin}
        pendingDishes={pendingDishes}
        pendingLocationsCount={pendingLocationsCount}
        reportsCount={reportsCount}
        onApproveDish={handleApproveDish}
      />

      {/* 2. Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 w-full flex flex-col gap-5 sm:gap-6">
        {/* Meal Switcher Tabs */}
        <section aria-label="Lựa chọn bữa ăn">
          <MealTabs
            currentMeal={currentMeal}
            onSelectMeal={(m) => setCurrentMeal(m)}
            mealCounts={mealCounts}
          />
        </section>

        {/* Quick Pre-Spin Filters */}
        <section aria-label="Bộ lọc nhanh trước khi quay">
          <QuickFilters
            filters={currentFilters}
            onChangeFilters={handleFilterChange}
          />
        </section>

        {/* Core Layout: 2 Columns on Desktop, Stacked on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Center Wheel & Big Button (7 cols) */}
          <section className="lg:col-span-7 flex flex-col items-center justify-center bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-6 shadow-md dark:shadow-xl backdrop-blur-sm lg:h-[580px]">
            <WheelCanvas
              dishes={activeDishes}
              isFavoriteFn={checkIsFavorite}
              onWinner={handleWinner}
              spinTrigger={spinTrigger}
            />
          </section>

          {/* Right Column: Dish List & Management (5 cols) */}
          <section className="lg:col-span-5 lg:h-[580px] flex flex-col min-h-0">
            <DishList
              currentMeal={currentMeal}
              dishes={listDishes}
              excludedDishIds={excludedDishIds}
              onToggleExclude={handleToggleExclude}
              onResetExcluded={handleResetExcluded}
              isFavoriteFn={checkIsFavorite}
              onToggleFavorite={handleToggleFavorite}
              onOpenAddModal={() => setIsAddOpen(true)}
              onOpenSuggestLocationModal={() => {
                setSuggestLocationDish(null);
                setIsSuggestLocationOpen(true);
              }}
              onOpenReviewModal={(dish) => setSelectedDishDetail(dish)}
              onDeleteDish={handleDeleteDish}
              onSelectDish={(dish) => setSelectedDishDetail(dish)}
              isAdmin={isAdmin}
            />
          </section>
        </div>
      </main>

      {/* ==================== MODALS ==================== */}
      {/* 1. Result Modal (from Spin) */}
      <ResultModal
        dish={winnerDish}
        mode="spin"
        onClose={() => setWinnerDish(null)}
        onSpinAgain={() => {
          setWinnerDish(null);
          setTimeout(() => {
            setSpinTrigger((prev) => prev + 1);
          }, 200);
        }}
        onExcludeDish={(id) => {
          handleToggleExclude(id);
          setWinnerDish(null);
        }}
        onOpenReviews={(dish, locIdx) => {
          setReviewDish(dish);
          setReviewLocationIndex(locIdx ?? null);
        }}
        onOpenSuggestLocation={(d) => {
          setSuggestLocationDish(d);
          setIsSuggestLocationOpen(true);
        }}
      />

      {/* 1b. Store Info / Detail Modal (from clicking Dish in list) */}
      <ResultModal
        dish={selectedDishDetail}
        mode="detail"
        onClose={() => setSelectedDishDetail(null)}
        onExcludeDish={(id) => {
          handleToggleExclude(id);
          setSelectedDishDetail(null);
        }}
        onOpenReviews={(dish, locIdx) => {
          setReviewDish(dish);
          setReviewLocationIndex(locIdx ?? null);
        }}
        onOpenSuggestLocation={(d) => {
          setSuggestLocationDish(d);
          setIsSuggestLocationOpen(true);
        }}
      />

      {/* 1c. Suggest Location Modal */}
      <SuggestLocationModal
        isOpen={isSuggestLocationOpen}
        dish={suggestLocationDish}
        dishes={dishes}
        onClose={() => {
          setIsSuggestLocationOpen(false);
          setSuggestLocationDish(null);
        }}
      />

      {/* 2. Add Dish Modal */}
      <AddDishModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddDish={handleAddDish}
        currentMeal={currentMeal}
      />

      {/* 3. History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onHistoryChange={() => setHistoryCount(getSpinHistory().length)}
      />

      {/* 4. Review Modal */}
      <ReviewModal
        dish={reviewDish}
        locationIndex={reviewLocationIndex}
        onClose={() => {
          setReviewDish(null);
          setReviewLocationIndex(null);
        }}
        onAddReview={handleAddReview}
      />

      {/* 5. Admin Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        isAdmin={isAdmin}
        onAdminStatusChange={(status) => setIsAdmin(status)}
        onRestoreDefaults={handleRestoreDefaults}
        pendingDishes={pendingDishes}
        onApproveDish={handleApproveDish}
        onRejectDish={handleDeleteDish}
      />
    </div>
  );
};
