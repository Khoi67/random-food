import React, { useState, useMemo } from 'react';
import { Dish, ReviewItem } from '../../types/index.js';
import { Search, Trash2, Star, MessageSquare, AlertCircle } from 'lucide-react';

interface FlattenedReview {
  review: ReviewItem;
  dishId: string;
  dishName: string;
  locationIndex: number | null;
  locationName: string | null;
}

interface AdminReviewsProps {
  dishes: Dish[];
  onDeleteReview: (dishId: string, locationIndex: number | null, reviewId: string) => void;
}

export const AdminReviews: React.FC<AdminReviewsProps> = ({
  dishes,
  onDeleteReview,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Flatten all reviews for centralized moderation
  const allReviews = useMemo(() => {
    const list: FlattenedReview[] = [];
    dishes.forEach((dish) => {
      // Dish root reviews
      if (dish.reviews && Array.isArray(dish.reviews)) {
        dish.reviews.forEach((r) => {
          list.push({
            review: r,
            dishId: dish.id,
            dishName: dish.name,
            locationIndex: null,
            locationName: null,
          });
        });
      }
      // Location reviews
      if (dish.locations && Array.isArray(dish.locations)) {
        dish.locations.forEach((loc, idx) => {
          if (loc.reviews && Array.isArray(loc.reviews)) {
            loc.reviews.forEach((r) => {
              list.push({
                review: r,
                dishId: dish.id,
                dishName: dish.name,
                locationIndex: idx,
                locationName: loc.name,
              });
            });
          }
        });
      }
    });

    return list.sort((a, b) => b.review.createdAt - a.review.createdAt);
  }, [dishes]);

  const filteredReviews = useMemo(() => {
    if (!searchTerm.trim()) return allReviews;
    const q = searchTerm.toLowerCase().trim();
    return allReviews.filter(
      (item) =>
        item.dishName.toLowerCase().includes(q) ||
        item.review.author.toLowerCase().includes(q) ||
        item.review.comment.toLowerCase().includes(q) ||
        (item.locationName && item.locationName.toLowerCase().includes(q))
    );
  }, [allReviews, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo nội dung đánh giá, người viết hoặc món ăn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-slate-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono self-end sm:self-center">
          Tổng cộng: <strong className="text-white">{filteredReviews.length}</strong> đánh giá
        </div>
      </div>

      {/* Review List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">Chưa có đánh giá nào!</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Khi thực khách để lại nhận xét và đánh giá sao cho các quán ăn, dữ liệu sẽ tập hợp tại đây để bạn kiểm duyệt và loại bỏ spam.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((item) => (
            <div
              key={`${item.dishId}_${item.review.id}`}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">
                    {item.dishName}
                  </span>
                  {item.locationName && (
                    <span className="text-xs text-brand-400 font-semibold bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20">
                      📍 {item.locationName}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono ml-auto sm:ml-0">
                    {new Date(item.review.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < item.review.stars ? 'fill-amber-400' : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-slate-300">
                    {item.review.author || 'Thực khách ẩn danh'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                  {item.review.comment}
                </p>
              </div>

              {/* Action */}
              <div className="self-end sm:self-center flex-shrink-0">
                <button
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn xóa đánh giá này không?`)) {
                      onDeleteReview(item.dishId, item.locationIndex, item.review.id);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Xóa đánh giá spam"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Spam</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
