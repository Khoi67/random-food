/**
 * DỊCH VỤ PHÂN TÍCH VÀ ĐO LƯỜNG SỰ KIỆN (Requirement 3.7 Analytics)
 * - Tích hợp Vercel Analytics (@vercel/analytics)
 * - Ghi nhận 6 sự kiện chính: spin, spin_again, open_maps, share, add_dish, filter_used
 * - Tuyệt đối không thu thập dữ liệu cá nhân (No PII, No IP, Privacy-First)
 */

import { inject, track } from '@vercel/analytics';

let isAnalyticsInitialized = false;

const isDev = Boolean(typeof import.meta !== 'undefined' && import.meta?.env?.DEV);

/**
 * Khởi tạo Vercel Web Analytics
 */
export function initAnalytics() {
  if (isAnalyticsInitialized) return;
  try {
    inject({
      mode: 'auto'
    });
    isAnalyticsInitialized = true;
    if (isDev) {
      console.log('[Analytics] 🚀 Vercel Analytics initialized in auto mode.');
    }
  } catch (err) {
    console.warn('[Analytics] Không thể khởi tạo Vercel Analytics:', err);
  }
}

/**
 * Ghi nhận sự kiện tổng quát (đảm bảo loại bỏ thông tin nhạy cảm)
 */
export function logEvent(eventName, properties = {}) {
  // Lọc chỉ giữ các thuộc tính an toàn (primitive types: string, number, boolean)
  const safeProps = {};
  for (const [key, val] of Object.entries(properties)) {
    if (val !== undefined && val !== null) {
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        safeProps[key] = val;
      }
    }
  }

  // Debug log ở môi trường local development
  if (isDev) {
    console.log(`[Analytics] 📊 Event "${eventName}":`, safeProps);
  }

  try {
    track(eventName, safeProps);
  } catch (err) {
    // Không làm gián đoạn trải nghiệm người dùng nếu mạng lỗi
  }
}

/**
 * 1. Sự kiện quay vòng (spin)
 */
export function trackSpin(options = {}) {
  const opts = typeof options === 'object' && options !== null ? options : { meal: options };
  logEvent('spin', {
    meal: opts.meal || 'sang',
    dishes_count: opts.dishesCount || 0,
    is_filtered: opts.isFiltered || false
  });
}

/**
 * 2. Sự kiện quay tiếp món khác từ kết quả (spin_again)
 */
export function trackSpinAgain(options = {}) {
  const opts = typeof options === 'object' && options !== null ? options : { previousDish: options };
  logEvent('spin_again', {
    previous_dish: opts.previousDish || '',
    meal: opts.meal || 'sang'
  });
}

/**
 * 3. Sự kiện mở Google Maps (open_maps)
 */
export function trackOpenMaps(dishOrOptions = {}, maybeLocation = '') {
  let opts = {};
  if (typeof dishOrOptions === 'string') {
    opts = { dishName: dishOrOptions, locationName: maybeLocation };
  } else if (typeof dishOrOptions === 'object' && dishOrOptions !== null) {
    opts = dishOrOptions;
  }
  logEvent('open_maps', {
    dish_name: opts.dishName || '',
    location_name: opts.locationName || '',
    maps_type: opts.type || 'directions'
  });
}

/**
 * 4. Sự kiện chia sẻ món ăn (share)
 */
export function trackShare(options = {}) {
  const opts = typeof options === 'object' && options !== null ? options : { dishName: options };
  logEvent('share', {
    dish_name: opts.dishName || '',
    share_method: opts.method || 'web_share'
  });
}

/**
 * 5. Sự kiện thêm món mới (add_dish)
 */
export function trackAddDish(mealOrOptions = {}, maybePrice = '') {
  let opts = {};
  if (typeof mealOrOptions === 'string') {
    opts = { meal: mealOrOptions };
  } else if (typeof mealOrOptions === 'object' && mealOrOptions !== null) {
    opts = mealOrOptions;
  }
  logEvent('add_dish', {
    meal: opts.meal || 'sang',
    has_short_name: opts.hasShortName || false,
    locations_count: opts.locationsCount || 0
  });
}

/**
 * 6. Sự kiện sử dụng bộ lọc (filter_used)
 */
export function trackFilterUsed(filterTypeOrOptions = {}, maybeValue = '') {
  let opts = {};
  if (typeof filterTypeOrOptions === 'string') {
    opts = { filterType: filterTypeOrOptions, filterValue: maybeValue };
  } else if (typeof filterTypeOrOptions === 'object' && filterTypeOrOptions !== null) {
    opts = filterTypeOrOptions;
  }
  logEvent('filter_used', {
    filter_type: opts.filterType || 'price',
    filter_value: String(opts.filterValue || 'all')
  });
}

