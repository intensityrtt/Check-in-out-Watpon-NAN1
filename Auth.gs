// ============================================================
// Auth.gs
// ระบบ Check-in / Check-out สำหรับการประชุม อบรม สัมมนา
// ไฟล์: ระบบ Authentication และ Session Management
// ============================================================

/**
 * login(username, password) — ตรวจสอบการเข้าสู่ระบบของ Admin
 * @param {string} username — ชื่อผู้ใช้
 * @param {string} password — รหัสผ่าน
 * @returns {Object} — {success, token, message}
 */
function login(username, password) {
  try {
    // ดึงค่า Config จาก Sheet
    const config = getSystemConfig();

    // ตรวจสอบ Username และ Password
    if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
      // สร้าง Session Token
      const token = createSession(username);
      Logger.log(`✅ Login สำเร็จ: ${username} — Token: ${token}`);
      return {
        success: true,
        token: token,
        username: username,
        message: "เข้าสู่ระบบสำเร็จ"
      };
    } else {
      Logger.log(`❌ Login ล้มเหลว: ${username}`);
      return {
        success: false,
        message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
      };
    }
  } catch (e) {
    Logger.log("Error login: " + e.message);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในระบบ: " + e.message
    };
  }
}

/**
 * createSession(username) — สร้าง Session Token และบันทึกลง PropertiesService
 * @param {string} username — ชื่อผู้ใช้
 * @returns {string} — Session Token
 */
function createSession(username) {
  const token = Utilities.getUuid();
  const config = getSystemConfig();
  const timeout = parseInt(config.SESSION_TIMEOUT) || 60;
  const expireAt = new Date().getTime() + (timeout * 60 * 1000);

  // บันทึก Session ลง Script Properties
  const props = PropertiesService.getScriptProperties();
  const sessionData = JSON.stringify({
    username: username,
    expireAt: expireAt,
    createdAt: new Date().getTime()
  });

  props.setProperty("SESSION_" + token, sessionData);
  Logger.log(`Session สร้างแล้ว: ${token} หมดอายุ: ${new Date(expireAt)}`);

  return token;
}

/**
 * validateSession(token) — ตรวจสอบความถูกต้องของ Session Token
 * @param {string} token — Session Token
 * @returns {Object} — {valid, username, message}
 */
function validateSession(token) {
  if (!token) {
    return { valid: false, message: "ไม่พบ Token" };
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const sessionJson = props.getProperty("SESSION_" + token);

    if (!sessionJson) {
      return { valid: false, message: "Session ไม่ถูกต้องหรือหมดอายุ" };
    }

    const session = JSON.parse(sessionJson);
    const now = new Date().getTime();

    // ตรวจสอบว่า Session หมดอายุหรือยัง
    if (now > session.expireAt) {
      // ลบ Session ที่หมดอายุ
      props.deleteProperty("SESSION_" + token);
      return { valid: false, message: "Session หมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่" };
    }

    // ต่ออายุ Session อัตโนมัติ
    const config = getSystemConfig();
    const timeout = parseInt(config.SESSION_TIMEOUT) || 60;
    session.expireAt = now + (timeout * 60 * 1000);
    props.setProperty("SESSION_" + token, JSON.stringify(session));

    return {
      valid: true,
      username: session.username,
      message: "Session ถูกต้อง"
    };
  } catch (e) {
    Logger.log("Error validateSession: " + e.message);
    return { valid: false, message: "เกิดข้อผิดพลาดในการตรวจสอบ Session" };
  }
}

/**
 * logout(token) — ออกจากระบบ และลบ Session
 * @param {string} token — Session Token
 * @returns {Object} — {success, message}
 */
function logout(token) {
  try {
    if (token) {
      const props = PropertiesService.getScriptProperties();
      props.deleteProperty("SESSION_" + token);
      Logger.log(`Logout สำเร็จ: Token ${token}`);
    }
    return { success: true, message: "ออกจากระบบสำเร็จ" };
  } catch (e) {
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

/**
 * cleanExpiredSessions() — ล้าง Session ที่หมดอายุทั้งหมด
 * ควรรันเป็น Trigger รายวัน
 */
function cleanExpiredSessions() {
  try {
    const props = PropertiesService.getScriptProperties();
    const allProps = props.getProperties();
    const now = new Date().getTime();
    let cleaned = 0;

    for (const [key, value] of Object.entries(allProps)) {
      if (key.startsWith("SESSION_")) {
        try {
          const session = JSON.parse(value);
          if (now > session.expireAt) {
            props.deleteProperty(key);
            cleaned++;
          }
        } catch (e) {
          // ถ้า parse ไม่ได้ให้ลบทิ้ง
          props.deleteProperty(key);
          cleaned++;
        }
      }
    }

    Logger.log(`ล้าง Session หมดอายุ: ${cleaned} รายการ`);
    return { success: true, cleaned: cleaned };
  } catch (e) {
    Logger.log("Error cleanExpiredSessions: " + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * changePassword(token, oldPassword, newPassword) — เปลี่ยนรหัสผ่าน Admin
 * @param {string} token — Session Token
 * @param {string} oldPassword — รหัสผ่านเดิม
 * @param {string} newPassword — รหัสผ่านใหม่
 * @returns {Object} — {success, message}
 */
function changePassword(token, oldPassword, newPassword) {
  // ตรวจสอบ Session ก่อน
  const session = validateSession(token);
  if (!session.valid) {
    return { success: false, message: session.message };
  }

  try {
    const config = getSystemConfig();

    // ตรวจสอบรหัสผ่านเดิม
    if (oldPassword !== config.ADMIN_PASSWORD) {
      return { success: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" };
    }

    // ตรวจสอบรหัสผ่านใหม่
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" };
    }

    // บันทึกรหัสผ่านใหม่
    const result = updateSystemConfig({ ADMIN_PASSWORD: newPassword });
    if (result.success) {
      return { success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" };
    } else {
      return result;
    }
  } catch (e) {
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

/**
 * isAuthenticated(token) — เช็คสั้นๆ ว่า Token valid หรือไม่
 * @param {string} token
 * @returns {boolean}
 */
function isAuthenticated(token) {
  const result = validateSession(token);
  return result.valid;
}
