import React, { useState } from 'react';
import { SpinHistoryItem } from '../types/index.js';
import { X, Trash2, Calendar, AlertCircle } from 'lucide-react';
import {
  getSpinHistory,
  deleteSpinHistoryItem,
  clearSpinHistory,
  getAvoidDays,
  setAvoidDays,
} from '../services/history.js';
import { showToast } from '../utils/helpers.js';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHistoryChange: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onHistoryChange,
}) => {
  const [history, setHistory] = useState<SpinHistoryItem[]>(getSpinHistory());
  const [avoidDays, setLocalAvoidDays] = useState<number>(getAvoidDays());

  React.useEffect(() => {
    if (isOpen) {
      setHistory(getSpinHistory());
      setLocalAvoidDays(getAvoidDays());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeleteItem = (id: string) => {
    deleteSpinHistoryItem(id);
    const updated = getSpinHistory();
    setHistory(updated);
    onHistoryChange();
    showToast('Đã xóa món khỏi lịch sử!', 'info');
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử 14 ngày không?')) {
      clearSpinHistory();
      setHistory([]);
      onHistoryChange();
      showToast('Đã xóa sạch lịch sử!', 'success');
    }
  };

  const handleAvoidDaysChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const days = parseInt(e.target.value, 10);
    setLocalAvoidDays(days);
    setAvoidDays(days);
    onHistoryChange();
    showToast(
      days > 0
        ? `Đã cài đặt: Tránh lặp lại món đã ăn trong ${days} ngày gần nhất.`
        : 'Đã tắt tính năng tránh lặp món.',
      'info'
    );
  };

  const mealLabels: Record<string, string> = {
    sang: '🌅 Sáng',
    trua: '☀️ Trưa',
    toi: '🌙 Tối',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>Lịch Sử Quay 14 Ngày</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Ghi nhớ món ăn trên thiết bị của bạn
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avoid Repeat Selector Box */}
        <div className="my-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Tùy chọn tránh lặp lại món đã ăn:</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              value={avoidDays}
              onChange={handleAvoidDaysChange}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="0">Không tránh lặp (Quay ngẫu nhiên bình thường)</option>
              <option value="1">Tránh món đã ăn trong 1 ngày gần nhất (24 giờ)</option>
              <option value="2">Tránh món đã ăn trong 2 ngày gần nhất</option>
              <option value="3">Tránh món đã ăn trong 3 ngày gần nhất</option>
              <option value="7">Tránh món đã ăn trong 7 ngày gần nhất (1 tuần)</option>
              <option value="14">Tránh món đã ăn trong 14 ngày gần nhất (2 tuần)</option>
            </select>
          </div>
          <p className="text-[10px] text-slate-500">
            Các món nằm trong khoảng thời gian này sẽ tự động được ẩn khỏi vòng quay.
          </p>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <span className="text-3xl block mb-2">🍜</span>
              <p className="font-semibold text-slate-300 text-sm">
                Chưa có món nào trong lịch sử 14 ngày
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Mỗi khi bạn bấm "Quay ngay", món trúng sẽ tự động được lưu tại đây.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const date = new Date(item.timestamp);
              const dateStr =
                date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
                ' - ' +
                date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="min-w-0 flex-1 flex items-center space-x-2.5">
                    <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex-shrink-0">
                      {mealLabels[item.mealType] || '🍜'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-white text-xs block truncate">
                        {item.dishName}
                      </span>
                      <span className="text-[10px] text-slate-500">{dateStr}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    aria-label="Xóa món khỏi lịch sử"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ lịch sử</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
