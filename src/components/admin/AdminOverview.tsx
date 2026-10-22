import React from 'react';
import { Dish, ReportItem } from '../../types/index.js';
import { 
  UtensilsCrossed, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Sun,
  CloudSun,
  Moon
} from 'lucide-react';

interface AdminOverviewProps {
  dishes: Dish[];
  pendingDishes: Dish[];
  reports: ReportItem[];
  onNavigateTab: (tab: 'queue' | 'dishes' | 'reviews' | 'backup' | 'logs') => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  dishes,
  pendingDishes,
  reports,
  onNavigateTab,
}) => {
  const approvedDishes = dishes.filter((d) => d.status === 'approved' || !d.status);
  const pendingCount = pendingDishes.length;
  const reportsCount = reports.length;

  const sangCount = approvedDishes.filter((d) => 
    d.meal === 'sang' || (Array.isArray(d.mealTypes) && d.mealTypes.includes('sang'))
  ).length;

  const truaCount = approvedDishes.filter((d) => 
    d.meal === 'trua' || (Array.isArray(d.mealTypes) && d.mealTypes.includes('trua'))
  ).length;

  const toiCount = approvedDishes.filter((d) => 
    d.meal === 'toi' || (Array.isArray(d.mealTypes) && d.mealTypes.includes('toi'))
  ).length;

  const totalReviewsCount = dishes.reduce((total, dish) => {
    let count = dish.reviews?.length || 0;
    if (dish.locations) {
      dish.locations.forEach((loc) => {
        count += loc.reviews?.length || 0;
      });
    }
    return total + count;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Approved */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Món Đang Phục Vụ
            </span>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{approvedDishes.length}</span>
            <button
              onClick={() => onNavigateTab('dishes')}
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition"
            >
              Xem thực đơn <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Chờ Phê Duyệt
            </span>
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-white">{pendingCount}</span>
              {pendingCount > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  Cần xử lý
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigateTab('queue')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
            >
              Duyệt ngay <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Reports Queue */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Báo Cáo Vi Phạm
            </span>
            <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-white">{reportsCount}</span>
              {reportsCount > 0 && (
                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                  Vi phạm
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigateTab('queue')}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
            >
              Xem báo cáo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng Đánh Giá
            </span>
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{totalReviewsCount}</span>
            <button
              onClick={() => onNavigateTab('reviews')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
            >
              Kiểm duyệt <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Meals Distribution */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <span>Phân Bố Theo Bữa Ăn TP.HCM</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Bữa Sáng</div>
                <div className="text-lg font-bold text-white">{sangCount} món</div>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {approvedDishes.length > 0 ? Math.round((sangCount / approvedDishes.length) * 100) : 0}%
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <CloudSun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Bữa Trưa</div>
                <div className="text-lg font-bold text-white">{truaCount} món</div>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {approvedDishes.length > 0 ? Math.round((truaCount / approvedDishes.length) * 100) : 0}%
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Bữa Chiều / Tối</div>
                <div className="text-lg font-bold text-white">{toiCount} món</div>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {approvedDishes.length > 0 ? Math.round((toiCount / approvedDishes.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
