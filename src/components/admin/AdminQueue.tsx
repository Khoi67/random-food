import React, { useState } from 'react';
import { Dish, ReportItem, LocationSuggestion, MealType, PriceRange, DishType } from '../../types/index.js';
import { 
  Check, 
  X, 
  Edit3, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  DollarSign, 
  ShieldAlert,
  Sparkles,
  Save,
  ExternalLink
} from 'lucide-react';

interface AdminQueueProps {
  pendingDishes: Dish[];
  reports: ReportItem[];
  pendingLocations?: LocationSuggestion[];
  onApproveDish: (dish: Dish) => void;
  onRejectDish: (dishId: string, dishName: string) => void;
  onApproveLocation?: (suggestion: LocationSuggestion) => void;
  onRejectLocation?: (suggestionId: string, dishName: string, locName: string) => void;
  onResolveReport: (reportId: string) => void;
  onDeleteReportedDish: (dishId: string) => void;
}

export const AdminQueue: React.FC<AdminQueueProps> = ({
  pendingDishes,
  reports,
  pendingLocations = [],
  onApproveDish,
  onRejectDish,
  onApproveLocation,
  onRejectLocation,
  onResolveReport,
  onDeleteReportedDish,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'locations' | 'reports'>('pending');
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

  // Tự động chuyển sang tab Quán Đề Xuất nếu không có món nào chờ duyệt mà có quán chờ duyệt
  React.useEffect(() => {
    if (pendingDishes.length === 0 && pendingLocations.length > 0 && activeSubTab === 'pending') {
      setActiveSubTab('locations');
    }
  }, [pendingDishes.length, pendingLocations.length]);

  // Quick edit state
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<PriceRange>('under50');
  const [editType, setEditType] = useState<DishType>('nuoc');
  const [editMeals, setEditMeals] = useState<MealType[]>(['sang']);

  const handleOpenEdit = (dish: Dish) => {
    setEditingDish(dish);
    setEditName(dish.name);
    setEditPrice(dish.priceRange || 'under50');
    setEditType(dish.type || 'nuoc');
    setEditMeals(dish.mealTypes && dish.mealTypes.length > 0 ? dish.mealTypes : [dish.meal || 'sang']);
  };

  const handleSaveAndApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish) return;
    const updated: Dish = {
      ...editingDish,
      name: editName.trim() || editingDish.name,
      priceRange: editPrice,
      type: editType,
      mealTypes: editMeals,
      meal: editMeals[0] || 'sang',
      status: 'approved',
      updatedAt: Date.now(),
    };
    onApproveDish(updated);
    setEditingDish(null);
  };

  const toggleMeal = (meal: MealType) => {
    setEditMeals((prev) =>
      prev.includes(meal)
        ? prev.length > 1
          ? prev.filter((m) => m !== meal)
          : prev
        : [...prev, meal]
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs header */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'pending'
              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Món Đang Chờ Duyệt</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold">
            {pendingDishes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('locations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'locations'
              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Quán Đề Xuất</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold">
            {pendingLocations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'reports'
              ? 'bg-rose-500/15 text-rose-800 dark:text-rose-400 border border-rose-500/30 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Báo Cáo Vi Phạm</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-700 dark:text-rose-300 font-extrabold">
            {reports.length}
          </span>
        </button>
      </div>

      {/* PENDING DISHES LIST */}
      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          {pendingDishes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Hàng đợi trống!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Hiện không có món ăn nào đang chờ phê duyệt. Khi người dùng đóng góp món mới, món sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingDishes.map((dish) => {
                const primaryLoc = dish.locations?.[0];
                return (
                  <div
                    key={dish.id}
                    className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-amber-500/20 rounded-2xl p-5 shadow-xs dark:shadow-lg backdrop-blur-md flex flex-col justify-between hover:border-amber-400 dark:hover:border-amber-500/40 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base font-black text-slate-900 dark:text-white break-words">{dish.name}</h4>
                          {dish.shortName && dish.shortName !== dish.name && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              ({dish.shortName})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase whitespace-nowrap flex-shrink-0">
                          Chờ Duyệt
                        </span>
                      </div>

                      {/* Details tags */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {dish.mealTypes?.map((m) => (
                          <span
                            key={m}
                            className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md"
                          >
                            {m === 'sang' ? '🌅 Sáng' : m === 'trua' ? '☀️ Trưa' : '🌙 Tối'}
                          </span>
                        ))}
                        <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                          {dish.priceRange === 'under50' ? '< 50k' : dish.priceRange === '50to100' ? '50-100k' : '> 100k'}
                        </span>
                        <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                          {dish.type === 'nuoc' ? '🍜 Món Nước' : '🍱 Món Khô'}
                        </span>
                        {dish.vegetarian && (
                          <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                            🌱 Món Chay
                          </span>
                        )}
                      </div>

                      {/* Location snippet */}
                      {primaryLoc && (
                        <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400 flex-shrink-0" />
                            <span className="truncate">{primaryLoc.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate pl-5">
                            {primaryLoc.address}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenEdit(dish)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span>Sửa nhanh</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onRejectDish(dish.id, dish.name)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Từ chối</span>
                        </button>
                        <button
                          onClick={() => onApproveDish({ ...dish, status: 'approved' })}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-500/20 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Duyệt Món</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PENDING LOCATIONS LIST */}
      {activeSubTab === 'locations' && (
        <div className="space-y-4">
          {pendingLocations.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Không có quán nào chờ duyệt!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Hiện tại không có đề xuất địa chỉ quán ăn mới nào từ người dùng.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-amber-500/20 rounded-2xl p-5 shadow-xs dark:shadow-lg backdrop-blur-md flex flex-col justify-between hover:border-amber-400 dark:hover:border-amber-500/40 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-black text-slate-900 dark:text-white break-words">{loc.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                            🍜 {loc.dishName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0 whitespace-nowrap">
                        Chờ Duyệt
                      </span>
                    </div>

                    {/* Details tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(loc.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(loc.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                        Gợi ý quán mới
                      </span>
                    </div>

                    {/* Location snippet & Note */}
                    <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400 flex-shrink-0 mt-0.5" />
                        <span className="break-words">{loc.address}</span>
                      </div>
                      {loc.note && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pl-5 break-words">
                          &ldquo;{loc.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    {loc.directionUrl ? (
                      <a
                        href={loc.directionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-brand-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-brand-400 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Xem Maps</span>
                      </a>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onRejectLocation?.(loc.id, loc.dishName, loc.name)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                      <button
                        onClick={() => onApproveLocation?.(loc)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-500/20 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt Quán</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REPORTS QUEUE */}
      {activeSubTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Không có báo cáo vi phạm!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Hệ thống chưa ghi nhận bất kỳ báo cáo phản cảm hoặc spam nào từ người dùng.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-slate-900/80 border border-rose-500/20 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                        {report.targetType === 'dish' ? 'Món ăn vi phạm' : 'Đánh giá vi phạm'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(report.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{report.targetName || `Mã đối tượng: ${report.targetId}`}</span>
                    </div>
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <strong className="text-rose-300">Lý do:</strong> {report.reason}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {report.targetType === 'dish' && (
                      <button
                        onClick={() => onDeleteReportedDish(report.targetId)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition cursor-pointer"
                      >
                        Xóa Món Này
                      </button>
                    )}
                    <button
                      onClick={() => onResolveReport(report.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      Đã xử lý (Xóa báo cáo)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUICK EDIT MODAL */}
      {editingDish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={() => setEditingDish(null)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Sửa Nhanh Trước Khi Duyệt</span>
              </h3>
              <button
                onClick={() => setEditingDish(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAndApprove} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tên Món Ăn
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Bữa Ăn Phù Hợp
                </label>
                <div className="flex gap-2">
                  {(['sang', 'trua', 'toi'] as MealType[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMeal(m)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        editMeals.includes(m)
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {m === 'sang' ? 'Sáng' : m === 'trua' ? 'Trưa' : 'Tối'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Khoảng Giá
                  </label>
                  <select
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value as PriceRange)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
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
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as DishType)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="nuoc">Món Nước 🍜</option>
                    <option value="kho">Món Khô 🍱</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDish(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu & Duyệt Luôn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
