import './css/style.css';
import { 
  ADD_DISH_COOLDOWN_MS, 
  MAX_SHARED_DISHES 
} from './utils/constants.js';
import { DEFAULT_DISHES_HCM } from './data/defaultDishes.js';
import { 
  loadDishesFromLocal, 
  saveDishesLocally, 
  initAdminPinSecurity 
} from './services/storage.js';
import { 
  initFirebase, 
  saveDishesCloud 
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
  setCurrentPinHash 
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
  initFirebaseModal 
} from './components/firebaseModal.js';

// Application State
let dishes = [];
let currentMeal = 'sang';
let lastAddDishTimestamp = 0;

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
let dishLocationsInput;
let resetDefaultsBtn;
let liveClockText;
let autoActiveText;
let toggleSoundBtn;
let soundOnIcon;
let soundOffIcon;
let dataSaveModeBadge;
let cloudStatusDot;
let cloudStatusText;

export function getActiveDishes() {
  return dishes.filter(d => Array.isArray(d.mealTypes) && d.mealTypes.includes(currentMeal));
}

function saveDishes(skipLocal = false) {
  if (!skipLocal) {
    saveDishesLocally(dishes);
  }
  saveDishesCloud(dishes);
}

function setCloudStatus(state, message = '') {
  if (!cloudStatusDot || !cloudStatusText || !dataSaveModeBadge) return;

  if (state === 'connected') {
    cloudStatusDot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
    cloudStatusText.textContent = "Firebase Realtime";
    dataSaveModeBadge.textContent = "Cloud Shared 🔥";
    dataSaveModeBadge.className = "text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30";
  } else if (state === 'connecting') {
    cloudStatusDot.className = "w-2 h-2 rounded-full bg-amber-400 animate-ping";
    cloudStatusText.textContent = "Đang kết nối...";
    dataSaveModeBadge.textContent = "Đang kết nối Cloud...";
    dataSaveModeBadge.className = "text-[11px] font-medium text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20";
  } else {
    cloudStatusDot.className = "w-2 h-2 rounded-full bg-slate-500";
    cloudStatusText.textContent = "LocalStorage";
    dataSaveModeBadge.textContent = "LocalStorage 🛡️";
    dataSaveModeBadge.className = "text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20";
  }
}

export function updateMealTabsUI() {
  const tabButtons = document.querySelectorAll('.meal-tab-btn');
  tabButtons.forEach(btn => {
    const meal = btn.dataset.meal;
    const count = dishes.filter(d => Array.isArray(d.mealTypes) && d.mealTypes.includes(meal)).length;
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
    sang: { name: 'Thực Đơn Sáng Sài Gòn', badge: 'BỮA SÁNG TP.HCM', icon: '🌅' },
    trua: { name: 'Thực Đơn Trưa Sài Gòn', badge: 'BỮA TRƯA TP.HCM', icon: '☀️' },
    toi: { name: 'Thực Đơn Chiều / Tối Sài Gòn', badge: 'CHIỀU / TỐI TP.HCM', icon: '🌙' },
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
  drawWheel(getActiveDishes());
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

  if (filtered.length === 0) {
    if (emptyListState) emptyListState.classList.remove('hidden');
    return;
  } else {
    if (emptyListState) emptyListState.classList.add('hidden');
  }

  filtered.forEach((dish, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'group flex flex-col p-3 rounded-2xl bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 transition duration-150';

    const tagBadges = (dish.mealTypes || []).map(m => {
      if (m === 'sang') return '<span class="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md">Sáng</span>';
      if (m === 'trua') return '<span class="text-[10px] px-1.5 py-0.5 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded-md">Trưa</span>';
      if (m === 'toi') return '<span class="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md">Tối</span>';
      return '';
    }).join(' ');

    const locationsCount = Array.isArray(dish.locations) ? dish.locations.length : 0;
    const locationsPreview = Array.isArray(dish.locations) && dish.locations.length > 0
      ? dish.locations.map(l => l.name).slice(0, 3).join(', ') + (dish.locations.length > 3 ? '...' : '')
      : 'TP. Hồ Chí Minh';

    const ratingSummary = getDishRatingSummary(dish);

    itemEl.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2.5 min-w-0 pr-2">
          <div class="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-brand-400 flex-shrink-0 border border-slate-700/60">
            ${index + 1}
          </div>
          <div class="min-w-0">
            <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <h4 class="text-sm font-bold text-slate-100 truncate group-hover:text-brand-300 transition">${escapeHtml(dish.name)}</h4>
              <div class="flex items-center space-x-1">
                ${tagBadges}
                <span class="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold flex items-center gap-0.5">
                  <span>⭐</span><span>${ratingSummary.starsText}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-1.5 flex-shrink-0">
          <button data-review-id="${dish.id}" class="review-dish-btn p-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 transition flex items-center gap-1 cursor-pointer" title="Xem & viết đánh giá cho món này">
            <span>⭐</span>
            <span>${ratingSummary.count > 0 ? ratingSummary.count + ' review' : 'Đánh giá'}</span>
          </button>

          <button data-preview-id="${dish.id}" class="preview-dish-btn p-1.5 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 rounded-lg border border-sky-500/20 transition flex items-center gap-1 cursor-pointer" title="Xem danh sách quán gợi ý">
            <span>${locationsCount} quán</span>
          </button>

          <button data-delete-id="${dish.id}" class="delete-dish-btn p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer" title="Xoá món này">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <p class="text-xs text-slate-400 mt-1 truncate pl-9" title="${escapeHtml(locationsPreview)}">
        📍 <span class="text-slate-300 font-medium">Gợi ý:</span> ${escapeHtml(locationsPreview)}
      </p>
    `;

    dishItemsContainer.appendChild(itemEl);
  });

  dishItemsContainer.querySelectorAll('.delete-dish-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-delete-id');
      deleteDish(id);
    });
  });

  dishItemsContainer.querySelectorAll('.preview-dish-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-preview-id');
      const dish = dishes.find(d => d.id === id);
      if (dish) showResultModal(dish, currentMeal);
    });
  });

  dishItemsContainer.querySelectorAll('.review-dish-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-review-id');
      const dish = dishes.find(d => d.id === id);
      if (dish) showReviewModal(dish);
    });
  });
}

function addDish(e) {
  e.preventDefault();

  const now = Date.now();
  if (now - lastAddDishTimestamp < ADD_DISH_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((ADD_DISH_COOLDOWN_MS - (now - lastAddDishTimestamp)) / 1000);
    showToast(`Vui lòng chờ ${remainingSeconds} giây trước khi thêm món tiếp theo!`, "warning");
    return;
  }

  if (dishes.length >= MAX_SHARED_DISHES) {
    showToast(`Thực đơn đã đạt tối đa ${MAX_SHARED_DISHES} món. Vui lòng nhờ Admin xóa bớt món trước khi thêm mới!`, "warning");
    return;
  }

  const name = dishNameInput.value.trim();
  const rawLocations = dishLocationsInput.value.trim();

  const checkedMeals = Array.from(addDishForm.querySelectorAll('input[name="mealCheck"]:checked'))
    .map(cb => cb.value);

  if (!name) {
    showToast("Vui lòng nhập tên món ăn!", "error");
    dishNameInput.focus();
    return;
  }

  if (name.length > 50) {
    showToast("Tên món ăn quá dài (tối đa 50 ký tự)!", "error");
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
  if (lines.length > 6) {
    showToast("Mỗi món chỉ nên thêm tối đa 6 địa chỉ quán ăn!", "warning");
    return;
  }

  const parsedLocations = lines.map(line => {
    let locName = line.slice(0, 50);
    let locAddress = 'TP. Hồ Chí Minh';
    if (line.includes(' - ')) {
      const parts = line.split(' - ');
      locName = parts[0].trim().slice(0, 50);
      locAddress = parts.slice(1).join(' - ').trim().slice(0, 100);
    } else if (line.includes(': ')) {
      const parts = line.split(': ');
      locName = parts[0].trim().slice(0, 50);
      locAddress = parts.slice(1).join(': ').trim().slice(0, 100);
    } else if (line.includes(',')) {
      const parts = line.split(',');
      locName = parts[0].trim().slice(0, 50);
      locAddress = parts.slice(1).join(',').trim().slice(0, 100);
    }
    return { name: locName, address: locAddress };
  });

  const newDish = {
    id: 'hcm-custom-' + Date.now(),
    name: name,
    mealTypes: checkedMeals,
    locations: parsedLocations
  };

  dishes.unshift(newDish);
  saveDishes();
  lastAddDishTimestamp = Date.now();

  dishNameInput.value = '';
  dishLocationsInput.value = '';

  showToast(`Đã thêm món "${name}" thành công!`, "success");
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

function resetDefaultDishes() {
  requireAdminPermission("Khôi phục dữ liệu mẫu", () => {
    if (confirm("CẢNH BÁO: Hành động này sẽ thay thế toàn bộ thực đơn dùng chung của mọi người bằng danh sách mẫu gốc chuẩn TP.HCM. Bạn chắc chắn chứ?")) {
      dishes = JSON.parse(JSON.stringify(DEFAULT_DISHES_HCM));
      saveDishes();
      showToast("Đã khôi phục thực đơn đặc sắc TP.HCM thành công!", "success");
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
    onResult: (winner) => showResultModal(winner, currentMeal)
  });
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
  dishLocationsInput = document.getElementById('dishLocationsInput');
  resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
  liveClockText = document.getElementById('liveClockText');
  autoActiveText = document.getElementById('autoActiveText');
  toggleSoundBtn = document.getElementById('toggleSoundBtn');
  soundOnIcon = document.getElementById('soundOnIcon');
  soundOffIcon = document.getElementById('soundOffIcon');
  dataSaveModeBadge = document.getElementById('dataSaveModeBadge');
  cloudStatusDot = document.getElementById('cloudStatusDot');
  cloudStatusText = document.getElementById('cloudStatusText');

  // Load initial local data
  dishes = loadDishesFromLocal();

  // Initialize Canvas
  initWheelCanvas(wheelCanvas);

  // Initialize Modules
  const initialPinHash = await initAdminPinSecurity();
  initAdminModal({ initialPinHash });

  initReviewsSystem({
    onSaveDishes: () => saveDishes(),
    onUpdateTabs: () => updateMealTabsUI()
  });

  initResultModal({
    onSpinAgain: handleSpinClick
  });

  initFirebaseModal({
    onReinitFirebase: () => {
      initFirebase({
        onDishesSync: (cloudDishes) => {
          dishes = cloudDishes;
          updateMealTabsUI();
        },
        onAdminPinSync: (newHash) => {
          setCurrentPinHash(newHash);
        },
        onStatusChange: setCloudStatus,
        getDishes: () => dishes,
        setDishes: (val) => { dishes = val; },
        getCurrentPinHash,
        setCurrentPinHash
      });
    },
    onSetCloudStatus: setCloudStatus
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

  // Reset defaults button
  if (resetDefaultsBtn) {
    resetDefaultsBtn.addEventListener('click', resetDefaultDishes);
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

  // Render initial UI
  updateMealTabsUI();

  // Initialize Firebase Cloud sync
  initFirebase({
    onDishesSync: (cloudDishes) => {
      dishes = cloudDishes;
      updateMealTabsUI();
    },
    onAdminPinSync: (newHash) => {
      setCurrentPinHash(newHash);
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
