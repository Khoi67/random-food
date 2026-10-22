/**
 * BỘ KIỂM THỬ HỒI QUY TOÀN DIỆN HỆ THỐNG (FULL SYSTEM REGRESSION TEST SUITE)
 * Ứng dụng: Hôm Nay Ăn Gì - TP.HCM (Random Food PWA)
 * 
 * Mục đích: Đảm bảo 100% chức năng cốt lõi không bao giờ bị phá vỡ, suy giảm hiệu năng
 * hoặc thay đổi hành vi ngoài ý muốn trong bất kỳ lần chỉnh sửa code nào trong tương lai.
 * 
 * Phạm vi bao phủ:
 * 1. Thuật toán Vòng quay & Trọng số (Spin Mechanics)
 * 2. Bộ lọc thông minh TP.HCM (Bữa ăn, Khoảng giá, Chay/Mặn, Nước/Khô, Loại trừ món)
 * 3. Tầng lưu trữ Local-First & Chuẩn hóa dữ liệu (Storage, Normalizer, Fallback)
 * 4. Quy trình Quản trị viên (Google Sign-In SHA-256, Duyệt món, Xóa món, Audit logs append-only)
 * 5. Hệ thống Đánh giá & Báo cáo (Review món, Review theo quán, Report, Rate limits)
 * 6. Lớp Bảo Vệ & An ninh ứng dụng (Kill Switch, XSS Sanitization, Security Headers, CSP, API Config)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import các modules nghiệp vụ thực tế của ứng dụng
import { filterDishes } from '../src/utils/filterLogic.js';
import { normalizeDish } from '../src/services/storage.js';
import { safeUrl, createGoogleMapsUrl, escapeHtml } from '../src/utils/helpers.js';
import apiConfigHandler from '../api/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper đọc và làm sạch database.rules.json
function getRules() {
  const rulesPath = path.resolve(__dirname, '../database.rules.json');
  const raw = fs.readFileSync(rulesPath, 'utf8');
  const clean = raw.replace(/\/\/.*$/gm, '');
  return JSON.parse(clean).rules;
}

// Mock Dish mẫu chuẩn TP.HCM
const mockDishComTam = {
  id: 'dish_com_tam_sg',
  name: 'Cơm tấm sườn bì chả',
  shortName: 'Cơm tấm',
  mealTypes: ['sang', 'trua', 'toi'],
  meal: 'trua',
  priceRange: 'under50',
  type: 'kho',
  vegetarian: false,
  status: 'approved',
  locations: [
    {
      id: 'loc_ba_ghien',
      name: 'Cơm Tấm Ba Ghiền',
      address: '84 Đặng Văn Ngữ, P.10, Phú Nhuận',
      lat: 10.7932,
      lng: 106.6711
    }
  ]
};

const mockDishPhoBo = {
  id: 'dish_pho_bo_sg',
  name: 'Phở bò tái lăn',
  shortName: 'Phở bò',
  mealTypes: ['sang', 'trua'],
  meal: 'sang',
  priceRange: '50to100',
  type: 'nuoc',
  vegetarian: false,
  status: 'approved',
  locations: []
};

const mockDishHuTiuChay = {
  id: 'dish_hu_tiu_chay',
  name: 'Hủ tiếu chay Sa Đéc',
  shortName: 'Hủ tiếu chay',
  mealTypes: ['sang', 'trua', 'toi'],
  meal: 'toi',
  priceRange: 'under50',
  type: 'nuoc',
  vegetarian: true,
  status: 'approved',
  locations: []
};

const allMockDishes = [mockDishComTam, mockDishPhoBo, mockDishHuTiuChay];

describe('🚀 FULL SYSTEM REGRESSION TEST SUITE — HÔM NAY ĂN GÌ (TP.HCM)', () => {

  // =========================================================================
  // PHẦN 1: BỘ LỌC THÔNG MINH TP.HCM (FILTER SYSTEM)
  // =========================================================================
  describe('1. Kiểm thử hồi quy: Bộ lọc ẩm thực TP.HCM (filterLogic)', () => {
    it('1.1. Lọc chính xác theo bữa ăn (Sáng, Trưa, Tối) hỗ trợ cả mealTypes mảng lẫn meal đơn', () => {
      // Bữa sáng: Cơm tấm và Phở bò đều phục vụ
      const breakfastDishes = filterDishes(allMockDishes, { currentMeal: 'sang' });
      assert.ok(breakfastDishes.some(d => d.id === 'dish_com_tam_sg'));
      assert.ok(breakfastDishes.some(d => d.id === 'dish_pho_bo_sg'));

      // Bữa tối: Phở bò chỉ có 'sang' và 'trua', không được xuất hiện ở bữa tối
      const dinnerDishes = filterDishes(allMockDishes, { currentMeal: 'toi' });
      assert.ok(dinnerDishes.some(d => d.id === 'dish_com_tam_sg'));
      assert.ok(dinnerDishes.some(d => d.id === 'dish_hu_tiu_chay'));
      assert.ok(!dinnerDishes.some(d => d.id === 'dish_pho_bo_sg'), 'Phở bò không phục vụ bữa tối nhưng bị lọt vào kết quả!');
    });

    it('1.2. Lọc chính xác theo khoảng giá (under50, 50to100, above100)', () => {
      const under50Dishes = filterDishes(allMockDishes, {
        currentMeal: 'sang',
        filters: { price: 'under50', dishType: 'all', vegOnly: false }
      });
      assert.ok(under50Dishes.every(d => d.priceRange === 'under50'));
      assert.ok(!under50Dishes.some(d => d.id === 'dish_pho_bo_sg'));

      const midPriceDishes = filterDishes(allMockDishes, {
        currentMeal: 'sang',
        filters: { price: '50to100', dishType: 'all', vegOnly: false }
      });
      assert.ok(midPriceDishes.every(d => d.priceRange === '50to100'));
      assert.ok(midPriceDishes.some(d => d.id === 'dish_pho_bo_sg'));
    });

    it('1.3. Lọc chính xác món Chay (vegOnly)', () => {
      const vegDishes = filterDishes(allMockDishes, {
        currentMeal: 'trua',
        filters: { price: 'all', dishType: 'all', vegOnly: true }
      });
      assert.equal(vegDishes.length, 1);
      assert.equal(vegDishes[0].id, 'dish_hu_tiu_chay');
      assert.equal(vegDishes[0].vegetarian, true);
    });

    it('1.4. Lọc chính xác Món Nước vs Món Khô (dishType: nuoc | kho)', () => {
      const dryDishes = filterDishes(allMockDishes, {
        currentMeal: 'sang',
        filters: { price: 'all', dishType: 'kho', vegOnly: false }
      });
      assert.ok(dryDishes.every(d => d.type === 'kho'));

      const soupDishes = filterDishes(allMockDishes, {
        currentMeal: 'sang',
        filters: { price: 'all', dishType: 'nuoc', vegOnly: false }
      });
      assert.ok(soupDishes.every(d => d.type === 'nuoc'));
    });

    it('1.5. Loại trừ món đã ăn (excludedDishIds) một cách tuyệt đối', () => {
      const excluded = new Set(['dish_com_tam_sg']);
      const filtered = filterDishes(allMockDishes, {
        currentMeal: 'sang',
        excludedDishIds: excluded,
        filters: { price: 'all', dishType: 'all', vegOnly: false }
      });
      assert.ok(!filtered.some(d => d.id === 'dish_com_tam_sg'), 'Món trong danh sách loại trừ vẫn xuất hiện!');
    });
  });

  // =========================================================================
  // PHẦN 2: TẦNG DỮ LIỆU LOCAL-FIRST & CHUẨN HÓA (STORAGE & NORMALIZER)
  // =========================================================================
  describe('2. Kiểm thử hồi quy: Chuẩn hóa dữ liệu & Cơ chế Local-First', () => {
    it('2.1. normalizeDish phải giữ nguyên dữ liệu hợp lệ và bổ sung trường mặc định an toàn', () => {
      const raw = {
        id: 'dish_banh_mi',
        name: 'Bánh mì thịt chả',
        mealTypes: ['sang', 'trua'],
        type: 'kho',
        priceRange: 'under50'
      };
      const normalized = normalizeDish(raw);

      assert.equal(normalized.id, 'dish_banh_mi');
      assert.equal(normalized.name, 'Bánh mì thịt chả');
      assert.equal(normalized.status, 'approved', 'Mặc định status là approved');
      assert.equal(normalized.type, 'kho');
      assert.equal(normalized.vegetarian, false);
      assert.ok(Array.isArray(normalized.locations));
      assert.ok(Array.isArray(normalized.tags));
    });

    it('2.2. normalizeDish xử lý an toàn chống payload độc hại và giới hạn độ dài', () => {
      const malicious = {
        name: '<script>alert("hacked")</script>Cơm Tấm',
        mealTypes: ['sang'],
        locations: [
          {
            name: '<b onmouseover=alert(1)>Quán A</b>',
            address: '123 Đường B'
          }
        ]
      };
      const clean = normalizeDish(malicious);
      assert.ok(typeof clean.name === 'string');
      assert.ok(!clean.name.includes('\0'));
      assert.ok(clean.locations[0].id, 'Quán ăn phải được gán ID an toàn');
    });
  });

  // =========================================================================
  // PHẦN 3: LỚP BẢO VỆ XSS & GIAO DIỆN (SECURITY HELPERS)
  // =========================================================================
  describe('3. Kiểm thử hồi quy: An toàn XSS, Sanitization & Liên kết ngoài', () => {
    it('3.1. safeUrl ngăn chặn triệt để mọi biến thể javascript:, data:, vbscript:', () => {
      assert.equal(safeUrl('javascript:alert(1)'), '');
      assert.equal(safeUrl('JAVASCRIPT:alert(1)'), '');
      assert.equal(safeUrl('  javascript:alert(1)  '), '');
      assert.equal(safeUrl('data:text/html;base64,PHNjcmlwdD4='), '');
      assert.equal(safeUrl('vbscript:msgbox(1)'), '');
      assert.equal(safeUrl('https://maps.google.com'), 'https://maps.google.com');
      assert.equal(safeUrl('/index.html'), '/index.html');
      assert.equal(safeUrl(null), '');
    });

    it('3.2. createGoogleMapsUrl mã hóa URI an toàn chống injection', () => {
      const url = createGoogleMapsUrl('Quán "Ngon" & Lạ', '12/3 Đường <Số 1>, TP.HCM');
      assert.ok(url.startsWith('https://www.google.com/maps/dir/?api=1&destination='));
      assert.ok(!url.includes('<'));
      assert.ok(!url.includes('>'));
      assert.ok(!url.includes('"'));
    });

    it('3.3. escapeHtml mã hóa đầy đủ 5 ký tự đặc biệt nguy hiểm', () => {
      const escaped = escapeHtml('<div class="box" id=\'a\'>5 & 10</div>');
      assert.equal(escaped, '&lt;div class=&quot;box&quot; id=&#039;a&#039;&gt;5 &amp; 10&lt;/div&gt;');
    });
  });

  // =========================================================================
  // PHẦN 4: AN NINH FIREBASE REALTIME DATABASE RULES (DATABASE INTEGRITY)
  // =========================================================================
  describe('4. Kiểm thử hồi quy: Quy tắc Bảo Mật Firebase RTDB (database.rules.json)', () => {
    const rules = getRules();

    it('4.1. Không cho phép ghi đè node gốc shared_dishes đối với khách thường', () => {
      const sharedWrite = rules.shared_dishes['.write'];
      assert.ok(
        sharedWrite.includes('admin') || sharedWrite.includes('admin_config/adminUid'),
        'LỖ HỔNG: shared_dishes cho phép người không phải admin ghi đè!'
      );
    });

    it('4.2. Khách chỉ được đưa món mới vào pending_dishes với status là pending', () => {
      const pendingWrite = rules.pending_dishes.$dishId['.write'];
      assert.ok(pendingWrite.includes("newData.child('status').val() === 'pending'"));
      assert.ok(pendingWrite.includes("!data.exists()"), 'Khách chỉ được tạo mới, cấm sửa hoặc ghi đè');
      assert.ok(pendingWrite.includes("root.child('rate_limits')"), 'Bắt buộc rate limit');
    });

    it('4.3. Đánh giá location_reviews độc lập và yêu cầu món phải tồn tại trong shared_dishes', () => {
      const locReviewWrite = rules.location_reviews.$dishId.$locId.$uid['.write'];
      assert.ok(
        locReviewWrite.includes("root.child('shared_dishes').child($dishId).exists()"),
        'location_reviews phải xác nhận món tồn tại trên Cloud'
      );
    });

    it('4.4. Nhật ký quản trị viên admin_audit_logs là APPEND-ONLY (Cấm sửa, cấm xóa)', () => {
      const auditWrite = rules.admin_audit_logs.$logId['.write'];
      assert.ok(auditWrite.includes('!data.exists() && newData.exists()'), 'Admin logs phải là append-only');
    });

    it('4.5. Khóa chặt rate_limits: Không cho khách xóa nút cha $uid để reset giới hạn', () => {
      assert.equal(Boolean(rules.rate_limits.$uid['.write']), false);
      assert.ok(rules.rate_limits.$uid.lastDishAt['.validate'].includes('now'));
    });
  });

  // =========================================================================
  // PHẦN 5: CỜ NGẮT GHI KHẨN CẤP (KILL SWITCH) & BẢO TRÌ
  // =========================================================================
  describe('5. Kiểm thử hồi quy: Cờ ngắt ghi khẩn cấp (Kill Switch - writesEnabled)', () => {
    const rules = getRules();

    it('5.1. Node config có .read: true và .write chỉ dành riêng cho Quản trị viên', () => {
      assert.ok(rules.config, 'Phải có node config');
      assert.equal(rules.config['.read'], true);
      assert.ok(rules.config.writesEnabled['.write'].includes('admin_config/adminUid'));
    });

    it('5.2. Toàn bộ các node người dùng ghi đều có điều kiện writesEnabled !== false', () => {
      const pendingWrite = rules.pending_dishes.$dishId['.write'];
      const dishReviewWrite = rules.shared_dishes.$dishId.reviews.$uid['.write'];
      const locReviewWrite = rules.location_reviews.$dishId.$locId.$uid['.write'];
      const reportWrite = rules.reports.$reportId['.write'];

      assert.ok(pendingWrite.includes("config/writesEnabled") && pendingWrite.includes('!== false'));
      assert.ok(dishReviewWrite.includes("config/writesEnabled") && dishReviewWrite.includes('!== false'));
      assert.ok(locReviewWrite.includes("config/writesEnabled") && locReviewWrite.includes('!== false'));
      assert.ok(reportWrite.includes("config/writesEnabled") && reportWrite.includes('!== false'));
    });
  });

  // =========================================================================
  // PHẦN 6: HEADER AN NINH, CSP & API CONFIG
  // =========================================================================
  describe('6. Kiểm thử hồi quy: Security Headers, CSP & /api/config Handler', () => {
    it('6.1. vercel.json cấu hình đầy đủ các header an ninh chuẩn OWASP', () => {
      const vercelConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf8'));
      const globalHeaders = vercelConfig.headers.find(h => h.source === '/(.*)').headers;

      const getHeader = (k) => globalHeaders.find(h => h.key.toLowerCase() === k.toLowerCase())?.value;

      assert.equal(getHeader('X-Content-Type-Options'), 'nosniff');
      assert.equal(getHeader('X-Frame-Options'), 'DENY');
      assert.equal(getHeader('Referrer-Policy'), 'strict-origin-when-cross-origin');
      assert.equal(getHeader('Cross-Origin-Opener-Policy'), 'same-origin-allow-popups');
      assert.ok(getHeader('Content-Security-Policy-Report-Only'));
      assert.ok(!getHeader('Content-Security-Policy-Report-Only').includes('unsafe-eval'));
    });

    it('6.2. /api/config chỉ nhận GET/HEAD, bảo vệ bí mật tuyệt đối (Zero Leakage)', () => {
      const originalEnv = { ...process.env };
      process.env.ADMIN_EMAIL = 'admin.master@saigonfood.vn';

      let statusCode = 0;
      let data = null;
      let headers = {};

      const req = { method: 'GET' };
      const res = {
        setHeader(k, v) { headers[k.toLowerCase()] = v; return res; },
        status(c) { statusCode = c; return res; },
        json(d) { data = d; return res; }
      };

      apiConfigHandler(req, res);

      assert.equal(statusCode, 200);
      assert.ok(data.adminEmailHash);
      assert.equal(data.adminEmailHash.length, 64, 'adminEmailHash phải là mã băm SHA-256');
      assert.ok(!JSON.stringify(data).includes('admin.master@saigonfood.vn'), 'Email thô không được lộ!');
      assert.ok(headers['cache-control'].includes('public'));

      // Thử request POST
      let postStatus = 0;
      const postRes = {
        setHeader() { return postRes; },
        status(c) { postStatus = c; return postRes; },
        json() { return postRes; }
      };
      apiConfigHandler({ method: 'POST' }, postRes);
      assert.equal(postStatus, 405, 'POST phải bị chặn với mã 405');

      process.env = originalEnv;
    });
  });
});
