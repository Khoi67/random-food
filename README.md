# Hôm Nay Ăn Gì Ở TP.HCM? - Vòng Quay May Mắn Ẩm Thực Sài Gòn (Cloud Sync) 🍜

Ứng dụng web hiện đại (Vite, HTML5, Tailwind CSS, Canvas API, Firebase Modular SDK) được tái cấu trúc theo mô-đun hóa rõ ràng, hiệu năng cao, hỗ trợ Hot Reload và sẵn sàng deploy tự động lên Vercel.

---

## 💻 Chạy Ứng Dụng Ở Local (Vite Dev Server)

```bash
# 1. Cài đặt thư viện phụ thuộc (nếu chưa có)
npm install

# 2. Khởi động máy chủ phát triển
npm run dev
```
Truy cập: `http://localhost:5173/`


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

## 🔐 Phân Quyền Admin (Bảo Vệ Thực Đơn Dùng Chung)

Khi nhiều người cùng truy cập ứng dụng chia sẻ Firebase, các thao tác nguy hiểm như **Xóa món ăn** hoặc **Khôi phục mẫu gốc** sẽ được bảo vệ bởi **Mã PIN Admin**:
- **Khách thường**: Có thể quay vòng may mắn, xem thực đơn, xem quán ăn chỉ đường Google Maps, thêm món mới.
- **Admin**: Được cấp quyền **Xóa món ăn** và **Khôi phục mẫu**.
- **Cách mở khóa**:
  1. Bấm vào nút `🔒 Khách` ở góc trên bên phải.
  2. Nhập mã PIN và bấm **Xác nhận**.
  3. Trạng thái sẽ chuyển thành `🔓 Admin`. Bạn có thể đổi mã PIN mới tại đây.

---

## ⭐ Hệ Thống Đánh Giá & Review Món Ăn (Realtime Foodie Reviews)

Mỗi món ăn trong thực đơn đều được trang bị hệ thống đánh giá tương tác:
- **Xem điểm số & Review**: Bấm vào nút `⭐ Đánh giá` ở từng món hoặc bấm `⭐ Xem review 💬` ngay trên popup sau khi quay trúng món.
- **Dữ liệu mẫu chân thực**: Tích hợp sẵn hàng chục bình luận, chia sẻ quán ngon tâm đắc từ các tín đồ ẩm thực Sài Gòn (Ba Ghiền, Huỳnh Hoa, Phở Lệ, Út Hưng, Ốc Đào...).
- **Gửi đánh giá mới**: Chọn từ 1 đến 5 sao với hiệu ứng chọn sao trực quan, để lại tên và cảm nhận. 
- **Đồng bộ tự động**: Đánh giá mới sẽ được đồng bộ tức thì lên Firebase Realtime Database và lưu cache vào `localStorage`.

---

## 🛡️ Cơ Chế Bảo Vệ Hạn Mức Free (Anti-Spam & Quota Shield)

Để ứng dụng luôn hoạt động mượt mà và **không bao giờ vượt quá hạn ngạch miễn phí** của Firebase và Vercel:
1. **Bộ đệm Edge CDN & Local Cache**: Cấu hình Firebase chỉ tải 1 lần qua `/api/config` và được lưu bộ nhớ đệm (Cache 24 giờ). Khi người dùng reload (F5) liên tục, web không gửi thêm request nào lên Serverless của Vercel (tiết kiệm 99% request).
2. **Giới hạn giãn cách (Rate-Limit Cooldown)**: Mỗi lần thêm món mới có thời gian chờ (cooldown 5 giây) để ngăn chặn spam nút gửi liên tiếp.
3. **Giới hạn số lượng (Max Dishes Cap)**: Thực đơn giới hạn tối đa 80 món để giữ dung lượng database luôn siêu nhẹ (< 50 KB).
4. **Tự động Fallback**: Nếu mạng chập chờn, Firebase bị ngắt kết nối hoặc hết hạn ngạch gói Free, ứng dụng tự động chuyển sang `LocalStorage` trên máy người dùng, đảm bảo web luôn hoạt động 100% thời gian.

---

### 📋 Cấu hình Security Rules trên Firebase Console (Bắt buộc để lưu món)
Tại [Firebase Console](https://console.firebase.google.com/) ➔ Realtime Database ➔ tab **Rules**, bạn hãy dán đoạn cấu hình này và bấm **Publish**:
```json
{
  "rules": {
    "shared_dishes": {
      ".read": true,
      ".write": true
    },
    "admin_config": {
      ".read": true,
      ".write": true
    }
  }
}
```
*(Lưu ý: Không dùng `newData.val().length` vì Firebase Realtime Database không hỗ trợ `.length` trên Object/Array, sẽ làm lỗi Permission Denied).*


---

## 🍜 Thực Đơn Chuyên Biệt TP.HCM (Sài Gòn)
- **Hơn 20 món ăn đặc sản**: Cơm tấm, Hủ tiếu Nam Vang, Bánh mì Huỳnh Hoa, Phở Lệ, Bún bò Út Hưng, Bánh canh cua Út Lệ, Ốc Đào, Lẩu bò Hoàng Thu, Lẩu dê 404, Phá lấu bò Cô Thảo, Dimsum Tiến Phát Q.5...
- **Mỗi món có danh sách 3 - 5 quán ăn thật kèm địa chỉ cụ thể** tại các quận của TP.HCM.
- Khi quay trúng món: Hiển thị danh sách quán, từng quán có nút **"Chỉ đường"** riêng mở thẳng Google Maps.

---

## 🚀 Cách Deploy Lên Vercel (Tự Động Cập Nhật Qua GitHub)

1. **Liên kết GitHub Repo**:
   - Truy cập [vercel.com](https://vercel.com/) ➔ Chọn **Add New Project**.
   - Chọn kho lưu trữ `Khoi67/random-food`.
2. **Cấu hình Environment Variables (Khuyên dùng)**:
   - Thêm biến môi trường trong mục **Settings ➔ Environment Variables** trên Vercel:
     - `FIREBASE_API_KEY`: API Key của Firebase
     - `FIREBASE_AUTH_DOMAIN`: Auth Domain
     - `FIREBASE_DATABASE_URL`: Đường link Database URL (ví dụ: `https://...firebasedatabase.app`)
     - `FIREBASE_PROJECT_ID`: Project ID
     - `FIREBASE_STORAGE_BUCKET`: Storage Bucket
     - `FIREBASE_MESSAGING_SENDER_ID`: Sender ID
     - `FIREBASE_APP_ID`: App ID
   - Ứng dụng tự động lấy thông tin từ Serverless Function `/api/config` và kết nối Firebase ngay khi tải trang mà không làm lộ secret trên GitHub.
3. **Mỗi lần git push**:
   - Khi bạn commit và push code lên nhánh `main` của GitHub, Vercel sẽ tự động build và cập nhật bản mới nhất trong vòng vài giây!

