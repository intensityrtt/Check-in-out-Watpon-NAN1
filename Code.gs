// ============================================================
// Code.gs
// ระบบ Check-in / Check-out สำหรับการประชุม อบรม สัมมนา
// ไฟล์: Entry Point หลักของ Web App (doGet, doPost)
// ============================================================

/**
 * doGet(e) — รับ HTTP GET Request
 * เป็น Entry Point หลักสำหรับแสดง UI ของ Web App
 */
function doGet(e) {
  try {
    const params = e.parameter || {};

    // รองรับ QR Code Check-in (ผ่าน URL ?qr=TOKEN)
    if (params.qr) {
      return serveQRCheckIn(params.qr);
    }

    // รองรับ Event ID โดยตรงสำหรับลิ้งค์เช็คอินสาธารณะ (ผ่าน URL ?id=EVENT_ID หรือ ?eventID=EVENT_ID)
    if (params.id || params.eventID) {
      return servePublicEvent(params.id || params.eventID);
    }

    // แสดง Main App
    return serveMainApp();
  } catch (err) {
    Logger.log("Error doGet: " + err.message);
    return HtmlService.createHtmlOutput(
      `<h2>เกิดข้อผิดพลาด</h2><p>${err.message}</p>`
    );
  }
}

/**
 * doPost(e) — รับ HTTP POST Request
 * ใช้เป็น API Endpoint สำหรับ AJAX calls (รองรับภายนอก)
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const token = body.token;
    const data = body.data || {};
    
    const result = handleApiAction(action, data, token);
    return jsonResponse(result);
  } catch (err) {
    Logger.log("Error doPost: " + err.message + " Stack: " + err.stack);
    return jsonResponse({ success: false, message: "Server Error: " + err.message });
  }
}

/**
 * apiGateway(action, data, token) — ช่องทางการติดต่อหลักสำหรับ google.script.run
 * ช่วยหลีกเลี่ยงปัญหา CORS เมื่อรันใน iFrame
 */
function apiGateway(action, data, token) {
  try {
    return handleApiAction(action, data, token);
  } catch (err) {
    Logger.log("Error apiGateway: " + err.message + " Stack: " + err.stack);
    return { success: false, message: "Server Error: " + err.message };
  }
}

/**
 * handleApiAction(action, data, token) — ตัวจัดการและส่งต่อ Action ทั้งหมด
 */
function handleApiAction(action, data, token) {
  switch (action) {

    // ===== Authentication =====
    case "login":
      return login(data.username, data.password);

    case "logout":
      return logout(token);

    case "validateSession":
      return validateSession(token);

    case "changePassword":
      return changePassword(token, data.oldPassword, data.newPassword);

    // ===== Events =====
    case "getAllEvents":
      return getAllEvents();

    case "getEventByID":
      return { success: true, data: getEventByID(data.eventID) };

    case "getEventByQRToken":
      return { success: true, data: getEventByQRToken(data.qrToken) };

    case "addEvent":
      return addEvent(token, data);

    case "updateEvent":
      return updateEvent(token, data.eventID, data);

    case "deleteEvent":
      return deleteEvent(token, data.eventID);

    case "toggleEventStatus":
      return toggleEventStatus(token, data.eventID);

    // ===== Participants =====
    case "getAllParticipants":
      return getAllParticipants();

    case "searchParticipants":
      return searchParticipants(data.query);

    case "addParticipant":
      return addParticipant(token, data);

    case "updateParticipant":
      return updateParticipant(token, data.PID, data);

    case "deleteParticipant":
      return deleteParticipant(token, data.PID);

    case "importParticipants":
      return importParticipantsFromCSV(token, data.csvData);

    // ===== Check-in / Check-out =====
    case "checkIn":
      return checkIn(data);

    case "checkOut":
      return checkOut(data);

    case "batchCheckOut":
      return batchCheckOut(token, data.eventID, data.pids, data.remark);

    case "checkInByQR":
      return checkInByQR(data.qrToken, data.pid, data.deviceInfo);

    case "registerAndCheckIn":
      return registerAndCheckIn(data);

    case "searchParticipantForPublicCheckout":
      return searchParticipantForPublicCheckout(data.eventID, data.query);

    case "updateAndCheckOutPublic":
      return updateAndCheckOutPublic(data);

    // ===== Dashboard & Reports =====
    case "getDashboardStats":
      return getDashboardStats(data.eventID);

    case "getAttendanceByEvent":
      return getAttendanceByEvent(data.eventID);

    case "getFullAttendanceReport":
      return getFullAttendanceReport(token, data.eventID);

    // ===== Export =====
    case "exportAttendanceCSV":
      return exportAttendanceCSV(token, data.eventID);

    case "exportFullReportCSV":
      return exportFullReportCSV(token, data.eventID);

    // ===== System Config =====
    case "getSystemConfig":
      return { success: true, data: getSystemConfig() };

    case "updateSystemConfig":
      return updateSystemConfig(data);

    case "setupSystem":
      return { success: true, message: setupSystem() };

    case "getWebAppUrl":
      return { success: true, url: getWebAppUrl() };

    case "getQRCodeUrl":
      return {
        success: true,
        url: generateQRCodeUrl(data.token),
        imageUrl: getQRCodeImageUrl(generateQRCodeUrl(data.token), 300)
      };

    default:
      return { success: false, message: "Unknown action: " + action };
  }
}

/**
 * serveMainApp() — แสดง Main App HTML
 */
function serveMainApp() {
  const template = HtmlService.createTemplateFromFile("Index");
  template.appUrl = getWebAppUrl();
  template.config = JSON.stringify(getSystemConfig());
  template.qrMode = false;
  template.qrToken = "";
  template.qrEvent = "null";

  return template.evaluate()
    .setTitle("Check-in / Check-out ระบบการประชุม อบรม สัมมนา")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0");
}

/**
 * serveQRCheckIn(qrToken) — แสดงหน้า Check-in ผ่าน QR Code
 */
function serveQRCheckIn(qrToken) {
  const event = getEventByQRToken(qrToken);
  const template = HtmlService.createTemplateFromFile("Index");
  template.appUrl = getWebAppUrl();
  template.config = JSON.stringify(getSystemConfig());
  template.qrMode = true;
  template.qrToken = qrToken;
  template.qrEvent = event ? JSON.stringify(event) : "null";

  return template.evaluate()
    .setTitle("QR Check-in — " + (event ? event.EventName : "ไม่พบกิจกรรม"))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0");
}

/**
 * include(filename) — ใช้สำหรับ <?!= include('filename') ?> ใน HTML Template
 * ใช้ getRawContent() แทน getContent() เพื่อป้องกันไม่ให้ Google Apps Script 
 * ทำการ sanitize แก้ไขโค้ด JavaScript ที่อยู่ใน script tags
 * @param {string} filename
 * @returns {string} — Raw HTML/JS/CSS content
 */
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).getRawContent();
}

/**
 * servePublicEvent(eventID) — แสดงหน้า Check-in สำหรับบุคคลภายนอกผ่าน Event ID
 */
function servePublicEvent(eventID) {
  const event = getEventByID(eventID);
  const template = HtmlService.createTemplateFromFile("Index");
  template.appUrl = getWebAppUrl();
  template.config = JSON.stringify(getSystemConfig());
  template.qrMode = true;
  template.qrToken = event ? event.QRToken : "";
  template.qrEvent = event ? JSON.stringify(event) : "null";

  return template.evaluate()
    .setTitle("ลงทะเบียนเข้าร่วม — " + (event ? event.EventName : "ไม่พบกิจกรรม"))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0");
}
