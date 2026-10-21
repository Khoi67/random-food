import React, { useState } from 'react';
import { Dish, MealType, PriceRange, DishType, LocationItem } from '../types/index.js';
import { X, Plus, Trash2 } from 'lucide-react';
import { showToast } from '../utils/helpers.js';
import { trackAddDish } from '../services/analytics.js';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Vui lòng nhập tên món ăn!', 'warning');
      return;
    }

    if (selectedMeals.length === 0) {
      showToast('Vui lòng chọn ít nhất một bữa ăn!', 'warning');
      return;
    }

    const validLocations = locations
      .map((l) => ({ name: l.name.trim(), address: l.address.trim() }))
      .filter((l) => l.name.length > 0);

    const newDish: Dish = {
      id: `dish_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      shortName: shortName.trim() || undefined,
      mealTypes: selectedMeals,
      priceRange,
      type: dishType,
      vegetarian,
      locations: validLocations.length > 0 ? validLocations : [{ name: trimmedName, address: 'TP. Hồ Chí Minh' }],
      status: 'approved',
      createdAt: Date.now(),
    };

    onAddDish(newDish);
    trackAddDish(trimmedName, priceRange);
    showToast(`Đã thêm món "${trimmedName}" thành công! 🎉`, 'success');

    // Reset Form
    setName('');
    setShortName('');
    setLocations([{ name: '', address: '' }]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>+ Thêm Món Ăn Mới</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Món mới sẽ được hiển thị ngay trên vòng quay
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng form"
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
          {/* Tên món */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Tên món ăn <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cơm tấm Ba Ghiền, Bánh canh cua..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-white placeholder-slate-500 transition"
            />
          </div>

          {/* Tên rút gọn */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300">
                Tên hiển thị trên vòng quay (Rút gọn)
              </label>
              <span className="text-[10px] text-slate-500">Tùy chọn</span>
            </div>
            <input
              type="text"
              maxLength={16}
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="VD: Cơm tấm, Hủ tiếu..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-white placeholder-slate-500 transition"
            />
          </div>

          {/* Bữa ăn */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Phù hợp cho bữa ăn nào? <span className="text-rose-400">*</span>
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
                        ? 'bg-brand-500/20 text-brand-300 border-brand-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
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
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Khoảng giá
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as PriceRange)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="under50">Dưới 50.000đ</option>
                <option value="50to100">50.000đ - 100.000đ</option>
                <option value="above100">Trên 100.000đ</option>
              </select>
            </div>

            {/* Kiểu món */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Kiểu món
              </label>
              <select
                value={dishType}
                onChange={(e) => setDishType(e.target.value as DishType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="kho">🥢 Món Khô</option>
                <option value="nuoc">🍜 Món Nước</option>
              </select>
            </div>
          </div>

          {/* Món chay */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
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
              <label className="text-xs font-bold text-slate-300">
                Địa chỉ quán ngon gợi ý (Google Maps)
              </label>
              <button
                type="button"
                onClick={handleAddLocationField}
                className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 cursor-pointer"
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
                    className="w-1/3 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="text"
                    value={loc.address}
                    onChange={(e) => handleLocationChange(idx, 'address', e.target.value)}
                    placeholder="Địa chỉ / Quận (VD: 84 Đặng Văn Ngữ, Q. Phú Nhuận)"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  {locations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLocationField(idx)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-slate-800">
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
