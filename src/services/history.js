/**
 * Dịch vụ Quản lý Lịch sử, Loại trừ và Món Yêu Thích (Requirement 3.2)
 * Lưu trữ độc lập theo thiết bị người dùng (localStorage)
 */

export const SPIN_HISTORY_KEY = 'hom_nay_an_gi_history_v1';
export const AVOID_DAYS_KEY = 'hom_nay_an_gi_avoid_days_v1';
export const FAVORITES_KEY = 'hom_nay_an_gi_favorites_v1';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Lấy lịch sử 14 ngày gần nhất (tự động loại bỏ các mục cũ hơn 14 ngày)
 */
export function getSpinHistory() {
  try {
    const raw = localStorage.getItem(SPIN_HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    const now = Date.now();
    const valid = list.filter(item => (now - item.timestamp) <= FOURTEEN_DAYS_MS);

    // Nếu có mục cũ bị loại, lưu lại danh sách sạch
    if (valid.length !== list.length) {
      localStorage.setItem(SPIN_HISTORY_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch (e) {
    console.error('Lỗi khi đọc lịch sử:', e);
    return [];
  }
}

/**
 * Ghi nhận một món đã quay trúng vào lịch sử
 */
export function recordSpinHistory(dish, mealType = 'sang') {
  if (!dish || !dish.id) return;
  const history = getSpinHistory();
  const entry = {
    id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    dishId: dish.id,
    dishName: dish.name,
    timestamp: Date.now(),
    mealType: mealType
  };

  history.unshift(entry);
  try {
    localStorage.setItem(SPIN_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  } catch (e) {
    console.error('Lỗi khi ghi lịch sử:', e);
  }
  return entry;
}

/**
 * Xóa một mục trong lịch sử
 */
export function deleteSpinHistoryItem(id) {
  const history = getSpinHistory().filter(item => item.id !== id);
  localStorage.setItem(SPIN_HISTORY_KEY, JSON.stringify(history));
  return history;
}

/**
 * Xóa toàn bộ lịch sử 14 ngày
 */
export function clearSpinHistory() {
  localStorage.removeItem(SPIN_HISTORY_KEY);
}

/**
 * Lấy số ngày tránh lặp lại (mặc định 0 = không tránh)
 */
export function getAvoidDays() {
  const val = parseInt(localStorage.getItem(AVOID_DAYS_KEY) || '0', 10);
  return isNaN(val) ? 0 : val;
}

/**
 * Lưu số ngày tránh lặp lại món đã ăn
 */
export function setAvoidDays(days) {
  const val = parseInt(days, 10) || 0;
  localStorage.setItem(AVOID_DAYS_KEY, String(val));
  return val;
}

/**
 * Lấy danh sách ID các món đã ăn trong N ngày gần nhất
 */
export function getRecentlyEatenDishIds(days = 0) {
  const avoidDays = days > 0 ? days : getAvoidDays();
  if (avoidDays <= 0) return new Set();

  const history = getSpinHistory();
  const cutoff = Date.now() - (avoidDays * 24 * 60 * 60 * 1000);
  const ids = new Set();

  history.forEach(item => {
    if (item.timestamp >= cutoff && item.dishId) {
      ids.add(item.dishId);
    }
  });

  return ids;
}

/**
 * Lấy danh sách ID các món Yêu Thích
 */
export function getFavoriteDishIds() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}

/**
 * Bật/tắt trạng thái Yêu Thích của một món
 * Trả về true nếu món trở thành Yêu Thích, false nếu bỏ Yêu Thích
 */
export function toggleFavoriteDish(dishId) {
  if (!dishId) return false;
  const favs = getFavoriteDishIds();
  let isFav = false;

  if (favs.has(dishId)) {
    favs.delete(dishId);
    isFav = false;
  } else {
    favs.add(dishId);
    isFav = true;
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favs)));
  return isFav;
}

/**
 * Kiểm tra một món có phải là Yêu Thích không
 */
export function isFavoriteDish(dishId) {
  if (!dishId) return false;
  const favs = getFavoriteDishIds();
  return favs.has(dishId);
}
