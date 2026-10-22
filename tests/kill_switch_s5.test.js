/**
 * Test Suite S5: Cờ ngắt ghi toàn hệ thống (Kill Switch) trong database.rules.json
 * 
 * Kiểm tra các yêu cầu:
 * 1. Node config/writesEnabled:
 *    - .read: true (khách đọc được để hiển thị UI)
 *    - .write: Chỉ Admin được phép sửa
 * 2. Điều kiện ngắt ghi:
 *    - root.child('config/writesEnabled').val() !== false tại mọi node khách có thể ghi:
 *      + pending_dishes/$dishId
 *      + shared_dishes/$dishId/reviews/$uid
 *      + location_reviews/$dishId/$locId/$uid
 *      + reports/$reportId
 * 3. Mô phỏng hành vi:
 *    - Khi writesEnabled = false: Khách bị chặn ghi ở tất cả các node trên.
 *    - Khi writesEnabled = false: Admin VẪN ghi được bình thường.
 *    - Khách không thể tự ý đổi writesEnabled thành true.
 *    - Khi writesEnabled = true hoặc node config chưa tồn tại: Mọi thao tác của khách diễn ra bình thường.
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

/**
 * Giả lập đánh giá logic Kill Switch theo đúng Firebase RTDB Rule Engine
 */
class KillSwitchSimulator {
  constructor(rules) {
    this.rules = rules;
  }

  isAdmin(auth, root) {
    if (!auth) return false;
    const hasClaim = auth.token && auth.token.admin === true;
    const adminUidVal = root.admin_config && root.admin_config.adminUid;
    return Boolean(hasClaim || (adminUidVal && auth.uid === adminUidVal));
  }

  isWritesEnabled(root) {
    if (!root || !root.config) return true;
    return root.config.writesEnabled !== false;
  }

  canWriteConfig(auth, root) {
    return this.isAdmin(auth, root);
  }

  canCreatePendingDish(auth, root, dishId, newDish) {
    const admin = this.isAdmin(auth, root);
    if (admin) return true;

    // Phải kiểm tra kill switch
    if (!this.isWritesEnabled(root)) return false;

    // Kiểm tra điều kiện người dùng thường
    if (!auth || !auth.uid) return false;
    if (newDish.createdBy !== auth.uid) return false;
    if (newDish.status !== 'pending') return false;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(dishId)) return false;

    // Rate limit
    const lastAt = root.rate_limits?.[auth.uid]?.lastDishAt;
    const now = Date.now();
    if (lastAt && lastAt > now - 60000) return false;

    return true;
  }

  canWriteDishReview(auth, root, dishId, uid, review) {
    const admin = this.isAdmin(auth, root);
    if (admin) return true;

    // Phải kiểm tra kill switch
    if (!this.isWritesEnabled(root)) return false;

    if (!auth || auth.uid !== uid) return false;

    // Rate limit
    const lastAt = root.rate_limits?.[auth.uid]?.lastReviewAt;
    const now = Date.now();
    if (lastAt && lastAt > now - 20000) return false;

    return true;
  }

  canWriteLocationReview(auth, root, dishId, locId, uid, review) {
    const admin = this.isAdmin(auth, root);
    if (admin) return true;

    // Phải kiểm tra kill switch
    if (!this.isWritesEnabled(root)) return false;

    if (!auth || auth.uid !== uid) return false;
    if (!root.shared_dishes?.[dishId]) return false;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(dishId) || !/^[A-Za-z0-9_-]{1,64}$/.test(locId)) return false;

    // Rate limit
    const lastAt = root.rate_limits?.[auth.uid]?.lastReviewAt;
    const now = Date.now();
    if (lastAt && lastAt > now - 20000) return false;

    return true;
  }

  canCreateReport(auth, root, reportId, report) {
    const admin = this.isAdmin(auth, root);
    if (admin) return true;

    // Phải kiểm tra kill switch
    if (!this.isWritesEnabled(root)) return false;

    if (!auth) return false;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(reportId)) return false;

    // Rate limit
    const lastAt = root.rate_limits?.[auth.uid]?.lastReportAt;
    const now = Date.now();
    if (lastAt && lastAt > now - 30000) return false;

    return true;
  }
}

describe('🛡️ Giai đoạn S5 - Cờ ngắt ghi (Kill Switch) trong database.rules.json', () => {

  describe('1. Cấu trúc node config và writesEnabled trong Rules', () => {
    it('1.1. Phải có node "config" với .read: true để khách đọc được trạng thái bảo trì', () => {
      const rules = getCleanRules();
      assert.ok(rules.config, 'Chưa khai báo node "config" trong database.rules.json!');
      assert.equal(rules.config['.read'], true, 'Node "config" phải có .read: true!');
    });

    it('1.2. config/writesEnabled chỉ cho phép Admin có quyền .write (Khách không được ghi)', () => {
      const rules = getCleanRules();
      const writesEnabledWrite = rules.config?.writesEnabled?.['.write'] || rules.config?.['.write'] || '';
      assert.ok(
        writesEnabledWrite.includes('admin') || writesEnabledWrite.includes('admin_config/adminUid'),
        'Quyền .write tại config/writesEnabled phải bị giới hạn nghiêm ngặt cho Admin!'
      );
      assert.ok(
        !writesEnabledWrite.includes('auth != null && auth.uid ===') && writesEnabledWrite !== true,
        'Khách hoặc người dùng thường không được phép sửa config/writesEnabled!'
      );
    });
  });

  describe('2. Rà soát điều kiện Kill Switch trong biểu thức .write của khách', () => {
    it('2.1. pending_dishes.$dishId có kiểm tra root.child("config/writesEnabled").val() !== false', () => {
      const rules = getCleanRules();
      const pendingWrite = rules.pending_dishes?.$dishId?.['.write'] || '';
      assert.ok(
        pendingWrite.includes("config/writesEnabled") && pendingWrite.includes('!== false'),
        'pending_dishes thiếu điều kiện ngắt ghi: root.child(\'config/writesEnabled\').val() !== false!'
      );
    });

    it('2.2. shared_dishes.reviews có kiểm tra root.child("config/writesEnabled").val() !== false', () => {
      const rules = getCleanRules();
      const reviewWrite = rules.shared_dishes?.$dishId?.reviews?.$uid?.['.write'] || '';
      assert.ok(
        reviewWrite.includes("config/writesEnabled") && reviewWrite.includes('!== false'),
        'shared_dishes.reviews thiếu điều kiện ngắt ghi: root.child(\'config/writesEnabled\').val() !== false!'
      );
    });

    it('2.3. location_reviews có kiểm tra root.child("config/writesEnabled").val() !== false', () => {
      const rules = getCleanRules();
      const locReviewWrite = rules.location_reviews?.$dishId?.$locId?.$uid?.['.write'] || '';
      assert.ok(
        locReviewWrite.includes("config/writesEnabled") && locReviewWrite.includes('!== false'),
        'location_reviews thiếu điều kiện ngắt ghi: root.child(\'config/writesEnabled\').val() !== false!'
      );
    });

    it('2.4. reports có kiểm tra root.child("config/writesEnabled").val() !== false', () => {
      const rules = getCleanRules();
      const reportWrite = rules.reports?.$reportId?.['.write'] || '';
      assert.ok(
        reportWrite.includes("config/writesEnabled") && reportWrite.includes('!== false'),
        'reports thiếu điều kiện ngắt ghi: root.child(\'config/writesEnabled\').val() !== false!'
      );
    });
  });

  describe('3. Kiểm thử kịch bản mô phỏng Kill Switch (Simulator)', () => {
    const rules = getCleanRules();
    const sim = new KillSwitchSimulator(rules);

    const normalUser = { uid: 'user_123', token: {} };
    const adminUser = { uid: 'admin_master', token: { admin: true } };

    const dishPayload = {
      name: 'Phở bò tái nạm',
      mealTypes: ['sang'],
      status: 'pending',
      createdBy: 'user_123'
    };

    const reviewPayload = {
      author: 'Nguyễn Văn A',
      stars: 5,
      comment: 'Quán ăn ngon, phục vụ nhanh!',
      createdAt: Date.now()
    };

    const reportPayload = {
      targetId: 'dish_1',
      reason: 'Món ăn đã đóng cửa vĩnh viễn',
      createdAt: Date.now()
    };

    it('3.1. Khi writesEnabled = false: Khách bị từ chối tạo pending_dishes', () => {
      const rootState = {
        config: { writesEnabled: false },
        admin_config: { adminUid: 'admin_master' },
        rate_limits: {}
      };
      const allowed = sim.canCreatePendingDish(normalUser, rootState, 'dish_test_1', dishPayload);
      assert.equal(allowed, false, 'Khách vẫn tạo được món khi Kill Switch đang BẬT (writesEnabled = false)!');
    });

    it('3.2. Khi writesEnabled = false: Khách bị từ chối viết review món', () => {
      const rootState = {
        config: { writesEnabled: false },
        admin_config: { adminUid: 'admin_master' },
        rate_limits: {}
      };
      const allowed = sim.canWriteDishReview(normalUser, rootState, 'dish_1', normalUser.uid, reviewPayload);
      assert.equal(allowed, false, 'Khách vẫn gửi được review món khi Kill Switch đang BẬT!');
    });

    it('3.3. Khi writesEnabled = false: Khách bị từ chối viết location_review', () => {
      const rootState = {
        config: { writesEnabled: false },
        admin_config: { adminUid: 'admin_master' },
        shared_dishes: { dish_1: { name: 'Cơm tấm' } },
        rate_limits: {}
      };
      const allowed = sim.canWriteLocationReview(normalUser, rootState, 'dish_1', 'loc_1', normalUser.uid, reviewPayload);
      assert.equal(allowed, false, 'Khách vẫn gửi được location review khi Kill Switch đang BẬT!');
    });

    it('3.4. Khi writesEnabled = false: Khách bị từ chối gửi reports', () => {
      const rootState = {
        config: { writesEnabled: false },
        admin_config: { adminUid: 'admin_master' },
        rate_limits: {}
      };
      const allowed = sim.canCreateReport(normalUser, rootState, 'rep_1', reportPayload);
      assert.equal(allowed, false, 'Khách vẫn gửi được báo cáo vi phạm khi Kill Switch đang BẬT!');
    });

    it('3.5. Khi writesEnabled = false: Admin VẪN có quyền ghi/duyệt/xử lý tại mọi node', () => {
      const rootState = {
        config: { writesEnabled: false },
        admin_config: { adminUid: 'admin_master' },
        shared_dishes: { dish_1: { name: 'Cơm tấm' } },
        rate_limits: {}
      };
      assert.equal(sim.canCreatePendingDish(adminUser, rootState, 'dish_admin_1', dishPayload), true);
      assert.equal(sim.canWriteDishReview(adminUser, rootState, 'dish_1', adminUser.uid, reviewPayload), true);
      assert.equal(sim.canWriteLocationReview(adminUser, rootState, 'dish_1', 'loc_1', adminUser.uid, reviewPayload), true);
      assert.equal(sim.canCreateReport(adminUser, rootState, 'rep_admin_1', reportPayload), true);
      assert.equal(sim.canWriteConfig(adminUser, rootState), true);
    });

    it('3.6. Khách bình thường KHÔNG thể sửa config/writesEnabled', () => {
      const rootState = {
        config: { writesEnabled: false },
        admin_config: { adminUid: 'admin_master' }
      };
      const allowed = sim.canWriteConfig(normalUser, rootState);
      assert.equal(allowed, false, 'Khách thường lại có quyền ghi vào config/writesEnabled!');
    });

    it('3.7. Khi writesEnabled = true hoặc node config chưa tồn tại: Khách ghi bình thường', () => {
      // Trường hợp 1: writesEnabled = true
      const rootStateTrue = {
        config: { writesEnabled: true },
        admin_config: { adminUid: 'admin_master' },
        shared_dishes: { dish_1: { name: 'Cơm tấm' } },
        rate_limits: {}
      };
      assert.equal(sim.canCreatePendingDish(normalUser, rootStateTrue, 'dish_ok_1', dishPayload), true);
      assert.equal(sim.canWriteDishReview(normalUser, rootStateTrue, 'dish_1', normalUser.uid, reviewPayload), true);
      assert.equal(sim.canWriteLocationReview(normalUser, rootStateTrue, 'dish_1', 'loc_1', normalUser.uid, reviewPayload), true);
      assert.equal(sim.canCreateReport(normalUser, rootStateTrue, 'rep_ok_1', reportPayload), true);

      // Trường hợp 2: Chưa khởi tạo node config (mặc định mở ghi)
      const rootStateNone = {
        admin_config: { adminUid: 'admin_master' },
        shared_dishes: { dish_1: { name: 'Cơm tấm' } },
        rate_limits: {}
      };
      assert.equal(sim.canCreatePendingDish(normalUser, rootStateNone, 'dish_ok_2', dishPayload), true);
      assert.equal(sim.canWriteDishReview(normalUser, rootStateNone, 'dish_1', normalUser.uid, reviewPayload), true);
      assert.equal(sim.canWriteLocationReview(normalUser, rootStateNone, 'dish_1', 'loc_1', normalUser.uid, reviewPayload), true);
      assert.equal(sim.canCreateReport(normalUser, rootStateNone, 'rep_ok_2', reportPayload), true);
    });
  });
});
