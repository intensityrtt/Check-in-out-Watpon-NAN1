// ============================================================
// Config.gs
// ระบบ Check-in / Check-out สำหรับการประชุม อบรม สัมมนา
// ไฟล์: การกำหนดค่าระบบกลาง (Configuration)
// ============================================================

/**
 * CONFIG — ค่าคงที่และค่าตั้งค่าระบบทั้งหมด
 * แก้ไขค่าในส่วนนี้เพื่อปรับแต่งระบบ
 */
const CONFIG = {
  // Spreadsheet ID
  SPREADSHEET_ID: "1q-vCTNwHBvPWskWu5zjWzC5r4fyqq3z-xUIz4Z363Vk",

  // ชื่อระบบ
  SYSTEM_NAME: "ระบบ Check-in / Check-out",
  SYSTEM_SUBTITLE: "การประชุม อบรม สัมมนา",
  SYSTEM_VERSION: "1.0.0",

  // Google Sheets — ชื่อ Sheet
  SHEET_EVENT: "Event",
  SHEET_PARTICIPANTS: "Participants",
  SHEET_ATTENDANCE: "Attendance",
  SHEET_CONFIG: "Config",

  // Admin Login (เปลี่ยนก่อน Deploy จริง)
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "admin1234",

  // Session timeout (นาที)
  SESSION_TIMEOUT: 60,

  // Timezone
  TIMEZONE: "Asia/Bangkok",

  // CSV Export — ข้อความบรรทัดที่ 1 และ 2 (ค่าเริ่มต้น)
  CSV_LINE1: "ลงชื่อรับเงินค่าพาหนะ",
  CSV_LINE2: "จำนวน ............. บาท",

  // QR Code Base URL (URL ของ Web App)
  QR_BASE_URL: "",

  // สีธีม
  THEME_PRIMARY: "#1976D2",
  THEME_SECONDARY: "#424242",

  // จำนวนแถวสูงสุดต่อหน้า
  PAGE_SIZE: 50,
};

/**
 * getSpreadsheet() — ดึง Spreadsheet หลักของระบบ
 * ใช้ SpreadsheetApp.openById() ในกรณีที่เป็นสคริปต์แบบ Standalone
 * หรือคลิกข้ามมาจาก Spreadsheet ตัวอื่น
 */
function getSpreadsheet() {
  try {
    if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== "") {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    throw new Error("ไม่สามารถเชื่อมต่อ Google Sheets ตาม ID ที่กำหนดได้: " + e.message);
  }
}

/**
 * getSheet(sheetName) — ดึง Sheet ตามชื่อ
 * ถ้าไม่มี Sheet จะสร้างให้อัตโนมัติ
 * @param {string} sheetName — ชื่อ Sheet
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }
  return sheet;
}

/**
 * initializeSheet(sheet, sheetName) — สร้าง Header Row สำหรับ Sheet ที่เพิ่งสร้าง
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} sheetName
 */
function initializeSheet(sheet, sheetName) {
  const headers = {
    [CONFIG.SHEET_EVENT]: [
      "EventID", "EventName", "Date", "StartTime", "EndTime",
      "Location", "Description", "QRCodeToken", "CreatedAt", "Status"
    ],
    [CONFIG.SHEET_PARTICIPANTS]: [
      "PID", "Title", "FirstName", "LastName", "Organization",
      "Position", "Email", "Phone", "CreatedAt", "Status"
    ],
    [CONFIG.SHEET_ATTENDANCE]: [
      "PID", "EventID", "CheckInTime", "CheckOutTime",
      "Latitude", "Longitude", "Browser", "Device", "IP",
      "Status", "Remark", "Duration"
    ],
    [CONFIG.SHEET_CONFIG]: [
      "Key", "Value", "Description", "UpdatedAt"
    ],
  };

  const headerRow = headers[sheetName];
  if (headerRow) {
    sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);

    // จัดสไตล์ Header
    const headerRange = sheet.getRange(1, 1, 1, headerRow.length);
    headerRange.setBackground("#1976D2");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(11);
    sheet.setFrozenRows(1);
  }
}

/**
 * setupSystem() — ฟังก์ชันสร้างระบบครั้งแรก
 * รัน 1 ครั้งหลังจาก Deploy เพื่อสร้าง Sheet และ Config เริ่มต้น
 */
function setupSystem() {
  // สร้าง Sheets ที่จำเป็น
  getSheet(CONFIG.SHEET_EVENT);
  getSheet(CONFIG.SHEET_PARTICIPANTS);
  getSheet(CONFIG.SHEET_ATTENDANCE);
  getSheet(CONFIG.SHEET_CONFIG);

  // บันทึกค่า Config เริ่มต้นลง Sheet
  saveDefaultConfig();

  Logger.log("✅ ระบบพร้อมใช้งาน — Sheets ถูกสร้างเรียบร้อยแล้ว");
  return "ระบบพร้อมใช้งาน";
}

/**
 * saveDefaultConfig() — บันทึกค่าตั้งค่าเริ่มต้นลง Sheet Config
 */
function saveDefaultConfig() {
  const configSheet = getSheet(CONFIG.SHEET_CONFIG);
  const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");

  const defaultConfigs = [
    ["SYSTEM_NAME", CONFIG.SYSTEM_NAME, "ชื่อระบบ", now],
    ["ADMIN_USERNAME", CONFIG.ADMIN_USERNAME, "ชื่อผู้ใช้ Admin", now],
    ["ADMIN_PASSWORD", CONFIG.ADMIN_PASSWORD, "รหัสผ่าน Admin", now],
    ["CSV_LINE1", CONFIG.CSV_LINE1, "ข้อความบรรทัดที่ 1 ใน CSV", now],
    ["CSV_LINE2", CONFIG.CSV_LINE2, "ข้อความบรรทัดที่ 2 ใน CSV", now],
    ["SESSION_TIMEOUT", CONFIG.SESSION_TIMEOUT.toString(), "Session timeout (นาที)", now],
  ];

  // ตรวจสอบว่ามีข้อมูลแล้วหรือไม่
  const existing = configSheet.getLastRow();
  if (existing <= 1) {
    configSheet.getRange(2, 1, defaultConfigs.length, 4).setValues(defaultConfigs);
  }
}

/**
 * getSystemConfig() — ดึงค่า Config จาก Sheet มาใช้งาน
 * @returns {Object} — Object ของค่า Config ทั้งหมด
 */
function getSystemConfig() {
  try {
    const configSheet = getSheet(CONFIG.SHEET_CONFIG);
    const data = configSheet.getDataRange().getValues();
    const config = { ...CONFIG }; // copy ค่าเริ่มต้น

    // อ่านค่าจาก Sheet ทับค่าเริ่มต้น
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      let value = data[i][1];
      if (key) {
        if (value instanceof Date) {
          value = formatDateTime(value);
        }
        config[key] = value;
      }
    }
    return config;
  } catch (e) {
    Logger.log("Error getSystemConfig: " + e.message);
    return CONFIG;
  }
}

/**
 * updateSystemConfig(updates) — อัปเดตค่า Config ใน Sheet
 * @param {Object} updates — Object ของ key-value ที่ต้องการอัปเดต
 * @returns {Object} — {success, message}
 */
function updateSystemConfig(updates) {
  try {
    const configSheet = getSheet(CONFIG.SHEET_CONFIG);
    const data = configSheet.getDataRange().getValues();
    const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");

    for (const [key, value] of Object.entries(updates)) {
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          // อัปเดตแถวที่มีอยู่
          configSheet.getRange(i + 1, 2).setValue(value);
          configSheet.getRange(i + 1, 4).setValue(now);
          found = true;
          break;
        }
      }
      if (!found) {
        // เพิ่มแถวใหม่
        const lastRow = configSheet.getLastRow() + 1;
        configSheet.getRange(lastRow, 1, 1, 4).setValues([[key, value, "", now]]);
      }
    }

    return { success: true, message: "บันทึกการตั้งค่าเรียบร้อยแล้ว" };
  } catch (e) {
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

/**
 * generateID(prefix) — สร้าง ID อัตโนมัติ
 * @param {string} prefix — คำนำหน้า เช่น "EVT", "PID", "ATT"
 * @returns {string} — ID เช่น "EVT20240101001"
 */
function generateID(prefix) {
  const now = new Date();
  const dateStr = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyyMMdd");
  const timeStr = Utilities.formatDate(now, CONFIG.TIMEZONE, "HHmmss");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}${dateStr}${timeStr}${random}`;
}

/**
 * formatDateTime(date) — จัดรูปแบบวันที่-เวลา
 * @param {Date|string} date
 * @returns {string} — "dd/MM/yyyy HH:mm:ss"
 */
function formatDateTime(date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return Utilities.formatDate(d, CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");
  } catch (e) {
    return String(date);
  }
}

/**
 * formatDate(date) — จัดรูปแบบวันที่อย่างเดียว
 * @param {Date|string} date
 * @returns {string} — "dd/MM/yyyy"
 */
function formatDate(date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return Utilities.formatDate(d, CONFIG.TIMEZONE, "dd/MM/yyyy");
  } catch (e) {
    return String(date);
  }
}

/**
 * formatTime(date) — จัดรูปแบบเวลาอย่างเดียว
 * @param {Date|string} date
 * @returns {string} — "HH:mm:ss"
 */
function formatTime(date) {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return Utilities.formatDate(d, CONFIG.TIMEZONE, "HH:mm:ss");
  } catch (e) {
    return String(date);
  }
}

/**
 * generateQRToken() — สร้าง Token สำหรับ QR Code
 * @returns {string} — UUID-like token
 */
function generateQRToken() {
  return Utilities.getUuid();
}

/**
 * parseDateSafe(dateVal) — แปลงข้อมูลวันที่ต่าง ๆ เป็น Date object อย่างปลอดภัย
 * @param {any} dateVal
 * @returns {Date|null}
 */
function parseDateSafe(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d;
  
  if (typeof dateVal === "string") {
    // ลองแปลงรูปแบบ dd/MM/yyyy HH:mm:ss หรือ dd/MM/yyyy
    const match = dateVal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const hour = parseInt(match[4] || "0", 10);
      const minute = parseInt(match[5] || "0", 10);
      const second = parseInt(match[6] || "0", 10);
      return new Date(year, month, day, hour, minute, second);
    }
  }
  return null;
}

/**
 * calculateDuration(checkIn, checkOut) — คำนวณระยะเวลาการเข้าร่วม
 * @param {string|Date} checkIn — เวลา Check-in
 * @param {string|Date} checkOut — เวลา Check-out
 * @returns {string} — "X ชั่วโมง Y นาที"
 */
function calculateDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "—";
  try {
    const inTime = parseDateSafe(checkIn);
    const outTime = parseDateSafe(checkOut);
    if (!inTime || !outTime) return "—";
    const diffMs = outTime - inTime;
    if (diffMs < 0) return "ข้อมูลไม่ถูกต้อง";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours} ชั่วโมง ${minutes} นาที`;
    } else if (minutes > 0) {
      return `${minutes} นาที ${seconds} วินาที`;
    } else {
      return `${seconds} วินาที`;
    }
  } catch (e) {
    return "—";
  }
}
