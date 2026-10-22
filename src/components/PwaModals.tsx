import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { promptPwaInstall } from '../services/pwa.js';

interface PwaModalsProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
}

export const PwaModals: React.FC<PwaModalsProps> = ({
  isModalOpen,
  onCloseModal,
}) => {
  const [isIos, setIsIos] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIosDetected =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(isIosDetected);

    // Check banner dismissed in sessionStorage
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (!dismissed && !isStandalone) {
      const timer = setTimeout(() => setShowBanner(true), 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleInstallClick = async () => {
    await promptPwaInstall();
    onCloseModal();
    setShowBanner(false);
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <>
      {/* Floating Bottom Banner */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-slate-900/95 border border-brand-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center space-x-3 min-w-0">
            <img
              src="/icons/icon-192.png"
              alt="Icon"
              className="w-10 h-10 rounded-xl flex-shrink-0 border border-brand-500/40 object-cover shadow-sm"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                Cài Đặt App "Hôm Nay Ăn Gì?"
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Mở nhanh & lưu ngoại tuyến
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-rose-500 hover:from-brand-600 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95"
            >
              Cài Đặt
            </button>
            <button
              onClick={handleDismissBanner}
              aria-label="Đóng banner"
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={onCloseModal}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onCloseModal}
              aria-label="Đóng cửa sổ"
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-500 to-amber-400 mx-auto p-0.5 shadow-xl shadow-brand-500/20 flex items-center justify-center mb-3">
              <img
                src="/icons/icon-192.png"
                alt="App Icon"
                className="w-full h-full rounded-[22px] object-cover"
              />
            </div>

            <h2 className="text-lg font-black text-white">Cài Đặt Lên Màn Hình Chính</h2>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Mở app tức thì không cần nhập URL • Chơi offline không cần mạng • Mượt mà như Native App
            </p>

            {isIos ? (
              /* iOS Safari Instructions */
              <div className="text-left bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>Hướng dẫn cho iPhone / iPad (Safari):</span>
                </div>
                <ol className="space-y-2 text-slate-300 list-decimal list-inside text-[11px] leading-relaxed">
                  <li>
                    Bấm vào biểu tượng <strong className="text-white bg-slate-800 px-1 py-0.5 rounded">Chia sẻ ⎋</strong> ở thanh dưới trình duyệt Safari.
                  </li>
                  <li>
                    Cuộn xuống và chọn <strong className="text-amber-300">"Thêm vào MH chính" (Add to Home Screen)</strong>.
                  </li>
                  <li>
                    Bấm <strong className="text-emerald-400">"Thêm" (Add)</strong> ở góc trên bên phải để hoàn tất!
                  </li>
                </ol>
              </div>
            ) : (
              /* Android / Desktop Install Button */
              <div className="space-y-3">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-rose-500 hover:from-brand-600 text-white font-black text-sm shadow-xl shadow-brand-500/25 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Cài Đặt Ngay (Miễn phí)</span>
                </button>
                <p className="text-[11px] text-slate-500">
                  Không tốn dung lượng máy • Không qua App Store • An toàn 100%
                </p>
              </div>
            )}

            <button
              onClick={onCloseModal}
              className="mt-4 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Để sau
            </button>
          </div>
        </div>
      )}
    </>
  );
};
