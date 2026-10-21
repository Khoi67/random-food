# 🤖 GEMINI AGENT RULES (HƯỚNG DẪN BẮT BUỘC DÀNH CHO AI AGENT)

Tài liệu này là **QUY TẮC BẮT BUỘC** dành cho tất cả các AI Agent (Antigravity, Gemini, Claude, Copilot,...) khi đọc hiểu, bảo trì, nâng cấp hoặc sửa lỗi trên dự án **Random Food (Hôm Nay Ăn Gì - TP.HCM)**.

---

## 🛑 1. CÁC ĐIỀU CẤM TUYỆT ĐỐI (NON-NEGOTIABLE CONSTRAINTS)

1. **TUYỆT ĐỐI KHÔNG `git push` TỰ ĐỘNG:**
   - Được phép `git commit` trên máy cục bộ để lưu tiến độ công việc.
   - **CHỈ ĐƯỢC CHẠY `git push` KHI NGƯỜI DÙNG YÊU CẦU TRỰC TIẾP TRONG CHAT.**

2. **TUYỆT ĐỐI KHÔNG LÀM LỘ THÔNG TIN BẢO MẬT (ZERO-KNOWLEDGE LEAKAGE):**
   - Không in địa chỉ email cá nhân, biến `ADMIN_EMAIL` hay khóa bí mật vào:
     - Giao diện người dùng (UI text).
     - Thông báo nổi (Toast alerts).
     - Nhật ký Console (`console.log`, `console.error`).
     - JSON trả về từ API `/api/config` (chỉ trả về `adminEmailHash` SHA-256).
   - Không lưu email thô vào `localStorage` hay Realtime Database `admin_config`.

3. **TUYỆT ĐỐI KHÔNG GHI ĐÈ NODE GỐC `shared_dishes` KHI THÊM MÓN:**
   - Khi người dùng thêm món ăn mới: **BẮT BUỘC** gọi `addDishCloud(dish)` (ghi vào `shared_dishes/${dish.id}`).
   - Không được gọi `saveDishesCloud` ghi đè toàn bộ danh sách khi thêm món lẻ, vì Firebase Rules sẽ chặn với lỗi `Permission Denied`.

4. **TUYỆT ĐỐI KHÔNG TỰ ĐỘNG ĐẨY SEED LÊN CLOUD KHI VỪA MỞ TRANG:**
   - Khi mở web nếu Cloud rỗng, **chỉ cho phép tự động seed nếu đã đăng nhập Google Admin thành công** (`isAdminUser === true`). Khách vãng lai mở web không được gọi ghi đè.

---

## 🏛️ 2. NGUYÊN TẮC KIẾN TRÚC CỐT LÕI (CORE ARCHITECTURE)

### A. Local-First Storage (Ưu tiên Cục bộ)
- Mọi thay đổi dữ liệu người dùng (Thêm món, Sửa, Lọc, Yêu thích, Lịch sử) **phải luôn cập nhật `localStorage` trước**, sau đó mới đẩy ngầm lên Firebase Cloud.
- Không để ứng dụng bị block giao diện bởi các lời gọi mạng bất đồng bộ.

### B. Tương thích Ngược (Data Normalization)
- Mọi dữ liệu món ăn nạp từ Storage hoặc Firebase **bắt buộc chạy qua hàm [`normalizeDish(dish)`](file:///d:/Practice/random-ai/src/services/storage.js)**.
- Đảm bảo các thuộc tính `mealTypes` (mảng), `locations` (mảng object), `status`, `priceRange`, `type` luôn có giá trị mặc định an toàn.

### C. Đồ họa Canvas 2D & Hiệu năng 60fps
- Vòng quay hiển thị chuẩn kích thước **400px** trên desktop, co giãn 100% trên mobile.
- Phải đo kích thước qua `containerRef` của khung chứa cố định, không đo qua thẻ cha có `display: flex` co dãn (shrink-wrap) để tránh bị kẹt kích thước 300px.
- Giữ nguyên cơ chế **Offscreen Canvas Buffer** (`bufferCanvasRef`): Nan quạt và chữ chỉ vẽ 1 lần vào Buffer; hàm `draw()` vòng lặp quay chỉ gọi `drawImage(buffer)` trong < 0.05ms.

### D. Đồng bộ State trên Modal (Tránh Stale Data)
- Các modal (`HistoryModal`, `ResultModal`, `AdminModal`) phải có `useEffect([isOpen])` để tự động nạp lại dữ liệu mới nhất từ `localStorage` khi người dùng mở modal.
- `ResultModal` hỗ trợ 2 chế độ riêng biệt:
  - `mode="spin"`: Chúc mừng quay trúng, bắn pháo hoa Confetti, nút "Quay lại món khác".
  - `mode="detail"`: Xem thông tin quán khi click món trong danh sách, tiêu đề "Thông Tin & Địa Điểm Quán", nút đóng, không có pháo hoa.

---

## 🧪 3. BỐN BƯỚC KIỂM THỬ TRƯỚC KHI BÀN GIAO (PRE-FLIGHT CHECKLIST)

Trước khi thông báo hoàn tất bất kỳ yêu cầu nào cho người dùng, Agent **phải tự động chạy và xác nhận 3 lệnh sau thành công 100%**:

```powershell
# 1. Kiểm tra 21/21 Unit Tests (Lọc món, Soft Migration, Xác suất quay)
cmd.exe /c "npm test"

# 2. Kiểm tra lỗi Kiểu dữ liệu TypeScript
cmd.exe /c "npx tsc --noEmit"

# 3. Kiểm tra Build Production của Vite
cmd.exe /c "npm run build"
```

---

## 📂 4. SƠ ĐỒ THƯ MỤC CẦN NẮM

```
d:/Practice/random-ai/
├── api/
│   └── config.js              # Serverless API trả về cấu hình băm SHA-256
├── src/
│   ├── components/
│   │   ├── WheelCanvas.tsx    # Vòng quay Canvas 400px + Offscreen Buffer
│   │   ├── DishList.tsx       # Danh sách món 3 tầng + click xem quán
│   │   ├── ResultModal.tsx    # Modal trúng thưởng / Chi tiết quán ăn
│   │   ├── HistoryModal.tsx   # Lịch sử 14 ngày & Tránh lặp món
│   │   └── AdminModal.tsx     # Đăng nhập Google Admin & Khôi phục thực đơn
│   ├── services/
│   │   ├── firebase.js        # Realtime DB, Google Auth, App Check
│   │   ├── history.js         # Lịch sử quay & tính ngày tránh lặp
│   │   ├── storage.js         # LocalStorage & normalizeDish
│   │   └── geolocation.js     # Định vị GPS & tính khoảng cách Haversine
│   ├── utils/
│   │   ├── constants.js       # Hằng số key & bảng màu 6 tông ấm
│   │   └── helpers.js         # Web Audio Synth & ShowToast
│   └── App.tsx                # State trung tâm & điều phối modal
├── database.rules.json        # Rules bảo mật Firebase Realtime Database
└── PROJECT_RULES.md           # Bản quy chuẩn kiến trúc chi tiết
```
