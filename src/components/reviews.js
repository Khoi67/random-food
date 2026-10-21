import { SAMPLE_LOCATION_REVIEWS_HCM } from '../data/sampleReviews.js';
import { escapeHtml, showToast } from '../utils/helpers.js';
import { REVIEW_COOLDOWN_MS, MAX_REVIEWS_PER_DISH } from '../utils/constants.js';
import { getCurrentUser } from '../services/firebase.js';

let currentReviewDish = null;
let currentReviewLocationIndex = null;
let selectedStarRating = 5;
let lastReviewSubmitTimestamp = 0;

let saveDishesCallback = null;
let updateMealTabsCallback = null;
let reportCallback = null;

export function initReviewsSystem({ onSaveDishes, onUpdateTabs, onReport }) {
  saveDishesCallback = onSaveDishes;
  updateMealTabsCallback = onUpdateTabs;
  reportCallback = onReport;
  setupStarRatingSelector();

  const addReviewForm = document.getElementById('addReviewForm');
  if (addReviewForm) {
    addReviewForm.addEventListener('submit', handleReviewSubmit);
  }

  const closeReviewModalBtn = document.getElementById('closeReviewModalBtn');
  if (closeReviewModalBtn) {
    closeReviewModalBtn.addEventListener('click', hideReviewModal);
  }

  const reviewModal = document.getElementById('reviewModal');
  if (reviewModal) {
    reviewModal.addEventListener('click', (e) => {
      if (e.target === reviewModal) hideReviewModal();
    });
  }
}

/**
 * Chuẩn hóa reviews thành mảng (hỗ trợ cả Array cũ lẫn Object theo UID)
 */
function normalizeReviews(rawReviews) {
  if (!rawReviews) return [];
  if (Array.isArray(rawReviews)) return rawReviews.filter(Boolean);
  if (typeof rawReviews === 'object') {
    return Object.entries(rawReviews).map(([uid, r]) => ({
      uid,
      id: r.id || `rev-${uid}`,
      ...r
    }));
  }
  return [];
}

export function getLocationReviews(loc, dish) {
  if (loc && loc.reviews) {
    const list = normalizeReviews(loc.reviews);
    if (list.length > 0) return list;
  }
  if (loc && SAMPLE_LOCATION_REVIEWS_HCM[loc.name]) {
    return SAMPLE_LOCATION_REVIEWS_HCM[loc.name];
  }
  return [];
}

export function getLocationRatingSummary(loc, dish) {
  const reviews = getLocationReviews(loc, dish);
  if (!reviews || reviews.length === 0) {
    return { average: 0, count: 0, starsText: 'Chưa có đánh giá', hasReviews: false };
  }
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  const avg = (sum / reviews.length).toFixed(1);
  return { average: Number(avg), count: reviews.length, starsText: avg, hasReviews: true };
}

export function getDishReviews(dish) {
  if (!dish) return [];
  const allReviews = [];
  if (dish.reviews) {
    allReviews.push(...normalizeReviews(dish.reviews));
  }
  if (Array.isArray(dish.locations)) {
    dish.locations.forEach(loc => {
      allReviews.push(...getLocationReviews(loc, dish));
    });
  }
  return allReviews;
}

export function getDishRatingSummary(dish) {
  const reviews = getDishReviews(dish);
  if (!reviews || reviews.length === 0) {
    return { average: 0, count: 0, starsText: 'Chưa có đánh giá', hasReviews: false };
  }
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  const avg = (sum / reviews.length).toFixed(1);
  return { average: Number(avg), count: reviews.length, starsText: avg, hasReviews: true };
}

export function showReviewModal(dish, locationIndex = null) {
  if (!dish) return;
  currentReviewDish = dish;
  currentReviewLocationIndex = (typeof locationIndex === 'number' && dish.locations && dish.locations[locationIndex])
    ? locationIndex
    : null;

  updateReviewModalContent();

  // Reset form nhập
  setStarRating(5);
  const reviewAuthorInput = document.getElementById('reviewAuthorInput');
  const reviewCommentInput = document.getElementById('reviewCommentInput');
  if (reviewAuthorInput) reviewAuthorInput.value = '';
  if (reviewCommentInput) reviewCommentInput.value = '';

  const reviewModal = document.getElementById('reviewModal');
  if (reviewModal) {
    reviewModal.classList.remove('modal-enter');
    reviewModal.classList.add('modal-show');
  }
}

export function hideReviewModal() {
  const reviewModal = document.getElementById('reviewModal');
  if (reviewModal) {
    reviewModal.classList.remove('modal-show');
    reviewModal.classList.add('modal-enter');
  }
  currentReviewDish = null;
  currentReviewLocationIndex = null;
}

export function updateReviewModalContent() {
  if (!currentReviewDish) return;
  const dish = currentReviewDish;
  const locations = Array.isArray(dish.locations) ? dish.locations : [];

  const reviewLocationTabsContainer = document.getElementById('reviewLocationTabsContainer');
  const reviewModalBadge = document.getElementById('reviewModalBadge');
  const reviewModalDishName = document.getElementById('reviewModalDishName');
  const reviewModalSubTitle = document.getElementById('reviewModalSubTitle');
  const reviewModalMapLink = document.getElementById('reviewModalMapLink');
  const reviewModalAvgScore = document.getElementById('reviewModalAvgScore');
  const reviewModalTotalCount = document.getElementById('reviewModalTotalCount');
  const reviewModalList = document.getElementById('reviewModalList');
  const emptyReviewState = document.getElementById('emptyReviewState');

  if (!reviewLocationTabsContainer) return;

  // 1. Render Location Switcher Chips
  reviewLocationTabsContainer.innerHTML = '';

  // Chip 0: Tất cả quán của món
  const allChip = document.createElement('button');
  allChip.type = 'button';
  const isAllActive = currentReviewLocationIndex === null;
  allChip.className = `px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1 ${
    isAllActive
      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
  }`;
  const dishSummary = getDishRatingSummary(dish);
  allChip.innerHTML = `<span>🏠 Tất cả (${dishSummary.starsText}⭐)</span>`;
  allChip.onclick = () => {
    currentReviewLocationIndex = null;
    updateReviewModalContent();
  };
  reviewLocationTabsContainer.appendChild(allChip);

  // Chips cho từng quán
  locations.forEach((loc, idx) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    const isLocActive = currentReviewLocationIndex === idx;
    const locSummary = getLocationRatingSummary(loc, dish);
    chip.className = `px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1 ${
      isLocActive
        ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
    }`;
    chip.innerHTML = `<span>📍 ${escapeHtml(loc.name)} (${locSummary.starsText}⭐)</span>`;
    chip.onclick = () => {
      currentReviewLocationIndex = idx;
      updateReviewModalContent();
    };
    reviewLocationTabsContainer.appendChild(chip);
  });

  // 2. Cập nhật Tiêu đề và Điểm số theo quán đang chọn
  let currentReviews = [];
  let summary = null;

  if (currentReviewLocationIndex !== null && locations[currentReviewLocationIndex]) {
    const loc = locations[currentReviewLocationIndex];
    if (reviewModalBadge) reviewModalBadge.textContent = "REVIEW ĐỊA CHỈ QUÁN ĂN";
    if (reviewModalDishName) reviewModalDishName.textContent = loc.name;
    if (reviewModalSubTitle) reviewModalSubTitle.textContent = `Món: ${dish.name} • 📍 ${loc.address}`;

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + ' ' + loc.address)}`;
    if (reviewModalMapLink) {
      reviewModalMapLink.href = mapUrl;
      reviewModalMapLink.classList.remove('hidden');
      reviewModalMapLink.classList.add('inline-flex');
    }

    summary = getLocationRatingSummary(loc, dish);
    currentReviews = getLocationReviews(loc, dish);
  } else {
    if (reviewModalBadge) reviewModalBadge.textContent = "ĐÁNH GIÁ ẨM THỰC SÀI GÒN";
    if (reviewModalDishName) reviewModalDishName.textContent = dish.name;
    if (reviewModalSubTitle) reviewModalSubTitle.textContent = `Tổng hợp đánh giá các quán ngon chuẩn vị TP.HCM (${locations.length} quán)`;
    if (reviewModalMapLink) {
      reviewModalMapLink.classList.add('hidden');
      reviewModalMapLink.classList.remove('inline-flex');
    }

    summary = getDishRatingSummary(dish);
    currentReviews = getDishReviews(dish);
  }

  if (reviewModalAvgScore) {
    reviewModalAvgScore.textContent = summary.hasReviews ? summary.starsText : "Chưa có";
  }
  if (reviewModalTotalCount) {
    reviewModalTotalCount.textContent = summary.hasReviews ? `${summary.count} đánh giá` : "Chưa có đánh giá";
  }

  // 3. Render danh sách review
  if (reviewModalList) {
    reviewModalList.innerHTML = '';
    if (!currentReviews || currentReviews.length === 0) {
      if (emptyReviewState) emptyReviewState.classList.remove('hidden');
    } else {
      if (emptyReviewState) emptyReviewState.classList.add('hidden');
      currentReviews.forEach((rev, rIdx) => {
        const item = document.createElement('div');
        item.className = 'p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1.5 transition hover:bg-slate-800 relative group';

        const ratingNum = Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 5)));
        const starString = '★'.repeat(ratingNum) + '☆'.repeat(Math.max(0, 5 - ratingNum));
        const authorInitial = (rev.author || 'T').charAt(0).toUpperCase();
        const reviewIdentifier = rev.id || rev.uid || `rev-${rIdx}`;

        item.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[10px] border border-amber-500/30 flex-shrink-0">
                ${escapeHtml(authorInitial)}
              </div>
              <span class="font-bold text-slate-200 truncate max-w-[150px] sm:max-w-[200px]">${escapeHtml(rev.author || 'Thực khách Sài Gòn')}</span>
            </div>
            <div class="flex items-center space-x-1.5 flex-shrink-0">
              <span class="text-amber-400 font-bold tracking-wider">${starString}</span>
              <span class="text-[10px] text-slate-400 font-normal">(${ratingNum}/5)</span>
            </div>
          </div>
          <p class="text-slate-300 leading-relaxed pl-8">
            ${escapeHtml(rev.comment)}
          </p>
          <div class="flex items-center justify-between pl-8 pt-1 text-[10px] text-slate-400">
            <span>${escapeHtml(rev.time || 'Vừa xong')}</span>
            <button type="button" class="report-review-btn opacity-60 hover:opacity-100 hover:text-rose-400 transition flex items-center gap-0.5 cursor-pointer" data-rev-id="${reviewIdentifier}" data-rev-author="${escapeHtml(rev.author || '')}">
              <span>🚩</span>
              <span>Báo cáo</span>
            </button>
          </div>
        `;

        // Gắn sự kiện Báo cáo review
        const reportBtn = item.querySelector('.report-review-btn');
        if (reportBtn) {
          reportBtn.addEventListener('click', () => {
            if (reportCallback) {
              reportCallback({
                targetType: 'review',
                targetId: reviewIdentifier,
                targetName: `Đánh giá của ${rev.author || 'Thực khách'}`
              });
            }
          });
        }

        reviewModalList.appendChild(item);
      });
    }
  }
}

function handleReviewSubmit(e) {
  e.preventDefault();
  if (!currentReviewDish) return;

  const now = Date.now();
  if (now - lastReviewSubmitTimestamp < REVIEW_COOLDOWN_MS) {
    const waitSec = Math.ceil((REVIEW_COOLDOWN_MS - (now - lastReviewSubmitTimestamp)) / 1000);
    showToast(`Vui lòng chờ ${waitSec} giây trước khi gửi đánh giá tiếp theo!`, "warning");
    return;
  }

  const reviewAuthorInput = document.getElementById('reviewAuthorInput');
  const reviewCommentInput = document.getElementById('reviewCommentInput');

  const author = (reviewAuthorInput ? reviewAuthorInput.value.trim() : '') || 'Thực khách Sài Gòn';
  const comment = reviewCommentInput ? reviewCommentInput.value.trim() : '';
  const rating = Math.min(5, Math.max(1, Math.round(Number(selectedStarRating) || 5)));

  if (!comment) {
    showToast("Vui lòng nhập cảm nhận hoặc gợi ý của bạn!", "error");
    if (reviewCommentInput) reviewCommentInput.focus();
    return;
  }

  // Tiêu chí bảo mật: nội dung review tối đa 500 ký tự
  if (comment.length > 500) {
    showToast("Nội dung đánh giá tối đa 500 ký tự!", "warning");
    return;
  }

  const user = getCurrentUser();
  const userUid = user?.uid || ('user-' + Date.now());

  const reviewData = {
    uid: userUid,
    id: 'rev-' + userUid,
    author: author.slice(0, 40),
    rating: rating,
    comment: comment.slice(0, 500),
    time: 'Vừa xong',
    createdAt: Date.now()
  };

  let isUpdated = false;

  // Nếu đang xem 1 quán cụ thể -> Lưu vào quán đó theo UID
  if (currentReviewLocationIndex !== null && Array.isArray(currentReviewDish.locations) && currentReviewDish.locations[currentReviewLocationIndex]) {
    const targetLoc = currentReviewDish.locations[currentReviewLocationIndex];
    if (!Array.isArray(targetLoc.reviews)) {
      targetLoc.reviews = [...getLocationReviews(targetLoc, currentReviewDish)];
    }
    // Tìm review cũ của cùng 1 UID để cập nhật (Mỗi UID chỉ đánh giá 1 lần)
    const existingIdx = targetLoc.reviews.findIndex(r => r.uid === userUid);
    if (existingIdx !== -1) {
      targetLoc.reviews[existingIdx] = { ...targetLoc.reviews[existingIdx], ...reviewData, time: 'Vừa cập nhật' };
      isUpdated = true;
    } else {
      targetLoc.reviews.unshift(reviewData);
      if (targetLoc.reviews.length > MAX_REVIEWS_PER_DISH) {
        targetLoc.reviews = targetLoc.reviews.slice(0, MAX_REVIEWS_PER_DISH);
      }
    }
  } else {
    // Lưu vào món ăn chung theo UID
    if (!Array.isArray(currentReviewDish.reviews)) {
      currentReviewDish.reviews = [...getDishReviews(currentReviewDish)];
    }
    const existingIdx = currentReviewDish.reviews.findIndex(r => r.uid === userUid);
    if (existingIdx !== -1) {
      currentReviewDish.reviews[existingIdx] = { ...currentReviewDish.reviews[existingIdx], ...reviewData, time: 'Vừa cập nhật' };
      isUpdated = true;
    } else {
      currentReviewDish.reviews.unshift(reviewData);
      if (currentReviewDish.reviews.length > MAX_REVIEWS_PER_DISH) {
        currentReviewDish.reviews = currentReviewDish.reviews.slice(0, MAX_REVIEWS_PER_DISH);
      }
    }
  }

  if (saveDishesCallback) saveDishesCallback();
  lastReviewSubmitTimestamp = Date.now();

  updateReviewModalContent();
  if (updateMealTabsCallback) updateMealTabsCallback();

  if (reviewCommentInput) reviewCommentInput.value = '';
  showToast(isUpdated ? "Đánh giá của bạn đã được cập nhật! ⭐" : "Cảm ơn bạn đã gửi đánh giá! ⭐", "success");
}

export function setupStarRatingSelector() {
  const stars = document.querySelectorAll('#starRatingSelector .star-btn');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const val = Number(star.dataset.star);
      setStarRating(val);
    });
    star.addEventListener('mouseenter', () => {
      const val = Number(star.dataset.star);
      highlightStars(val);
    });
  });
  const container = document.getElementById('starRatingSelector');
  if (container) {
    container.addEventListener('mouseleave', () => {
      highlightStars(selectedStarRating);
    });
  }
}

export function setStarRating(val) {
  selectedStarRating = val;
  highlightStars(val);
}

export function highlightStars(val) {
  const stars = document.querySelectorAll('#starRatingSelector .star-btn');
  stars.forEach(s => {
    const starNum = Number(s.dataset.star);
    if (starNum <= val) {
      s.classList.remove('text-slate-600');
      s.classList.add('text-amber-400');
    } else {
      s.classList.remove('text-amber-400');
      s.classList.add('text-slate-600');
    }
  });
}
