// ============================================================
// Sheet.gs
// ระบบ Check-in / Check-out สำหรับการประชุม อบรม สัมมนา
// ไฟล์: จัดการข้อมูล Google Sheets (CRUD สำหรับทุก Sheet)
// ============================================================

// ============================================================
// ส่วนที่ 1: จัดการ Sheet Event (กิจกรรม)
// ============================================================

function getAllEvents() {
  try {
    const sheet = getSheet(CONFIG.SHEET_EVENT);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, data: [] };
    const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const events = data
      .filter(row => row[0] && row[9] !== "deleted")
      .map(row => ({
        EventID: row[0], EventName: row[1],
        Date: row[2] ? formatDate(row[2]) : "",
        StartTime: row[3] ? formatTime(row[3]) : "",
        EndTime: row[4] ? formatTime(row[4]) : "",
        Location: row[5], Description: row[6],
        QRCodeToken: row[7],
        CreatedAt: row[8] ? formatDateTime(row[8]) : "",
        Status: row[9] || "active"
      }));
    return { success: true, data: events };
  } catch (e) {
    return { success: false, message: e.message, data: [] };
  }
}

function getEventByID(eventID) {
  try {
    const sheet = getSheet(CONFIG.SHEET_EVENT);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return null;
    const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const row = data.find(r => r[0] === eventID && r[9] !== "deleted");
    if (!row) return null;
    return {
      EventID: row[0], EventName: row[1],
      Date: row[2] ? formatDate(row[2]) : "",
      StartTime: row[3] ? formatTime(row[3]) : "",
      EndTime: row[4] ? formatTime(row[4]) : "",
      Location: row[5], Description: row[6],
      QRCodeToken: row[7],
      CreatedAt: row[8] ? formatDateTime(row[8]) : "",
      Status: row[9] || "active"
    };
  } catch (e) { return null; }
}

function getEventByQRToken(token) {
  try {
    const sheet = getSheet(CONFIG.SHEET_EVENT);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return null;
    const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const row = data.find(r => r[7] === token && r[9] !== "deleted");
    if (!row) return null;
    return {
      EventID: row[0], EventName: row[1],
      Date: row[2] ? formatDate(row[2]) : "",
      StartTime: row[3] ? formatTime(row[3]) : "",
      EndTime: row[4] ? formatTime(row[4]) : "",
      Location: row[5], Description: row[6],
      QRCodeToken: row[7], Status: row[9] || "active"
    };
  } catch (e) { return null; }
}

function addEvent(token, eventData) {
  if (!isAuthenticated(token)) return { success: false, message: "Session หมดอายุ" };
  try {
    const sheet = getSheet(CONFIG.SHEET_EVENT);
    const eventID = generateID("EVT");
    const qrToken = generateQRToken();
    sheet.appendRow([
      eventID, eventData.EventName || "",
      eventData.Date || "", eventData.StartTime || "",
      eventData.EndTime || "", eventData.Location || "",
      eventData.Description || "", qrToken, new Date(), "active"
    ]);
    return { success: true, message: "เพิ่มกิจกรรมสำเร็จ", eventID: eventID, qrToken: qrToken };
  } catch (e) { return { success: false, message: e.message }; }
}

function updateEvent(token, eventID, eventData) {
  if (!isAuthenticated(token)) return { success: false, message: "Session หมดอายุ" };
  try {
    const sheet = getSheet(CONFIG.SHEET_EVENT);
    const lastRow = sheet.getLastRow();
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let rowIndex = -1;
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === eventID) { rowIndex = i + 2; break; }
    }
    if (rowIndex === -1) return { success: false, message: "ไม่พบกิจกรรม" };
    sheet.getRange(rowIndex, 2).setValue(eventData.EventName || "");
    sheet.getRange(rowIndex, 3).setValue(eventData.Date || "");
    sheet.getRange(rowIndex, 4).setValue(eventData.StartTime || "");
    sheet.getRange(rowIndex, 5).setValue(eventData.EndTime || "");
    sheet.getRange(rowIndex, 6).setValue(eventData.Location || "");
    sheet.getRange(rowIndex, 7).setValue(eventData.Description || "");
    return { success: true, message: "แก้ไขกิจกรรมสำเร็จ" };
  } catch (e) { return { success: false, message: e.message }; }
}

function deleteEvent(token, eventID) {
  if (!isAuthenticated(token)) return { success: false, message: "Session หมดอายุ" };
  try {
    const sheet = getSheet(CONFIG.SHEET_EVENT);
    const lastRow = sheet.getLastRow();
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === eventID) {
        sheet.getRange(i + 2, 10).setValue("deleted");
        return { success: true, message: "ลบกิจกรรมสำเร็จ" };
      }
    }
    return { success: false, message: "ไม่พบกิจกรรม" };
  } catch (e) { return { success: false, message: e.message }; }
}

function toggleEventStatus(token, eventID) {
  if (!isAuthenticated(token)) return { success: false, message: "Session หมดอายุ" };
  try {
    const sheet = getSheet(CONFIG.SHEET_EVENT);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: "ไม่พบกิจกรรม" };
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let rowIndex = -1;
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === eventID) { rowIndex = i + 2; break; }
    }
    if (rowIndex === -1) return { success: false, message: "ไม่พบกิจกรรม" };
    
    const currentStatus = sheet.getRange(rowIndex, 10).getValue() || "active";
    const newStatus = currentStatus === "closed" ? "active" : "closed";
    sheet.getRange(rowIndex, 10).setValue(newStatus);
    return { success: true, message: `เปลี่ยนสถานะเป็น ${newStatus === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน"} สำเร็จ`, status: newStatus };
  } catch (e) { return { success: false, message: e.message }; }
}

// ============================================================
// ส่วนที่ 2: จัดการ Sheet Participants (ผู้เข้าร่วม)
// ============================================================

function getAllParticipants() {
  try {
    const sheet = getSheet(CONFIG.SHEET_PARTICIPANTS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, data: [] };
    const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const participants = data
      .filter(row => row[0] && row[9] !== "deleted")
      .map(row => ({
        PID: row[0], Title: row[1],
        FirstName: row[2], LastName: row[3],
        FullName: `${row[1]}${row[2]} ${row[3]}`,
        Organization: row[4], Position: row[5],
        Email: row[6], Phone: row[7],
        CreatedAt: row[8] ? formatDateTime(row[8]) : "",
        Status: row[9] || "active"
      }));
    return { success: true, data: participants };
  } catch (e) { return { success: false, message: e.message, data: [] }; }
}

function searchParticipants(query) {
  try {
    const result = getAllParticipants();
    if (!result.success) return result;
    const q = query.toLowerCase().trim();
    const filtered = result.data.filter(p => {
      const pid = String(p.PID || "").toLowerCase();
      const firstName = String(p.FirstName || "").toLowerCase();
      const lastName = String(p.LastName || "").toLowerCase();
      const fullName = String(p.FullName || "").toLowerCase();
      const phone = String(p.Phone || "").toLowerCase();
      const org = String(p.Organization || "").toLowerCase();
      
      return pid.includes(q) ||
             firstName.includes(q) ||
             lastName.includes(q) ||
             fullName.includes(q) ||
             phone.includes(q) ||
             org.includes(q);
    });
    return { success: true, data: filtered };
  } catch (e) { return { success: false, message: e.message, data: [] }; }
}

function getParticipantByPID(pid) {
  try {
    const sheet = getSheet(CONFIG.SHEET_PARTICIPANTS);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return null;
    const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const row = data.find(r => r[0] === pid && r[9] !== "deleted");
    if (!row) return null;
    return {
      PID: row[0], Title: row[1], FirstName: row[2], LastName: row[3],
      FullName: `${row[1]}${row[2]} ${row[3]}`,
      Organization: row[4], Position: row[5],
      Email: row[6], Phone: row[7], Status: row[9] || "active"
    };
  } catch (e) { return null; }
}

function addParticipant(token, participantData) {
  if (!isAuthenticated(token)) return { success: false, message: "Session หมดอายุ" };
  try {
    const sheet = getSheet(CONFIG.SHEET_PARTICIPANTS);
    const pid = generateID("PID");
    sheet.appendRow([
      pid, participantData.Title || "",
      participantData.FirstName || "", participantData.LastName || "",
      participantData.Organization || "", participantData.Position || "",
      participantData.Email || "", formatPhoneForSheet(participantData.Phone),
      new Date(), "active"
    ]);
    return { success: true, message: "เพิ่มผู้เข้าร่วมสำเร็จ", pid: pid };
  } catch (e) { return { success: false, message: e.message }; }
}

function updateParticipant(token, pid, data) {
  if (!isAuthenticated(token)) return { success: false, message: "Session หมดอายุ" };
  try {
    const sheet = getSheet(CONFIG.SHEET_PARTICIPANTS);
    const lastRow = sheet.getLastRow();
    const pids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let rowIndex = -1;
    for (let i = 0; i < pids.length; i++) {
      if (pids[i][0] === pid) { rowIndex = i + 2; break; }
    }
    if (rowIndex === -1) return { success: false, message: "ไม่พบผู้เข้าร่วม" };
    sheet.getRange(rowIndex, 2).setValue(data.Title || "");
    sheet.getRange(rowIndex, 3).setValue(data.FirstName || "");
    sheet.getRange(rowIndex, 4).setValue(data.LastName || "");
    sheet.getRange(rowIndex, 5).setValue(data.Organization || "");
    sheet.getRange(rowIndex, 6).setValue(data.Position || "");
    sheet.getRange(rowIndex, 7).setValue(data.Email || "");
    sheet.getRange(rowIndex, 8).setValue(formatPhoneForSheet(data.Phone));
    return { success: true, message: "แก้ไขข้อมูลสำเร็จ" };
  } catch (e) { return { success: false, message: e.message }; }
}

function deleteParticipant(token, pid) {
  if (!isAuthenticated(token)) return { success: false, message: "Session หมดอายุ" };
  try {
    const sheet = getSheet(CONFIG.SHEET_PARTICIPANTS);
    const lastRow = sheet.getLastRow();
    const pids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < pids.length; i++) {
      if (pids[i][0] === pid) {
        sheet.getRange(i + 2, 10).setValue("deleted");
        return { success: true, message: "ลบผู้เข้าร่วมสำเร็จ" };
      }
    }
    return { success: false, message: "ไม่พบผู้เข้าร่วม" };
  } catch (e) { return { success: false, message: e.message }; }
}

// ============================================================
// ส่วนที่ 3: จัดการ Sheet Attendance (การเข้าร่วม)
// ============================================================

function getAttendanceByEvent(eventID) {
  try {
    const sheet = getSheet(CONFIG.SHEET_ATTENDANCE);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, data: [] };
    const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
    const attendance = data
      .filter(row => row[0] && row[1] === eventID)
      .map(row => ({
        PID: row[0], EventID: row[1],
        CheckInTime: row[2] ? formatDateTime(row[2]) : "",
        CheckOutTime: row[3] ? formatDateTime(row[3]) : "",
        Latitude: row[4], Longitude: row[5],
        Browser: row[6], Device: row[7], IP: row[8],
        Status: row[9] || "checked-in",
        Remark: row[10], Duration: row[11]
      }));
    return { success: true, data: attendance };
  } catch (e) { return { success: false, message: e.message, data: [] }; }
}

function getAttendanceRecord(pid, eventID) {
  try {
    const sheet = getSheet(CONFIG.SHEET_ATTENDANCE);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return null;
    const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(pid) && String(data[i][1]) === String(eventID)) {
        return {
          rowIndex: i + 2, PID: data[i][0], EventID: data[i][1],
          CheckInTime: data[i][2], CheckOutTime: data[i][3], Status: data[i][9]
        };
      }
    }
    return null;
  } catch (e) { return null; }
}

function getAllAttendance() {
  try {
    const sheet = getSheet(CONFIG.SHEET_ATTENDANCE);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, data: [] };
    const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
    const attendance = data
      .filter(row => row[0])
      .map(row => ({
        PID: row[0], EventID: row[1],
        CheckInTime: row[2] ? formatDateTime(row[2]) : "",
        CheckOutTime: row[3] ? formatDateTime(row[3]) : "",
        Latitude: row[4], Longitude: row[5],
        Browser: row[6], Device: row[7], IP: row[8],
        Status: row[9] || "checked-in",
        Remark: row[10], Duration: row[11]
      }));
    return { success: true, data: attendance };
  } catch (e) { return { success: false, message: e.message, data: [] }; }
}
