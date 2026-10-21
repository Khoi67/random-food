import React from 'react';
import { FilterState, PriceRange, DishType } from '../types/index.js';
import { RotateCcw } from 'lucide-react';

interface QuickFiltersProps {
  filters: FilterState;
  onChangeFilters: (newFilters: FilterState) => void;
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({
  filters,
  onChangeFilters,
}) => {
  const isFiltering =
    filters.price !== 'all' || filters.dishType !== 'all' || filters.vegOnly;

  const handlePriceChange = (val: 'all' | PriceRange) => {
    onChangeFilters({ ...filters, price: val });
  };

  const handleTypeChange = (val: 'all' | DishType) => {
    onChangeFilters({ ...filters, dishType: val });
  };

  const handleVegToggle = () => {
    onChangeFilters({ ...filters, vegOnly: !filters.vegOnly });
  };

  const handleReset = () => {
    onChangeFilters({ price: 'all', dishType: 'all', vegOnly: false });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2 py-1 max-w-2xl mx-auto">
      {/* Price Filters */}
      <div className="flex items-center space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
        <span className="text-[10px] text-slate-500 font-semibold px-1.5">Giá:</span>
        {(
          [
            { key: 'all', label: 'Tất cả' },
            { key: 'under50', label: '< 50k' },
            { key: '50to100', label: '50-100k' },
            { key: 'above100', label: '> 100k' },
          ] as const
        ).map((item) => {
          const active = filters.price === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handlePriceChange(item.key)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                active
                  ? 'bg-brand-500 text-white font-bold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Dish Type Filters */}
      <div className="flex items-center space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
        <span className="text-[10px] text-slate-500 font-semibold px-1.5">Kiểu:</span>
        {(
          [
            { key: 'all', label: 'Tất cả' },
            { key: 'nuoc', label: '🍜 Nước' },
            { key: 'kho', label: '🥢 Khô' },
          ] as const
        ).map((item) => {
          const active = filters.dishType === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleTypeChange(item.key)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                active
                  ? 'bg-brand-500 text-white font-bold shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Vegetarian Toggle */}
      <button
        onClick={handleVegToggle}
        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
          filters.vegOnly
            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/40'
            : 'bg-slate-900/60 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30'
        }`}
      >
        <span>🌱</span>
        <span>Ăn chay</span>
      </button>

      {/* Reset Button */}
      {isFiltering && (
        <button
          onClick={handleReset}
          className="px-2 py-1.5 rounded-xl text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 transition flex items-center gap-1 cursor-pointer animate-in fade-in"
          title="Xóa tất cả bộ lọc"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Đặt lại</span>
        </button>
      )}
    </div>
  );
};
