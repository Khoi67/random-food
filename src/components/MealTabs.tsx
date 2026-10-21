import React from 'react';
import { MealType } from '../types/index.js';

interface MealTabsProps {
  currentMeal: MealType;
  onSelectMeal: (meal: MealType) => void;
  mealCounts: Record<MealType, number>;
}

export const MealTabs: React.FC<MealTabsProps> = ({
  currentMeal,
  onSelectMeal,
  mealCounts,
}) => {
  const tabs: { key: MealType; label: string; icon: string }[] = [
    { key: 'sang', label: 'Bữa Sáng', icon: '🌅' },
    { key: 'trua', label: 'Bữa Trưa', icon: '☀️' },
    { key: 'toi', label: 'Chiều / Tối', icon: '🌙' },
  ];

  return (
    <div className="bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 max-w-md mx-auto shadow-inner">
      <div className="grid grid-cols-3 gap-1.5">
        {tabs.map((tab) => {
          const isActive = currentMeal === tab.key;
          const count = mealCounts[tab.key] || 0;

          return (
            <button
              key={tab.key}
              onClick={() => onSelectMeal(tab.key)}
              className={`flex items-center justify-center space-x-1.5 sm:space-x-2 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-brand-500 to-rose-500 text-white shadow-lg shadow-brand-500/25 scale-[1.02]'
                  : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-900 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
