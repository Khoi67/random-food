import React, { useState } from 'react';
import { Dish } from '../../types/index.js';
import { DEFAULT_DISHES_HCM } from '../../data/defaultDishes.js';
import { 
  Download, 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  FileJson, 
  X,
  Lock
} from 'lucide-react';
import { showToast } from '../../utils/helpers.js';

interface AdminBackupProps {
  dishes: Dish[];
  onRestoreDefaultMenu: (defaultDishes: Dish[]) => void;
}

export const AdminBackup: React.FC<AdminBackupProps> = ({
  dishes,
  onRestoreDefaultMenu,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [hasAgreedCheckbox, setHasAgreedCheckbox] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState('');

  // 1. Xuất file sao lưu JSON
  const handleExportJSON = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        totalDishes: dishes.length,
        version: '1.0.0',
        dishes: dishes,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      const filename = `random-food-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Đã tải xuống file sao lưu JSON an toàn! 💾', 'success');
      return true;
    } catch (err) {
      console.error('Lỗi xuất sao lưu:', err);
      showToast('Không thể xuất file sao lưu: ' + (err as Error).message, 'error');
      return false;
    }
  };

  // 2. Mở quy trình khôi phục: TỰ ĐỘNG TẢI FILE SAO LƯU TRƯỚC (BẮT BUỘC)
  const handleStartRestoreProcess = () => {
    // Tự động sao lưu trước khi mở modal
    handleExportJSON();
    setConfirmStep(1);
    setHasAgreedCheckbox(false);
    setConfirmInputText('');
    setShowConfirmModal(true);
  };

  // 3. Thực hiện khôi phục
  const handleFinalRestore = () => {
    if (confirmInputText.trim().toUpperCase() !== 'KHOI PHUC') {
      showToast('Vui lòng gõ chính xác "KHOI PHUC" để xác nhận!', 'warning');
      return;
    }

    onRestoreDefaultMenu(DEFAULT_DISHES_HCM as Dish[]);
    setShowConfirmModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export JSON Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center mb-4">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Xuất Bản Sao Lưu Dữ Liệu (JSON)</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Tải toàn bộ thực đơn hiện tại (gồm danh sách món ăn, địa điểm các quán tại TP.HCM, đánh giá của thực khách) về máy tính dưới định dạng JSON tiêu chuẩn.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-amber-400" />
                <span>Số lượng món sao lưu:</span>
              </span>
              <strong className="text-white font-mono">{dishes.length} món</strong>
            </div>
          </div>

          <button
            onClick={handleExportJSON}
            className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-orange-500 hover:from-brand-600 hover:to-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Tải Về File Sao Lưu (.JSON)</span>
          </button>
        </div>

        {/* Restore Default Menu Card */}
        <div className="bg-slate-900/80 border border-rose-500/20 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Khôi Phục Thực Đơn Chuẩn Gốc</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Đặt lại thực đơn về danh sách 30 món ăn đặc sản tiêu chuẩn của TP.HCM (Cơm tấm, Phở bò, Hủ tiếu, Bánh mì, v.v.). Hệ thống sẽ <strong>tự động xuất file sao lưu trước</strong> nhằm chống mất mát dữ liệu.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>Yêu cầu xác thực 2 bước an toàn trước khi thực hiện.</span>
            </div>
          </div>

          <button
            onClick={handleStartRestoreProcess}
            className="mt-6 w-full py-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Bắt Đầu Khôi Phục Thực Đơn</span>
          </button>
        </div>
      </div>

      {/* 2-STEP CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>Xác Nhận Khôi Phục Thực Đơn Gốc</span>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>Đã tự động tải xuống bản sao lưu JSON dữ liệu hiện tại về máy bạn.</span>
            </div>

            {/* Step 1: Checkbox */}
            {confirmStep === 1 && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Hành động này sẽ ghi đè thực đơn dùng chung trên Firebase Cloud và đưa hệ thống về 30 món ăn tiêu chuẩn của Sài Gòn.
                </p>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="confirmCheck"
                    checked={hasAgreedCheckbox}
                    onChange={(e) => setHasAgreedCheckbox(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="confirmCheck" className="text-xs text-slate-300 cursor-pointer select-none">
                    Tôi hiểu rõ hành động này và xác nhận muốn tiếp tục sang bước 2.
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    disabled={!hasAgreedCheckbox}
                    onClick={() => setConfirmStep(2)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      hasAgreedCheckbox
                        ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Tiếp Tục (Bước 2)
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Type Confirmation */}
            {confirmStep === 2 && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Vui lòng nhập từ khóa <strong className="text-rose-400 font-mono">KHOI PHUC</strong> vào ô bên dưới để hoàn tất:
                </p>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Gõ KHOI PHUC..."
                    value={confirmInputText}
                    onChange={(e) => setConfirmInputText(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:border-rose-500 focus:outline-none uppercase"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setConfirmStep(1)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Quay lại
                  </button>
                  <button
                    disabled={confirmInputText.trim().toUpperCase() !== 'KHOI PHUC'}
                    onClick={handleFinalRestore}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition ${
                      confirmInputText.trim().toUpperCase() === 'KHOI PHUC'
                        ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/20 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Đồng Ý Khôi Phục Gốc
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
