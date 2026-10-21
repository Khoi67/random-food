import React, { useState } from 'react';
import { Dish, MealType } from '../types/index.js';
import { Search, Plus, Heart, Ban, Trash2, MapPin, Star } from 'lucide-react';

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
  isAdmin: boolean;
}

export const DishList: React.FC<DishListProps> = ({
  currentMeal,
  dishes,
  excludedDishIds,
  onToggleExclude,
  onResetExcluded,
  isFavoriteFn,
  onToggleFavorite,
  onOpenAddModal,
  onOpenReviewModal,
  onDeleteDish,
  isAdmin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const mealTitles: Record<MealType, string> = {
    sang: 'Thực đơn Bữa Sáng',
    trua: 'Thực đơn Bữa Trưa',
    toi: 'Thực đơn Chiều / Tối',
  };

  const filtered = dishes.filter((dish) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = dish.name.toLowerCase().includes(term);
    const locMatch =
      Array.isArray(dish.locations) &&
      dish.locations.some(
        (l) =>
          (l.name && l.name.toLowerCase().includes(term)) ||
          (l.address && l.address.toLowerCase().includes(term))
      );
    return nameMatch || locMatch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-3xl border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span>{mealTitles[currentMeal]}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 font-bold">
              {dishes.length} món
            </span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Các món ăn đang được đưa vào vòng quay
          </p>
        </div>

        {/* Add Dish Button */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">Thêm món</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative my-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm tên món, quán ăn, quận..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-white placeholder-slate-500 transition"
        />
      </div>

      {/* Excluded Dishes Banner */}
      {excludedDishIds.size > 0 && (
        <div className="flex items-center justify-between p-2.5 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          <span className="flex items-center gap-1.5 font-semibold">
            <span>🚫</span>
            <span>Đang tạm loại {excludedDishIds.size} món phiên hôm nay</span>
          </span>
          <button
            onClick={onResetExcluded}
            className="text-[11px] font-bold text-amber-300 hover:text-white underline cursor-pointer"
          >
            Khôi phục tất cả
          </button>
        </div>
      )}

      {/* Dish Items Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[300px] max-h-[580px]">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <span className="text-3xl block mb-2">🔍</span>
            <p className="font-semibold text-slate-300 text-sm">Không tìm thấy món ăn nào</p>
            <p className="text-xs text-slate-500 mt-1">
              Thử xóa từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc nhanh
            </p>
          </div>
        ) : (
          filtered.map((dish) => {
            const isFav = isFavoriteFn(dish.id);
            const isExcluded = excludedDishIds.has(dish.id);
            const locations = dish.locations || [];

            // Ratings summary
            const reviews = dish.reviews || [];
            const hasReviews = reviews.length > 0;
            const avgRating = hasReviews
              ? (reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length).toFixed(1)
              : null;

            return (
              <div
                key={dish.id}
                className="group p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/80 hover:border-brand-500/30 transition duration-150 flex flex-col gap-2"
              >
                {/* Header Row: Dish Name & Action Icons */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-white text-sm sm:text-base leading-snug">
                        {dish.name}
                      </span>
                      {dish.shortName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-300 border border-brand-500/20 font-medium">
                          🏷️ {dish.shortName}
                        </span>
                      )}
                    </div>

                    {/* Locations preview */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3 text-brand-400 flex-shrink-0" />
                      <span className="truncate">
                        {locations.length > 0
                          ? locations.map((l) => l.name).join(', ')
                          : 'TP. Hồ Chí Minh'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {/* Favorite 2x button */}
                    <button
                      onClick={() => onToggleFavorite(dish.id)}
                      aria-label="Yêu thích (tăng 2x tỉ lệ)"
                      title={isFav ? 'Bỏ yêu thích' : 'Yêu thích (2x tỉ lệ trúng)'}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isFav
                          ? 'text-rose-400 bg-rose-500/20 hover:bg-rose-500/30'
                          : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-400' : ''}`} />
                    </button>

                    {/* Exclude from wheel button */}
                    <button
                      onClick={() => onToggleExclude(dish.id)}
                      aria-label="Tạm loại khỏi vòng quay phiên này"
                      title="Tạm loại khỏi vòng quay phiên này"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Ban className="w-4 h-4" />
                    </button>

                    {/* Admin Delete button */}
                    {isAdmin && onDeleteDish && (
                      <button
                        onClick={() => onDeleteDish(dish)}
                        aria-label="Xóa món ăn"
                        title="Xóa món ăn"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer Badges & Reviews */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/50 flex-wrap">
                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Price Badge */}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md border font-semibold ${
                        dish.priceRange === 'under50'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : dish.priceRange === 'above100'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {dish.priceRange === 'under50'
                        ? '< 50k'
                        : dish.priceRange === 'above100'
                        ? '> 100k'
                        : '50-100k'}
                    </span>

                    {/* Type Badge */}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80">
                      {dish.type === 'nuoc' ? '🍜 Nước' : '🥢 Khô'}
                    </span>

                    {/* Vegetarian */}
                    {dish.vegetarian && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        🌱 Chay
                      </span>
                    )}

                    {/* Favorite indicator */}
                    {isFav && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                        ❤️ 2x
                      </span>
                    )}
                  </div>

                  {/* Reviews trigger */}
                  <button
                    onClick={() => onOpenReviewModal(dish)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{hasReviews ? `${avgRating} (${reviews.length})` : 'Đánh giá'}</span>
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
