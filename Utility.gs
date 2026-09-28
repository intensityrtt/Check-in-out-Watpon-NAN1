// ============================================================
// Utility.gs
// ระบบ Check-in / Check-out สำหรับการประชุม อบรม สัมมนา
// ไฟล์: ฟังก์ชันช่วยเหลือทั่วไป
// ============================================================

/**
 * detectBrowser(userAgent) — ตรวจสอบ Browser จาก User-Agent
 * @param {string} userAgent
 * @returns {string} — ชื่อ Browser
 */
function detectBrowser(userAgent) {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Microsoft Edge";
  if (ua.includes("chrome/") && !ua.includes("chromium")) return "Google Chrome";
  if (ua.includes("firefox/")) return "Mozilla Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("msie") || ua.includes("trident")) return "Internet Explorer";
  return "Unknown Browser";
}

/**
 * detectDevice(userAgent) — ตรวจสอบประเภทอุปกรณ์
 * @param {string} userAgent
 * @returns {string} — ประเภทอุปกรณ์
 */
function detectDevice(userAgent) {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android") && ua.includes("mobile")) return "Android Phone";
  if (ua.includes("android")) return "Android Tablet";
  if (ua.includes("macintosh")) return "Mac";
  if (ua.includes("windows")) return "Windows PC";
  if (ua.includes("linux")) return "Linux";
  return "Unknown Device";
}

/**
 * sanitizeInput(input) — ทำความสะอาด Input ป้องกัน XSS
 * @param {string} input
 * @returns {string}
 */
function sanitizeInput(input) {
  if (!input) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .trim();
}

/**
 * validateEmail(email) — ตรวจสอบรูปแบบ Email
 * @param {string} email
 * @returns {boolean}
 */
function validateEmail(email) {
  if (!email) return true; // Email ไม่บังคับ
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * validatePhone(phone) — ตรวจสอบรูปแบบเบอร์โทรศัพท์ไทย
 * @param {string} phone
 * @returns {boolean}
 */
function validatePhone(phone) {
  if (!phone) return true; // Phone ไม่บังคับ
  const re = /^[0-9]{9,10}$/;
  return re.test(phone.replace(/[-\s]/g, ""));
}

/**
 * getWebAppUrl() — ดึง URL ของ Web App
 * @returns {string}
 */
function getWebAppUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (e) {
    return "";
  }
}

/**
 * generateQRCodeUrl(token) — สร้าง URL สำหรับ QR Code
 * @param {string} token — QR Token ของ Event
 * @returns {string} — URL ที่ใช้สร้าง QR Code
 */
function generateQRCodeUrl(token) {
  const baseUrl = getWebAppUrl();
  return `${baseUrl}?qr=${token}`;
}

/**
 * getQRCodeImageUrl(data) — สร้าง URL รูปภาพ QR Code จาก Google Charts API
 * @param {string} data — ข้อมูลที่จะเข้ารหัสใน QR
 * @param {number} size — ขนาด QR Code (px)
 * @returns {string} — URL รูปภาพ QR Code
 */
function getQRCodeImageUrl(data, size) {
  size = size || 200;
  const encoded = encodeURIComponent(data);
  return `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encoded}&choe=UTF-8`;
}

/**
 * getCurrentThaiDate() — ดึงวันที่ปัจจุบันในรูปแบบไทย
 * @returns {string} — "วันที่ DD เดือน YYYY"
 */
function getCurrentThaiDate() {
  const now = new Date();
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
    "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
    "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

/**
 * logAction(action, details) — บันทึก Log การกระทำ
 * @param {string} action — ชื่อการกระทำ
 * @param {Object} details — รายละเอียด
 */
function logAction(action, details) {
  Logger.log(`[${new Date().toISOString()}] ${action}: ${JSON.stringify(details)}`);
}

/**
 * jsonResponse(data) — สร้าง JSON Response สำหรับ Web App
 * @param {Object} data
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * htmlResponse(html) — สร้าง HTML Response สำหรับ Web App
 * @param {string} html
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function htmlResponse(html) {
  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * paginate(array, page, pageSize) — แบ่งหน้าข้อมูล
 * @param {Array} array — ข้อมูลทั้งหมด
 * @param {number} page — หมายเลขหน้า (เริ่มจาก 1)
 * @param {number} pageSize — จำนวนต่อหน้า
 * @returns {Object} — {data, total, page, pageSize, totalPages}
 */
function paginate(array, page, pageSize) {
  page = parseInt(page) || 1;
  pageSize = parseInt(pageSize) || CONFIG.PAGE_SIZE;
  const total = array.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    data: array.slice(start, end),
    total: total,
    page: page,
    pageSize: pageSize,
    totalPages: totalPages
  };
}

/**
 * formatPhoneForSheet(phone) — ปรับรูปแบบเบอร์โทรศัพท์ให้มี ' นำหน้าเพื่อให้เก็บเลข 0 ใน Google Sheets ได้
 * @param {string|number} phone
 * @returns {string}
 */
function formatPhoneForSheet(phone) {
  if (phone === null || phone === undefined) return "";
  const cleanPhone = String(phone).trim();
  if (cleanPhone === "") return "";
  if (cleanPhone.startsWith("'")) return cleanPhone;
  return "'" + cleanPhone;
}
