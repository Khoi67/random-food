import React, { useState } from 'react';
import { Dish, ReviewItem } from '../types/index.js';
import { X, Star, Send } from 'lucide-react';
import { showToast } from '../utils/helpers.js';

interface ReviewModalProps {
  dish: Dish | null;
  onClose: () => void;
  onAddReview: (dishId: string, review: ReviewItem) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  dish,
  onClose,
  onAddReview,
}) => {
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [author, setAuthor] = useState('');
  const [comment, setComment] = useState('');

  if (!dish) return null;

  const reviews = dish.reviews || [];
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1)
      : '5.0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      showToast('Vui lòng nhập nhận xét của bạn!', 'warning');
      return;
    }

    const newRev: ReviewItem = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      author: author.trim() || 'Thực khách Sài Gòn',
      stars,
      comment: trimmedComment,
      createdAt: Date.now(),
    };

    onAddReview(dish.id, newRev);
    showToast('Cảm ơn bạn đã gửi đánh giá! ⭐', 'success');
    setComment('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span>Đánh Giá: {dish.name}</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {reviews.length > 0
                ? `Điểm trung bình: ${avgRating} ⭐ (${reviews.length} lượt đánh giá)`
                : 'Chưa có đánh giá nào. Hãy là người đầu tiên nhận xét!'}
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

        {/* Existing Reviews List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 min-h-[160px] max-h-[260px]">
          {reviews.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <p className="text-slate-300 font-medium">Chưa có bình luận nào cho món này.</p>
              <p className="text-slate-500 mt-1">Gửi đánh giá bên dưới để chia sẻ cảm nhận của bạn!</p>
            </div>
          ) : (
            reviews.map((rev) => {
              const date = new Date(rev.createdAt);
              const dateStr = date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });

              return (
                <div
                  key={rev.id}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{rev.author}</span>
                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className="text-xs">
                          {s <= rev.stars ? '★' : '☆'}
                        </span>
                      ))}
                      <span className="text-[10px] text-slate-500 ml-2">{dateStr}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{rev.comment}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Submit New Review Form */}
        <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Đánh giá của bạn:</span>
            {/* Interactive Stars */}
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onMouseEnter={() => setHoverStars(s)}
                  onMouseLeave={() => setHoverStars(0)}
                  onClick={() => setStars(s)}
                  className="p-0.5 text-lg transition cursor-pointer"
                >
                  <span
                    className={
                      (hoverStars || stars) >= s ? 'text-amber-400' : 'text-slate-600'
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Tên bạn (tùy chọn)"
              className="col-span-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhận xét quán ngon, hương vị món ăn..."
              className="col-span-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi Đánh Giá</span>
          </button>
        </form>
      </div>
    </div>
  );
};
