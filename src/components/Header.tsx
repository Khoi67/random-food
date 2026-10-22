import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, MoreVertical, History, ShieldCheck, Clock, LogOut, Bell, Check, ExternalLink, X } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled } from '../utils/audio.js';
import { signOutAdminGoogle } from '../services/firebase.js';
import { showToast } from '../utils/helpers.js';
import { Dish } from '../types/index.js';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenAdmin: () => void;
  onSignOut?: () => void;
  historyCount: number;
  cloudStatus: 'connected' | 'connecting' | 'offline';
  isAdmin: boolean;
  pendingDishes?: Dish[];
  reportsCount?: number;
  onApproveDish?: (dish: Dish) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenAdmin,
  onSignOut,
  historyCount,
  cloudStatus,
  isAdmin,
  pendingDishes = [],
  reportsCount = 0,
  onApproveDish,
}) => {
  const [sound, setSound] = useState(isSoundEnabled());
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  const totalPending = pendingDishes.length + reportsCount;

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
  };

  return (
    <header className={`sticky top-0 ${notifyOpen || menuOpen ? 'z-50' : 'z-30'} bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-500 via-orange-500 to-amber-400 p-0.5 shadow-md shadow-brand-500/20 flex-shrink-0 flex items-center justify-center">
            <span className="text-2xl" role="img" aria-label="Noodle bowl">🍜</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                Hôm Nay Ăn Gì?
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 hidden sm:inline-block">
                  TP.HCM
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden xs:block truncate max-w-[200px] sm:max-w-none">
              Vòng quay ẩm thực Sài Gòn • Quán ngon gần bạn
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          
          {/* Live Clock (Desktop only) */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-slate-200">{timeStr}</span>
          </div>

          {/* Cloud Sync Status Badge */}
          <div
            title={cloudStatus === 'connected' ? 'Đang đồng bộ Firebase Cloud' : 'Chế độ ngoại tuyến'}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 select-none"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cloudStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : cloudStatus === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-slate-500'
              }`}
            />
            <span className="hidden sm:inline text-[11px] font-medium">
              {cloudStatus === 'connected' ? 'Cloud Sync' : cloudStatus === 'connecting' ? 'Đang kết nối' : 'Ngoại tuyến'}
            </span>
          </div>

          {/* Sound Toggle Button */}
          <button
            onClick={handleToggleSound}
            aria-label={sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
            title={sound ? 'Âm thanh: ĐANG BẬT' : 'Âm thanh: ĐANG TẮT'}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
          >
            {sound ? <Volume2 className="w-4 h-4 text-brand-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Admin Notification Bell (Thông báo món & review/báo cáo cần duyệt) */}
          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifyOpen(!notifyOpen)}
                aria-label="Thông báo kiểm duyệt"
                title={totalPending > 0 ? `Có ${totalPending} mục cần phê duyệt` : 'Thông báo kiểm duyệt (0)'}
                className={`relative p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                  notifyOpen
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/20'
                    : totalPending > 0
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-sm'
                    : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Bell className={`w-4 h-4 ${totalPending > 0 ? 'animate-bounce' : ''}`} />
                {totalPending > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-lg animate-pulse border-2 border-slate-950">
                    {totalPending}
                  </span>
                )}
              </button>

              {/* Notification Popover Panel */}
              {notifyOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifyOpen(false)}
                  />
                  <div
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black p-4 z-50 flex flex-col max-h-[85vh] ring-1 ring-white/10"
                    style={{ backgroundColor: '#0f172a', opacity: 1 }}
                  >
                    {/* Popover Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white">Mục Cần Phê Duyệt</h3>
                          <p className="text-[10px] text-slate-400">
                            {totalPending > 0
                              ? `${totalPending} mục đang chờ quản trị viên xử lý`
                              : 'Hiện không có mục nào chờ duyệt'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotifyOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Popover List */}
                    <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
                      {totalPending === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 space-y-1.5">
                          <p className="text-2xl">✨</p>
                          <p className="font-semibold text-slate-300">Tất cả đã được xử lý xong!</p>
                          <p className="text-[11px] text-slate-500">
                            Không có món ăn hay báo cáo vi phạm nào đang chờ duyệt.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Danh sách món ăn chờ duyệt */}
                          {pendingDishes.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                                <span>🍜 Món ăn chờ duyệt ({pendingDishes.length})</span>
                              </div>
                              {pendingDishes.map((dish) => (
                                <div
                                  key={dish.id}
                                  className="p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-2 text-xs"
                                  style={{ backgroundColor: '#020617' }}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-white truncate">{dish.name}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                                        Chờ duyệt
                                      </span>
                                      {dish.type && (
                                        <span className="text-slate-500">
                                          {dish.type === 'nuoc' ? 'Món nước' : 'Món khô'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {onApproveDish && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await onApproveDish(dish);
                                      }}
                                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold text-[11px] flex items-center gap-1 transition flex-shrink-0 border border-emerald-500/20 active:scale-95 cursor-pointer"
                                      title="Duyệt nhanh món này"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Duyệt</span>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Báo cáo vi phạm / Đánh giá cần xử lý */}
                          {reportsCount > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                                <span>🚩 Báo cáo vi phạm & Đánh giá ({reportsCount})</span>
                              </div>
                              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-2">
                                <div className="text-xs">
                                  <p className="font-bold text-rose-300">
                                    {reportsCount} báo cáo vi phạm cần xử lý
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Bao gồm báo cáo sai địa chỉ hoặc nhận xét spam
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNotifyOpen(false);
                                    window.location.hash = '#/admin';
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] flex-shrink-0 transition active:scale-95 cursor-pointer shadow-md shadow-rose-500/20"
                                >
                                  Xử lý
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Popover Footer: Mở Trang Quản Trị Chi Tiết */}
                    <div className="pt-3 border-t border-slate-800/80 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setNotifyOpen(false);
                          window.location.hash = '#/admin';
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-95"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Mở Bảng Điều Khiển Chi Tiết (#/admin)</span>
                        <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Dropdown Menu "⋯" */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu chức năng mở rộng"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
            >
              <MoreVertical className="w-4 h-4" />
              {historyCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-md">
                  {historyCount}
                </span>
              )}
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 w-64 sm:w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black p-2 z-50 ring-1 ring-white/10"
                  style={{ backgroundColor: '#0f172a', opacity: 1 }}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenHistory();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <History className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>Lịch sử 14 ngày & Tránh lặp</span>
                    </span>
                    {historyCount > 0 && (
                      <span className="text-[10px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 ml-2">
                        {historyCount}
                      </span>
                    )}
                  </button>

                  {isAdmin ? (
                    <>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          window.location.hash = '#/admin';
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition cursor-pointer mb-1"
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span>Trang Quản Trị (#/admin)</span>
                        </span>
                        {totalPending > 0 ? (
                          <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-md font-extrabold animate-pulse">
                            ⏳ {totalPending}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono">👑</span>
                        )}
                      </button>

                      <button
                        onClick={async () => {
                          setMenuOpen(false);
                          if (onSignOut) {
                            onSignOut();
                          } else {
                            await signOutAdminGoogle();
                            showToast('Đã đăng xuất tài khoản Quản trị viên', 'info');
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <LogOut className="w-4 h-4 text-rose-400" />
                          <span>Đăng xuất</span>
                        </span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                        <span>Đăng nhập Quản trị viên</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">🔒</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
