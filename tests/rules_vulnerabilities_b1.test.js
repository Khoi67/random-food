/**
 * Test Suite B1: Kiểm tra và phát hiện các lỗ hổng bảo mật trong database.rules.json
 * 
 * Mục tiêu: Chứng minh các lỗ hổng tồn tại trên Rules cũ (Test ĐỎ),
 * sau đó Rules mới sẽ khắc phục toàn bộ (Test XANH).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCleanRules() {
  const rulesPath = path.resolve(__dirname, '../database.rules.json');
  const raw = fs.readFileSync(rulesPath, 'utf8');
  const clean = raw.replace(/\/\/.*$/gm, '');
  return JSON.parse(clean).rules;
}

describe('🔴 Giai đoạn B1 - Chứng minh & Kiểm tra lỗ hổng Rules', () => {

  // MỤC 1: Rate limit thật sự có tác dụng
  describe('Mục 1: Rate limit thật sự có tác dụng (lastDishAt, lastReviewAt, lastReportAt)', () => {
    it('1.1. rate_limits/$uid không được cho phép ghi tùy ý ở node cha (chống reset rate limit)', () => {
      const rules = getCleanRules();
      const userNode = rules.rate_limits?.$uid;
      // Nếu có .write ở cấp $uid, khách có thể ghi đè cả object hoặc xóa sạch node để reset rate limit
      const hasParentWrite = Boolean(userNode?.['.write']);
      assert.equal(
        hasParentWrite,
        false,
        'LỖ HỔNG: rate_limits/$uid có .write ở nút cha, cho phép khách xóa hoặc ghi đè toàn bộ để reset giới hạn!'
      );
    });

    it('1.2. rate_limits/$uid/lastDishAt chỉ cho ghi khi newData.val() === now (chống đặt giá trị quá khứ)', () => {
      const rules = getCleanRules();
      const lastDishAtValidate = rules.rate_limits?.$uid?.lastDishAt?.['.validate'] || '';
      assert.ok(
        lastDishAtValidate.includes('now'),
        'LỖ HỔNG: lastDishAt không yêu cầu newData.val() === now, cho phép gửi giá trị giả mạo!'
      );
    });

    it('1.3. pending_dishes bắt buộc kiểm tra rate_limits (tối thiểu 60 giây)', () => {
      const rules = getCleanRules();
      const pendingWrite = rules.pending_dishes?.$dishId?.['.write'] || '';
      assert.ok(
        pendingWrite.includes("root.child('rate_limits')") && pendingWrite.includes('60000'),
        'LỖ HỔNG: pending_dishes không kiểm tra rate_limits lastDishAt cũ hơn 60 giây!'
      );
    });

    it('1.4. location_reviews bắt buộc kiểm tra rate_limits (tối thiểu 20 giây)', () => {
      const rules = getCleanRules();
      const locRevWrite = rules.location_reviews?.$dishId?.$locId?.$uid?.['.write'] || '';
      assert.ok(
        locRevWrite.includes("root.child('rate_limits')") && locRevWrite.includes('20000'),
        'LỖ HỔNG: location_reviews không kiểm tra rate_limits lastReviewAt cũ hơn 20 giây!'
      );
    });

    it('1.5. reports bắt buộc kiểm tra rate_limits (tối thiểu 30 giây)', () => {
      const rules = getCleanRules();
      const reportWrite = rules.reports?.$reportId?.['.write'] || '';
      assert.ok(
        reportWrite.includes("root.child('rate_limits')") && reportWrite.includes('30000'),
        'LỖ HỔNG: reports không kiểm tra rate_limits lastReportAt cũ hơn 30 giây!'
      );
    });
  });

  // MỤC 2: Giới hạn kích thước và whitelist trường cho khách ghi được
  describe('Mục 2: Giới hạn kích thước và whitelist trường cho khách ($other: false)', () => {
    it('2.1. pending_dishes/$dishId phải có $other: false để chặn trường lạ', () => {
      const rules = getCleanRules();
      const dishNode = rules.pending_dishes?.$dishId;
      assert.equal(
        dishNode?.$other?.['.validate'],
        false,
        'LỖ HỔNG: pending_dishes/$dishId thiếu $other: { .validate: false }, cho phép bơm trường rác lạ!'
      );
    });

    it('2.2. mealTypes trong pending_dishes phải kiểm tra từng phần tử thuộc sang|trua|toi và tối đa 3', () => {
      const rules = getCleanRules();
      const mealTypesNode = rules.pending_dishes?.$dishId?.mealTypes;
      const valRule = mealTypesNode?.$index?.['.validate'] || mealTypesNode?.['.validate'] || '';
      assert.ok(
        valRule.includes('sang') && valRule.includes('trua') && valRule.includes('toi'),
        'LỖ HỔNG: mealTypes không kiểm tra giá trị hợp lệ của từng bữa ăn (sang/trua/toi)!'
      );
    });

    it('2.3. locations trong pending_dishes phải giới hạn <= 10 quán, name <= 100, address <= 200, $other: false', () => {
      const rules = getCleanRules();
      const locIndex = rules.pending_dishes?.$dishId?.locations?.$index;
      assert.ok(locIndex, 'LỖ HỔNG: locations thiếu schema chi tiết cho từng quán ($index)!');
      assert.equal(
        locIndex?.$other?.['.validate'],
        false,
        'LỖ HỔNG: location item thiếu $other: false!'
      );
    });

    it('2.4. reports chỉ có targetId <= 100, reason <= 300, createdAt và $other: false', () => {
      const rules = getCleanRules();
      const reportNode = rules.reports?.$reportId;
      assert.equal(
        reportNode?.$other?.['.validate'],
        false,
        'LỖ HỔNG: reports thiếu $other: false!'
      );
      const targetIdVal = reportNode?.targetId?.['.validate'] || '';
      assert.ok(
        targetIdVal.includes('100'),
        'LỖ HỔNG: reports.targetId không giới hạn độ dài <= 100!'
      );
    });

    it('2.5. Khóa $dishId và $locId phải kiểm tra regex an toàn /^[A-Za-z0-9_-]{1,64}$/', () => {
      const raw = fs.readFileSync(path.resolve(__dirname, '../database.rules.json'), 'utf8');
      assert.ok(
        raw.includes('$dishId.matches(/^[A-Za-z0-9_-]{1,64}$/)'),
        'LỖ HỔNG: Khóa $dishId chưa được validate theo regex an toàn!'
      );
    });

    it('2.6. KHÔNG được đặt $other: false trên shared_dishes để đảm bảo Admin Khôi phục thành công', () => {
      const rules = getCleanRules();
      const sharedDishOther = rules.shared_dishes?.$dishId?.$other;
      assert.equal(
        sharedDishOther,
        undefined,
        'CẢNH BÁO: shared_dishes không được đặt $other: false vì sẽ chặn Khôi phục dữ liệu mẫu của Admin!'
      );
    });
  });

  // MỤC 3: Bỏ quyền sửa món của người tạo trong shared_dishes
  describe('Mục 3: Bỏ quyền sửa món của người tạo trong shared_dishes', () => {
    it('3.1. $dishId trong shared_dishes CHỈ cho Admin ghi, xóa hoàn toàn nhánh người tạo sửa món', () => {
      const rules = getCleanRules();
      const writeRule = rules.shared_dishes?.$dishId?.['.write'] || '';
      assert.equal(
        writeRule.includes("data.child('createdBy').val()"),
        false,
        'LỖ HỔNG: shared_dishes/$dishId vẫn cho phép người tạo tự sửa món sau khi đã approved!'
      );
    });
  });

  // MỤC 4: Dọn trùng lặp location_reviews
  describe('Mục 4: Dọn trùng lặp location_reviews & kiểm tra món tồn tại', () => {
    it('4.1. location_reviews ở gốc bắt buộc kiểm tra root.child("shared_dishes").child($dishId).exists()', () => {
      const rules = getCleanRules();
      const locRevWrite = rules.location_reviews?.$dishId?.$locId?.$uid?.['.write'] || '';
      assert.ok(
        locRevWrite.includes("root.child('shared_dishes').child($dishId).exists()"),
        'LỖ HỔNG: location_reviews cho phép review món không hề tồn tại trong shared_dishes!'
      );
    });

    it('4.2. shared_dishes/$dishId/location_reviews cũ phải chuyển sang chỉ đọc (.write: false)', () => {
      const rules = getCleanRules();
      const oldLocRevWrite = rules.shared_dishes?.$dishId?.location_reviews?.$locId?.$uid?.['.write'];
      assert.equal(
        Boolean(oldLocRevWrite),
        false,
        'LỖ HỔNG: shared_dishes/$dishId/location_reviews cũ vẫn còn quyền ghi, gây trùng lặp và phân mảnh dữ liệu!'
      );
    });
  });

  // MỤC 5: Các chỗ nhỏ
  describe('Mục 5: Các chỗ nhỏ (createdAt, admin_audit_logs, review)', () => {
    it('5.1. createdAt của pending_dishes, reports, review phải kiểm tra khoảng thời gian hợp lệ ±10 phút so với now', () => {
      const rules = getCleanRules();
      const dishCreatedAt = rules.pending_dishes?.$dishId?.createdAt?.['.validate'] || '';
      assert.ok(
        dishCreatedAt.includes('now') && dishCreatedAt.includes('600000'),
        'LỖ HỔNG: createdAt của món không kiểm tra phạm vi thời gian ±10 phút so với now!'
      );
    });

    it('5.2. admin_audit_logs phải kiểm tra adminUid === auth.uid và có $other: false', () => {
      const rules = getCleanRules();
      const logNode = rules.admin_audit_logs?.$logId;
      assert.equal(
        logNode?.$other?.['.validate'],
        false,
        'LỖ HỔNG: admin_audit_logs thiếu $other: false!'
      );
      const uidVal = logNode?.adminUid?.['.validate'] || '';
      assert.ok(
        uidVal.includes('auth.uid'),
        'LỖ HỔNG: admin_audit_logs không ràng buộc adminUid === auth.uid!'
      );
    });

    it('5.3. review (cả ở reviews và location_reviews) phải có $other: false', () => {
      const rules = getCleanRules();
      const revDish = rules.shared_dishes?.$dishId?.reviews?.$uid;
      const revLoc = rules.location_reviews?.$dishId?.$locId?.$uid;
      assert.equal(revDish?.$other?.['.validate'], false, 'LỖ HỔNG: reviews thiếu $other: false!');
      assert.equal(revLoc?.$other?.['.validate'], false, 'LỖ HỔNG: location_reviews thiếu $other: false!');
    });
  });

});
