import './css/style.css';
import { 
  ADD_DISH_COOLDOWN_MS, 
  MAX_SHARED_DISHES 
} from './utils/constants.js';
import { DEFAULT_DISHES_HCM } from './data/defaultDishes.js';
import { 
  loadDishesFromLocal, 
  saveDishesLocally, 
  initAdminPinSecurity,
  normalizeDish 
} from './services/storage.js';
import { 
  initFirebase, 
  saveDishesCloud,
  getCurrentUser,
  isCurrentUserAdmin,
  submitReportCloud
} from './services/firebase.js';
import { 
  isSoundEnabled, 
  setSoundEnabled, 
  playTickSound 
} from './utils/audio.js';
import { 
  showToast, 
  escapeHtml, 
  detectMealByCurrentTime 
} from './utils/helpers.js';
import { 
  initWheelCanvas, 
  drawWheel, 
  spinWheel 
} from './components/wheel.js';
import { 
  initAdminModal, 
  requireAdminPermission, 
  getCurrentPinHash, 
  setCurrentPinHash,
  updateAdminUI,
  getIsAdmin
} from './components/adminModal.js';
import { 
  initReviewsSystem, 
  getDishRatingSummary, 
  showReviewModal 
} from './components/reviews.js';
import { 
  initResultModal, 
  showResultModal 
} from './components/resultModal.js';
import {
  getSpinHistory,
  recordSpinHistory,
  deleteSpinHistoryItem,
  clearSpinHistory,
  getAvoidDays,
  setAvoidDays,
  getRecentlyEatenDishIds,
  isFavoriteDish,
  toggleFavoriteDish
} from './services/history.js';

// Application State
let dishes = [];
let currentMeal = 'sang';
let lastAddDishTimestamp = 0;
let excludedDishIds = new Set(); // Món ăn tạm loại khỏi vòng quay phiên hiện tại (Requirement 5)

// Quick Filter State (Requirement 3.1)
let currentFilters = {
  price: 'all',    // 'all' | 'under50' | '50to100' | 'above100'
  dishType: 'all', // 'all' | 'nuoc' | 'kho'
  vegOnly: false   // boolean
};

// Current Active Report State
let activeReportTarget = null;

// DOM Element References
let wheelCanvas;
let mainSpinBtn;
let centerSpinBtn;
let wheelStatusMessage;
let activeWheelCount;
let currentMealHeading;
let currentMealSubheading;
let currentListCategoryName;
let currentListTotalBadge;
let dishItemsContainer;
let emptyListState;
let searchDishInput;
let addDishForm;
let dishNameInput;
let dishShortNameInput;
let dishLocationsInput;
let liveClockText;
let autoActiveText;
let toggleSoundBtn;
let soundOnIcon;
let soundOffIcon;
let dataSaveModeBadge;
let cloudStatusDot;
let cloudStatusText;
let dishListSkeleton;
let offlineBanner;

// Quick Filter Elements (Requirement 3.1)
let quickFilterBtns = [];
let resetQuickFiltersBtn = null;
let dishPriceRangeInput;
let dishTypeInput;
let dishVegetarianInput;
let dishTagsInput;

// Modal Thêm Món
let addDishModal;
let closeAddDishModalBtn;
let cancelAddDishBtn;
let openAddDishModalBtn;
let openAddDishMobileBtn;
let emptyStateAddDishBtn;

// Header More Menu
let headerMoreMenuBtn;
let headerMoreMenu;

// Modal Báo Cáo
let reportModal;
let closeReportModalBtn;
let cancelReportBtn;
let reportForm;
let reportTargetName;
let reportReasonInput;

// History Modal DOM Elements (Requirement 3.2)
let historyModal;
let closeHistoryModalBtn;
let closeHistoryModalFooterBtn;
let clearAllHistoryBtn;
let historyListContainer;
let modalAvoidDaysSelect;
let avoidRepeatSelect;
let openHistoryModalBtn;
let headerHistoryBtn;
let historyCountBadge;
let headerHistoryBadge;

/**
 * Lọc danh sách món ăn hiển thị trên Vòng quay & Thực đơn
 * Chỉ lấy món đã được duyệt ('approved') hoặc món gốc (backward-compatible)
 * Loại trừ các món người dùng tạm loại khỏi vòng quay trong phiên này (Requirement 3.2)
 * Loại trừ các món đã ăn trong N ngày gần đây (Requirement 3.2)
 * Áp dụng bộ lọc nhanh trước khi quay (Requirement 3.1)
 */
export function getActiveDishes() {
  const avoidDays = getAvoidDays();
  const recentlyEatenIds = avoidDays > 0 ? getRecentlyEatenDishIds(avoidDays) : null;

  return dishes.filter(d => {
    if (!Array.isArray(d.mealTypes) || !d.mealTypes.includes(currentMeal)) return false;
    if (d.status && d.status !== 'approved') return false;
    if (excludedDishIds.has(d.id)) return false;

    // 3.2: Tránh lặp lại món đã ăn trong N ngày gần đây
    if (recentlyEatenIds && recentlyEatenIds.has(d.id)) {
      return false;
    }

    // 3.1: Lọc theo khoảng giá
    if (currentFilters.price !== 'all') {
      if (d.priceRange && d.priceRange !== currentFilters.price) return false;
    }

    // 3.1: Lọc theo kiểu món nước / khô
    if (currentFilters.dishType !== 'all') {
      if (d.type && d.type !== currentFilters.dishType) return false;
    }

    // 3.1: Lọc món chay
    if (currentFilters.vegOnly) {
      if (!d.vegetarian) return false;
    }

    return true;
  });
}

function saveDishes(skipLocal = false) {
  if (!skipLocal) {
    saveDishesLocally(dishes);
  }
  saveDishesCloud(dishes);
}

export function showAddDishModal() {
  if (addDishModal) {
    addDishModal.classList.remove('modal-enter');
    addDishModal.classList.add('modal-show');
    if (dishNameInput) dishNameInput.focus();
  }
}

export function hideAddDishModal() {
  if (addDishModal) {
    addDishModal.classList.remove('modal-show');
    addDishModal.classList.add('modal-enter');
  }
}

/**
 * Đồng bộ hóa nhãn trạng thái dữ liệu thống nhất (Requirement 6)
 */
function setCloudStatus(state, message = '') {
  if (!cloudStatusDot || !cloudStatusText) return;

  if (state === 'connected') {
    cloudStatusDot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
    cloudStatusText.textContent = "Cloud Sync 🔥";
    if (dataSaveModeBadge) {
      dataSaveModeBadge.textContent = "Cloud Sync 🔥";
      dataSaveModeBadge.className = "text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20";
    }
  } else if (state === 'connecting') {
    cloudStatusDot.className = "w-2 h-2 rounded-full bg-amber-400 animate-ping";
    cloudStatusText.textContent = "Đang kết nối...";
    if (dataSaveModeBadge) {
      dataSaveModeBadge.textContent = "Đang kết nối...";
      dataSaveModeBadge.className = "text-[11px] font-medium text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20";
    }
  } else {
    // Offline / LocalStorage
    cloudStatusDot.className = "w-2 h-2 rounded-full bg-slate-500";
    cloudStatusText.textContent = "Ngoại tuyến (Lưu máy) 🛡️";
    if (dataSaveModeBadge) {
      dataSaveModeBadge.textContent = "Ngoại tuyến (Lưu máy) 🛡️";
      dataSaveModeBadge.className = "text-[11px] font-medium text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700";
    }
  }
}

/**
 * Cập nhật giao diện các nút lọc nhanh trước khi quay (Requirement 3.1)
 */
export function updateQuickFilterUI() {
  if (!quickFilterBtns || quickFilterBtns.length === 0) return;

  quickFilterBtns.forEach(btn => {
    const fType = btn.dataset.filterType;
    const fVal = btn.dataset.filterVal;

    let isActive = false;
    if (fType === 'price') {
      isActive = currentFilters.price === fVal;
    } else if (fType === 'dishType') {
      isActive = currentFilters.dishType === fVal;
    } else if (fType === 'veg') {
      isActive = currentFilters.vegOnly;
    }

    if (fType === 'veg') {
      if (isActive) {
        btn.className = 'quick-filter-btn px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white shadow-sm transition flex items-center gap-1 cursor-pointer';
      } else {
        btn.className = 'quick-filter-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-emerald-300 hover:text-white border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer';
      }
    } else {
      if (isActive) {
        btn.className = 'quick-filter-btn px-2.5 py-1 rounded-lg text-[11px] font-bold bg-brand-500 text-white shadow-sm transition cursor-pointer';
      } else {
        btn.className = 'quick-filter-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer';
      }
    }
  });

  const isFiltering = currentFilters.price !== 'all' || currentFilters.dishType !== 'all' || currentFilters.vegOnly;
  if (resetQuickFiltersBtn) {
    if (isFiltering) {
      resetQuickFiltersBtn.classList.remove('hidden');
    } else {
      resetQuickFiltersBtn.classList.add('hidden');
    }
  }
}

/**
 * Cập nhật số lượng trên các badge lịch sử (Requirement 3.2)
 */
export function updateHistoryBadges() {
  const history = getSpinHistory();
  const count = history.length;

  if (historyCountBadge) {
    historyCountBadge.textContent = count;
    if (count > 0) historyCountBadge.classList.remove('hidden');
    else historyCountBadge.classList.add('hidden');
  }
  if (headerHistoryBadge) {
    headerHistoryBadge.textContent = `${count} món`;
  }
}

/**
 * Hiển thị Modal Lịch sử 14 ngày (Requirement 3.2)
 */
export function showHistoryModal() {
  if (!historyModal) return;
  renderHistoryList();
  if (modalAvoidDaysSelect) {
    modalAvoidDaysSelect.value = String(getAvoidDays());
  }
  historyModal.classList.remove('modal-enter');
  historyModal.classList.add('modal-show');
}

export function hideHistoryModal() {
  if (historyModal) {
    historyModal.classList.remove('modal-show');
    historyModal.classList.add('modal-enter');
  }
}

/**
 * Render danh sách lịch sử 14 ngày (Requirement 3.2)
 */
export function renderHistoryList() {
  updateHistoryBadges();
  const history = getSpinHistory();

  if (!historyListContainer) return;
  historyListContainer.innerHTML = '';

  if (history.length === 0) {
    historyListContainer.innerHTML = `
      <div class="py-10 text-center text-slate-400 text-xs">
        <span class="text-3xl block mb-2">🍜</span>
        <p class="font-bold text-slate-300">Chưa có món nào trong lịch sử 14 ngày</p>
        <p class="text-[11px] text-slate-500 mt-1">Mỗi lần bạn bấm "Quay ngay", món trúng sẽ tự động được lưu lại tại đây.</p>
      </div>
    `;
    return;
  }

  history.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs hover:border-slate-700 transition';

    const date = new Date(item.timestamp);
    const dateStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + 
                    ' - ' + 
                    date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

    const mealEmojis = { sang: '🌅 Sáng', trua: '☀️ Trưa', toi: '🌙 Tối' };
    const mealBadge = mealEmojis[item.mealType] || '🍜';

    itemEl.innerHTML = `
      <div class="flex items-center space-x-2.5 min-w-0 pr-2 flex-1">
        <span class="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex-shrink-0">${mealBadge}</span>
        <div class="min-w-0 flex-1">
          <span class="font-bold text-slate-200 block truncate">${escapeHtml(item.dishName || 'Món ăn')}</span>
          <span class="text-[10px] text-slate-500">${dateStr}</span>
        </div>
      </div>
      <button data-delete-hist-id="${item.id}" aria-label="Xóa món này khỏi lịch sử" class="delete-hist-btn text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer text-xs" title="Xóa món này khỏi lịch sử">
        ✕
      </button>
    `;

    historyListContainer.appendChild(itemEl);
  });

  historyListContainer.querySelectorAll('.delete-hist-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const histId = btn.getAttribute('data-delete-hist-id');
      deleteSpinHistoryItem(histId);
      renderHistoryList();
      updateMealTabsUI();
    });
  });
}

export function updateMealTabsUI() {
  updateQuickFilterUI();
  updateHistoryBadges();
  const activeDishesList = getActiveDishes();

  const tabButtons = document.querySelectorAll('.meal-tab-btn');
  tabButtons.forEach(btn => {
    const meal = btn.dataset.meal;
    const count = dishes.filter(d => 
      Array.isArray(d.mealTypes) && 
      d.mealTypes.includes(meal) && 
      (d.status === 'approved' || !d.status)
    ).length;
    const badge = btn.querySelector('.meal-count-badge');
    if (badge) badge.textContent = count;

    if (meal === currentMeal) {
      btn.className = 'meal-tab-btn flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-brand-500 to-rose-500 text-white shadow-lg shadow-brand-500/20';
      if (badge) {
        badge.className = 'meal-count-badge text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 bg-white/25 text-white';
      }
    } else {
      btn.className = 'meal-tab-btn flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition';
      if (badge) {
        badge.className = 'meal-count-badge text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 bg-slate-900 text-slate-400';
      }
    }
  });

  const titles = {
    sang: { name: 'Thực đơn bữa sáng', badge: 'BỮA SÁNG TP.HCM', icon: '🌅' },
    trua: { name: 'Thực đơn bữa trưa', badge: 'BỮA TRƯA TP.HCM', icon: '☀️' },
    toi: { name: 'Thực đơn chiều / tối', badge: 'CHIỀU / TỐI TP.HCM', icon: '🌙' },
  };
  const curInfo = titles[currentMeal];
  if (currentMealHeading) currentMealHeading.textContent = `${curInfo.icon} ${curInfo.name}`;
  if (currentMealSubheading) currentMealSubheading.textContent = curInfo.badge;
  if (currentListCategoryName) currentListCategoryName.textContent = curInfo.name;

  if (addDishForm) {
    const formCheckboxes = addDishForm.querySelectorAll('input[name="mealCheck"]');
    formCheckboxes.forEach(cb => {
      if (cb.value === currentMeal) cb.checked = true;
    });
  }

  renderDishList();
  drawWheel(activeDishesList);
}

export function renderDishList() {
  const activeList = getActiveDishes();
  const searchTerm = searchDishInput ? searchDishInput.value.trim().toLowerCase() : '';

  if (activeWheelCount) activeWheelCount.textContent = activeList.length;
  if (currentListTotalBadge) currentListTotalBadge.textContent = `${activeList.length} món`;

  const filtered = activeList.filter(d => {
    const matchName = d.name.toLowerCase().includes(searchTerm);
    const matchLoc = Array.isArray(d.locations) && d.locations.some(l =>
      (l.name && l.name.toLowerCase().includes(searchTerm)) ||
      (l.address && l.address.toLowerCase().includes(searchTerm))
    );
    return matchName || matchLoc;
  });

  if (!dishItemsContainer) return;
  dishItemsContainer.innerHTML = '';

  // 3.2: Banner hiển thị các món đã tạm loại hôm nay
  if (excludedDishIds.size > 0) {
    const excludedBanner = document.createElement('div');
    excludedBanner.className = 'flex items-center justify-between p-2.5 mb-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300';
    excludedBanner.innerHTML = `
      <span class="flex items-center gap-1.5 font-semibold">
        <span>🚫</span>
        <span>Đang tạm loại ${excludedDishIds.size} món hôm nay</span>
      </span>
      <button id="resetExcludedDishesBtn" type="button" class="text-[11px] font-bold text-amber-300 hover:text-white underline cursor-pointer">
        Khôi phục tất cả
      </button>
    `;
    dishItemsContainer.appendChild(excludedBanner);

    const resetBtn = excludedBanner.querySelector('#resetExcludedDishesBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        excludedDishIds.clear();
        showToast("Đã khôi phục tất cả món ăn vào vòng quay! ✨", "success");
        updateMealTabsUI();
      });
    }
  }

  if (filtered.length === 0) {
    if (emptyListState) emptyListState.classList.remove('hidden');
    return;
  } else {
    if (emptyListState) emptyListState.classList.add('hidden');
  }

  filtered.forEach((dish, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'group flex flex-col p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/30 transition duration-150';

    const tagBadges = (dish.mealTypes || []).map(m => {
      if (m === 'sang') return '<span class="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md">Sáng</span>';
      if (m === 'trua') return '<span class="text-[10px] px-1.5 py-0.5 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded-md">Trưa</span>';
      if (m === 'toi') return '<span class="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md">Tối</span>';
      return '';
    }).join(' ');

    // 3.1: Badges thông tin phân loại (Giá, Kiểu món, Chay, Tags)
    const priceText = dish.priceRange === 'under50' ? '< 50k' : (dish.priceRange === 'above100' ? '> 100k' : '50k-100k');
    const priceClass = dish.priceRange === 'under50' 
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
      : (dish.priceRange === 'above100' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20');
    const priceBadge = `<span class="text-[10px] px-1.5 py-0.5 rounded-md border font-semibold ${priceClass}" title="Khoảng giá">${priceText}</span>`;

    const typeBadge = dish.type === 'nuoc'
      ? '<span class="text-[10px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-md font-medium" title="Món nước">🍜 Nước</span>'
      : '<span class="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-md font-medium" title="Món khô">🥢 Khô</span>';

    const vegBadge = dish.vegetarian
      ? '<span class="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md font-bold" title="Món chay">🌱 Chay</span>'
      : '';

    // 3.2: Badge Yêu Thích
    const isFav = isFavoriteDish(dish.id);
    const favBadge = isFav 
      ? '<span class="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold" title="Món Yêu Thích - 2x tỉ lệ trúng vòng quay">❤️ Yêu thích (2x)</span>'
      : '';

    const locationsCount = Array.isArray(dish.locations) ? dish.locations.length : 0;
    const locationsPreview = Array.isArray(dish.locations) && dish.locations.length > 0
      ? dish.locations.map(l => l.name).slice(0, 3).join(', ') + (dish.locations.length > 3 ? '...' : '')
      : 'TP. Hồ Chí Minh';

    // Đánh giá chuẩn xác: không hiện mặc định khi rỗng (Requirement 6)
    const ratingSummary = getDishRatingSummary(dish);
    const ratingHtml = ratingSummary.hasReviews
      ? `<span class="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold flex items-center gap-0.5">
           <span>⭐</span><span>${ratingSummary.starsText}</span>
         </span>`
      : `<span class="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
           Chưa có đánh giá
         </span>`;

    const shortNameBadge = dish.shortName 
      ? `<span class="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-500/10 text-brand-300 border border-brand-500/20 font-medium" title="Tên rút gọn hiển thị trên vòng quay">🏷️ ${escapeHtml(dish.shortName)}</span>`
      : '';

    itemEl.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center space-x-2.5 min-w-0 pr-1 flex-1">
          <div class="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-brand-400 flex-shrink-0 border border-slate-700/60">
            ${index + 1}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-1.5 flex-wrap gap-1">
              <h4 class="text-sm font-bold text-slate-100 truncate group-hover:text-brand-300 transition">${escapeHtml(dish.name)}</h4>
              <div class="flex items-center space-x-1 flex-wrap gap-1">
                ${tagBadges}
                ${typeBadge}
                ${priceBadge}
                ${vegBadge}
                ${favBadge}
                ${shortNameBadge}
                ${ratingHtml}
              </div>
            </div>
            <p class="text-xs text-slate-400 mt-1 truncate" title="${escapeHtml(locationsPreview)}">
              📍 <span class="text-slate-300 font-medium">Gợi ý:</span> ${escapeHtml(locationsPreview)}
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
          <!-- Nút Yêu Thích (Requirement 3.2) -->
          <button data-fav-id="${dish.id}" aria-label="Yêu thích món ${escapeHtml(dish.name)}" class="fav-dish-btn min-h-[36px] p-2 text-xs ${isFav ? 'text-rose-400 bg-rose-500/15 border-rose-500/30' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border-slate-700/60'} rounded-xl border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400" title="${isFav ? 'Đã yêu thích (Tăng 2x tỉ lệ quay). Bấm để bỏ' : 'Thêm vào yêu thích (Tăng 2x tỉ lệ quay)'}">
            <span>${isFav ? '❤️' : '🤍'}</span>
          </button>

          <!-- Nút Không muốn món này hôm nay (Requirement 3.2) -->
          <button data-exclude-id="${dish.id}" aria-label="Tạm loại món ${escapeHtml(dish.name)} khỏi vòng quay" class="exclude-dish-btn min-h-[36px] p-2 text-xs text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400" title="Không muốn món này hôm nay (Tạm loại khỏi vòng quay)">
            <span>🚫</span>
          </button>

          <button data-review-id="${dish.id}" aria-label="Xem và viết đánh giá cho món ${escapeHtml(dish.name)}" class="review-dish-btn min-h-[36px] px-2.5 py-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/20 transition flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400" title="Xem & viết đánh giá cho món này">
            <span>⭐</span>
            <span class="hidden sm:inline">${ratingSummary.hasReviews ? ratingSummary.count + ' review' : 'Đánh giá'}</span>
          </button>

          <button data-preview-id="${dish.id}" aria-label="Xem danh sách quán gợi ý của món ${escapeHtml(dish.name)}" class="preview-dish-btn min-h-[36px] px-2.5 py-1.5 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 rounded-xl border border-sky-500/20 transition flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400" title="Xem danh sách quán gợi ý">
            <span>${locationsCount} quán</span>
          </button>

          <!-- Nút Báo Cáo Vi Phạm (Requirement 7) -->
          <button data-report-dish-id="${dish.id}" data-dish-name="${escapeHtml(dish.name)}" aria-label="Báo cáo vi phạm món ${escapeHtml(dish.name)}" class="report-dish-btn min-h-[36px] p-2 text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400" title="Báo cáo thông tin sai / vi phạm">
            <span>🚩</span>
          </button>

          <button data-delete-id="${dish.id}" aria-label="Xoá món ${escapeHtml(dish.name)}" class="delete-dish-btn min-h-[36px] p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400" title="Xoá món này (Yêu cầu Admin)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    `;

    dishItemsContainer.appendChild(itemEl);
  });

  // Gắn sự kiện Yêu Thích (Requirement 3.2)
  dishItemsContainer.querySelectorAll('.fav-dish-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-fav-id');
      const targetDish = dishes.find(d => d.id === id);
      const isNowFav = toggleFavoriteDish(id);
      showToast(isNowFav ? `Đã thêm "${targetDish ? targetDish.name : 'Món'}" vào Yêu thích! Tăng 2x tỉ lệ trúng ❤️` : `Đã bỏ yêu thích món "${targetDish ? targetDish.name : 'Món'}"`, 'info');
      updateMealTabsUI();
      playTickSound();
    });
  });

  // Gắn sự kiện Không muốn món này hôm nay (Requirement 3.2)
  dishItemsContainer.querySelectorAll('.exclude-dish-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-exclude-id');
      const targetDish = dishes.find(d => d.id === id);
      excludedDishIds.add(id);
      showToast(`Đã tạm loại "${targetDish ? targetDish.name : 'Món'}" khỏi vòng quay hôm nay!`, 'info');
      updateMealTabsUI();
      playTickSound();
    });
  });

  // Gắn sự kiện Xóa (Chỉ Admin)
  dishItemsContainer.querySelectorAll('.delete-dish-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-delete-id');
      deleteDish(id);
    });
  });

  // Gắn sự kiện Xem quán
  dishItemsContainer.querySelectorAll('.preview-dish-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-preview-id');
      const dish = dishes.find(d => d.id === id);
      if (dish) showResultModal(dish, currentMeal);
    });
  });

  // Gắn sự kiện Review
  dishItemsContainer.querySelectorAll('.review-dish-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-review-id');
      const dish = dishes.find(d => d.id === id);
      if (dish) showReviewModal(dish);
    });
  });

  // Gắn sự kiện Báo Cáo Món Ăn
  dishItemsContainer.querySelectorAll('.report-dish-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-report-dish-id');
      const name = btn.getAttribute('data-dish-name');
      openReportModal({
        targetType: 'dish',
        targetId: id,
        targetName: `Món: ${name}`
      });
    });
  });
}

/**
 * Thêm món ăn mới:
 * Validate nghiêm ngặt: Tên 1-60 ký tự, shortName tối đa 15 ký tự, danh sách quán tối đa 20 dòng mỗi dòng <= 200 ký tự.
 * Cơ chế 'Chờ duyệt': Nếu là khách thường -> status: 'pending', nếu là Admin -> status: 'approved' (Requirement 7).
 */
function addDish(e) {
  e.preventDefault();

  const now = Date.now();
  if (now - lastAddDishTimestamp < ADD_DISH_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((ADD_DISH_COOLDOWN_MS - (now - lastAddDishTimestamp)) / 1000);
    showToast(`Vui lòng chờ ${remainingSeconds} giây trước khi thêm món tiếp theo để bảo vệ hệ thống!`, "warning");
    return;
  }

  if (dishes.length >= MAX_SHARED_DISHES) {
    showToast(`Thực đơn đã đạt tối đa ${MAX_SHARED_DISHES} món. Vui lòng nhờ Admin xóa bớt món trước khi thêm mới!`, "warning");
    return;
  }

  const name = dishNameInput.value.trim();
  const shortName = dishShortNameInput ? dishShortNameInput.value.trim().slice(0, 15) : '';
  const rawLocations = dishLocationsInput.value.trim();

  const checkedMeals = Array.from(addDishForm.querySelectorAll('input[name="mealCheck"]:checked'))
    .map(cb => cb.value);

  // Validate tên món 1 - 60 ký tự
  if (!name || name.length < 1) {
    showToast("Vui lòng nhập tên món ăn!", "error");
    dishNameInput.focus();
    return;
  }

  if (name.length > 60) {
    showToast("Tên món ăn tối đa 60 ký tự!", "error");
    dishNameInput.focus();
    return;
  }

  if (!rawLocations) {
    showToast("Vui lòng nhập ít nhất một quán & địa chỉ tại TP.HCM!", "error");
    dishLocationsInput.focus();
    return;
  }

  if (checkedMeals.length === 0) {
    showToast("Hãy chọn ít nhất 1 bữa ăn phù hợp (Sáng, Trưa hoặc Tối)!", "warning");
    return;
  }

  const lines = rawLocations.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Validate tối đa 20 dòng quán
  if (lines.length > 20) {
    showToast("Danh sách quán tối đa 20 địa chỉ!", "warning");
    return;
  }

  // Validate mỗi dòng quán tối đa 200 ký tự
  for (const line of lines) {
    if (line.length > 200) {
      showToast("Mỗi dòng địa chỉ quán tối đa 200 ký tự!", "warning");
      return;
    }
  }

  const parsedLocations = lines.map(line => {
    let locName = line.slice(0, 80);
    let locAddress = 'TP. Hồ Chí Minh';
    if (line.includes(' - ')) {
      const parts = line.split(' - ');
      locName = parts[0].trim().slice(0, 80);
      locAddress = parts.slice(1).join(' - ').trim().slice(0, 120);
    } else if (line.includes(': ')) {
      const parts = line.split(': ');
      locName = parts[0].trim().slice(0, 80);
      locAddress = parts.slice(1).join(': ').trim().slice(0, 120);
    } else if (line.includes(',')) {
      const parts = line.split(',');
      locName = parts[0].trim().slice(0, 80);
      locAddress = parts.slice(1).join(',').trim().slice(0, 120);
    }
    return { name: locName, address: locAddress };
  });

  const currentUser = getCurrentUser();
  const isAdmin = getIsAdmin() || isCurrentUserAdmin();

  // 3.1: Đọc các trường thuộc tính mở rộng
  const priceRange = dishPriceRangeInput ? dishPriceRangeInput.value : '50to100';
  const type = dishTypeInput ? dishTypeInput.value : 'kho';
  const vegetarian = dishVegetarianInput ? dishVegetarianInput.checked : false;
  const rawTags = dishTagsInput ? dishTagsInput.value.trim() : '';
  const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : [];

  // Khách thường -> status: 'pending'. Admin -> status: 'approved'
  const newDish = {
    id: 'hcm-custom-' + Date.now(),
    name: name,
    mealTypes: checkedMeals,
    locations: parsedLocations,
    priceRange,
    type,
    vegetarian,
    tags,
    status: isAdmin ? 'approved' : 'pending',
    createdBy: currentUser?.uid || 'guest',
    createdAt: Date.now()
  };

  if (shortName) {
    newDish.shortName = shortName;
  }

  dishes.unshift(newDish);
  saveDishes();
  lastAddDishTimestamp = Date.now();

  dishNameInput.value = '';
  if (dishShortNameInput) dishShortNameInput.value = '';
  dishLocationsInput.value = '';
  if (dishPriceRangeInput) dishPriceRangeInput.value = '50to100';
  if (dishTypeInput) dishTypeInput.value = 'kho';
  if (dishVegetarianInput) dishVegetarianInput.checked = false;
  if (dishTagsInput) dishTagsInput.value = '';

  hideAddDishModal();

  if (isAdmin) {
    showToast(`Đã thêm món "${name}" thành công! ✨`, "success");
  } else {
    showToast(`Đã gửi món "${name}"! Món đang chờ Admin duyệt trước khi xuất hiện trên vòng quay. ⏳`, "info");
  }

  updateMealTabsUI();
}

function deleteDish(id) {
  const target = dishes.find(d => d.id === id);
  if (!target) return;

  requireAdminPermission("Xóa món ăn", () => {
    if (confirm(`Bạn có chắc muốn xoá "${target.name}" khỏi thực đơn dùng chung của mọi người?`)) {
      dishes = dishes.filter(d => d.id !== id);
      saveDishes();
      showToast(`Đã xoá món "${target.name}"!`, "info");
      updateMealTabsUI();
    }
  });
}

function updateLiveClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (liveClockText) liveClockText.textContent = timeStr;
}

function handleSpinClick() {
  spinWheel({
    getActiveDishes,
    mainSpinBtn,
    centerSpinBtn,
    wheelStatusMessage,
    onResult: (winner) => {
      // 3.2: Tự động ghi nhận món đã quay vào lịch sử 14 ngày
      recordSpinHistory(winner, currentMeal);
      updateHistoryBadges();
      showResultModal(winner, currentMeal);
    }
  });
}

/**
 * Xử lý Modal Báo Cáo Nội Dung Vi Phạm (Requirement 7)
 */
export function openReportModal({ targetType, targetId, targetName }) {
  activeReportTarget = { targetType, targetId, targetName };
  if (!reportModal) return;

  if (reportTargetName) {
    reportTargetName.textContent = targetName || 'Mục này';
  }
  if (reportReasonInput) {
    reportReasonInput.value = '';
  }

  reportModal.classList.remove('modal-enter');
  reportModal.classList.add('modal-show');
  if (reportReasonInput) {
    setTimeout(() => reportReasonInput.focus(), 150);
  }
}

export function hideReportModal() {
  if (reportModal) {
    reportModal.classList.remove('modal-show');
    reportModal.classList.add('modal-enter');
  }
  activeReportTarget = null;
}

async function handleReportSubmit(e) {
  e.preventDefault();
  if (!activeReportTarget) return;

  const reason = reportReasonInput ? reportReasonInput.value.trim() : '';
  if (!reason) {
    showToast("Vui lòng nhập lý do báo cáo!", "error");
    return;
  }

  await submitReportCloud({
    targetType: activeReportTarget.targetType,
    targetId: activeReportTarget.targetId,
    targetName: activeReportTarget.targetName,
    reason: reason
  });

  hideReportModal();
  showToast("Cảm ơn bạn! Báo cáo đã được gửi tới Quản trị viên để kiểm duyệt.", "success");
}

async function init() {
  // Grab DOM references
  wheelCanvas = document.getElementById('wheelCanvas');
  mainSpinBtn = document.getElementById('mainSpinBtn');
  centerSpinBtn = document.getElementById('centerSpinBtn');
  wheelStatusMessage = document.getElementById('wheelStatusMessage');
  activeWheelCount = document.getElementById('activeWheelCount');
  currentMealHeading = document.getElementById('currentMealHeading');
  currentMealSubheading = document.getElementById('currentMealSubheading');
  currentListCategoryName = document.getElementById('currentListCategoryName');
  currentListTotalBadge = document.getElementById('currentListTotalBadge');
  dishItemsContainer = document.getElementById('dishItemsContainer');
  emptyListState = document.getElementById('emptyListState');
  searchDishInput = document.getElementById('searchDishInput');
  addDishForm = document.getElementById('addDishForm');
  dishNameInput = document.getElementById('dishNameInput');
  dishShortNameInput = document.getElementById('dishShortNameInput');
  dishLocationsInput = document.getElementById('dishLocationsInput');
  liveClockText = document.getElementById('liveClockText');
  autoActiveText = document.getElementById('autoActiveText');
  toggleSoundBtn = document.getElementById('toggleSoundBtn');
  soundOnIcon = document.getElementById('soundOnIcon');
  soundOffIcon = document.getElementById('soundOffIcon');
  dataSaveModeBadge = document.getElementById('dataSaveModeBadge');
  cloudStatusDot = document.getElementById('cloudStatusDot');
  cloudStatusText = document.getElementById('cloudStatusText');
  dishListSkeleton = document.getElementById('dishListSkeleton');
  offlineBanner = document.getElementById('offlineBanner');

  // Add Dish Modal references
  addDishModal = document.getElementById('addDishModal');
  closeAddDishModalBtn = document.getElementById('closeAddDishModalBtn');
  cancelAddDishBtn = document.getElementById('cancelAddDishBtn');
  openAddDishModalBtn = document.getElementById('openAddDishModalBtn');
  openAddDishMobileBtn = document.getElementById('openAddDishMobileBtn');
  emptyStateAddDishBtn = document.getElementById('emptyStateAddDishBtn');

  // Header More Menu references
  headerMoreMenuBtn = document.getElementById('headerMoreMenuBtn');
  headerMoreMenu = document.getElementById('headerMoreMenu');

  // Report Modal references
  reportModal = document.getElementById('reportModal');
  closeReportModalBtn = document.getElementById('closeReportModalBtn');
  cancelReportBtn = document.getElementById('cancelReportBtn');
  reportForm = document.getElementById('reportForm');
  reportTargetName = document.getElementById('reportTargetName');
  reportReasonInput = document.getElementById('reportReasonInput');

  // Quick Filter DOM references (Requirement 3.1)
  resetQuickFiltersBtn = document.getElementById('resetQuickFiltersBtn');
  quickFilterBtns = document.querySelectorAll('.quick-filter-btn');
  dishPriceRangeInput = document.getElementById('dishPriceRangeInput');
  dishTypeInput = document.getElementById('dishTypeInput');
  dishVegetarianInput = document.getElementById('dishVegetarianInput');
  dishTagsInput = document.getElementById('dishTagsInput');

  // History Modal references (Requirement 3.2)
  historyModal = document.getElementById('historyModal');
  closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');
  closeHistoryModalFooterBtn = document.getElementById('closeHistoryModalFooterBtn');
  clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
  historyListContainer = document.getElementById('historyListContainer');
  modalAvoidDaysSelect = document.getElementById('modalAvoidDaysSelect');
  avoidRepeatSelect = document.getElementById('avoidRepeatSelect');
  openHistoryModalBtn = document.getElementById('openHistoryModalBtn');
  headerHistoryBtn = document.getElementById('headerHistoryBtn');
  historyCountBadge = document.getElementById('historyCountBadge');
  headerHistoryBadge = document.getElementById('headerHistoryBadge');

  // Load initial local data (và đảm bảo các món cũ có status 'approved' và soft migration)
  dishes = loadDishesFromLocal().map(normalizeDish);
  dishes.forEach(d => {
    if (!d.status) d.status = 'approved';
  });

  // Initialize Canvas
  initWheelCanvas(wheelCanvas);

  // Initialize Modules
  const initialPinHash = await initAdminPinSecurity();
  initAdminModal({ 
    initialPinHash,
    getDishes: () => dishes,
    setDishes: (newDishes) => { dishes = newDishes; },
    onSaveDishes: () => saveDishes(),
    onUpdateTabs: () => updateMealTabsUI()
  });

  initReviewsSystem({
    onSaveDishes: () => saveDishes(),
    onUpdateTabs: () => updateMealTabsUI(),
    onReport: openReportModal
  });

  // Result Modal with Spin Again, Exclude Dish & Favorite (Requirement 3.2)
  initResultModal({
    onSpinAgain: handleSpinClick,
    onExcludeDish: (dishToExclude) => {
      excludedDishIds.add(dishToExclude.id);
      showToast(`Đã tạm loại "${dishToExclude.name}" khỏi vòng quay hôm nay!`, "info");
      updateMealTabsUI();
    },
    onToggleFavorite: (dish, isFav) => {
      showToast(isFav ? `Đã thêm "${dish.name}" vào Yêu thích! Tăng 2x tỉ lệ trúng ❤️` : `Đã bỏ yêu thích món "${dish.name}"`, "info");
      updateMealTabsUI();
    }
  });

  // History Modal Listeners (Requirement 3.2)
  if (openHistoryModalBtn) openHistoryModalBtn.addEventListener('click', showHistoryModal);
  if (headerHistoryBtn) headerHistoryBtn.addEventListener('click', () => {
    if (headerMoreMenu) headerMoreMenu.classList.add('hidden');
    showHistoryModal();
  });
  if (closeHistoryModalBtn) closeHistoryModalBtn.addEventListener('click', hideHistoryModal);
  if (closeHistoryModalFooterBtn) closeHistoryModalFooterBtn.addEventListener('click', hideHistoryModal);
  if (historyModal) {
    historyModal.addEventListener('click', (e) => {
      if (e.target === historyModal) hideHistoryModal();
    });
  }

  // Đồng bộ lựa chọn Tránh lặp lại món (Requirement 3.2)
  const currentAvoidDays = getAvoidDays();
  if (avoidRepeatSelect) avoidRepeatSelect.value = String(currentAvoidDays);
  if (modalAvoidDaysSelect) modalAvoidDaysSelect.value = String(currentAvoidDays);

  const handleAvoidDaysChange = (e) => {
    const val = parseInt(e.target.value, 10) || 0;
    setAvoidDays(val);
    if (avoidRepeatSelect) avoidRepeatSelect.value = String(val);
    if (modalAvoidDaysSelect) modalAvoidDaysSelect.value = String(val);
    showToast(val > 0 ? `Đang bật tránh lặp lại món đã ăn trong ${val} ngày qua! ⏳` : 'Đã tắt chế độ tránh lặp lại món.', 'info');
    updateMealTabsUI();
  };

  if (avoidRepeatSelect) avoidRepeatSelect.addEventListener('change', handleAvoidDaysChange);
  if (modalAvoidDaysSelect) modalAvoidDaysSelect.addEventListener('change', handleAvoidDaysChange);

  if (clearAllHistoryBtn) {
    clearAllHistoryBtn.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử ăn uống 14 ngày trên thiết bị này?')) {
        clearSpinHistory();
        renderHistoryList();
        updateMealTabsUI();
        showToast('Đã xóa toàn bộ lịch sử 14 ngày!', 'info');
      }
    });
  }

  // Add Dish Modal Listeners (Requirement 1)
  if (openAddDishModalBtn) openAddDishModalBtn.addEventListener('click', showAddDishModal);
  if (openAddDishMobileBtn) openAddDishMobileBtn.addEventListener('click', showAddDishModal);
  if (emptyStateAddDishBtn) emptyStateAddDishBtn.addEventListener('click', showAddDishModal);
  if (closeAddDishModalBtn) closeAddDishModalBtn.addEventListener('click', hideAddDishModal);
  if (cancelAddDishBtn) cancelAddDishBtn.addEventListener('click', hideAddDishModal);
  if (addDishModal) {
    addDishModal.addEventListener('click', (e) => {
      if (e.target === addDishModal) hideAddDishModal();
    });
  }

  // Header More Menu Toggle (Requirement 2)
  if (headerMoreMenuBtn && headerMoreMenu) {
    headerMoreMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      headerMoreMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!headerMoreMenu.contains(e.target) && e.target !== headerMoreMenuBtn) {
        headerMoreMenu.classList.add('hidden');
      }
    });
  }

  // Báo Cáo Modal Listeners
  if (closeReportModalBtn) closeReportModalBtn.addEventListener('click', hideReportModal);
  if (cancelReportBtn) cancelReportBtn.addEventListener('click', hideReportModal);
  if (reportForm) reportForm.addEventListener('submit', handleReportSubmit);
  if (reportModal) {
    reportModal.addEventListener('click', (e) => {
      if (e.target === reportModal) hideReportModal();
    });
  }

  // Online / Offline Status Detection (Requirement 8)
  window.addEventListener('online', () => {
    if (offlineBanner) offlineBanner.classList.add('hidden');
    showToast("Đã khôi phục kết nối Internet! 🌐", "success");
    setCloudStatus('connected');
  });

  window.addEventListener('offline', () => {
    if (offlineBanner) offlineBanner.classList.remove('hidden');
    showToast("Mất kết nối mạng! Ứng dụng chuyển sang chế độ Ngoại tuyến. 🛡️", "warning");
    setCloudStatus('local');
  });

  // Global Keydown (Escape closes open menus/modals) (Requirement 7)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (headerMoreMenu) headerMoreMenu.classList.add('hidden');
      hideAddDishModal();
      hideReportModal();
      hideHistoryModal();
    }
  });

  // Auto detect current meal tab
  const auto = detectMealByCurrentTime();
  currentMeal = auto.detected;
  if (autoActiveText) {
    autoActiveText.textContent = `Tự động chọn ${auto.name}`;
  }

  // Live Clock
  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  // Meal tabs click listeners
  document.querySelectorAll('.meal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const meal = btn.dataset.meal;
      if (meal && meal !== currentMeal) {
        currentMeal = meal;
        updateMealTabsUI();
        playTickSound();
      }
    });
  });

  // Spin Buttons
  if (mainSpinBtn) mainSpinBtn.addEventListener('click', handleSpinClick);
  if (centerSpinBtn) centerSpinBtn.addEventListener('click', handleSpinClick);

  // Search input
  if (searchDishInput) {
    searchDishInput.addEventListener('input', () => {
      renderDishList();
    });
  }

  // Add dish form
  if (addDishForm) {
    addDishForm.addEventListener('submit', addDish);
  }

  // Sound toggle button
  if (toggleSoundBtn) {
    toggleSoundBtn.addEventListener('click', () => {
      const newState = !isSoundEnabled();
      setSoundEnabled(newState);
      if (newState) {
        if (soundOnIcon) soundOnIcon.classList.remove('hidden');
        if (soundOffIcon) soundOffIcon.classList.add('hidden');
        showToast("Đã bật âm thanh", "info");
        playTickSound();
      } else {
        if (soundOnIcon) soundOnIcon.classList.add('hidden');
        if (soundOffIcon) soundOffIcon.classList.remove('hidden');
        showToast("Đã tắt âm thanh", "info");
      }
    });
  }

  window.addEventListener('resize', () => {
    drawWheel(getActiveDishes());
  });

  // Gắn sự kiện Bộ lọc nhanh trước khi quay (Requirement 3.1)
  if (quickFilterBtns && quickFilterBtns.length > 0) {
    quickFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const fType = btn.dataset.filterType;
        const fVal = btn.dataset.filterVal;
        if (fType === 'price') {
          currentFilters.price = fVal;
        } else if (fType === 'dishType') {
          currentFilters.dishType = fVal;
        } else if (fType === 'veg') {
          currentFilters.vegOnly = !currentFilters.vegOnly;
        }
        updateQuickFilterUI();
        updateMealTabsUI();
        playTickSound();
      });
    });
  }

  if (resetQuickFiltersBtn) {
    resetQuickFiltersBtn.addEventListener('click', () => {
      currentFilters.price = 'all';
      currentFilters.dishType = 'all';
      currentFilters.vegOnly = false;
      updateQuickFilterUI();
      updateMealTabsUI();
      playTickSound();
    });
  }

  // Render initial UI
  updateMealTabsUI();

  // Initialize Firebase Cloud sync + Anonymous Auth + Google Auth
  initFirebase({
    onDishesSync: (cloudDishes) => {
      dishes = cloudDishes.map(normalizeDish);
      updateMealTabsUI();
    },
    onAdminPinSync: (newHash) => {
      setCurrentPinHash(newHash);
    },
    onAuthChange: ({ user, isAdmin }) => {
      updateAdminUI(isAdmin);
    },
    onStatusChange: setCloudStatus,
    getDishes: () => dishes,
    setDishes: (val) => { dishes = val; },
    getCurrentPinHash,
    setCurrentPinHash
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
