/**
 * Test Suite S6: Kiểm thử bảo mật & phản hồi Endpoint /api/config (api/config.js)
 * 
 * Các tiêu chí kiểm tra:
 * 1. Phản hồi đúng định dạng JSON.
 * 2. Có Cache-Control header chuẩn cho CDN caching.
 * 3. Chống rò rỉ dữ liệu nhạy cảm:
 *    - ADMIN_EMAIL chỉ xuất hiện dưới dạng mã băm 1 chiều SHA-256 (64 hex chars), không lộ email thô.
 *    - Không chứa private key, client_secret hay service account credentials.
 * 4. Kiểm soát HTTP Method: Chỉ cho phép GET/HEAD, từ chối POST/PUT/DELETE với status 405.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/config.js';

// Helper tạo mock request & response của Vercel Serverless Function
function createMockReqRes(options = {}) {
  const req = {
    method: options.method || 'GET',
    headers: options.headers || {},
    url: '/api/config',
    query: options.query || {},
    body: options.body || null,
  };

  const headers = {};
  let statusCode = 200;
  let responseData = null;

  const res = {
    setHeader(key, value) {
      headers[key.toLowerCase()] = value;
      return res;
    },
    getHeader(key) {
      return headers[key.toLowerCase()];
    },
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    end() {
      return res;
    },
    _getHeaders: () => headers,
    _getStatusCode: () => statusCode,
    _getData: () => responseData,
  };

  return { req, res };
}

describe('🛡️ Giai đoạn S6 - Rà soát & Kiểm thử Endpoint /api/config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Giả lập biến môi trường cấu hình
    process.env.FIREBASE_API_KEY = 'AIzaSyFakeKeyForTest12345';
    process.env.FIREBASE_AUTH_DOMAIN = 'random-food-hcm.firebaseapp.com';
    process.env.FIREBASE_DATABASE_URL = 'https://random-food-hcm-default-rtdb.asia-southeast1.firebasedatabase.app';
    process.env.FIREBASE_PROJECT_ID = 'random-food-hcm';
    process.env.FIREBASE_STORAGE_BUCKET = 'random-food-hcm.appspot.com';
    process.env.FIREBASE_MESSAGING_SENDER_ID = '1234567890';
    process.env.FIREBASE_APP_ID = '1:1234567890:web:abcdef123456';
    process.env.FIREBASE_MEASUREMENT_ID = 'G-ABCDEF1234';
    process.env.ADMIN_EMAIL = 'admin.secret@example.com';
    process.env.RECAPTCHA_SITE_KEY = '6LfakeKeyRecaptchaTestSiteKey';
    process.env.RECAPTCHA_TYPE = 'v3';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Định dạng phản hồi và mã trạng thái HTTP', () => {
    it('1.1. Trả về status 200 và dữ liệu dạng JSON cho GET request', () => {
      const { req, res } = createMockReqRes({ method: 'GET' });
      handler(req, res);

      assert.equal(res._getStatusCode(), 200);
      const data = res._getData();
      assert.ok(typeof data === 'object' && data !== null, 'Phản hồi phải là một Object JSON');
      assert.equal(data.projectId, 'random-food-hcm');
      assert.equal(data.apiKey, 'AIzaSyFakeKeyForTest12345');
    });

    it('1.2. Trả về đầy đủ các trường cấu hình cần thiết cho Client', () => {
      const { req, res } = createMockReqRes({ method: 'GET' });
      handler(req, res);

      const data = res._getData();
      const requiredFields = [
        'apiKey',
        'authDomain',
        'databaseURL',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId',
        'measurementId',
        'adminEmailHash',
        'recaptchaSiteKey',
        'recaptchaType'
      ];

      for (const field of requiredFields) {
        assert.ok(Object.prototype.hasOwnProperty.call(data, field), `Thiếu trường cấu hình: ${field}`);
      }
    });
  });

  describe('2. Header Cache-Control', () => {
    it('2.1. Phải có header Cache-Control tối ưu CDN Edge Caching (86400s)', () => {
      const { req, res } = createMockReqRes({ method: 'GET' });
      handler(req, res);

      const cacheControl = res.getHeader('cache-control');
      assert.ok(cacheControl, 'Thiếu header Cache-Control!');
      assert.ok(cacheControl.includes('public'), 'Cache-Control phải là public');
      assert.ok(cacheControl.includes('max-age=86400'), 'Cache-Control phải có max-age=86400 (24h)');
      assert.ok(cacheControl.includes('s-maxage=86400'), 'Cache-Control phải có s-maxage=86400');
      assert.ok(cacheControl.includes('stale-while-revalidate'), 'Cache-Control nên có stale-while-revalidate');
    });
  });

  describe('3. Bảo mật thông tin & Chống rò rỉ dữ liệu nhạy cảm (Zero Leakage)', () => {
    it('3.1. Tuyệt đối KHÔNG trả về ADMIN_EMAIL dạng văn bản thô', () => {
      const { req, res } = createMockReqRes({ method: 'GET' });
      handler(req, res);

      const data = res._getData();
      assert.equal(
        data.adminEmail,
        undefined,
        'LỖ HỔNG: API trả về trực tiếp trường adminEmail!'
      );

      // Quét toàn bộ các giá trị trong phản hồi, không giá trị nào được chứa email thô
      const jsonString = JSON.stringify(data);
      assert.ok(
        !jsonString.includes('admin.secret@example.com'),
        'LỖ HỔNG: Tìm thấy email gốc admin.secret@example.com trong payload phản hồi!'
      );
      assert.ok(
        !jsonString.includes('@example.com'),
        'LỖ HỔNG: Payload chứa domain email cá nhân!'
      );
    });

    it('3.2. adminEmailHash phải là mã băm SHA-256 chuẩn (64 ký tự hex)', () => {
      const { req, res } = createMockReqRes({ method: 'GET' });
      handler(req, res);

      const data = res._getData();
      assert.ok(typeof data.adminEmailHash === 'string', 'adminEmailHash phải là dạng chuỗi');
      assert.equal(data.adminEmailHash.length, 64, 'Mã băm SHA-256 phải có đúng 64 ký tự hex');
      assert.ok(/^[0-9a-f]{64}$/.test(data.adminEmailHash), 'adminEmailHash không đúng định dạng hex SHA-256');
    });

    it('3.3. Xử lý an toàn khi biến môi trường ADMIN_EMAIL chưa được cấu hình', () => {
      delete process.env.ADMIN_EMAIL;
      const { req, res } = createMockReqRes({ method: 'GET' });
      handler(req, res);

      const data = res._getData();
      assert.equal(data.adminEmailHash, '', 'Khi chưa có ADMIN_EMAIL, adminEmailHash phải là chuỗi rỗng an toàn');
    });

    it('3.4. Tuyệt đối KHÔNG chứa private key, client_secret hoặc credentials của service account', () => {
      const { req, res } = createMockReqRes({ method: 'GET' });
      handler(req, res);

      const data = res._getData();
      const forbiddenKeys = [
        'privateKey',
        'private_key',
        'clientSecret',
        'client_secret',
        'serviceAccount',
        'service_account',
        'accessToken',
        'token'
      ];

      for (const key of forbiddenKeys) {
        assert.equal(data[key], undefined, `LỖ HỔNG: Phát hiện trường nhạy cảm "${key}" trong API config!`);
      }
    });
  });

  describe('4. Kiểm soát phương thức HTTP (HTTP Method Guard)', () => {
    it('4.1. Cho phép request GET và HEAD', () => {
      const getReq = createMockReqRes({ method: 'GET' });
      handler(getReq.req, getReq.res);
      assert.equal(getReq.res._getStatusCode(), 200);

      const headReq = createMockReqRes({ method: 'HEAD' });
      handler(headReq.req, headReq.res);
      assert.equal(headReq.res._getStatusCode(), 200);
    });

    it('4.2. Từ chối request POST với HTTP 405 Method Not Allowed', () => {
      const { req, res } = createMockReqRes({ method: 'POST', body: { spam: true } });
      handler(req, res);

      assert.equal(res._getStatusCode(), 405, 'Phải trả về mã lỗi 405 cho POST request');
      assert.equal(res.getHeader('allow'), 'GET, HEAD');
      assert.equal(res._getData()?.error, 'Method Not Allowed');
    });

    it('4.3. Từ chối request DELETE và PUT với HTTP 405 Method Not Allowed', () => {
      const putReq = createMockReqRes({ method: 'PUT' });
      handler(putReq.req, putReq.res);
      assert.equal(putReq.res._getStatusCode(), 405);

      const deleteReq = createMockReqRes({ method: 'DELETE' });
      handler(deleteReq.req, deleteReq.res);
      assert.equal(deleteReq.res._getStatusCode(), 405);
    });
  });
});
