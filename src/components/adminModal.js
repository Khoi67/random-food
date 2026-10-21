import { hashPin } from '../services/storage.js';
import { 
  syncAdminPinToCloud, 
  signInAdminGoogle, 
  signOutAdminGoogle, 
  getCurrentUser, 
  getAdminEmail,
  isCurrentUserAdmin,
  getReportsCloud,
  resolveReportCloud
} from '../services/firebase.js';
import { ADMIN_PIN_HASH_KEY } from '../utils/constants.js';
import { showToast, escapeHtml } from '../utils/helpers.js';
import { DEFAULT_DISHES_HCM } from '../data/defaultDishes.js';

let isAdminAuthenticated = false;
let pendingAdminCallback = null;
let currentPinHash = null;
let activeAdminTab = 'pending'; // 'pending' | 'reports' | 'testCleaner' | 'restore' | 'settings'

let getDishesCallback = null;
let setDishesCallback = null;
let saveDishesCallback = null;
let updateTabsCallback = null;

export function getIsAdmin() {
  return isAdminAuthenticated || isCurrentUserAdmin();
}

export function getCurrentPinHash() {
  return currentPinHash;
}

export function setCurrentPinHash(hash) {
  currentPinHash = hash;
}

export function initAdminModal({ initialPinHash, getDishes, setDishes, onSaveDishes, onUpdateTabs }) {
  if (initialPinHash) currentPinHash = initialPinHash;
  getDishesCallback = getDishes;
  setDishesCallback = setDishes;
  saveDishesCallback = onSaveDishes;
  updateTabsCallback = onUpdateTabs;

  const adminLockBtn = document.getElementById('adminLockBtn');
  const closeAdminModalBtn = document.getElementById('closeAdminModalBtn');
  const adminModal = document.getElementById('adminModal');

  if (adminLockBtn) {
    adminLockBtn.addEventListener('click', () => {
      showAdminModal();
    });
  }

  if (closeAdminModalBtn) {
    closeAdminModalBtn.addEventListener('click', hideAdminModal);
  }

  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) hideAdminModal();
    });
  }

  // Khởi tạo giao diện Admin ban đầu
  updateAdminUI(false);
}

export function requireAdminPermission(actionName, callback) {
  if (getIsAdmin()) {
    callback();
    return;
  }

  pendingAdminCallback = callback;
  showAdminModal();
  showToast(`Cần quyền Quản trị viên để thực hiện: ${actionName}`, "warning");
}

export function showAdminModal() {
  const adminModal = document.getElementById('adminModal');
  if (!adminModal) return;

  renderAdminModalContent();

  adminModal.classList.remove('modal-enter');
  adminModal.classList.add('modal-show');
}

export function hideAdminModal() {
  const adminModal = document.getElementById('adminModal');
  if (adminModal) {
    adminModal.classList.remove('modal-show');
    adminModal.classList.add('modal-enter');
  }
  pendingAdminCallback = null;
}

/**
 * Render động nội dung Admin Modal (Đăng nhập Google / PIN hoặc Dashboard đầy đủ tính năng)
 */
export async function renderAdminModalContent() {
  const container = document.getElementById('adminModalBody');
  if (!container) return;

  const isAdmin = getIsAdmin();
  const user = getCurrentUser();
  const configuredAdminEmail = getAdminEmail();

  if (!isAdmin) {
    // Giao diện khi CHƯA có quyền Admin
    container.innerHTML = `
      <div class="flex flex-col items-center text-center mb-5">
        <div class="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl mb-2.5 shadow-lg shadow-amber-500/10">
          🔐
        </div>
        <h3 class="text-base font-bold text-white">Xác Thực Quản Trị Viên</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-xs">
          Đăng nhập bằng tài khoản Google Quản trị viên được bảo vệ bởi Firebase Security Rules.
        </p>
      </div>

      <!-- Nút Đăng nhập Google -->
      <div class="space-y-4">
        <button id="googleSignInBtn" type="button"
          class="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center space-x-2.5 shadow-lg shadow-white/10 transition cursor-pointer">
          <svg class="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Đăng nhập bằng Google Admin</span>
        </button>

        ${configuredAdminEmail ? `
          <p class="text-[11px] text-center text-slate-400">
            Email quản trị hợp lệ: <span class="text-amber-300 font-mono font-semibold">${escapeHtml(configuredAdminEmail)}</span>
          </p>
        ` : ''}

        <div class="relative flex py-1 items-center">
          <div class="flex-grow border-t border-slate-800"></div>
          <span class="flex-shrink mx-3 text-slate-500 text-[10px] uppercase font-bold tracking-wider">Hoặc dùng PIN cục bộ</span>
          <div class="flex-grow border-t border-slate-800"></div>
        </div>

        <!-- Mở khóa bằng mã PIN -->
        <form id="adminPinInlineForm" class="space-y-3">
          <div>
            <input type="password" id="adminPinInlineInput" placeholder="Nhập mã PIN Admin..."
              class="w-full bg-slate-950/80 border border-slate-700/80 focus:border-amber-500 text-center text-sm font-mono text-white rounded-xl px-3.5 py-2.5 outline-none transition">
          </div>
          <button type="submit"
            class="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700 cursor-pointer">
            Mở Khóa Bằng PIN
          </button>
        </form>

        <div class="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
          💡 <span class="text-slate-300 font-semibold">Ghi chú bảo mật:</span> Đăng nhập Google xác thực danh tính Admin ở cấp độ máy chủ Firebase Rules. Mã PIN là lớp khóa tiện lợi trên giao diện (UI Lock).
        </div>
      </div>
    `;

    // Gắn sự kiện Google Sign-In
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        googleBtn.disabled = true;
        googleBtn.innerHTML = `<span>Đang kết nối Google...</span>`;
        const res = await signInAdminGoogle();
        if (res && res.isAdmin) {
          isAdminAuthenticated = true;
          updateAdminUI(true);
          renderAdminModalContent();
          if (pendingAdminCallback) {
            const cb = pendingAdminCallback;
            pendingAdminCallback = null;
            cb();
          }
        } else {
          renderAdminModalContent();
        }
      });
    }

    // Gắn sự kiện PIN Form
    const pinForm = document.getElementById('adminPinInlineForm');
    if (pinForm) {
      pinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('adminPinInlineInput');
        if (!input) return;
        const enteredPin = input.value.trim();
        if (!enteredPin) return;

        const enteredHash = await hashPin(enteredPin);
        const targetHash = currentPinHash || localStorage.getItem(ADMIN_PIN_HASH_KEY);

        if (!targetHash) {
          showToast("Đang tải dữ liệu mã PIN từ Cloud, vui lòng thử lại sau giây lát...", "warning");
          return;
        }

        if (enteredHash === targetHash) {
          isAdminAuthenticated = true;
          updateAdminUI(true);
          showToast("Đã mở khóa quyền Admin thành công!", "success");
          renderAdminModalContent();
          if (pendingAdminCallback) {
            const cb = pendingAdminCallback;
            pendingAdminCallback = null;
            cb();
          }
        } else {
          showToast("Mã PIN không chính xác! Vui lòng thử lại", "error");
          input.value = '';
          input.focus();
        }
      });
    }

  } else {
    // Giao diện khi ĐÃ ĐĂNG NHẬP ADMIN (Dashboard đầy đủ tính năng)
    const allDishes = getDishesCallback ? getDishesCallback() : [];
    const pendingDishes = allDishes.filter(d => d.status === 'pending');
    const reports = await getReportsCloud();
    const testDishes = allDishes.filter(d => d.name && /test/i.test(d.name));

    container.innerHTML = `
      <!-- Header Admin Info -->
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div class="flex items-center space-x-2.5">
          <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-lg border border-amber-500/30">
            👑
          </div>
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Bảng Quản Trị Hệ Thống</span>
              <span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">Admin Active</span>
            </h3>
            <p class="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              ${user?.email ? escapeHtml(user.email) : 'Chế độ Admin bằng PIN'}
            </p>
          </div>
        </div>

        <button id="adminLogoutBtn" type="button"
          class="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-rose-950/60 hover:border-rose-700/60 text-slate-300 hover:text-rose-200 text-xs font-semibold transition cursor-pointer">
          Đăng xuất
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center space-x-1.5 overflow-x-auto pb-2 mb-3 text-xs scrollbar-none">
        <button type="button" class="admin-tab-btn px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${activeAdminTab === 'pending' ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}" data-tab="pending">
          ⏳ Chờ duyệt (${pendingDishes.length})
        </button>
        <button type="button" class="admin-tab-btn px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${activeAdminTab === 'reports' ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}" data-tab="reports">
          🚩 Báo cáo (${reports.length})
        </button>
        <button type="button" class="admin-tab-btn px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${activeAdminTab === 'testCleaner' ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}" data-tab="testCleaner">
          🧹 Dọn món test (${testDishes.length})
        </button>
        <button type="button" class="admin-tab-btn px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${activeAdminTab === 'restore' ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}" data-tab="restore">
          🔄 Khôi phục mẫu
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="adminTabContent" class="min-h-[220px] max-h-[360px] overflow-y-auto pr-1">
        <!-- Render nội dung theo activeAdminTab -->
      </div>
    `;

    // Render nội dung tab đang chọn
    renderActiveAdminTab(pendingDishes, reports, testDishes);

    // Gắn sự kiện chuyển tab
    container.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeAdminTab = btn.getAttribute('data-tab');
        renderAdminModalContent();
      });
    });

    // Gắn sự kiện Đăng xuất
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await signOutAdminGoogle();
        isAdminAuthenticated = false;
        updateAdminUI(false);
        showToast("Đã khóa chế độ Quản trị viên (Khách)", "info");
        renderAdminModalContent();
      });
    }
  }
}

/**
 * Render chi tiết từng Tab chức năng trong Admin Dashboard
 */
function renderActiveAdminTab(pendingDishes, reports, testDishes) {
  const contentArea = document.getElementById('adminTabContent');
  if (!contentArea) return;

  if (activeAdminTab === 'pending') {
    // 1. Quản lý Món Chờ Duyệt (Requirement 7)
    if (pendingDishes.length === 0) {
      contentArea.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 text-center text-slate-400 space-y-2">
          <span class="text-3xl">🎉</span>
          <p class="text-xs font-semibold text-slate-300">Không có món nào đang chờ duyệt!</p>
          <p class="text-[11px] text-slate-500">Món mới do người dùng thêm vào sẽ xuất hiện tại đây để bạn kiểm duyệt trước khi lên vòng quay.</p>
        </div>
      `;
    } else {
      contentArea.innerHTML = `
        <div class="space-y-2.5">
          ${pendingDishes.map(d => `
            <div class="p-3 rounded-2xl bg-slate-800/80 border border-amber-500/30 text-xs space-y-2" data-pending-id="${escapeHtml(d.id)}">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-bold text-white text-sm">${escapeHtml(d.name)}</h4>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    📍 ${d.locations ? d.locations.length : 0} quán • Bữa: ${(d.mealTypes || []).join(', ')}
                  </p>
                </div>
                <span class="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Chờ duyệt
                </span>
              </div>
              <div class="flex items-center justify-end space-x-2 pt-1 border-t border-slate-700/60">
                <button type="button" class="reject-dish-btn px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 font-semibold text-xs border border-rose-500/30 transition cursor-pointer" data-id="${escapeHtml(d.id)}">
                  ✕ Từ chối
                </button>
                <button type="button" class="approve-dish-btn px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition cursor-pointer" data-id="${escapeHtml(d.id)}">
                  ✓ Duyệt lên vòng quay
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Gắn sự kiện duyệt / từ chối món
      contentArea.querySelectorAll('.approve-dish-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          approveDish(id);
        });
      });
      contentArea.querySelectorAll('.reject-dish-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          rejectDish(id);
        });
      });
    }

  } else if (activeAdminTab === 'reports') {
    // 2. Quản lý Báo Cáo Vi Phạm (Requirement 7)
    if (reports.length === 0) {
      contentArea.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 text-center text-slate-400 space-y-2">
          <span class="text-3xl">🛡️</span>
          <p class="text-xs font-semibold text-slate-300">Không có báo cáo vi phạm nào!</p>
          <p class="text-[11px] text-slate-500">Mọi báo cáo về quán ăn, nội dung sai lệch hay ngôn từ không phù hợp sẽ được lưu tại đây.</p>
        </div>
      `;
    } else {
      contentArea.innerHTML = `
        <div class="space-y-2.5">
          ${reports.map(rep => `
            <div class="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-rose-300 flex items-center gap-1 text-[11px]">
                  <span>🚩 Báo cáo:</span>
                  <span class="text-slate-200">${escapeHtml(rep.targetName || rep.targetType)}</span>
                </span>
                <span class="text-[10px] text-slate-500">
                  ${rep.createdAt ? new Date(rep.createdAt).toLocaleDateString('vi-VN') : ''}
                </span>
              </div>
              <p class="text-slate-300 leading-relaxed bg-slate-950/60 p-2 rounded-xl text-[11px] border border-slate-800">
                "${escapeHtml(rep.reason || 'Nội dung không phù hợp')}"
              </p>
              <div class="flex items-center justify-end pt-1">
                <button type="button" class="resolve-report-btn px-3 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition cursor-pointer" data-rep-id="${escapeHtml(rep.id)}">
                  Đánh dấu Đã xử lý ✓
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      contentArea.querySelectorAll('.resolve-report-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-rep-id');
          await resolveReportCloud(id);
          showToast("Đã xử lý xong báo cáo vi phạm!", "success");
          renderAdminModalContent();
        });
      });
    }

  } else if (activeAdminTab === 'testCleaner') {
    // 3. Quét & Xóa Món Test (Requirement 9)
    contentArea.innerHTML = `
      <div class="space-y-3.5">
        <div class="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-2">
          <p class="font-bold text-slate-200">🧹 Công Cụ Quét Dọn Món Test Tự Động:</p>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Hệ thống sẽ quét toàn bộ danh sách món ăn trên Cloud và Máy có tên chứa từ <code class="text-amber-300 font-bold">"test"</code> (không phân biệt hoa thường).
          </p>
        </div>

        ${testDishes.length === 0 ? `
          <div class="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center">
            <span class="text-emerald-400 font-bold text-xs">✅ Danh sách sạch sẽ! Không tìm thấy món test nào.</span>
          </div>
        ` : `
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs px-1">
              <span class="font-semibold text-rose-300">Tìm thấy ${testDishes.length} món test:</span>
            </div>
            <div class="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              ${testDishes.map(td => `
                <div class="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900 text-slate-300 text-[11px]">
                  <span class="font-semibold text-white truncate max-w-[200px]">${escapeHtml(td.name)}</span>
                  <span class="text-slate-500 text-[10px]">${td.status || 'approved'}</span>
                </div>
              `).join('')}
            </div>

            <button id="confirmDeleteTestDishesBtn" type="button"
              class="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-lg shadow-rose-600/20 cursor-pointer">
              Xác Nhận Xóa Vĩnh Viễn ${testDishes.length} Món Test Này
            </button>
          </div>
        `}
      </div>
    `;

    const confirmBtn = document.getElementById('confirmDeleteTestDishesBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        deleteTestDishes();
      });
    }

  } else if (activeAdminTab === 'restore') {
    // 4. Khôi Phục Dữ Liệu Mẫu (2 Bước an toàn) (Requirement 5)
    contentArea.innerHTML = `
      <div class="space-y-4">
        <div class="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-xs space-y-2 text-rose-200">
          <p class="font-bold flex items-center gap-1.5 text-sm text-rose-400">
            <span>⚠️ CẢNH BÁO NGUY HIỂM (2 BƯỚC XÁC NHẬN)</span>
          </p>
          <p class="text-[11px] leading-relaxed text-slate-300">
            Hành động này sẽ thay thế <span class="font-bold text-white">TOÀN BỘ</span> thực đơn dùng chung của mọi người trên Cloud bằng 27 món mẫu gốc chuẩn vị TP.HCM.
          </p>
        </div>

        <div class="space-y-2">
          <label for="restoreConfirmInput" class="block text-xs font-semibold text-slate-300">
            Để xác nhận, vui lòng gõ chính xác chữ <span class="font-mono text-amber-300 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">KHOI PHUC</span> vào bên dưới:
          </label>
          <input type="text" id="restoreConfirmInput" placeholder="Gõ KHOI PHUC vào đây..."
            class="w-full bg-slate-950 border border-slate-700 text-xs rounded-xl p-2.5 text-white font-mono outline-none focus:border-rose-500">
        </div>

        <button id="finalConfirmRestoreBtn" type="button" disabled
          class="w-full py-2.5 px-4 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs transition cursor-not-allowed">
          Xác Nhận Khôi Phục Thực Đơn Mẫu
        </button>
      </div>
    `;

    const confirmInput = document.getElementById('restoreConfirmInput');
    const finalBtn = document.getElementById('finalConfirmRestoreBtn');
    if (confirmInput && finalBtn) {
      confirmInput.addEventListener('input', () => {
        if (confirmInput.value.trim() === 'KHOI PHUC') {
          finalBtn.disabled = false;
          finalBtn.className = "w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold text-xs transition shadow-lg shadow-rose-600/30 cursor-pointer";
        } else {
          finalBtn.disabled = true;
          finalBtn.className = "w-full py-2.5 px-4 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs transition cursor-not-allowed";
        }
      });

      finalBtn.addEventListener('click', () => {
        executeRestoreDefaultDishes();
      });
    }
  }
}

/**
 * Duyệt món ăn (Pending -> Approved)
 */
function approveDish(dishId) {
  if (!getDishesCallback || !saveDishesCallback) return;
  const dishes = getDishesCallback();
  const target = dishes.find(d => d.id === dishId);
  if (!target) return;

  target.status = 'approved';
  saveDishesCallback();
  showToast(`Đã duyệt món "${target.name}" lên vòng quay! 🎉`, "success");
  if (updateTabsCallback) updateTabsCallback();
  renderAdminModalContent();
}

/**
 * Từ chối món ăn
 */
function rejectDish(dishId) {
  if (!getDishesCallback || !setDishesCallback || !saveDishesCallback) return;
  let dishes = getDishesCallback();
  const target = dishes.find(d => d.id === dishId);
  if (!target) return;

  dishes = dishes.filter(d => d.id !== dishId);
  setDishesCallback(dishes);
  saveDishesCallback();
  showToast(`Đã từ chối món "${target.name}"!`, "info");
  if (updateTabsCallback) updateTabsCallback();
  renderAdminModalContent();
}

/**
 * Xóa toàn bộ món test
 */
function deleteTestDishes() {
  if (!getDishesCallback || !setDishesCallback || !saveDishesCallback) return;
  let dishes = getDishesCallback();
  const beforeCount = dishes.length;
  dishes = dishes.filter(d => !d.name || !/test/i.test(d.name));
  const removedCount = beforeCount - dishes.length;

  setDishesCallback(dishes);
  saveDishesCallback();
  showToast(`Đã dọn dẹp thành công ${removedCount} món test! 🧹`, "success");
  if (updateTabsCallback) updateTabsCallback();
  renderAdminModalContent();
}

/**
 * Thực hiện khôi phục thực đơn gốc TP.HCM
 */
function executeRestoreDefaultDishes() {
  if (!setDishesCallback || !saveDishesCallback) return;
  const defaults = JSON.parse(JSON.stringify(DEFAULT_DISHES_HCM));
  defaults.forEach(d => d.status = 'approved');
  setDishesCallback(defaults);
  saveDishesCallback();
  showToast("Đã khôi phục thực đơn gốc TP.HCM thành công! 🍜", "success");
  if (updateTabsCallback) updateTabsCallback();
  hideAdminModal();
}

export function updateAdminUI(isAdmin) {
  const adminLockBtn = document.getElementById('adminLockBtn');
  const adminLockIcon = document.getElementById('adminLockIcon');
  const adminLockText = document.getElementById('adminLockText');

  if (!adminLockBtn) return;

  if (isAdmin || getIsAdmin()) {
    if (adminLockIcon) adminLockIcon.textContent = "🔓";
    if (adminLockText) adminLockText.textContent = "Admin";
    adminLockBtn.className = "text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white px-2.5 py-1.5 sm:py-2 rounded-xl border border-amber-500/40 transition flex items-center space-x-1.5 cursor-pointer shadow-sm";
  } else {
    if (adminLockIcon) adminLockIcon.textContent = "🔒";
    if (adminLockText) adminLockText.textContent = "Khách";
    adminLockBtn.className = "text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 sm:py-2 rounded-xl border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer";
  }
}
