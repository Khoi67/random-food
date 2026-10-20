# Hôm Nay Ăn Gì Ở TP.HCM? - Vòng Quay May Mắn Ẩm Thực Sài Gòn (Cloud Sync) 🍜

Ứng dụng web Single-File (HTML5, Tailwind CSS qua CDN, Canvas API, Vanilla JavaScript, Firebase Modular SDK) chạy trực tiếp trong 1 file duy nhất `index.html`. Không cần NodeJS, không cần build step, sẵn sàng deploy ngay lên Vercel.

---

## ✨ Điểm Mới: Hỗ Trợ Dùng Chung Realtime Qua Firebase

Ứng dụng hỗ trợ cơ chế lưu trữ kép **Hybrid (LocalStorage + Firebase Realtime Database)**:
- **Mặc định**: Lưu trữ an toàn trong `localStorage` trên máy người dùng.
- **Khi kết nối Firebase**: Trở thành **ứng dụng dùng chung Realtime**. Khi bất kỳ ai thêm, sửa hoặc xóa món/quán ăn, vòng quay trên máy của tất cả mọi người khác sẽ **tự động cập nhật tức thì** mà không cần reload trang.

---

## 🛠️ Hướng Dẫn Kích Hoạt Firebase Dùng Chung (Miễn phí 100%)

Chỉ cần thực hiện 3 bước đơn giản:

1. **Tạo Project**:
   - Truy cập [Firebase Console](https://console.firebase.google.com/) bằng tài khoản Google của bạn.
   - Bấm **Add project** (Đặt tên bất kỳ, ví dụ `hom-nay-an-gi`).
2. **Kích hoạt Realtime Database**:
   - Ở thanh menu bên trái, chọn **Build ➔ Realtime Database**.
   - Bấm **Create Database** ➔ Chọn vị trí máy chủ (ví dụ `Singapore` hoặc `United States`).
   - Ở bước chọn Security Rules, chọn **Start in test mode** (để tất cả mọi người có thể cùng thêm/xóa món ăn) ➔ Bấm **Enable**.
3. **Lấy mã cấu hình**:
   - Bấm vào icon bánh răng **Project Settings** ở góc trên bên trái.
   - Kéo xuống mục **Your apps**, bấm vào icon Web `</>` để tạo web app.
   - Sao chép toàn bộ đoạn mã `const firebaseConfig = { ... };`.
4. **Dán vào ứng dụng**:
   - Mở ứng dụng web lên, bấm vào nút **"Đồng bộ Cloud"** ở góc trên bên phải thanh tiêu đề.
   - Dán đoạn mã vừa copy vào ô nhập và bấm **"Lưu & Kết Nối Ngay"**.
   - Đèn trạng thái sẽ chuyển sang màu xanh lá **"Firebase Realtime"** 🔥. Giờ đây bất kỳ ai truy cập đường link web của bạn đều sẽ dùng chung 1 thực đơn!

---

## 🍜 Thực Đơn Chuyên Biệt TP.HCM (Sài Gòn)
- **Hơn 20 món ăn đặc sản**: Cơm tấm, Hủ tiếu Nam Vang, Bánh mì Huỳnh Hoa, Phở Lệ, Bún bò Út Hưng, Bánh canh cua Út Lệ, Ốc Đào, Lẩu bò Hoàng Thu, Lẩu dê 404, Phá lấu bò Cô Thảo, Dimsum Tiến Phát Q.5...
- **Mỗi món có danh sách 3 - 5 quán ăn thật kèm địa chỉ cụ thể** tại các quận của TP.HCM.
- Khi quay trúng món: Hiển thị danh sách quán, từng quán có nút **"Chỉ đường"** riêng mở thẳng Google Maps.

---

## 🚀 Cách Deploy Lên Vercel

1. **Cách 1: Kéo thả (Dễ nhất)**
   - Truy cập [vercel.com/new](https://vercel.com/new).
   - Kéo thư mục `random-ai` thả vào trình duyệt Vercel.
   - Bấm **Deploy**.
2. **Cách 2: Qua Vercel CLI**
   ```bash
   cd d:\Practice\random-ai
   npx vercel
   ```
