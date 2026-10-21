export default function handler(req, res) {
  // Trả về cấu hình Firebase từ biến môi trường của Vercel
  const config = {
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
    databaseURL: process.env.FIREBASE_DATABASE_URL || "",
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.FIREBASE_APP_ID || "",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "",
    adminEmail: process.env.ADMIN_EMAIL || "",
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || "",
    recaptchaType: process.env.RECAPTCHA_TYPE || "v3"
  };

  // Cache tại Vercel Edge CDN trong 24 giờ, giảm tối đa số lượt gọi Serverless
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400");
  return res.status(200).json(config);
}
