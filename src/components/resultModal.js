import { escapeHtml } from '../utils/helpers.js';
import { getDishRatingSummary, getLocationRatingSummary, showReviewModal } from './reviews.js';

let currentDishResult = null;

export function showResultModal(dish, currentMeal) {
  currentDishResult = dish;
  const modalDishName = document.getElementById('modalDishName');
  const modalMealBadge = document.getElementById('modalMealBadge');
  const modalRatingScore = document.getElementById('modalRatingScore');
  const modalReviewCount = document.getElementById('modalReviewCount');
  const modalOpenReviewBtn = document.getElementById('modalOpenReviewBtn');
  const modalNearbySearchLink = document.getElementById('modalNearbySearchLink');
  const modalLocationsCount = document.getElementById('modalLocationsCount');
  const modalLocationsList = document.getElementById('modalLocationsList');
  const resultModal = document.getElementById('resultModal');

  if (modalDishName) modalDishName.textContent = dish.name;

  const mealNames = {
    sang: '🌅 Món ăn Bữa Sáng tại TP.HCM',
    trua: '☀️ Món ăn Bữa Trưa tại TP.HCM',
    toi: '🌙 Món ăn Chiều / Tối tại TP.HCM'
  };
  if (modalMealBadge) {
    modalMealBadge.textContent = mealNames[currentMeal] || '🍜 Món ngon tại TP.HCM';
  }

  // Cập nhật điểm đánh giá & nút xem review
  const summary = getDishRatingSummary(dish);
  if (modalRatingScore) modalRatingScore.textContent = `${summary.starsText}/5`;
  if (modalReviewCount) modalReviewCount.textContent = `(${summary.count} review 💬)`;
  if (modalOpenReviewBtn) {
    modalOpenReviewBtn.onclick = () => {
      showReviewModal(dish);
    };
  }

  const nearbyQuery = `${dish.name} TP.HCM gần đây`;
  if (modalNearbySearchLink) {
    modalNearbySearchLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nearbyQuery)}`;
  }

  const locations = Array.isArray(dish.locations) && dish.locations.length > 0
    ? dish.locations
    : [{ name: dish.name, address: 'TP. Hồ Chí Minh' }];

  if (modalLocationsCount) modalLocationsCount.textContent = `${locations.length} quán`;
  if (modalLocationsList) {
    modalLocationsList.innerHTML = '';

    locations.forEach((loc, index) => {
      const fullQuery = `${loc.name} ${loc.address}`.trim();
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery)}`;
      const locSummary = getLocationRatingSummary(loc, dish);

      const card = document.createElement('div');
      card.className = 'group flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 transition duration-150 text-left';

      card.innerHTML = `
        <div class="flex items-start space-x-3 min-w-0 pr-2 flex-1 cursor-pointer view-loc-review-trigger" data-loc-idx="${index}" title="Bấm để xem đánh giá & review của quán này">
          <div class="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
            ${index + 1}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-2 flex-wrap">
              <h4 class="text-sm font-bold text-white group-hover:text-amber-300 transition truncate">
                ${escapeHtml(loc.name)}
              </h4>
              <span class="inline-flex items-center text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                ⭐ ${locSummary.starsText} <span class="text-slate-400 font-normal ml-0.5">(${locSummary.count})</span>
              </span>
            </div>
            <p class="text-xs text-slate-300 truncate mt-0.5" title="${escapeHtml(loc.address)}">
              📍 ${escapeHtml(loc.address)}
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-1.5 flex-shrink-0">
          <button type="button" class="view-loc-review-btn px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white font-semibold text-xs border border-amber-500/30 transition flex items-center gap-1 cursor-pointer" data-loc-idx="${index}" title="Xem review và đánh giá cho quán này">
            <span>⭐ Review</span>
          </button>

          <a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white font-bold text-xs border border-sky-500/30 transition transform active:scale-95" title="Mở Google Maps chỉ đường">
            <span>Chỉ đường</span>
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
            </svg>
          </a>
        </div>
      `;

      modalLocationsList.appendChild(card);
    });

    // Gắn sự kiện click mở review chi tiết từng quán
    modalLocationsList.querySelectorAll('.view-loc-review-trigger, .view-loc-review-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(el.getAttribute('data-loc-idx'));
        showReviewModal(dish, idx);
      });
    });
  }

  if (resultModal) {
    resultModal.classList.remove('modal-enter');
    resultModal.classList.add('modal-show');
  }
}

export function hideResultModal() {
  const resultModal = document.getElementById('resultModal');
  if (resultModal) {
    resultModal.classList.remove('modal-show');
    resultModal.classList.add('modal-enter');
  }
}

export function initResultModal({ onSpinAgain }) {
  const closeModalBtn = document.getElementById('closeModalBtn');
  const resultModal = document.getElementById('resultModal');
  const modalSpinAgainBtn = document.getElementById('modalSpinAgainBtn');

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideResultModal);
  }

  if (resultModal) {
    resultModal.addEventListener('click', (e) => {
      if (e.target === resultModal) hideResultModal();
    });
  }

  if (modalSpinAgainBtn) {
    modalSpinAgainBtn.addEventListener('click', () => {
      hideResultModal();
      if (onSpinAgain) onSpinAgain();
    });
  }
}
