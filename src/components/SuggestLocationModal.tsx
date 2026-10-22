import React, { useState, useMemo, useEffect } from 'react';
import { Dish, LocationSuggestion } from '../types/index.js';
import { X, MapPin, Send, Compass, Search, Utensils, Check } from 'lucide-react';
import { showToast, createGoogleMapsUrl } from '../utils/helpers.js';
import { suggestLocationCloud, isCurrentUserAdmin } from '../services/firebase.js';

interface SuggestLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dish?: Dish | null;
  dishes?: Dish[];
  onSuggestionSuccess?: (suggestion: LocationSuggestion) => void;
}

export const SuggestLocationModal: React.FC<SuggestLocationModalProps> = ({
  isOpen,
  onClose,
  dish = null,
  dishes = [],
  onSuggestionSuccess
}) => {
  const [selectedDishId, setSelectedDishId] = useState<string>('');
  const [dishSearch, setDishSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [directionUrl, setDirectionUrl] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Click outside to close dish dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Khởi tạo món được chọn
  useEffect(() => {
    if (dish && dish.id) {
      setSelectedDishId(dish.id);
    } else {
      setSelectedDishId('');
    }
    setDishSearch('');
    setIsDropdownOpen(false);
  }, [dish, isOpen]);

  // Chỉ lấy danh sách các món ĐÃ ĐƯỢC DUYỆT (Loại bỏ triệt để các món đang chờ duyệt)
  const approvedDishes = useMemo(() => {
    return (dishes || []).filter((d) => d && (d.status === 'approved' || !d.status));
  }, [dishes]);

  // Xác định món mục tiêu (từ prop dish hoặc người dùng chọn từ danh sách approvedDishes)
  const activeDish = useMemo(() => {
    if (dish) {
      return dish.status === 'pending' ? null : dish;
    }
    return approvedDishes.find((d) => d.id === selectedDishId) || null;
  }, [dish, approvedDishes, selectedDishId]);

  // Lọc danh sách món khi người dùng gõ tìm kiếm (chỉ tìm trong các món đã duyệt)
  const filteredDishes = useMemo(() => {
    if (!dishSearch.trim()) return approvedDishes.slice(0, 30);
    const term = dishSearch.trim().toLowerCase();
    return approvedDishes.filter((d) => d.name && d.name.toLowerCase().includes(term)).slice(0, 20);
  }, [approvedDishes, dishSearch]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Kiểm tra đã chọn món chưa
    if (!activeDish) {
      showToast('Vui lòng chọn món ăn cần thêm địa chỉ quán!', 'warning');
      return;
    }

    // 2. Honeypot bẫy bot tự động điền form
    if (honeypot) {
      console.warn('Phát hiện bot điền form qua honeypot');
      onClose();
      return;
    }

    const isAdmin = isCurrentUserAdmin();

    // 3. Client-side Rate Limit Cooldown (60s cho khách)
    if (!isAdmin) {
      const lastSuggestTime = Number(localStorage.getItem('hom_nay_an_gi_last_loc_time') || 0);
      const now = Date.now();
      const elapsed = (now - lastSuggestTime) / 1000;
      const cooldownSec = 60;
      if (elapsed < cooldownSec) {
        const remaining = Math.ceil(cooldownSec - elapsed);
        showToast(`Bạn thao tác quá nhanh. Vui lòng đợi ${remaining}s trước khi gửi gợi ý tiếp theo! ⏳`, 'warning');
        return;
      }
    }

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName || trimmedName.length < 2) {
      showToast('Vui lòng nhập tên quán ăn hợp lệ (từ 2 ký tự)!', 'warning');
      return;
    }

    if (!trimmedAddress || trimmedAddress.length < 5) {
      showToast('Vui lòng nhập địa chỉ quán chi tiết tại TP.HCM!', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const suggestionId = `sug_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const safeMapsUrl = directionUrl.trim() || createGoogleMapsUrl(trimmedName, trimmedAddress);

      const suggestion: LocationSuggestion = {
        id: suggestionId,
        dishId: activeDish.id,
        dishName: activeDish.name,
        name: trimmedName,
        address: trimmedAddress,
        directionUrl: safeMapsUrl,
        note: note.trim(),
        createdBy: 'anonymous',
        createdAt: Date.now(),
        status: 'pending'
      };

      const ok = await suggestLocationCloud(suggestion);
      if (ok) {
        if (!isAdmin) {
          localStorage.setItem('hom_nay_an_gi_last_loc_time', String(Date.now()));
        }
        showToast(`Cảm ơn bạn! Quán "${trimmedName}" cho món "${activeDish.name}" đã được ghi nhận. 🎉`, 'success');
        if (onSuggestionSuccess) {
          onSuggestionSuccess(suggestion);
        }
        // Reset form
        setName('');
        setAddress('');
        setNote('');
        setDirectionUrl('');
        setHoneypot('');
        setSelectedDishId('');
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-800 dark:text-slate-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Gợi Ý Quán Ngon</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {dish ? (
                  <>Cho món: <strong className="text-amber-600 dark:text-amber-300">{dish.name}</strong></>
                ) : (
                  'Đề xuất quán ngon TP.HCM cho món ăn bạn thích'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1">
          {/* Honeypot field (hidden from real users, traps bots) */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="hp_phone_fax"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Chọn Món Ăn (Khi mở tự do không truyền dish cố định) */}
          {!dish && (
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Chọn món ăn cần thêm quán <span className="text-rose-500">*</span></span>
                {activeDish && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Đã chọn
                  </span>
                )}
              </label>

              {activeDish ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{activeDish.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDishId('');
                      setIsDropdownOpen(true);
                    }}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium cursor-pointer"
                  >
                    Chọn món khác
                  </button>
                </div>
              ) : (
                <div ref={dropdownRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm và chọn món ăn tại TP.HCM..."
                      value={dishSearch}
                      onChange={(e) => {
                        setDishSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Dropdown danh sách món */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl z-20 scrollbar-thin divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredDishes.length > 0 ? (
                        filteredDishes.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setSelectedDishId(d.id);
                              setDishSearch('');
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-white flex items-center transition cursor-pointer"
                          >
                            <span className="font-semibold">{d.name}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-center text-xs text-slate-400 dark:text-slate-500">
                          Không tìm thấy món "{dishSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tên Quán */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên quán ăn <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Cơm Tấm Ba Ghiền, Phở Lệ..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Địa Chỉ Tại TP.HCM */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Địa chỉ tại TP.HCM <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: 84 Đặng Văn Ngữ, P.10, Phú Nhuận"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={150}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Link Google Maps (Tùy chọn) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Link Google Maps</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Tự động tạo nếu để trống</span>
            </label>
            <input
              type="url"
              placeholder="https://maps.google.com/..."
              value={directionUrl}
              onChange={(e) => setDirectionUrl(e.target.value)}
              maxLength={300}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Ghi Chú Đặc Trưng */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú món ngon <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">(Tùy chọn)</span>
            </label>
            <textarea
              placeholder="Ví dụ: Miếng sườn to ướp đậm vị, nước mắm kẹo rất ngon..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!dish && !activeDish)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 hover:to-brand-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Compass className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi Quán Đề Xuất</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
