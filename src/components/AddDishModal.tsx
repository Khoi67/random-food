import React, { useState } from 'react';
import { Dish, MealType, PriceRange, DishType, LocationItem } from '../types/index.js';
import { X, Plus, Trash2 } from 'lucide-react';
import { showToast } from '../utils/helpers.js';
import { trackAddDish } from '../services/analytics.js';
import { isCurrentUserAdmin, getCurrentUser, ensureAuth } from '../services/firebase.js';

interface AddDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDish: (dish: Dish) => void;
  currentMeal: MealType;
}

export const AddDishModal: React.FC<AddDishModalProps> = ({
  isOpen,
  onClose,
  onAddDish,
  currentMeal,
}) => {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>([currentMeal]);
  const [priceRange, setPriceRange] = useState<PriceRange>('under50');
  const [dishType, setDishType] = useState<DishType>('kho');
  const [vegetarian, setVegetarian] = useState(false);
  const [locations, setLocations] = useState<LocationItem[]>([
    { name: '', address: '' },
  ]);
  const [honeypot, setHoneypot] = useState('');

  if (!isOpen) return null;

  const handleMealToggle = (m: MealType) => {
    if (selectedMeals.includes(m)) {
      if (selectedMeals.length === 1) {
        showToast('Món ăn phải thuộc ít nhất một bữa ăn!', 'warning');
        return;
      }
      setSelectedMeals(selectedMeals.filter((x) => x !== m));
    } else {
      setSelectedMeals([...selectedMeals, m]);
    }
  };

  const handleAddLocationField = () => {
    setLocations([...locations, { name: '', address: '' }]);
  };

  const handleRemoveLocationField = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleLocationChange = (index: number, field: 'name' | 'address', val: string) => {
    const updated = [...locations];
    updated[index][field] = val;
    setLocations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // GHI CHÚ BẢO MẬT:
    // Client-side honeypot và rate limit (localStorage) chỉ là lớp bảo vệ phụ trợ nhằm giảm tải và bẫy bot sơ cấp.
    // Lớp bảo mật cốt lõi, không thể bypass là Firebase Realtime Database Security Rules và App Check.
    
    // 1. Kiểm tra Honeypot (bot trap)
    if (honeypot) {
      console.warn('Phát hiện bot tự động điền form qua honeypot');
      onClose();
      return;
    }

    const isAdmin = isCurrentUserAdmin();

    // 2. Kiểm tra Rate Limit phía Client (Cooldown 60s cho khách thường)
    if (!isAdmin) {
      const lastDishTime = Number(localStorage.getItem('hom_nay_an_gi_last_dish_time') || 0);
      const now = Date.now();
      const elapsed = (now - lastDishTime) / 1000;
      const cooldownSec = 60;
      if (elapsed < cooldownSec) {
        const remaining = Math.ceil(cooldownSec - elapsed);
        showToast(`Bạn thao tác quá nhanh. Vui lòng đợi ${remaining}s trước khi gửi món tiếp theo! ⏳`, 'warning');
        return;
      }
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Vui lòng nhập tên món ăn!', 'warning');
      return;
    }

    if (selectedMeals.length === 0) {
      showToast('Vui lòng chọn ít nhất một bữa ăn!', 'warning');
      return;
    }

    const dishId = `dish_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const validLocations: LocationItem[] = locations
      .map((l, idx) => ({
        id: l.id || `loc_${dishId}_${idx}`,
        name: l.name.trim(),
        address: l.address.trim() || 'TP. Hồ Chí Minh'
      }))
      .filter((l) => l.name.length > 0);

    const authUser = await ensureAuth();
    const currentUser = authUser || getCurrentUser();
    const dishStatus = isAdmin ? 'approved' : 'pending';
    const trimmedShortName = shortName.trim();

    const newDish: Dish = {
      id: dishId,
      name: trimmedName,
      mealTypes: selectedMeals,
      priceRange,
      type: dishType,
      vegetarian,
      locations: validLocations.length > 0 ? validLocations : [{ id: `loc_${dishId}_0`, name: trimmedName, address: 'TP. Hồ Chí Minh' }],
      status: dishStatus,
      createdBy: currentUser?.uid || 'anonymous',
      createdAt: Date.now(),
    };

    if (trimmedShortName) {
      newDish.shortName = trimmedShortName;
    }

    if (!isAdmin) {
      localStorage.setItem('hom_nay_an_gi_last_dish_time', String(Date.now()));
    }

    onAddDish(newDish);
    trackAddDish(trimmedName, priceRange);
    if (isAdmin) {
      showToast(`Đã thêm món "${trimmedName}" thành công! 🎉`, 'success');
    } else {
      showToast(`Đã gửi đề xuất món "${trimmedName}"! Món sẽ hiển thị sau khi Quản trị viên duyệt. 🎉`, 'info');
    }

    // Reset Form
    setName('');
    setShortName('');
    setHoneypot('');
    setLocations([{ name: '', address: '' }]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-800 dark:text-slate-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>+ Thêm Món Ăn Mới</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Món mới sẽ được hiển thị ngay trên vòng quay
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng form"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
          {/* Honeypot Field - Ẩn với người dùng, bẫy spam bot */}
          <div style={{ display: 'none' }} aria-hidden="true">
            <input
              type="text"
              name="website_url"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Tên món */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên món ăn <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cơm tấm Ba Ghiền, Bánh canh cua..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition"
            />
          </div>

          {/* Tên rút gọn */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tên hiển thị trên vòng quay (Rút gọn)
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Tùy chọn</span>
            </div>
            <input
              type="text"
              maxLength={16}
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="VD: Cơm tấm, Hủ tiếu..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition"
            />
          </div>

          {/* Bữa ăn */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Phù hợp cho bữa ăn nào? <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'sang', label: '🌅 Bữa Sáng' },
                { key: 'trua', label: '☀️ Bữa Trưa' },
                { key: 'toi', label: '🌙 Chiều / Tối' },
              ].map((m) => {
                const checked = selectedMeals.includes(m.key as MealType);
                return (
                  <button
                    type="button"
                    key={m.key}
                    onClick={() => handleMealToggle(m.key as MealType)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      checked
                        ? 'bg-brand-500 text-white border-brand-500 shadow-xs dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/50'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Khoảng giá & Kiểu món */}
          <div className="grid grid-cols-2 gap-3">
            {/* Giá */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Khoảng giá
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as PriceRange)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="under50">Dưới 50.000đ</option>
                <option value="50to100">50.000đ - 100.000đ</option>
                <option value="above100">Trên 100.000đ</option>
              </select>
            </div>

            {/* Kiểu món */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kiểu món
              </label>
              <select
                value={dishType}
                onChange={(e) => setDishType(e.target.value as DishType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="kho">🥢 Món Khô</option>
                <option value="nuoc">🍜 Món Nước</option>
              </select>
            </div>
          </div>

          {/* Món chay */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>🌱</span>
              <span>Đây là món chay</span>
            </span>
            <input
              type="checkbox"
              checked={vegetarian}
              onChange={(e) => setVegetarian(e.target.checked)}
              className="w-4 h-4 accent-brand-500 cursor-pointer rounded"
            />
          </div>

          {/* Địa chỉ quán ăn */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Địa chỉ quán ngon gợi ý (Google Maps)
              </label>
              <button
                type="button"
                onClick={handleAddLocationField}
                className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm quán</span>
              </button>
            </div>

            <div className="space-y-2">
              {locations.map((loc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={loc.name}
                    onChange={(e) => handleLocationChange(idx, 'name', e.target.value)}
                    placeholder="Tên quán (VD: Quán A)"
                    className="w-1/3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="text"
                    value={loc.address}
                    onChange={(e) => handleLocationChange(idx, 'address', e.target.value)}
                    placeholder="Địa chỉ / Quận (VD: 84 Đặng Văn Ngữ, Q. Phú Nhuận)"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  {locations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLocationField(idx)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 text-white font-black text-sm shadow-lg shadow-brand-500/25 active:scale-[0.99] transition cursor-pointer"
            >
              Lưu & Thêm Vào Vòng Quay ✨
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
