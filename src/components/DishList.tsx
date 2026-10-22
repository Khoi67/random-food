import React, { useState } from 'react';
import { Dish, MealType } from '../types/index.js';
import { Search, Plus, Heart, Ban, Trash2, Star, MapPin } from 'lucide-react';

interface DishListProps {
  currentMeal: MealType;
  dishes: Dish[];
  excludedDishIds: Set<string>;
  onToggleExclude: (id: string) => void;
  onResetExcluded: () => void;
  isFavoriteFn: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenSuggestLocationModal?: () => void;
  onOpenReviewModal: (dish: Dish) => void;
  onDeleteDish?: (dish: Dish) => void;
  onSelectDish?: (dish: Dish) => void;
  isAdmin: boolean;
}

export const DishList: React.FC<DishListProps> = ({
  currentMeal,
  dishes = [],
  excludedDishIds = new Set(),
  onToggleExclude,
  onResetExcluded,
  isFavoriteFn,
  onToggleFavorite,
  onOpenAddModal,
  onOpenSuggestLocationModal,
  onOpenReviewModal,
  onDeleteDish,
  onSelectDish,
  isAdmin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const mealTitles: Record<MealType, string> = {
    sang: 'Thực đơn bữa sáng',
    trua: 'Thực đơn bữa trưa',
    toi: 'Thực đơn chiều / tối',
  };

  // Lọc an toàn tương thích với cả món dữ liệu cũ (thiếu trường, tên undefined, locations dạng chuỗi)
  const filtered = (dishes || []).filter((dish) => {
    if (!dish) return false;
    if (!searchTerm) return true;
    const term = searchTerm.trim().toLowerCase();
    const dishName = dish.name ? String(dish.name).toLowerCase() : '';
    const nameMatch = dishName.includes(term);

    const locationsList = Array.isArray(dish.locations) ? dish.locations : [];
    const locMatch = locationsList.some((l: any) => {
      if (!l) return false;
      if (typeof l === 'string') return l.toLowerCase().includes(term);
      const lName = l.name ? String(l.name).toLowerCase() : '';
      const lAddr = l.address ? String(l.address).toLowerCase() : '';
      return lName.includes(term) || lAddr.includes(term);
    });

    return nameMatch || locMatch;
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 shadow-md dark:shadow-xl backdrop-blur-md overflow-hidden transition-colors">
      {/* Top Header: Tiêu đề toàn chiều ngang không bị cắt chữ ... */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white capitalize tracking-tight">
              {mealTitles[currentMeal] || 'Thực đơn'}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold flex-shrink-0">
              {dishes.length} món
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Danh sách các món và quán ngon TP.HCM
        </p>

        {/* Action Toolbar: Thêm món (Primary) & Thêm quán (Secondary) cân đối 2 cột */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-bold text-xs shadow-sm shadow-brand-500/20 active:scale-98 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Thêm món</span>
          </button>

          {onOpenSuggestLocationModal && (
            <button
              type="button"
              onClick={onOpenSuggestLocationModal}
              title="Gợi ý thêm địa chỉ quán ăn ngon tại TP.HCM"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-amber-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:hover:text-amber-300 font-bold text-xs border border-slate-200 dark:border-slate-700/80 active:scale-98 transition cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
              <span className="whitespace-nowrap">Thêm quán</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative my-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm nhanh món hoặc quán tại TP.HCM..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-950 focus:border-brand-500 focus:outline-none text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition"
        />
      </div>

      {/* Excluded Dishes Banner */}
      {excludedDishIds && excludedDishIds.size > 0 && (
        <div className="flex items-center justify-between p-2.5 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-300">
          <span className="flex items-center gap-1.5 font-semibold truncate mr-2">
            <span>🚫</span>
            <span className="truncate">Đang tạm loại {excludedDishIds.size} món hôm nay</span>
          </span>
          <button
            type="button"
            onClick={onResetExcluded}
            className="text-[11px] font-bold text-amber-600 dark:text-amber-300 hover:underline cursor-pointer flex-shrink-0"
          >
            Khôi phục tất cả
          </button>
        </div>
      )}

      {/* Dish Items Scroll Container: Cuộn nội bộ mượt mà, cố định chiều cao tương xứng với cột vòng quay */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 max-h-[480px] lg:max-h-none">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <span className="text-3xl block mb-2">🍜</span>
            <p className="font-semibold text-slate-300 text-sm">Chưa có món ăn nào trong danh mục này</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm ? 'Thử tìm với từ khóa khác' : 'Bấm nút "+ Thêm món" ở trên để đóng góp quán ngon nhé!'}
            </p>
          </div>
        ) : (
          filtered.map((dish, index) => {
            const dishId = dish.id || `dish-${index}`;
            const isFav = isFavoriteFn ? isFavoriteFn(dishId) : false;

            // Xử lý an toàn danh sách địa chỉ (hỗ trợ cả Object lẫn chuỗi string)
            const locationsList = Array.isArray(dish.locations) ? dish.locations : [];
            const locationsPreview =
              locationsList.length > 0
                ? locationsList
                    .map((l: any) => (typeof l === 'string' ? l : l?.name || l?.address || ''))
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(', ') || 'TP. Hồ Chí Minh'
                : 'TP. Hồ Chí Minh';

            // Xử lý an toàn đánh giá sao (tổng hợp từ dish.reviews và các quán trong dish.locations)
            const locReviews = Array.isArray(dish.locations)
              ? dish.locations.flatMap((l) => (Array.isArray(l?.reviews) ? l.reviews : []))
              : [];
            const dishReviews = Array.isArray(dish.reviews) ? dish.reviews : [];
            const allReviews = [...dishReviews, ...locReviews];
            const hasReviews = allReviews.length > 0;
            const avgRating = hasReviews
              ? (
                  allReviews.reduce((sum, r) => sum + (Number(r?.stars) || 5), 0) /
                  allReviews.length
                ).toFixed(1)
              : null;

            // Xử lý an toàn bữa ăn
            const mealTypes = Array.isArray(dish.mealTypes)
              ? dish.mealTypes
              : dish.meal
              ? [dish.meal]
              : [];

            // Xử lý an toàn khoảng giá
            const priceRange = dish.priceRange || '50to100';
            const priceText =
              priceRange === 'under50'
                ? '< 50k'
                : priceRange === 'above100'
                ? '> 100k'
                : '50k-100k';
            const priceClass =
              priceRange === 'under50'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : priceRange === 'above100'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

            const typeBadgeText = dish.type === 'nuoc' ? '🍜 Nước' : '🥢 Khô';

            return (
              <div
                key={dishId}
                onClick={() => onSelectDish && onSelectDish(dish)}
                className="group flex flex-col p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-amber-50/40 border border-slate-200/90 hover:border-amber-400/60 dark:bg-slate-900/80 dark:hover:bg-slate-800/90 dark:border-slate-800 dark:hover:border-amber-500/40 transition-all duration-150 gap-2 shadow-2xs hover:shadow-md cursor-pointer select-none active:scale-[0.99]"
                title="Bấm để xem thông tin quán, địa chỉ và chỉ đường"
              >
                {/* TẦNG 1: Số thứ tự + Tên món (đậm xám than dịu mắt) + Nút thao tác nhanh */}
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    {/* Badge số thứ tự */}
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-300 flex-shrink-0 border border-slate-200 dark:border-slate-700/60 shadow-2xs group-hover:border-amber-400/50 group-hover:text-brand-600 transition-colors">
                      {index + 1}
                    </div>

                    {/* Tên món: Dùng text-slate-900 (Đen than sang trọng, dễ đọc, không chói) hover thành brand-600 (cam ẩm thực) */}
                    <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300 text-sm sm:text-base leading-snug truncate transition-colors">
                        {dish.name || 'Món ăn'}
                      </h3>
                      {dish.shortName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-medium whitespace-nowrap">
                          🏷️ {dish.shortName}
                        </span>
                      )}
                      {dish.status === 'pending' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold whitespace-nowrap animate-pulse flex items-center gap-1">
                          <span>⏳</span>
                          <span>Đang chờ duyệt</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nút hành động nhanh bên phải: Tối giản icon nhỏ, không chiếm dụng chiều ngang */}
                  <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
                    {/* Nút Yêu thích */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(dishId);
                      }}
                      aria-label={`Yêu thích món ${dish.name || ''}`}
                      title={
                        isFav
                          ? 'Đã yêu thích (Tăng 2x tỉ lệ quay). Bấm để bỏ'
                          : 'Thêm vào yêu thích (Tăng 2x tỉ lệ quay)'
                      }
                      className={`p-1.5 sm:p-2 rounded-xl border text-xs transition cursor-pointer ${
                        isFav
                          ? 'text-rose-500 bg-rose-500/15 border-rose-500/30'
                          : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/60 bg-white dark:bg-transparent'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                          isFav ? 'fill-rose-500' : ''
                        }`}
                      />
                    </button>

                    {/* Nút Tạm loại */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExclude(dishId);
                      }}
                      aria-label={`Tạm loại món ${dish.name || ''}`}
                      title="Không muốn món này hôm nay (Tạm loại khỏi vòng quay)"
                      className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:text-slate-500 dark:hover:text-amber-400 dark:hover:bg-amber-500/10 border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-transparent transition cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>

                    {/* Nút Xóa Admin */}
                    {isAdmin && onDeleteDish && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDish(dish);
                        }}
                        aria-label={`Xóa món ${dish.name || ''}`}
                        title="Xóa món ăn này (Quyền Quản trị viên)"
                        className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-transparent transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* TẦNG 2: Toàn bộ Tags trải đều theo chiều ngang */}
                <div className="flex items-center gap-1.5 flex-wrap w-full">
                  {/* Meal Badges */}
                  {mealTypes.map((m) => {
                    if (m === 'sang') {
                      return (
                        <span
                          key="sang"
                          className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-md font-medium whitespace-nowrap"
                        >
                          Sáng
                        </span>
                      );
                    }
                    if (m === 'trua') {
                      return (
                        <span
                          key="trua"
                          className="text-[10px] px-1.5 py-0.5 bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 rounded-md font-medium whitespace-nowrap"
                        >
                          Trưa
                        </span>
                      );
                    }
                    if (m === 'toi') {
                      return (
                        <span
                          key="toi"
                          className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 rounded-md font-medium whitespace-nowrap"
                        >
                          Tối
                        </span>
                      );
                    }
                    return null;
                  })}

                  {/* Type Badge */}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 whitespace-nowrap font-medium shadow-2xs">
                    {typeBadgeText}
                  </span>

                  {/* Price Badge */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md border font-semibold whitespace-nowrap ${priceClass}`}
                  >
                    {priceText}
                  </span>

                  {/* Vegetarian */}
                  {dish.vegetarian && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold whitespace-nowrap">
                      🌱 Chay
                    </span>
                  )}

                  {/* Favorite indicator */}
                  {isFav && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold whitespace-nowrap">
                      ❤️ 2x
                    </span>
                  )}
                </div>

                {/* TẦNG 3: Địa chỉ quán ăn gợi ý (bên trái) + Nút Đánh giá sao (bên phải) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/60 w-full text-xs">
                  {/* Địa chỉ gợi ý */}
                  <div
                    className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 min-w-0 flex-1 truncate"
                    title={locationsPreview}
                  >
                    <MapPin className="w-3 h-3 text-brand-500 dark:text-brand-400 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium flex-shrink-0">Gợi ý:</span>
                    <span className="truncate">{locationsPreview}</span>
                  </div>

                  {/* Nút Đánh giá */}
                  {dish.status === 'pending' ? (
                    <span
                      className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/40 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700/40 flex-shrink-0 cursor-not-allowed"
                      title="Món đang chờ duyệt, chưa mở tính năng đánh giá"
                    >
                      <Star className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                      <span>Chưa mở đánh giá</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReviewModal(dish);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/20 transition cursor-pointer flex-shrink-0"
                      title="Xem & viết đánh giá cho món này"
                    >
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>
                        {hasReviews ? `${avgRating} (${allReviews.length})` : 'Đánh giá'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
