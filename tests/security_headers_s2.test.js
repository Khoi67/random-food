/**
 * Test Suite S2: Kiểm tra tính hợp lệ và tiêu chuẩn an toàn của vercel.json
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('🛡️ Giai đoạn S2 - Security Headers (vercel.json)', () => {
  const vercelPath = path.resolve(__dirname, '../vercel.json');
  assert.ok(fs.existsSync(vercelPath), 'File vercel.json phải tồn tại');

  const content = fs.readFileSync(vercelPath, 'utf8');
  const config = JSON.parse(content);

  it('2.1. File vercel.json là JSON hợp lệ và có cấu hình headers cho mọi route', () => {
    assert.ok(Array.isArray(config.headers), 'config.headers phải là mảng');
    const rootHeaderConfig = config.headers.find((h) => h.source === '/(.*)');
    assert.ok(rootHeaderConfig, 'Phải có header rules cho source: "/(.*)"');
  });

  it('2.2. X-Content-Type-Options phải là "nosniff"', () => {
    const headers = config.headers[0].headers;
    const item = headers.find((h) => h.key === 'X-Content-Type-Options');
    assert.equal(item?.value, 'nosniff');
  });

  it('2.3. Referrer-Policy phải là "strict-origin-when-cross-origin"', () => {
    const headers = config.headers[0].headers;
    const item = headers.find((h) => h.key === 'Referrer-Policy');
    assert.equal(item?.value, 'strict-origin-when-cross-origin');
  });

  it('2.4. X-Frame-Options phải là "DENY" (chống clickjacking)', () => {
    const headers = config.headers[0].headers;
    const item = headers.find((h) => h.key === 'X-Frame-Options');
    assert.equal(item?.value, 'DENY');
  });

  it('2.5. Permissions-Policy cho phép geolocation=(self), cấm camera, microphone, payment', () => {
    const headers = config.headers[0].headers;
    const item = headers.find((h) => h.key === 'Permissions-Policy');
    assert.ok(item?.value.includes('geolocation=(self)'));
    assert.ok(item?.value.includes('camera=()'));
    assert.ok(item?.value.includes('microphone=()'));
    assert.ok(item?.value.includes('payment=()'));
  });

  it('2.6. Strict-Transport-Security: max-age=31536000 (không có includeSubDomains / preload)', () => {
    const headers = config.headers[0].headers;
    const item = headers.find((h) => h.key === 'Strict-Transport-Security');
    assert.equal(item?.value, 'max-age=31536000');
  });

  it('2.7. Cross-Origin-Opener-Policy phải là "same-origin-allow-popups" (không dùng same-origin để bảo toàn Google Sign-In popup)', () => {
    const headers = config.headers[0].headers;
    const item = headers.find((h) => h.key === 'Cross-Origin-Opener-Policy');
    assert.equal(item?.value, 'same-origin-allow-popups');
  });

  it('2.8. Có rewrite an toàn fallback về /index.html cho SPA và loại trừ /api/', () => {
    assert.ok(Array.isArray(config.rewrites), 'config.rewrites phải là mảng');
    const spaRewrite = config.rewrites.find((r) => r.destination === '/index.html');
    assert.ok(spaRewrite, 'Phải có rewrite về /index.html cho SPA');
  });

  // GIAI ĐOẠN S3: CSP Ở CHẾ ĐỘ REPORT-ONLY
  it('3.1. Phải có header Content-Security-Policy-Report-Only (CHƯA đặt Content-Security-Policy thật)', () => {
    const headers = config.headers[0].headers;
    const reportOnly = headers.find((h) => h.key === 'Content-Security-Policy-Report-Only');
    const enforcing = headers.find((h) => h.key === 'Content-Security-Policy');
    assert.ok(reportOnly, 'Bắt buộc phải có Content-Security-Policy-Report-Only');
    assert.equal(enforcing, undefined, 'CẤM đặt Content-Security-Policy thật ở giai đoạn này!');
  });

  it('3.2. CSP Report-Only chứa các directive an toàn cốt lõi: default-src self, object-src none, base-uri self', () => {
    const headers = config.headers[0].headers;
    const csp = headers.find((h) => h.key === 'Content-Security-Policy-Report-Only')?.value || '';
    assert.ok(csp.includes("default-src 'self'"));
    assert.ok(csp.includes("object-src 'none'"));
    assert.ok(csp.includes("base-uri 'self'"));
    assert.ok(csp.includes("frame-ancestors 'none'"));
    assert.ok(csp.includes("form-action 'self'"));
  });

  it('3.3. CSP Report-Only KHÔNG chứa unsafe-eval', () => {
    const headers = config.headers[0].headers;
    const csp = headers.find((h) => h.key === 'Content-Security-Policy-Report-Only')?.value || '';
    assert.equal(csp.includes("'unsafe-eval'"), false, 'Tuyệt đối không dùng unsafe-eval');
  });

  it('3.4. CSP Report-Only kết nối đúng host Firebase RTDB Singapore (asia-southeast1)', () => {
    const headers = config.headers[0].headers;
    const csp = headers.find((h) => h.key === 'Content-Security-Policy-Report-Only')?.value || '';
    assert.ok(csp.includes('asia-southeast1.firebasedatabase.app'));
    assert.ok(csp.includes('wss://'));
  });
});
