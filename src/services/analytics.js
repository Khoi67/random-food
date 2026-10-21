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
export function trackSpin({ meal = 'sang', dishesCount = 0, isFiltered = false }) {
  logEvent('spin', {
    meal,
    dishes_count: dishesCount,
    is_filtered: isFiltered
  });
}

/**
 * 2. Sự kiện quay tiếp món khác từ kết quả (spin_again)
 */
export function trackSpinAgain({ previousDish = '', meal = 'sang' }) {
  logEvent('spin_again', {
    previous_dish: previousDish,
    meal
  });
}

/**
 * 3. Sự kiện mở Google Maps (open_maps)
 */
export function trackOpenMaps({ dishName = '', locationName = '', type = 'directions' }) {
  logEvent('open_maps', {
    dish_name: dishName,
    location_name: locationName,
    maps_type: type
  });
}

/**
 * 4. Sự kiện chia sẻ món ăn (share)
 */
export function trackShare({ dishName = '', method = 'web_share' }) {
  logEvent('share', {
    dish_name: dishName,
    share_method: method
  });
}

/**
 * 5. Sự kiện thêm món mới (add_dish)
 */
export function trackAddDish({ meal = 'sang', hasShortName = false, locationsCount = 0 }) {
  logEvent('add_dish', {
    meal,
    has_short_name: hasShortName,
    locations_count: locationsCount
  });
}

/**
 * 6. Sự kiện sử dụng bộ lọc (filter_used)
 */
export function trackFilterUsed({ filterType = 'price', filterValue = 'all' }) {
  logEvent('filter_used', {
    filter_type: filterType,
    filter_value: String(filterValue)
  });
}
