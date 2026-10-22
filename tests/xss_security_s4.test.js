/**
 * Test Suite S4: Kiểm thử phòng chống XSS toàn diện (XSS Review & Sanitization)
 * 
 * Kiểm tra các vector tấn công XSS phổ biến:
 * - <script>alert(1)</script>
 * - <img src=x onerror=alert(1)>
 * - "><svg onload=alert(1)>
 * - javascript:alert(1)
 * - data:text/html;base64,...
 * - vbscript:msgbox(1)
 * - Chuỗi Unicode đặc biệt và chuỗi cực dài
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeUrl, createGoogleMapsUrl, escapeHtml } from '../src/utils/helpers.js';
import { normalizeDish } from '../src/services/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🛡️ Giai đoạn S4 - Kiểm thử phòng vệ XSS & Sanitization', () => {

  // 1. KIỂM THỬ HÀM SAFE URL
  describe('1. Hàm helper safeUrl (Lọc giao thức độc hại)', () => {
    it('1.1. Chặn hoàn toàn javascript: (kể cả hoa/thường, khoảng trắng)', () => {
      assert.equal(safeUrl('javascript:alert(1)'), '');
      assert.equal(safeUrl('  JAVASCRIPT:alert(document.cookie)  '), '');
      assert.equal(safeUrl('javascript:/*--></title></style></textarea>*/<script>alert(1)</script>'), '');
    });

    it('1.2. Chặn hoàn toàn data: URI (chống chèn HTML giả mạo)', () => {
      assert.equal(safeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), '');
      assert.equal(safeUrl('DATA:text/html,<script>alert(1)</script>'), '');
    });

    it('1.3. Chặn hoàn toàn vbscript: và null-byte injection', () => {
      assert.equal(safeUrl('vbscript:msgbox("xss")'), '');
      assert.equal(safeUrl('https://example.com/\0javascript:alert(1)'), '');
    });

    it('1.4. Chấp nhận các URL https://, http:// và liên kết nội bộ hợp lệ', () => {
      assert.equal(safeUrl('https://www.google.com/maps/dir/'), 'https://www.google.com/maps/dir/');
      assert.equal(safeUrl('http://localhost:5173/'), 'http://localhost:5173/');
      assert.equal(safeUrl('#/admin'), '#/admin');
      assert.equal(safeUrl('/sw.js'), '/sw.js');
    });

    it('1.5. Xử lý an toàn với giá trị null, undefined, số hoặc chuỗi rỗng', () => {
      assert.equal(safeUrl(null), '');
      assert.equal(safeUrl(undefined), '');
      assert.equal(safeUrl(''), '');
      assert.equal(safeUrl(12345), '');
    });
  });

  // 2. KIỂM THỬ TẠO LINK GOOGLE MAPS
  describe('2. Hàm createGoogleMapsUrl (Chống XSS qua URL Maps)', () => {
    it('2.1. Tự động encodeURIComponent toàn bộ ký tự nguy hiểm trong tên quán và địa chỉ', () => {
      const maliciousName = '<script>alert("XSS")</script>';
      const maliciousAddr = '"><svg onload=alert(1)>';
      const url = createGoogleMapsUrl(maliciousName, maliciousAddr);

      assert.ok(url.startsWith('https://www.google.com/maps/dir/?api=1&destination='));
      // Tuyệt đối không chứa ký tự <, >, " trần
      assert.equal(url.includes('<script>'), false);
      assert.equal(url.includes('<svg'), false);
      assert.equal(url.includes('"'), false);
      assert.ok(url.includes(encodeURIComponent(maliciousName)));
      assert.ok(url.includes(encodeURIComponent(maliciousAddr)));
    });

    it('2.2. Xử lý an toàn khi địa chỉ hoặc tên quán rỗng/null', () => {
      const url = createGoogleMapsUrl('', null);
      assert.ok(url.includes('TP.%20H%E1%BB%93%20Ch%C3%AD%20Minh'));
    });
  });

  // 3. KIỂM THỬ ESCAPE HTML & TEXT SANITIZATION
  describe('3. Escape HTML & An toàn hiển thị văn bản', () => {
    it('3.1. escapeHtml mã hóa đầy đủ các ký tự đặc biệt nguy hiểm', () => {
      const raw = '<img src=x onerror=alert(1)> & "hello" \'world\'';
      const escaped = escapeHtml(raw);

      assert.equal(escaped.includes('<'), false);
      assert.equal(escaped.includes('>'), false);
      assert.ok(escaped.includes('&lt;img'));
      assert.ok(escaped.includes('&amp;'));
      assert.ok(escaped.includes('&quot;hello&quot;'));
      assert.ok(escaped.includes('&#039;world&#039;'));
    });
  });

  // 4. KIỂM THỬ NORMALIZE DISH VỚI DỮ LIỆU ĐỘC HẠI
  describe('4. normalizeDish xử lý an toàn dữ liệu đầu vào chứa mã độc', () => {
    it('4.1. Payload XSS trong tên món, tags, địa chỉ: Được chuẩn hóa dạng chuỗi thuần túy', () => {
      const xssDish = {
        id: 'dish_xss_test',
        name: '<script>alert("hack")</script> Cơm Tấm',
        tags: ['"><svg onload=alert(1)>', 'javascript:alert(1)'],
        locations: [
          {
            id: 'loc_bad_1',
            name: '<img src=x onerror=alert(1)> Quán Cô Ba',
            address: '123 Đường Số 1 <iframe src="evil.com"></iframe>',
          },
        ],
      };

      const normalized = normalizeDish(xssDish);
      assert.equal(typeof normalized.name, 'string');
      assert.equal(normalized.tags.length, 2);
      assert.equal(typeof normalized.locations[0].name, 'string');
      assert.equal(typeof normalized.locations[0].address, 'string');
      // ID location được sanitize tuân thủ regex an toàn
      assert.ok(/^[A-Za-z0-9_-]{1,64}$/.test(normalized.locations[0].id));
    });

    it('4.2. Chuỗi Unicode cực dài và ký tự điều khiển: Được cắt gọn an toàn', () => {
      const hugeUnicode = '🔥 Ăn Ngon '.repeat(1000); // ~11,000 ký tự
      const longDish = {
        id: 'dish_long_unicode',
        name: 'Món ăn test',
        locations: [{ name: hugeUnicode, address: hugeUnicode }],
      };

      const normalized = normalizeDish(longDish);
      assert.ok(normalized.locations[0].name.length <= 100);
      assert.ok(normalized.locations[0].address.length <= 200);
    });
  });

  // 5. RÀ SOÁT CẤM EVAL & NEW FUNCTION TRONG MÃ NGUỒN
  describe('5. Rà soát tuyệt đối không sử dụng eval hoặc new Function trong mã nguồn', () => {
    it('5.1. Thư mục src/ không chứa lệnh eval()', () => {
      const srcDir = path.resolve(__dirname, '../src');
      function checkDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkDir(fullPath);
          } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Bỏ qua comments
            const clean = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
            assert.equal(
              /\beval\s*\(/.test(clean),
              false,
              `Phát hiện lệnh eval() trong file ${entry.name}`
            );
          }
        }
      }
      checkDir(srcDir);
    });

    it('5.2. Thư mục src/ không chứa new Function()', () => {
      const srcDir = path.resolve(__dirname, '../src');
      function checkDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkDir(fullPath);
          } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const clean = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
            assert.equal(
              /new\s+Function\s*\(/.test(clean),
              false,
              `Phát hiện new Function() trong file ${entry.name}`
            );
          }
        }
      }
      checkDir(srcDir);
    });
  });

});
