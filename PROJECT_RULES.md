# 🏛️ RANDOM FOOD ARCHITECTURE & ENGINEERING RULES (QUY TẮC BẢO TOÀN HỆ THỐNG)

> **Mục tiêu**: Đảm bảo mọi tính năng đang hoạt động (Vòng quay 60fps, Realtime Cloud Sync, Phân quyền Admin, Lịch sử 14 ngày, Đánh giá, Lọc món) KHÔNG BAO GIỜ bị ảnh hưởng (regression) khi thêm mới, sửa đổi hay refactor.

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM OVERVIEW)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (BROWSER / PWA)                        │
│                                                                        │
│  ┌───────────────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │   Canvas 2D Engine    │  │  State Manager │  │    Audio Engine   │  │
│  │ Offscreen GPU Buffer  │  │   (App.tsx)    │  │   Web Audio Synth │  │
│  └───────────┬───────────┘  └───────┬────────┘  └───────────────────┘  │
│              │                      │                                  │
│              └──────────────┐       │                                  │
│                             ▼       ▼                                  │
│                 ┌─────────────────────────────┐                        │
│                 │   Local-First Storage Layer │                        │
│                 │  (LocalStorage + Migration) │                        │
│                 └──────────────┬──────────────┘                        │
└────────────────────────────────┼───────────────────────────────────────┘
                                 │ Realtime Sync / REST Fallback
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FIREBASE CLOUD BACKEND                          │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Realtime DB (Singapore) │  │          Authentication             │  │
│  │   /shared_dishes/$id    │  │  - Anonymous Auth (Khách vãng lai)  │  │
│  │   /shared_dishes/.../rev│  │  - Google Sign-In (Admin 👑)        │  │
│  │   /reports/$reportId    │  └─────────────────────────────────────┘  │
│  └─────────────────────────┘  ┌─────────────────────────────────────┐  │
│                               │              App Check              │  │
│                               │  reCAPTCHA Enterprise / v3          │  │
│                               └─────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. NGUYÊN TẮC VÀNG BẢO TOÀN HỆ THỐNG (THE 7 GOLDEN RULES)

### 📌 NGUYÊN TẮC 1: Local-First & Graceful Degradation (Ưu tiên Dữ liệu Cục bộ)
- **Quy tắc**: Mọi thao tác người dùng (Thêm món, Sửa, Lọc, Yêu thích, Lịch sử) **phải luôn lưu vào `LocalStorage` trước**, sau đó mới đồng bộ ngầm lên Cloud.
- **Tại sao**: Nếu người dùng rớt mạng, Firebase chậm hoặc bị `Permission Denied`, ứng dụng vẫn hoạt động trơn tru 100%, không bị treo màn hình trắng hay mất dữ liệu.
- **Cấm**: Không bao giờ phụ thuộc 100% vào Promise của Cloud trước khi render UI.

### 📌 NGUYÊN TẮC 2: Tôn trọng Cấu trúc Firebase Security Rules (Granular Mutation)
- **Quy tắc**:
  - Khi thêm một món ăn mới: **BẮT BUỘC** gọi `set(ref(db, "shared_dishes/" + dish.id), dish)`.
  - Tuyệt đối **KHÔNG GHI ĐÈ** lên toàn bộ node cha `shared_dishes`.
- **Tại sao**: Node cha `shared_dishes` có rule `.write` yêu cầu tài khoản Google Admin. Nếu gọi ghi đè node cha khi thêm món của khách, Firebase sẽ chặn ngay với lỗi `Permission Denied`. Node con `$dishId` có rule `!data.exists()` cho phép mọi người dùng thêm món mới an toàn.
- **Ngoại lệ duy nhất**: Chỉ hàm `saveDishesCloud` dành riêng cho Admin (Khôi phục dữ liệu gốc) mới được phép ghi đè node cha `shared_dishes`.

### 📌 NGUYÊN TẮC 3: Tuyệt đối Bảo mật Danh tính & Bí mật (Zero-Knowledge Privacy)
- **Quy tắc**:
  - Không bao giờ hiển thị tên biến môi trường (như `ADMIN_EMAIL`, `API_KEY`) hay địa chỉ email thật trong các câu thông báo Toast, Console log hoặc giao diện công khai.
  - API `/api/config` chỉ trả về **Mã băm SHA-256 một chiều** (`adminEmailHash`), không bao giờ trả về email dạng thô.
  - Phân quyền Admin ở client chỉ so sánh `SHA256(currentUser.email) === adminEmailHash`.
  - Khi đăng nhập sai email Admin, chỉ hiển thị thông báo trung tính: *"Tài khoản Google này không có quyền Quản trị viên."*

### 📌 NGUYÊN TẮC 4: Tương thích Ngược Dữ liệu Cũ (Soft Migration & Schema Guard)
- **Quy tắc**: Bất kỳ dữ liệu món ăn nào lấy từ Cloud hoặc LocalStorage đều phải chạy qua hàm chuẩn hóa `normalizeDish(dish)` trước khi đưa vào State.
- **Tại sao**: Dữ liệu người dùng cũ hoặc dữ liệu cũ trên Cloud có thể thiếu các trường mới (ví dụ: thiếu `mealTypes`, thiếu `status`, `locations` là mảng chuỗi thay vì object).
- **Chuẩn cấu trúc Dish**:
  ```typescript
  interface Dish {
    id: string;
    name: string;
    shortName?: string;
    mealTypes: ('sang' | 'trua' | 'toi')[]; // Luôn là MẢNG
    priceRange: 'under50' | '50to100' | 'above100';
    type: 'nuoc' | 'kho';
    vegetarian: boolean;
    locations: { name: string; address: string }[]; // Luôn là mảng Object
    status: 'approved' | 'pending';
    createdAt: number;
    reviews?: ReviewItem[];
  }
  ```

### 📌 NGUYÊN TẮC 5: Tách biệt Vòng đời Modal & Tránh Stale State
- **Quy tắc**: 
  - Các modal trạng thái (như `HistoryModal`, `ResultModal`, `AdminModal`) khi được mở ra **phải luôn đồng bộ lại State mới nhất từ Storage thông qua `useEffect([isOpen])`**.
  - Không được dựa vào giá trị khởi tạo `useState(getSpinHistory())` duy nhất một lần khi mount ban đầu, vì modal sẽ chứa dữ liệu cũ (stale data).
  - Tách bạch rõ ràng `mode="spin"` (khi quay trúng: có pháo hoa, tiêu đề chúc mừng, nút quay lại) và `mode="detail"` (khi click xem quán: tiêu đề thông tin quán, nút đóng, không pháo hoa).

### 📌 NGUYÊN TẮC 6: Bảo toàn Hiệu năng Vòng quay (60fps Canvas Architecture)
- **Quy tắc**:
  - Vòng quay sử dụng kỹ thuật **Offscreen Canvas Buffer** (`bufferCanvasRef`).
  - Toàn bộ việc vẽ nan quạt, chữ uốn lượn, viền bóng phức tạp **chỉ được render 1 lần duy nhất vào bộ nhớ đệm Buffer** khi danh sách món hoặc kích thước thay đổi.
  - Khi vòng quay đang xoay (vòng lặp 60fps), `draw()` chỉ thực hiện thao tác xoay tọa độ và `drawImage(buffer)` trong chưa tới `0.05ms`.
  - **Kích thước Canvas**: Luôn đo theo khung chứa ngoài cùng cố định (`containerRef`), không bao giờ đo theo thẻ cha có `display: flex` co dãn (shrink-wrap) để tránh bị kẹt kích thước 300px.

### 📌 NGUYÊN TẮC 7: Kiểm thử Hồi quy Trước khi Bàn giao (Regression Testing)
- **Quy tắc bắt buộc** trước khi kết thúc bất kỳ lượt chỉnh sửa nào:
  1. Chạy `npm test` để đảm bảo 100% test case (21/21) kiểm tra lọc món, tương thích dữ liệu cũ và phân phối xác suất quay đều vượt qua.
  2. Chạy `npx tsc --noEmit` để đảm bảo không có lỗi lệch kiểu dữ liệu TypeScript.
  3. Chạy `npm run build` để xác nhận bundle production không bị lỗi cú pháp hay import lậu.
  4. **Chỉ thực hiện `git push` khi người dùng yêu cầu rõ ràng.**

---

## 3. CHECKLIST KIỂM TRA NHANH KHI UPDATE MÃ NGUỒN

| Hạng mục kiểm tra | Tiêu chuẩn đạt |
|---|---|
| **Vòng quay (Wheel)** | Kích thước chuẩn 400px, xoay 60fps mượt mà, dừng đúng tâm mũi tên vàng. |
| **Bảo mật Admin** | Không lộ email cá nhân hay biến `ADMIN_EMAIL`. Chỉ tài khoản Google hợp lệ mới có quyền Xóa / Khôi phục. |
| **Thêm món mới** | Khách bình thường thêm món được ngay, lưu cả LocalStorage lẫn Cloud `shared_dishes/$id`. |
| **Lịch sử & Tránh lặp** | Quay xong lưu ngay vào lịch sử 14 ngày; chọn tránh lặp 1-3 ngày sẽ tự động ẩn các món đã ăn. |
| **Xem chi tiết quán** | Bấm vào card món hiển thị đúng địa chỉ, GPS "Tìm quán gần tôi", mở Google Maps, không hiện chữ "Vũ trụ đã chọn". |
