import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dish, MealType, FilterState, ReviewItem } from './types/index.js';
import { DEFAULT_DISHES_HCM } from './data/defaultDishes.js';
import {
  loadDishesFromLocal,
  saveDishesLocally,
  normalizeDish,
} from './services/storage.js';
import {
  initFirebase,
  saveDishesCloud,
  getCurrentUser,
  isCurrentUserAdmin,
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

export const App: React.FC = () => {
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
  const [reviewDish, setReviewDish] = useState<Dish | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Status state
  const [isAdmin, setIsAdmin] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'connecting' | 'offline'>('offline');
  const [historyCount, setHistoryCount] = useState<number>(() => getSpinHistory().length);

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
    saveDishesCloud(newDishes);
  };

  // Filtered Dishes for Active Meal
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
    persistDishes(updated);
  };

  // Delete Dish (Admin)
  const handleDeleteDish = (dish: Dish) => {
    if (!isAdmin) {
      setIsAdminOpen(true);
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${dish.name}" không?`)) {
      const updated = dishes.filter((d) => d.id !== dish.id);
      persistDishes(updated);
      showToast(`Đã xóa món "${dish.name}".`, 'info');
    }
  };

  // Restore Default Dishes
  const handleRestoreDefaults = () => {
    if (window.confirm('Khôi phục toàn bộ thực đơn chuẩn gốc TP.HCM? Mọi món tự thêm sẽ được thay thế.')) {
      const defaults = DEFAULT_DISHES_HCM.map(normalizeDish);
      persistDishes(defaults);
      setExcludedDishIds(new Set());
      showToast('Đã khôi phục thực đơn gốc TP.HCM thành công! 🍜', 'success');
    }
  };

  // Spin Winning Dish
  const handleWinner = (dish: Dish) => {
    recordSpinHistory(dish.id, dish.name, currentMeal);
    setHistoryCount(getSpinHistory().length);
    trackSpin(dish.id, dish.name, currentMeal);
    setWinnerDish(dish);
  };

  // Add Review
  const handleAddReview = (dishId: string, review: ReviewItem) => {
    const updated = dishes.map((d) => {
      if (d.id === dishId) {
        const revs = d.reviews || [];
        return { ...d, reviews: [review, ...revs] };
      }
      return d;
    });
    persistDishes(updated);
    if (winnerDish && winnerDish.id === dishId) {
      setWinnerDish({
        ...winnerDish,
        reviews: [review, ...(winnerDish.reviews || [])],
      });
    }
  };

  // Handle Quick Filters change
  const handleFilterChange = (newFilters: FilterState) => {
    setCurrentFilters(newFilters);
    trackFilterUsed('quick_filter', newFilters.price !== 'all' ? newFilters.price : newFilters.dishType);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white pb-12">
      {/* 1. Sticky Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        historyCount={historyCount}
        cloudStatus={cloudStatus}
        isAdmin={isAdmin}
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
          <section className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900/40 rounded-3xl border border-slate-800/80 p-4 sm:p-6 shadow-xl backdrop-blur-sm">
            <WheelCanvas
              dishes={activeDishes}
              isFavoriteFn={checkIsFavorite}
              onWinner={handleWinner}
            />
          </section>

          {/* Right Column: Dish List & Management (5 cols) */}
          <section className="lg:col-span-5 h-full">
            <DishList
              currentMeal={currentMeal}
              dishes={activeDishes}
              excludedDishIds={excludedDishIds}
              onToggleExclude={handleToggleExclude}
              onResetExcluded={handleResetExcluded}
              isFavoriteFn={checkIsFavorite}
              onToggleFavorite={handleToggleFavorite}
              onOpenAddModal={() => setIsAddOpen(true)}
              onOpenReviewModal={(dish) => setReviewDish(dish)}
              onDeleteDish={handleDeleteDish}
              isAdmin={isAdmin}
            />
          </section>
        </div>
      </main>

      {/* ==================== MODALS ==================== */}
      {/* 1. Result Modal */}
      <ResultModal
        dish={winnerDish}
        onClose={() => setWinnerDish(null)}
        onSpinAgain={() => {
          setWinnerDish(null);
        }}
        onExcludeDish={(id) => {
          handleToggleExclude(id);
          setWinnerDish(null);
        }}
        onOpenReviews={(dish) => {
          setReviewDish(dish);
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
        onClose={() => setReviewDish(null)}
        onAddReview={handleAddReview}
      />

      {/* 5. Admin Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        isAdmin={isAdmin}
        onAdminStatusChange={(status) => setIsAdmin(status)}
        onRestoreDefaults={handleRestoreDefaults}
      />
    </div>
  );
};
