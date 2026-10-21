/**
 * DỊCH VỤ ĐỊNH VỊ VÀ TÍNH KHOẢNG CÁCH QUÁN GẦN TÔI (Requirement 3.4)
 * - Tôn trọng bảo mật: chỉ xin quyền khi người dùng chủ động nhấn nút.
 * - Tính khoảng cách theo đường chim bay bằng công thức Haversine.
 * - Sắp xếp quán theo khoảng cách tăng dần và hiển thị 'Cách bạn ~1.2 km'.
 * - Fallback mượt mà nếu từ chối quyền hoặc lỗi thiết bị.
 */

// Bảng tọa độ trung tâm các Quận / Huyện / Thành phố tại TP.HCM
export const DISTRICT_COORDINATES_HCM = [
  { match: /quận\s*1\b|q\.?1\b|bến\s*nghé|bến\s*thành|đa\s*kao|tân\s*định|cô\s*giang|nguyễn\s*cư\s*trinh/i, lat: 10.7769, lng: 106.7009 },
  { match: /quận\s*3\b|q\.?3\b|võ\s*thị\s*sáu|bàn\s*cờ/i, lat: 10.7844, lng: 106.6844 },
  { match: /quận\s*4\b|q\.?4\b|vĩnh\s*khánh|đoàn\s*văn\s*bơ|hoàng\s*diệu/i, lat: 10.7578, lng: 106.7013 },
  { match: /quận\s*5\b|q\.?5\b|chợ\s*lớn|an\s*đông|triệu\s*quang\s*phục/i, lat: 10.7540, lng: 106.6634 },
  { match: /quận\s*6\b|q\.?6\b|bình\s*tây/i, lat: 10.7481, lng: 106.6352 },
  { match: /quận\s*7\b|q\.?7\b|phú\s*mỹ\s*hưng|tân\s*phong|tân\s*quy|tân\s*hưng|nguyễn\s*thị\s*thập/i, lat: 10.7340, lng: 106.7218 },
  { match: /quận\s*8\b|q\.?8\b|ba\s*đình/i, lat: 10.7241, lng: 106.6286 },
  { match: /quận\s*10\b|q\.?10\b|hồ\s*thị\s*kỷ|tô\s*hiến\s*thành|thành\s*thái/i, lat: 10.7679, lng: 106.6669 },
  { match: /quận\s*11\b|q\.?11\b|đầm\s*sen|lê\s*đại\s*hành/i, lat: 10.7629, lng: 106.6504 },
  { match: /quận\s*12\b|q\.?12\b/i, lat: 10.8671, lng: 106.6413 },
  { match: /phú\s*nhuận|đặng\s*văn\s*ngữ|phan\s*xích\s*long/i, lat: 10.7992, lng: 106.6803 },
  { match: /bình\s*thạnh|bà\s*chiểu|thanh\s*đa|bùi\s*hữu\s*nghĩa/i, lat: 10.8106, lng: 106.7091 },
  { match: /tân\s*bình|đồng\s*đen|nguyễn\s*hồng\s*đào/i, lat: 10.8015, lng: 106.6534 },
  { match: /tân\s*phú/i, lat: 10.7901, lng: 106.6280 },
  { match: /gò\s*vấp|lê\s*quang\s*định/i, lat: 10.8388, lng: 106.6653 },
  { match: /bình\s*tân/i, lat: 10.7654, lng: 106.6038 },
  { match: /quận\s*2\b|q\.?2\b|thảo\s*điền/i, lat: 10.7872, lng: 106.7498 },
  { match: /quận\s*9\b|q\.?9\b/i, lat: 10.8428, lng: 106.7944 },
  { match: /thủ\s*đức/i, lat: 10.8494, lng: 106.7537 },
  { match: /nhà\s*bè/i, lat: 10.6953, lng: 106.7277 },
  { match: /hóc\s*môn/i, lat: 10.8865, lng: 106.5923 },
  { match: /bình\s*chánh/i, lat: 10.6874, lng: 106.5912 },
  { match: /củ\s*chi/i, lat: 11.0067, lng: 106.4946 },
  { match: /cần\s*giờ/i, lat: 10.4114, lng: 106.9546 }
];

// Tọa độ chi tiết các quán / địa điểm ẩm thực nổi tiếng tại TP.HCM
export const FAMOUS_LANDMARKS_HCM = [
  { match: /ba ghiền/i, lat: 10.7946, lng: 106.6715 },
  { match: /phúc lộc thọ/i, lat: 10.7410, lng: 106.7090 },
  { match: /tú mập/i, lat: 10.7975, lng: 106.6450 },
  { match: /nhân quán/i, lat: 10.7570, lng: 106.6800 },
  { match: /quỳnh/i, lat: 10.7710, lng: 106.6860 },
  { match: /huỳnh hoa/i, lat: 10.7711, lng: 106.6917 },
  { match: /bảy hổ/i, lat: 10.7905, lng: 106.6965 },
  { match: /như lan/i, lat: 10.7725, lng: 106.7032 },
  { match: /hòa mã/i, lat: 10.7748, lng: 106.6852 },
  { match: /út hưng/i, lat: 10.7795, lng: 106.6865 },
  { match: /phở lệ/i, lat: 10.7554, lng: 106.6710 },
  { match: /phở hòa/i, lat: 10.7895, lng: 106.6885 },
  { match: /bò né lệ hồng/i, lat: 10.7960, lng: 106.6780 },
  { match: /bánh canh út lệ/i, lat: 10.7770, lng: 106.6620 },
  { match: /tiến phát/i, lat: 10.7545, lng: 106.6570 },
  { match: /baoz dimsum/i, lat: 10.7562, lng: 106.6675 },
  { match: /xôi gà bà chiểu/i, lat: 10.8010, lng: 106.6980 },
  { match: /chị tuyền/i, lat: 10.7635, lng: 106.6955 },
  { match: /a chảnh/i, lat: 10.7730, lng: 106.6580 },
  { match: /mạc văn khoa/i, lat: 10.7970, lng: 106.6890 },
  { match: /cơm niêu tú xương/i, lat: 10.7830, lng: 106.6870 },
  { match: /cơm gà 142/i, lat: 10.7485, lng: 106.6680 },
  { match: /bún mắm 173 cô giang/i, lat: 10.7635, lng: 106.6950 },
  { match: /bánh xèo ăn là ghiền/i, lat: 10.7735, lng: 106.6900 },
  { match: /bún chả ánh hồng/i, lat: 10.7875, lng: 106.6845 },
  { match: /cơm thố chuyên ký/i, lat: 10.7715, lng: 106.7035 },
  { match: /ốc đào/i, lat: 10.7645, lng: 106.6895 },
  { match: /ốc oanh/i, lat: 10.7600, lng: 106.7050 },
  { match: /lẩu bò hoàng thu/i, lat: 10.7675, lng: 106.6760 },
  { match: /lẩu dê 404/i, lat: 10.7390, lng: 106.7115 },
  { match: /phá lấu bò cô thảo/i, lat: 10.7580, lng: 106.7080 }
];

let cachedUserCoords = null;

/**
 * Lấy tọa độ GPS của một quán ăn
 * 1. Ưu tiên lat/lng đã có sẵn trong object quán
 * 2. Tìm kiếm trong danh sách quán nổi tiếng
 * 3. Tìm theo Quận / Huyện trong địa chỉ
 * 4. Fallback về trung tâm TP.HCM
 */
export function getCoordinatesForLocation(loc) {
  if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' && !isNaN(loc.lat) && !isNaN(loc.lng)) {
    return { lat: loc.lat, lng: loc.lng };
  }

  const fullText = `${loc?.name || ''} ${loc?.address || ''}`.trim();

  // Kiểm tra danh sách quán nổi tiếng
  for (const item of FAMOUS_LANDMARKS_HCM) {
    if (item.match.test(fullText)) {
      return { lat: item.lat, lng: item.lng };
    }
  }

  // Kiểm tra theo Quận / Huyện
  for (const item of DISTRICT_COORDINATES_HCM) {
    if (item.match.test(fullText)) {
      return { lat: item.lat, lng: item.lng };
    }
  }

  // Mặc định trung tâm TP.HCM (Quận 1)
  return { lat: 10.7769, lng: 106.7009 };
}

/**
 * Công thức Haversine tính khoảng cách theo đường chim bay giữa 2 tọa độ GPS (km)
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Định dạng khoảng cách hiển thị thân thiện: 'Cách bạn ~1.2 km' hoặc 'Cách bạn ~450 m'
 */
export function formatDistance(km) {
  if (km == null || isNaN(km)) return '';
  if (km < 1) {
    const meters = Math.max(50, Math.round(km * 1000));
    return `Cách bạn ~${meters} m`;
  }
  return `Cách bạn ~${km.toFixed(1)} km`;
}

/**
 * Lấy tọa độ người dùng đã lưu trong phiên duyệt web hiện tại (nếu có)
 */
export function getCachedUserLocation() {
  if (cachedUserCoords) return cachedUserCoords;
  try {
    const raw = sessionStorage.getItem('user_geo_coords');
    if (raw) {
      cachedUserCoords = JSON.parse(raw);
      return cachedUserCoords;
    }
  } catch (e) {}
  return null;
}

/**
 * Yêu cầu quyền vị trí người dùng qua Geolocation API (CHỈ KHI NGƯỜI DÙNG BẤM NÚT)
 */
export function requestUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ Geolocation API.'));
      return;
    }

    // Nếu đã có cache thì trả về ngay
    const cached = getCachedUserLocation();
    if (cached) {
      resolve(cached);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        cachedUserCoords = coords;
        try {
          sessionStorage.setItem('user_geo_coords', JSON.stringify(coords));
        } catch (e) {}
        resolve(coords);
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 60000
      }
    );
  });
}
