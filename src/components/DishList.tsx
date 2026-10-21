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
    <div className="flex flex-col h-full bg-slate-900/60 rounded-3xl border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-md overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-white capitalize truncate">
              {mealTitles[currentMeal] || 'Thực đơn'}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700/80 font-bold flex-shrink-0">
              {dishes.length} món
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            Danh sách các món và quán ngon TP.HCM
          </p>
        </div>

        {/* Add Dish Button */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 active:scale-95 transition cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm món</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative my-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm nhanh món hoặc quán tại TP.HCM..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-white placeholder-slate-500 transition"
        />
      </div>

      {/* Excluded Dishes Banner */}
      {excludedDishIds && excludedDishIds.size > 0 && (
        <div className="flex items-center justify-between p-2.5 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          <span className="flex items-center gap-1.5 font-semibold truncate mr-2">
            <span>🚫</span>
            <span className="truncate">Đang tạm loại {excludedDishIds.size} món hôm nay</span>
          </span>
          <button
            type="button"
            onClick={onResetExcluded}
            className="text-[11px] font-bold text-amber-300 hover:text-white underline cursor-pointer flex-shrink-0"
          >
            Khôi phục tất cả
          </button>
        </div>
      )}

      {/* Dish Items Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[260px] max-h-[460px] lg:max-h-[560px]">
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

            // Xử lý an toàn đánh giá sao
            const reviews = Array.isArray(dish.reviews) ? dish.reviews : [];
            const hasReviews = reviews.length > 0;
            const avgRating = hasReviews
              ? (
                  reviews.reduce((sum, r) => sum + (Number(r?.stars) || 5), 0) /
                  reviews.length
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
                className="group flex flex-col p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 transition-all duration-150 gap-2 shadow-sm cursor-pointer select-none active:scale-[0.99]"
                title="Bấm để xem thông tin quán, địa chỉ và chỉ đường"
              >
                {/* TẦNG 1: Số thứ tự + Tên món (đậm tông cam) + Nút thao tác nhanh (Rộng rãi, không bị ép hẹp) */}
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    {/* Badge số thứ tự */}
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-brand-400 flex-shrink-0 border border-slate-700/60 shadow-inner">
                      {index + 1}
                    </div>

                    {/* Tên món */}
                    <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-brand-400 group-hover:text-brand-300 text-sm sm:text-base leading-snug truncate">
                        {dish.name || 'Món ăn'}
                      </h3>
                      {dish.shortName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-300 border border-brand-500/20 font-medium whitespace-nowrap">
                          🏷️ {dish.shortName}
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
                          ? 'text-rose-400 bg-rose-500/15 border-rose-500/30'
                          : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800 border-slate-700/60'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                          isFav ? 'fill-rose-400' : ''
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
                      className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 border border-slate-700/60 transition cursor-pointer"
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
                        className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700/60 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* TẦNG 2: Toàn bộ Tags trải đều theo chiều ngang (Chiếm trọn 100% chiều rộng card, KHÔNG BAO GIỜ bị dồn thành 1 cột dọc) */}
                <div className="flex items-center gap-1.5 flex-wrap w-full">
                  {/* Meal Badges */}
                  {mealTypes.map((m) => {
                    if (m === 'sang') {
                      return (
                        <span
                          key="sang"
                          className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md font-medium whitespace-nowrap"
                        >
                          Sáng
                        </span>
                      );
                    }
                    if (m === 'trua') {
                      return (
                        <span
                          key="trua"
                          className="text-[10px] px-1.5 py-0.5 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded-md font-medium whitespace-nowrap"
                        >
                          Trưa
                        </span>
                      );
                    }
                    if (m === 'toi') {
                      return (
                        <span
                          key="toi"
                          className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md font-medium whitespace-nowrap"
                        >
                          Tối
                        </span>
                      );
                    }
                    return null;
                  })}

                  {/* Type Badge */}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80 whitespace-nowrap font-medium">
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
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold whitespace-nowrap">
                      🌱 Chay
                    </span>
                  )}

                  {/* Favorite indicator */}
                  {isFav && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold whitespace-nowrap">
                      ❤️ 2x
                    </span>
                  )}
                </div>

                {/* TẦNG 3: Địa chỉ quán ăn gợi ý (bên trái) + Nút Đánh giá sao (bên phải) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 w-full text-xs">
                  {/* Địa chỉ gợi ý */}
                  <div
                    className="flex items-center gap-1 text-[11px] text-slate-400 min-w-0 flex-1 truncate"
                    title={locationsPreview}
                  >
                    <MapPin className="w-3 h-3 text-brand-400 flex-shrink-0" />
                    <span className="text-slate-300 font-medium flex-shrink-0">Gợi ý:</span>
                    <span className="truncate">{locationsPreview}</span>
                  </div>

                  {/* Nút Đánh giá */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenReviewModal(dish);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/20 transition cursor-pointer flex-shrink-0"
                    title="Xem & viết đánh giá cho món này"
                  >
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>
                      {hasReviews ? `${avgRating} (${reviews.length})` : 'Đánh giá'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
