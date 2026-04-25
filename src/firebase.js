// ============================================================
//  firebase.js  –  Cấu hình Firebase cho TayVinSchool
// ============================================================
//
//  HƯỚNG DẪN SETUP (5 phút):
//  1. Truy cập https://console.firebase.google.com
//  2. Tạo project mới (tên bất kỳ, ví dụ: "tayvin-game")
//  3. Vào Build → Realtime Database → Create database
//     → chọn vùng (asia-southeast1 để nhanh nhất ở VN)
//     → chọn "Start in test mode" (cho phép đọc/ghi tự do)
//  4. Vào Project Settings (⚙️) → General → Your apps → Web (</>)
//     → Đăng ký app → Copy firebaseConfig bên dưới
//  5. Thay các giá trị YOUR_... bằng giá trị thực từ console
//

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB9_MLeuj_YabFoKAomsx-GJ983Qv87fmE",
  authDomain: "tayvinschool.firebaseapp.com",
  databaseURL: "https://tayvinschool-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "tayvinschool",
  storageBucket: "tayvinschool.firebasestorage.app",
  messagingSenderId: "801017917647",
  appId: "1:801017917647:web:0ee7532fa944b9931b47ba",
  measurementId: "G-D6J8N68QFE",
};

// ── Initialise (safe – won't crash if config not filled in yet) ──────────────
let _app = null;
let _db = null;

const CONFIGURED = !firebaseConfig.apiKey.includes('YOUR_');

if (CONFIGURED) {
  try {
    _app = initializeApp(firebaseConfig);
    _db = getDatabase(_app);
  } catch (err) {
    console.warn('[Firebase] Init error:', err.message);
  }
}

export const db = _db;
export const isFirebaseReady = () => !!_db;
