import React, { useState } from 'react';
import { Dish, ReviewItem } from '../types/index.js';
import { X, Star, Send, Navigation, MapPin } from 'lucide-react';
import { showToast, createGoogleMapsUrl } from '../utils/helpers.js';

interface ReviewModalProps {
  dish: Dish | null;
  locationIndex?: number | null;
  onClose: () => void;
  onAddReview: (dishId: string, locationIndex: number | null, review: ReviewItem) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  dish,
  locationIndex = null,
  onClose,
  onAddReview,
}) => {
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [author, setAuthor] = useState('');
  const [comment, setComment] = useState('');
  const [honeypot, setHoneypot] = useState('');

  if (!dish) return null;

  const targetLocation =
    locationIndex != null && dish.locations && dish.locations[locationIndex]
      ? dish.locations[locationIndex]
      : null;

  const isPending = dish.status === 'pending';
  const reviews = targetLocation ? (targetLocation.reviews || []) : (dish.reviews || []);
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1)
      : '5.0';

  // Nút chỉ đường dùng chuẩn Google Maps Directions URL (không dùng API key, không lưu tọa độ)
  const handleOpenMaps = () => {
    if (!targetLocation) return;
    const url = createGoogleMapsUrl(targetLocation.name, targetLocation.address);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // GHI CHÚ BẢO MẬT:
    // Client-side honeypot và rate limit (localStorage) chỉ là lớp bảo vệ phụ trợ nhằm giảm tải và bẫy bot sơ cấp.
    // Lớp bảo mật cốt lõi, không thể bypass là Firebase Realtime Database Security Rules và App Check.

    // 1. Kiểm tra Honeypot
    if (honeypot) {
      console.warn('Phát hiện bot tự động submit review qua honeypot');
      onClose();
      return;
    }

    if (isPending) {
      showToast('Món ăn đang chờ duyệt, chưa mở tính năng đánh giá!', 'warning');
      return;
    }

    // 2. Kiểm tra Rate limit phía client (cooldown 10 giây giữa 2 lần gửi review)
    const lastRevTime = Number(localStorage.getItem('hom_nay_an_gi_last_review_time') || 0);
    const now = Date.now();
    const elapsed = (now - lastRevTime) / 1000;
    const cooldownSec = 10;
    if (elapsed < cooldownSec) {
      const remaining = Math.ceil(cooldownSec - elapsed);
      showToast(`Bạn thao tác quá nhanh. Vui lòng đợi ${remaining}s trước khi gửi đánh giá tiếp theo! ⏳`, 'warning');
      return;
    }

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

    localStorage.setItem('hom_nay_an_gi_last_review_time', String(now));
    onAddReview(dish.id, locationIndex, newRev);
    showToast('Cảm ơn bạn đã gửi đánh giá! ⭐', 'success');
    setComment('');
    setHoneypot('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800 gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 flex-shrink-0" />
              <span className="truncate">
                {targetLocation ? targetLocation.name : `Đánh Giá: ${dish.name}`}
              </span>
            </h2>
            {targetLocation && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                <span className="truncate">{targetLocation.address}</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              {isPending
                ? 'Món ăn đang chờ Admin duyệt — tính năng đánh giá tạm thời khóa.'
                : reviews.length > 0
                ? `Điểm trung bình: ${avgRating} ⭐ (${reviews.length} lượt đánh giá)`
                : 'Chưa có đánh giá nào cho địa điểm này. Hãy là người đầu tiên nhận xét!'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {targetLocation && (
              <button
                type="button"
                onClick={handleOpenMaps}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 text-white font-semibold text-xs flex items-center gap-1 transition shadow-md shadow-brand-500/20 cursor-pointer active:scale-95"
                title="Mở chỉ đường trên Google Maps"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Chỉ đường</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Đóng cửa sổ"
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Existing Reviews List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 min-h-[160px] max-h-[260px]">
          {reviews.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <p className="text-slate-300 font-medium">
                {targetLocation
                  ? `Chưa có bình luận nào cho quán "${targetLocation.name}".`
                  : 'Chưa có bình luận nào cho món này.'}
              </p>
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
        {isPending ? (
          <div className="pt-3 border-t border-slate-800 text-center py-4 px-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
            <p className="text-xs text-amber-300 font-semibold">
              ⏳ Món ăn đang chờ Admin phê duyệt
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Bạn chỉ có thể gửi nhận xét và chấm sao sau khi món ăn được Quản trị viên phê duyệt chính thức.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-800 space-y-3">
            {/* Honeypot field - ẩn với người dùng, bẫy spam bot */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <input
                type="text"
                name="phone_check"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

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
        )}
      </div>
    </div>
  );
};
