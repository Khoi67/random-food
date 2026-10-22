import React, { useEffect, useState } from 'react';
import { Dish, LocationItem } from '../types/index.js';
import confetti from 'canvas-confetti';
import {
  X,
  RotateCcw,
  Ban,
  MapPin,
  ExternalLink,
  Navigation,
  Star,
  Compass,
} from 'lucide-react';
import {
  requestUserLocation,
  getCachedUserLocation,
  getCoordinatesForLocation,
  haversineDistance,
  formatDistance,
} from '../services/geolocation.js';
import { showToast, createGoogleMapsUrl } from '../utils/helpers.js';
import { trackSpinAgain, trackOpenMaps } from '../services/analytics.js';

interface ResultModalProps {
  dish: Dish | null;
  onClose: () => void;
  onSpinAgain?: () => void;
  onExcludeDish: (id: string) => void;
  onOpenReviews: (dish: Dish, locationIndex?: number) => void;
  mode?: 'spin' | 'detail';
}

export const ResultModal: React.FC<ResultModalProps> = ({
  dish,
  onClose,
  onSpinAgain,
  onExcludeDish,
  onOpenReviews,
  mode = 'spin',
}) => {
  const [locationsWithDistance, setLocationsWithDistance] = useState<
    (LocationItem & { distKm?: number })[]
  >([]);
  const [isLocating, setIsLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );

  useEffect(() => {
    if (!dish) return;

    // Trigger Confetti only when won from a spin
    if (mode === 'spin') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ea580c', '#f59e0b', '#dc2626', '#10b981', '#3b82f6'],
        });
      } catch (e) {}
    }

    // Check cached location
    const cached = getCachedUserLocation();
    const locs = dish.locations || [];

    if (cached) {
      setUserCoords(cached);
      const computed = locs.map((loc) => {
        const coords = getCoordinatesForLocation(loc);
        const distKm = haversineDistance(
          cached.lat,
          cached.lng,
          coords.lat,
          coords.lng
        );
        return { ...loc, distKm };
      });
      computed.sort((a, b) => (a.distKm ?? 999) - (b.distKm ?? 999));
      setLocationsWithDistance(computed);
    } else {
      setLocationsWithDistance(locs);
    }
  }, [dish]);

  if (!dish) return null;

  // Handle Sort Nearby Location with Geolocation Permission
  const handleSortNearby = async () => {
    setIsLocating(true);
    try {
      const coords = await requestUserLocation();
      setUserCoords(coords);
      showToast('Đã lấy vị trí hiện tại thành công! 📍', 'success');

      const locs = dish.locations || [];
      const computed = locs.map((loc) => {
        const c = getCoordinatesForLocation(loc);
        const distKm = haversineDistance(coords.lat, coords.lng, c.lat, c.lng);
        return { ...loc, distKm };
      });
      computed.sort((a, b) => (a.distKm ?? 999) - (b.distKm ?? 999));
      setLocationsWithDistance(computed);
    } catch (err: any) {
      showToast(
        err.message || 'Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập vị trí.',
        'warning'
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleOpenMaps = (locName: string, address: string) => {
    trackOpenMaps(dish.name, locName);
    const url = createGoogleMapsUrl(locName, address);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const reviews = dish.reviews || [];
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1)
      : null;

  const isPending = dish.status === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-brand-500/30 p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-500 via-amber-400 to-rose-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Đóng cửa sổ"
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Celebration Header */}
        <div className="text-center pt-2 pb-4">
          {mode === 'spin' ? (
            <div className="inline-block px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-bold text-xs uppercase tracking-wider mb-2">
              🎉 Vũ Trụ Đã Chọn Cho Bạn!
            </div>
          ) : (
            <div className="inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
              📍 Thông Tin & Địa Điểm Quán
            </div>
          )}
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {dish.name}
          </h2>
          {dish.shortName && (
            <p className="text-xs text-amber-300 font-medium mt-1">
              🏷️ {dish.shortName}
            </p>
          )}

          {/* Badges info */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5 flex-wrap">
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
              {dish.priceRange === 'under50'
                ? '< 50.000đ'
                : dish.priceRange === 'above100'
                ? '> 100.000đ'
                : '50.000đ - 100.000đ'}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {dish.type === 'nuoc' ? '🍜 Món nước' : '🥢 Món khô'}
            </span>
            {dish.vegetarian && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                🌱 Chay
              </span>
            )}
          </div>
        </div>

        {/* Pending Banner if dish is not yet approved */}
        {dish.status === 'pending' && (
          <div className="mb-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-300 font-medium">
                Món đang chờ Admin duyệt (Chưa lên vòng quay)
              </span>
            </div>
            <span className="text-[10px] text-amber-400/90 font-bold bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
              Chờ duyệt
            </span>
          </div>
        )}

        {/* Quán Ngon Gợi Ý / Quán Gần Tôi */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
              <span>Gợi ý quán ngon tại TP.HCM:</span>
            </h3>

            {/* Sort Nearby Button */}
            <button
              onClick={handleSortNearby}
              disabled={isLocating}
              className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 cursor-pointer bg-brand-500/10 hover:bg-brand-500/20 px-2 py-1 rounded-lg border border-brand-500/20 transition disabled:opacity-50"
            >
              <Compass className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Đang định vị...' : userCoords ? 'Đã sắp xếp gần bạn' : 'Tìm quán gần tôi'}</span>
            </button>
          </div>

          {locationsWithDistance.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/40 text-center text-xs text-slate-400">
              Quán ăn quanh khu vực TP. Hồ Chí Minh
            </div>
          ) : (
            locationsWithDistance.map((loc, idx) => {
              const locReviews = loc.reviews || [];
              const locAvgRating =
                locReviews.length > 0
                  ? (locReviews.reduce((s, r) => s + r.stars, 0) / locReviews.length).toFixed(1)
                  : null;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isPending) {
                      showToast('Món ăn đang chờ Admin duyệt, chưa mở tính năng đánh giá!', 'warning');
                      return;
                    }
                    onOpenReviews(dish, idx);
                  }}
                  className={`p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 shadow-sm ${
                    isPending
                      ? 'cursor-default'
                      : 'hover:border-amber-500/40 hover:bg-slate-900/90 cursor-pointer group transition'
                  }`}
                  title={
                    isPending
                      ? 'Món ăn đang chờ Admin duyệt — tính năng đánh giá tạm thời khóa'
                      : `Nhấn để xem đánh giá & nhận xét về ${loc.name}`
                  }
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-white text-xs truncate ${!isPending ? 'group-hover:text-amber-300 transition' : ''}`}>
                        {loc.name}
                      </span>
                      {loc.distKm != null && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md border border-emerald-500/20 flex-shrink-0">
                          {formatDistance(loc.distKm)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {loc.address}
                    </p>

                    {/* Review count & stars for this location */}
                    <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                      {isPending ? (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Star className="w-3 h-3 text-slate-600" />
                          <span>Chưa mở đánh giá (Món đang chờ duyệt)</span>
                        </span>
                      ) : locAvgRating ? (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{locAvgRating} ({locReviews.length} đánh giá)</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 group-hover:text-amber-400/80 transition">
                          <Star className="w-3 h-3 text-slate-600 group-hover:text-amber-400 transition" />
                          <span>Chưa có đánh giá • Bấm để xem & nhận xét</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Nút Đánh giá riêng từng quán (Khóa nếu món pending) */}
                    {isPending ? (
                      <span
                        className="px-2 py-1.5 rounded-xl bg-slate-800/40 text-slate-500 font-medium text-xs flex items-center gap-1 border border-slate-700/40 cursor-not-allowed select-none"
                        title="Món đang chờ duyệt, chưa mở tính năng đánh giá"
                      >
                        <Star className="w-3 h-3 text-slate-600" />
                        <span>Chưa mở đánh giá</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReviews(dish, idx);
                        }}
                        className="px-2 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold text-xs flex items-center gap-1 transition cursor-pointer border border-amber-500/20 active:scale-95"
                        title={`Xem & viết đánh giá cho ${loc.name}`}
                      >
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{locReviews.length > 0 ? `${locAvgRating}★` : 'Đánh giá'}</span>
                      </button>
                    )}

                    {/* Google Maps Directions Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenMaps(loc.name, loc.address);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-brand-500 hover:text-white text-slate-300 font-semibold text-xs flex items-center gap-1 transition cursor-pointer shadow-sm active:scale-95 border border-slate-700/50"
                      title="Mở chỉ đường trên Google Maps"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Chỉ đường</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2 mt-2">
          {mode === 'spin' && onSpinAgain ? (
            <div>
              {/* Spin Again */}
              <button
                onClick={() => {
                  try {
                    trackSpinAgain({ previousDish: dish.name });
                  } catch (_) {}
                  onSpinAgain();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Quay lại món khác</span>
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center transition cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          )}

          {/* Temporary Exclude Button */}
          <button
            onClick={() => {
              onExcludeDish(dish.id);
              onClose();
              showToast(`Đã tạm loại "${dish.name}" khỏi vòng quay hôm nay!`, 'info');
            }}
            className="w-full py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Không muốn món này hôm nay (Tạm loại khỏi vòng)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
