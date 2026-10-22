import React, { useState, useMemo } from 'react';
import { Dish, MealType, PriceRange, DishType, LocationItem } from '../../types/index.js';
import { 
  Search, 
  Edit2, 
  Trash2, 
  Plus, 
  MapPin, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  X, 
  Save
} from 'lucide-react';

interface AdminDishesProps {
  dishes: Dish[];
  onUpdateDish: (updatedDish: Dish) => void;
  onDeleteDish: (dishId: string, dishName: string) => void;
}

export const AdminDishes: React.FC<AdminDishesProps> = ({
  dishes,
  onUpdateDish,
  onDeleteDish,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mealFilter, setMealFilter] = useState<'all' | MealType>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | PriceRange>('all');
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

  // Edit form state
  const [formName, setFormName] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formMeals, setFormMeals] = useState<MealType[]>(['sang']);
  const [formPrice, setFormPrice] = useState<PriceRange>('under50');
  const [formType, setFormType] = useState<DishType>('nuoc');
  const [formVeg, setFormVeg] = useState(false);
  const [formLocations, setFormLocations] = useState<LocationItem[]>([]);

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      // Search by name or location
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = dish.name.toLowerCase().includes(query) || (dish.shortName && dish.shortName.toLowerCase().includes(query));
        const matchesLoc = dish.locations?.some((l) => 
          l.name.toLowerCase().includes(query) || l.address.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesLoc) return false;
      }

      // Meal filter
      if (mealFilter !== 'all') {
        const hasMeal = dish.meal === mealFilter || (Array.isArray(dish.mealTypes) && dish.mealTypes.includes(mealFilter));
        if (!hasMeal) return false;
      }

      // Price filter
      if (priceFilter !== 'all' && dish.priceRange !== priceFilter) {
        return false;
      }

      return true;
    });
  }, [dishes, searchTerm, mealFilter, priceFilter]);

  const handleOpenEdit = (dish: Dish) => {
    setEditingDish(dish);
    setFormName(dish.name);
    setFormShortName(dish.shortName || '');
    setFormMeals(dish.mealTypes && dish.mealTypes.length > 0 ? dish.mealTypes : [dish.meal || 'sang']);
    setFormPrice(dish.priceRange || 'under50');
    setFormType(dish.type || 'nuoc');
    setFormVeg(Boolean(dish.vegetarian));
    setFormLocations(dish.locations ? JSON.parse(JSON.stringify(dish.locations)) : []);
  };

  const handleToggleMeal = (m: MealType) => {
    setFormMeals((prev) => 
      prev.includes(m)
        ? prev.length > 1 ? prev.filter((item) => item !== m) : prev
        : [...prev, m]
    );
  };

  const handleAddLocation = () => {
    setFormLocations((prev) => [
      ...prev,
      { name: '', address: '', reviews: [] }
    ]);
  };

  const handleUpdateLocation = (index: number, field: 'name' | 'address', val: string) => {
    setFormLocations((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveLocation = (index: number) => {
    setFormLocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish) return;
    const cleanName = formName.trim();
    if (!cleanName) return;

    const validLocations = formLocations
      .filter((loc) => loc.name.trim() || loc.address.trim())
      .map((loc) => ({
        ...loc,
        name: loc.name.trim() || cleanName,
        address: loc.address.trim() || 'TP. Hồ Chí Minh'
      }));

    const updated: Dish = {
      ...editingDish,
      name: cleanName,
      shortName: formShortName.trim() || cleanName.slice(0, 16),
      mealTypes: formMeals,
      meal: formMeals[0] || 'sang',
      priceRange: formPrice,
      type: formType,
      vegetarian: formVeg,
      locations: validLocations,
      updatedAt: Date.now()
    };

    onUpdateDish(updated);
    setEditingDish(null);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên món hoặc địa chỉ quán..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          {/* Meal tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Bữa:</span>
            {(['all', 'sang', 'trua', 'toi'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMealFilter(m)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  mealFilter === m
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {m === 'all' ? 'Tất cả' : m === 'sang' ? 'Sáng' : m === 'trua' ? 'Trưa' : 'Tối'}
              </button>
            ))}
          </div>

          {/* Price tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Giá:</span>
            {(['all', 'under50', '50to100', 'above100'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriceFilter(p)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  priceFilter === p
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p === 'all' ? 'Tất cả' : p === 'under50' ? '<50k' : p === '50to100' ? '50-100k' : '>100k'}
              </button>
            ))}
          </div>

          <div className="text-slate-400 font-mono">
            Kết quả: <strong className="text-white">{filteredDishes.length}</strong> món
          </div>
        </div>
      </div>

      {/* Dishes Table / Cards */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800/80">
          {filteredDishes.map((dish) => {
            const isApproved = dish.status === 'approved' || !dish.status;
            const primaryLoc = dish.locations?.[0];
            const locCount = dish.locations?.length || 0;

            return (
              <div
                key={dish.id}
                className="p-4 hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-white truncate max-w-[250px] sm:max-w-none">
                      {dish.name}
                    </span>
                    {isApproved ? (
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Đã duyệt
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Chờ duyệt
                      </span>
                    )}
                    {dish.vegetarian && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded-md font-semibold">
                        🌱 Chay
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      {dish.priceRange === 'under50' ? '< 50k' : dish.priceRange === '50to100' ? '50-100k' : '> 100k'}
                    </span>
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                      {dish.type === 'nuoc' ? '🍜 Món Nước' : '🍱 Món Khô'}
                    </span>
                    <span className="text-slate-400">
                      Bữa: {dish.mealTypes?.join(', ') || dish.meal}
                    </span>
                  </div>

                  {primaryLoc && (
                    <div className="text-xs text-slate-300 flex items-center gap-1 truncate pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                      <span className="truncate">{primaryLoc.name} — {primaryLoc.address}</span>
                      {locCount > 1 && (
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md flex-shrink-0 ml-1">
                          +{locCount - 1} quán
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <button
                    onClick={() => handleOpenEdit(dish)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer"
                    title="Chỉnh sửa món"
                  >
                    <Edit2 className="w-4 h-4 text-amber-400" />
                  </button>
                  <button
                    onClick={() => onDeleteDish(dish.id, dish.name)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                    title="Xóa món"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EDIT DISH MODAL */}
      {editingDish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
          onClick={() => setEditingDish(null)}
        >
          <div
            className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-8 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-400" />
                <span>Chỉnh Sửa Món Ăn</span>
              </h3>
              <button
                onClick={() => setEditingDish(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDish} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tên Món Ăn
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tên Rút Gọn (Hiển thị trên bánh xe)
                  </label>
                  <input
                    type="text"
                    value={formShortName}
                    onChange={(e) => setFormShortName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Meal Types */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Bữa Ăn Phục Vụ
                </label>
                <div className="flex gap-2">
                  {(['sang', 'trua', 'toi'] as MealType[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleToggleMeal(m)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        formMeals.includes(m)
                          ? 'bg-brand-500 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {m === 'sang' ? '🌅 Sáng' : m === 'trua' ? '☀️ Trưa' : '🌙 Chiều / Tối'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Khoảng Giá
                  </label>
                  <select
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value as PriceRange)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="under50">Dưới 50k</option>
                    <option value="50to100">50k - 100k</option>
                    <option value="above100">Trên 100k</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Kiểu Món
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as DishType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="nuoc">Món Nước 🍜</option>
                    <option value="kho">Món Khô 🍱</option>
                  </select>
                </div>
              </div>

              {/* Vegetarian */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="formVeg"
                  checked={formVeg}
                  onChange={(e) => setFormVeg(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 focus:ring-0 bg-slate-950 border-slate-800"
                />
                <label htmlFor="formVeg" className="text-xs text-slate-300 cursor-pointer">
                  Món Chay (Phù hợp ngày Rằm / Mùng 1)
                </label>
              </div>

              {/* Locations Section */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    Địa Điểm Quán Ăn ({formLocations.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLocation}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm quán
                  </button>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {formLocations.map((loc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 relative"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveLocation(idx)}
                        className="absolute top-2 right-2 text-slate-500 hover:text-rose-400 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="text"
                        placeholder="Tên quán (vd: Phở Lệ Quận 5)"
                        value={loc.name}
                        onChange={(e) => handleUpdateLocation(idx, 'name', e.target.value)}
                        className="w-[90%] px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                      <input
                        type="text"
                        placeholder="Địa chỉ quán (vd: 413-415 Nguyễn Trãi, Q.5)"
                        value={loc.address}
                        onChange={(e) => handleUpdateLocation(idx, 'address', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2 sticky bottom-0 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setEditingDish(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-orange-500 hover:from-brand-600 hover:to-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-brand-500/20 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
