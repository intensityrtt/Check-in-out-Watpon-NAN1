// ============================================================
// Attendance.gs
// ระบบ Check-in / Check-out สำหรับการประชุม อบรม สัมมนา
// ไฟล์: ระบบ Check-in และ Check-out
// ============================================================

/**
 * checkIn(params) — ดำเนินการ Check-in
 * @param {Object} params — {pid, eventID, latitude, longitude, browser, device, ip, remark}
 * @returns {Object} — {success, message, data}
 */
function checkIn(params) {
  try {
    const { pid, eventID, latitude, longitude, browser, device, ip, remark } = params;

    // ตรวจสอบว่ามีผู้เข้าร่วมและกิจกรรมอยู่จริง
    const participant = getParticipantByPID(pid);
    if (!participant) {
      return { success: false, message: "ไม่พบผู้เข้าร่วม PID: " + pid };
    }

    const event = getEventByID(eventID);
    if (!event) {
      return { success: false, message: "ไม่พบกิจกรรม" };
    }

    if (event.Status === "closed") {
      return { success: false, message: "กิจกรรมนี้ปิดระบบ Check-in แล้ว" };
    }

    // ตรวจสอบว่าเคย Check-in แล้วหรือยัง
    const existing = getAttendanceRecord(pid, eventID);
    if (existing) {
      // ถ้าเคย Check-in แล้ว ส่งข้อมูลกลับ
      return {
        success: false,
        alreadyCheckedIn: true,
        message: `${participant.FullName} ได้ Check-in แล้วเมื่อ ${formatDateTime(existing.CheckInTime)}`,
        participant: participant
      };
    }

    // บันทึก Check-in
    const sheet = getSheet(CONFIG.SHEET_ATTENDANCE);
    const now = new Date();

    sheet.appendRow([
      pid,              // PID
      eventID,          // EventID
      now,              // CheckInTime
      "",               // CheckOutTime (ว่างไว้)
      latitude || "",   // Latitude
      longitude || "",  // Longitude
      browser || "",    // Browser
      device || "",     // Device
      ip || "",         // IP
      "checked-in",     // Status
      remark || "",     // Remark
      ""                // Duration (คำนวณตอน Check-out)
    ]);

    Logger.log(`✅ Check-in: ${pid} — ${participant.FullName} — Event: ${eventID}`);

    return {
      success: true,
      message: `Check-in สำเร็จ! ยินดีต้อนรับ ${participant.FullName}`,
      data: {
        participant: participant,
        event: event,
        checkInTime: formatDateTime(now)
      }
    };
  } catch (e) {
    Logger.log("Error checkIn: " + e.message);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

/**
 * checkOut(params) — ดำเนินการ Check-out
 * @param {Object} params — {pid, eventID, remark}
 * @returns {Object} — {success, message, data}
 */
function checkOut(params) {
  try {
    const { pid, eventID, remark } = params;

    // ตรวจสอบผู้เข้าร่วม
    const participant = getParticipantByPID(pid);
    if (!participant) {
      return { success: false, message: "ไม่พบผู้เข้าร่วม PID: " + pid };
    }

    // ตรวจสอบว่า Check-in แล้วหรือยัง
    const record = getAttendanceRecord(pid, eventID);
    if (!record) {
      return { success: false, message: `${participant.FullName} ยังไม่ได้ Check-in` };
    }

    // ตรวจสอบว่า Check-out แล้วหรือยัง
    if (record.Status === "checked-out" && record.CheckOutTime) {
      return {
        success: false,
        alreadyCheckedOut: true,
        message: `${participant.FullName} ได้ Check-out แล้ว`
      };
    }

    // คำนวณระยะเวลา
    const now = new Date();
    const duration = calculateDuration(record.CheckInTime, now);

    // อัปเดตข้อมูล Check-out
    const sheet = getSheet(CONFIG.SHEET_ATTENDANCE);
    sheet.getRange(record.rowIndex, 4).setValue(now);           // CheckOutTime
    sheet.getRange(record.rowIndex, 10).setValue("checked-out"); // Status
    sheet.getRange(record.rowIndex, 12).setValue(duration);     // Duration
    if (remark) {
      sheet.getRange(record.rowIndex, 11).setValue(remark);
    }

    Logger.log(`✅ Check-out: ${pid} — ${participant.FullName} — ระยะเวลา: ${duration}`);

    return {
      success: true,
      message: `Check-out สำเร็จ! ขอบคุณ ${participant.FullName}`,
      data: {
        participant: participant,
        checkInTime: formatDateTime(record.CheckInTime),
        checkOutTime: formatDateTime(now),
        duration: duration
      }
    };
  } catch (e) {
    Logger.log("Error checkOut: " + e.message);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

/**
 * checkInByQR(qrToken, pid) — Check-in ผ่าน QR Code
 * @param {string} qrToken — Token ใน QR Code
 * @param {string} pid — PID ของผู้เข้าร่วม
 * @param {Object} deviceInfo — {browser, device, ip}
 * @returns {Object} — {success, message}
 */
function checkInByQR(qrToken, pid, deviceInfo) {
  const event = getEventByQRToken(qrToken);
  if (!event) {
    return { success: false, message: "QR Code ไม่ถูกต้องหรือหมดอายุ" };
  }

  return checkIn({
    pid: pid,
    eventID: event.EventID,
    browser: deviceInfo ? deviceInfo.browser : "",
    device: deviceInfo ? deviceInfo.device : "",
    ip: deviceInfo ? deviceInfo.ip : ""
  });
}

/**
 * getDashboardStats(eventID) — สรุปสถิติสำหรับ Dashboard
 * @param {string} eventID — Event ที่เลือก (ถ้าไม่ระบุจะดึงทั้งหมด)
 * @returns {Object} — {success, stats}
 */
function getDashboardStats(eventID) {
  try {
    const participantsResult = getAllParticipants();
    const totalParticipants = participantsResult.success ? participantsResult.data.length : 0;

    let attendanceData = [];
    if (eventID) {
      const result = getAttendanceByEvent(eventID);
      attendanceData = result.success ? result.data : [];
    } else {
      const result = getAllAttendance();
      attendanceData = result.success ? result.data : [];
    }

    const checkedIn = attendanceData.filter(a => a.Status === "checked-in" || a.Status === "checked-out").length;
    const checkedOut = attendanceData.filter(a => a.Status === "checked-out").length;
    const notCheckedOut = attendanceData.filter(a => a.Status === "checked-in").length;
    const notArrived = totalParticipants - checkedIn;

    // สถิติ Check-in รายชั่วโมง (สำหรับ Line Chart)
    const hourlyData = buildHourlyData(attendanceData);

    // สถิติรายองค์กร (สำหรับ Bar Chart)
    const orgData = buildOrgData(attendanceData, participantsResult.data || []);

    return {
      success: true,
      stats: {
        totalParticipants,
        checkedIn,
        checkedOut,
        notCheckedOut,
        notArrived: Math.max(0, notArrived),
        attendanceRate: totalParticipants > 0
          ? Math.round((checkedIn / totalParticipants) * 100)
          : 0
      },
      charts: {
        hourly: hourlyData,
        byOrg: orgData,
        pieData: [
          ["สถานะ", "จำนวน"],
          ["Check-out แล้ว", checkedOut],
          ["Check-in แล้ว (ยังอยู่)", notCheckedOut],
          ["ยังไม่มา", Math.max(0, notArrived)]
        ]
      }
    };
  } catch (e) {
    Logger.log("Error getDashboardStats: " + e.message);
    return { success: false, message: e.message };
  }
}

/**
 * buildHourlyData(attendanceData) — สร้างข้อมูล Check-in รายชั่วโมง
 */
function buildHourlyData(attendanceData) {
  const hourMap = {};
  for (const att of attendanceData) {
    if (att.CheckInTime) {
      try {
        const d = new Date(att.CheckInTime);
        const hour = d.getHours();
        const key = `${hour}:00`;
        hourMap[key] = (hourMap[key] || 0) + 1;
      } catch (e) {}
    }
  }
  const result = [["ชั่วโมง", "จำนวน Check-in"]];
  for (let h = 7; h <= 18; h++) {
    const key = `${h}:00`;
    result.push([key, hourMap[key] || 0]);
  }
  return result;
}

/**
 * buildOrgData(attendanceData, participants) — สร้างข้อมูลรายองค์กร
 */
function buildOrgData(attendanceData, participants) {
  const checkedInPIDs = new Set(attendanceData.map(a => a.PID));
  const orgMap = {};

  for (const p of participants) {
    const org = p.Organization || "ไม่ระบุ";
    if (!orgMap[org]) orgMap[org] = { total: 0, checkedIn: 0 };
    orgMap[org].total++;
    if (checkedInPIDs.has(p.PID)) orgMap[org].checkedIn++;
  }

  const result = [["องค์กร", "ลงทะเบียน", "Check-in"]];
  for (const [org, data] of Object.entries(orgMap)) {
    result.push([org, data.total, data.checkedIn]);
  }
  return result;
}

/**
 * getFullAttendanceReport(token, eventID) — รายงานการเข้าร่วมแบบเต็ม
 * รวมข้อมูลผู้เข้าร่วมและ Attendance
 */
function getFullAttendanceReport(token, eventID) {
  if (!isAuthenticated(token)) return { success: false, message: "Session หมดอายุ" };

  try {
    const participantsResult = getAllParticipants();
    const participants = participantsResult.success ? participantsResult.data : [];

    let attendanceData = [];
    if (eventID) {
      const result = getAttendanceByEvent(eventID);
      attendanceData = result.success ? result.data : [];
    } else {
      const result = getAllAttendance();
      attendanceData = result.success ? result.data : [];
    }

    // สร้าง Map จาก PID+EventID เป็น Attendance
    const attMap = {};
    for (const att of attendanceData) {
      const key = `${att.PID}_${att.EventID}`;
      attMap[key] = att;
    }

    // รวมข้อมูล
    const report = participants.map((p, index) => {
      const key = `${p.PID}_${eventID || ""}`;
      const att = eventID ? attMap[key] : null;

      // ถ้าไม่ระบุ Event ให้หาจาก attendance ทุกรายการ
      const attendances = eventID ? [att].filter(Boolean) :
        attendanceData.filter(a => a.PID === p.PID);

      return {
        no: index + 1,
        PID: p.PID,
        Title: p.Title,
        FirstName: p.FirstName,
        LastName: p.LastName,
        FullName: p.FullName,
        Organization: p.Organization,
        Position: p.Position,
        Phone: p.Phone,
        Email: p.Email,
        CheckInTime: att ? att.CheckInTime : (attendances[0] ? attendances[0].CheckInTime : ""),
        CheckOutTime: att ? att.CheckOutTime : (attendances[0] ? attendances[0].CheckOutTime : ""),
        Duration: att ? att.Duration : (attendances[0] ? attendances[0].Duration : ""),
        Status: att ? att.Status : (attendances.length > 0 ? attendances[0].Status : "not-arrived"),
        Browser: att ? att.Browser : "",
        Device: att ? att.Device : ""
      };
    });

    return { success: true, data: report };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * registerAndCheckIn(params) — ลงทะเบียนผู้เข้าร่วมใหม่และ Check-in ทันที
 * @param {Object} params — {eventID, participantData, checkinData}
 * @returns {Object} — {success, message, data}
 */
function registerAndCheckIn(params) {
  try {
    const { eventID, participantData, checkinData } = params;

    // ตรวจสอบสถานะกิจกรรม
    const event = getEventByID(eventID);
    if (!event) return { success: false, message: "ไม่พบกิจกรรม" };
    if (event.Status === "closed") return { success: false, message: "กิจกรรมนี้ปิดระบบ Check-in แล้ว" };

    const formattedPhone = formatPhoneForSheet(participantData.Phone);

    // 1. ค้นหาผู้เข้าร่วมจากเบอร์โทรศัพท์ในฐานข้อมูลหลัก (Participants) เพื่อป้องกันข้อมูลซ้ำซ้อนและแยกฐานข้อมูลรายกิจกรรมอย่างถูกต้อง
    let pid = null;
    let existingParticipantRowIndex = -1;
    const pSheet = getSheet(CONFIG.SHEET_PARTICIPANTS);
    const lastRow = pSheet.getLastRow();
    
    if (lastRow > 1) {
      const pData = pSheet.getRange(2, 1, lastRow - 1, 10).getValues();
      for (let i = 0; i < pData.length; i++) {
        const rowPhone = formatPhoneForSheet(pData[i][7]);
        if (rowPhone === formattedPhone && pData[i][9] !== "deleted") {
          pid = String(pData[i][0]);
          existingParticipantRowIndex = i + 2;
          break;
        }
      }
    }

    if (pid) {
      // ตรวจสอบว่าเคย Check-in ในกิจกรรมนี้ไปแล้วหรือยัง
      const existingRecord = getAttendanceRecord(pid, eventID);
      if (existingRecord) {
        if (existingRecord.Status === "checked-in") {
          return { success: false, message: `เบอร์โทรศัพท์นี้ได้ลงทะเบียนและ Check-in กิจกรรมนี้เรียบร้อยแล้ว` };
        } else if (existingRecord.Status === "checked-out") {
          return { success: false, message: `เบอร์โทรศัพท์นี้ได้ทำ Check-out ออกจากกิจกรรมนี้เรียบร้อยแล้ว` };
        }
      }

      // อัปเดตข้อมูลผู้เข้าร่วมที่มีอยู่แล้วให้เป็นปัจจุบัน (เผื่อสะกดผิดหรือเปลี่ยนหน่วยงาน)
      pSheet.getRange(existingParticipantRowIndex, 2).setValue(participantData.Title || "นาย");
      pSheet.getRange(existingParticipantRowIndex, 3).setValue(participantData.FirstName || "");
      pSheet.getRange(existingParticipantRowIndex, 4).setValue(participantData.LastName || "");
      pSheet.getRange(existingParticipantRowIndex, 5).setValue(participantData.Organization || "");
      pSheet.getRange(existingParticipantRowIndex, 6).setValue(participantData.Position || "");
      pSheet.getRange(existingParticipantRowIndex, 7).setValue(participantData.Email || "");
      pSheet.getRange(existingParticipantRowIndex, 8).setValue(formattedPhone);
    } else {
      // เพิ่มผู้เข้าร่วมรายใหม่กรณีไม่พบเบอร์โทรศัพท์เดิมในระบบ
      pid = generateID("PID");
      pSheet.appendRow([
        pid,
        participantData.Title || "นาย",
        participantData.FirstName || "",
        participantData.LastName || "",
        participantData.Organization || "",
        participantData.Position || "",
        participantData.Email || "",
        formattedPhone,
        new Date(), // CreatedAt
        "active"    // Status
      ]);
    }

    // 2. ดำเนินการ Check-in ในกิจกรรมเป้าหมาย
    const aSheet = getSheet(CONFIG.SHEET_ATTENDANCE);
    const now = new Date();

    aSheet.appendRow([
      pid,
      eventID,
      now,
      "", // CheckOutTime
      checkinData.latitude || "",
      checkinData.longitude || "",
      checkinData.browser || "",
      checkinData.device || "",
      checkinData.ip || "",
      "checked-in",
      checkinData.remark || "",
      "" // Duration
    ]);

    const fullName = `${participantData.Title || ""}${participantData.FirstName} ${participantData.LastName}`;
    Logger.log(`✅ Register & Check-in สำเร็จ: ${pid} — ${fullName} — Event: ${eventID}`);

    return {
      success: true,
      message: `ลงทะเบียนและ Check-in สำเร็จ! ยินดีต้อนรับ ${fullName}`,
      data: {
        pid: pid,
        fullName: fullName,
        checkInTime: formatDateTime(now)
      }
    };
  } catch (e) {
    Logger.log("Error registerAndCheckIn: " + e.message);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

/**
 * searchParticipantForPublicCheckout(eventID, query) — ค้นหาผู้เข้าร่วมเพื่อทำ Public Check-out
 * @param {string} eventID
 * @param {string} query
 * @returns {Object} — {success, data}
 */
function searchParticipantForPublicCheckout(eventID, query) {
  try {
    if (!eventID) {
      return { success: false, message: "ไม่ระบุรหัสกิจกรรม" };
    }
    if (!query || query.trim() === "") {
      return { success: false, message: "กรุณาระบุชื่อ นามสกุล หรือเบอร์โทรศัพท์เพื่อค้นหา" };
    }

    // 1. ดึงข้อมูล Attendance ทั้งหมดของ Event นี้
    const attendanceResult = getAttendanceByEvent(eventID);
    if (!attendanceResult.success || attendanceResult.data.length === 0) {
      return { success: false, message: "ยังไม่มีผู้ลงชื่อเข้าร่วมในกิจกรรมนี้" };
    }

    // สร้าง Map ของ PID ที่มีการ Check-in ใน Event นี้
    const attMap = {};
    attendanceResult.data.forEach(att => {
      attMap[String(att.PID)] = att;
    });

    // 2. ดึงข้อมูล Participants ทั้งหมดที่ตรงกับ query
    const participantsResult = searchParticipants(query);
    if (!participantsResult.success || participantsResult.data.length === 0) {
      return { success: false, message: "ไม่พบข้อมูลผู้ลงทะเบียนตามเงื่อนไขที่ระบุ" };
    }

    // 3. กรองเฉพาะผู้เข้าร่วมที่มีประวัติการเข้าร่วมใน Event นี้ (อยู่ใน attMap)
    const results = [];
    for (const p of participantsResult.data) {
      const attendance = attMap[String(p.PID)];
      if (!attendance) {
        // ข้ามผู้เข้าร่วมที่ไม่ได้เช็คอินในกิจกรรมนี้
        continue;
      }

      let status = "can-checkout";
      let checkInTimeStr = formatDateTime(attendance.CheckInTime);
      let checkOutTimeStr = "";

      if (attendance.Status === "checked-out" && attendance.CheckOutTime) {
        status = "checked-out";
        checkOutTimeStr = formatDateTime(attendance.CheckOutTime);
      }

      results.push({
        PID: p.PID,
        Title: p.Title,
        FirstName: p.FirstName,
        LastName: p.LastName,
        FullName: p.FullName,
        Organization: p.Organization,
        Position: p.Position,
        Phone: p.Phone,
        Email: p.Email,
        Status: status,
        CheckInTime: checkInTimeStr,
        CheckOutTime: checkOutTimeStr
      });
    }

    if (results.length === 0) {
      return { success: false, message: "พบชื่อผู้ลงทะเบียนในระบบ แต่ยังไม่ได้ทำการ Check-in เข้าร่วมกิจกรรมนี้" };
    }

    return { success: true, data: results };
  } catch (e) {
    Logger.log("Error searchParticipantForPublicCheckout: " + e.message);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

/**
 * updateAndCheckOutPublic(data) — อัปเดตข้อมูลผู้เข้าร่วมและทำ Check-out ทันที (สาธารณะ)
 * @param {Object} data — ข้อมูลฟอร์ม check-out {pid, eventID, title, firstName, ...}
 * @returns {Object} — {success, message}
 */
function updateAndCheckOutPublic(data) {
  try {
    const { pid, eventID, title, firstName, lastName, organization, position, phone, email, remark } = data;

    if (!pid || !eventID) {
      return { success: false, message: "ข้อมูลไม่ครบถ้วน (PID หรือ EventID หายไป)" };
    }

    // 1. อัปเดตข้อมูลผู้เข้าร่วม
    const pSheet = getSheet(CONFIG.SHEET_PARTICIPANTS);
    const pLastRow = pSheet.getLastRow();
    if (pLastRow <= 1) {
      return { success: false, message: "ไม่พบผู้เข้าร่วมลงทะเบียนในระบบ" };
    }
    const pids = pSheet.getRange(2, 1, pLastRow - 1, 1).getValues();
    let pRowIndex = -1;
    for (let i = 0; i < pids.length; i++) {
      if (pids[i][0] === pid) {
        pRowIndex = i + 2;
        break;
      }
    }
    if (pRowIndex === -1) {
      return { success: false, message: "ไม่พบผู้เข้าร่วมที่ต้องการแก้ไข" };
    }

    // อัปเดตข้อมูลใหม่ลงไป (ผู้ใช้อาจจะแก้ตัวสะกดเพื่อความถูกต้องของใบประกาศ)
    pSheet.getRange(pRowIndex, 2).setValue(title || "นาย");
    pSheet.getRange(pRowIndex, 3).setValue(firstName || "");
    pSheet.getRange(pRowIndex, 4).setValue(lastName || "");
    pSheet.getRange(pRowIndex, 5).setValue(organization || "");
    pSheet.getRange(pRowIndex, 6).setValue(position || "");
    pSheet.getRange(pRowIndex, 7).setValue(email || "");
    pSheet.getRange(pRowIndex, 8).setValue(formatPhoneForSheet(phone));

    // 2. ค้นหา Attendance Record
    const record = getAttendanceRecord(pid, eventID);
    if (!record) {
      const fullName = `${title || ""}${firstName} ${lastName}`;
      return { success: false, message: `${fullName} ยังไม่ได้ Check-in ในกิจกรรมนี้` };
    }

    if (record.Status === "checked-out" && record.CheckOutTime) {
      return { success: false, message: "ท่านได้ทำการ Check-out ไปเรียบร้อยแล้ว" };
    }

    // 3. ทำการบันทึก Check-out
    const now = new Date();
    const duration = calculateDuration(record.CheckInTime, now);

    const aSheet = getSheet(CONFIG.SHEET_ATTENDANCE);
    aSheet.getRange(record.rowIndex, 4).setValue(now);           // CheckOutTime
    aSheet.getRange(record.rowIndex, 10).setValue("checked-out"); // Status
    aSheet.getRange(record.rowIndex, 12).setValue(duration);     // Duration
    if (remark) {
      aSheet.getRange(record.rowIndex, 11).setValue(remark);
    }

    const fullName = `${title || ""}${firstName} ${lastName}`;
    Logger.log(`✅ Public Check-out สำเร็จ: ${pid} — ${fullName} — ระยะเวลา: ${duration}`);

    return {
      success: true,
      message: `Check-out สำเร็จ! ขอบคุณคุณ ${fullName} ที่เข้าร่วมกิจกรรม`,
      data: {
        fullName: fullName,
        checkInTime: formatDateTime(record.CheckInTime),
        checkOutTime: formatDateTime(now),
        duration: duration
      }
    };
  } catch (e) {
    Logger.log("Error updateAndCheckOutPublic: " + e.message);
    return { success: false, message: "เกิดข้อผิดพลาดในการ Check-out: " + e.message };
  }
}

/**
 * batchCheckOut(token, eventID, pids, remark) — ดำเนินการ Check-out เป็นกลุ่มสำหรับ Admin
 * @param {string} token
 * @param {string} eventID
 * @param {Array<string>} pids
 * @param {string} [remark]
 * @returns {Object} — {success, message, count}
 */
function batchCheckOut(token, eventID, pids, remark) {
  if (!isAuthenticated(token)) return { success: false, message: "Session หมดอายุ" };
  if (!eventID) return { success: false, message: "ไม่ระบุรหัสกิจกรรม" };
  if (!pids || !pids.length) return { success: false, message: "ไม่พบรายการที่จะ Check-out" };

  try {
    const sheet = getSheet(CONFIG.SHEET_ATTENDANCE);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: "ไม่พบข้อมูลการเข้าร่วม" };

    const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
    const pidSet = new Set(pids.map(String));
    const now = new Date();
    let successCount = 0;

    for (let i = 0; i < data.length; i++) {
      const rowPid = String(data[i][0]);
      const rowEventId = String(data[i][1]);
      const status = data[i][9];

      if (pidSet.has(rowPid) && rowEventId === String(eventID) && status === "checked-in") {
        const rowIndex = i + 2;
        const checkInTime = data[i][2];
        const duration = calculateDuration(checkInTime, now);

        sheet.getRange(rowIndex, 4).setValue(now);           // CheckOutTime
        sheet.getRange(rowIndex, 10).setValue("checked-out"); // Status
        sheet.getRange(rowIndex, 12).setValue(duration);     // Duration
        if (remark) {
          sheet.getRange(rowIndex, 11).setValue(remark);
        }
        successCount++;
      }
    }

    return {
      success: true,
      message: `ทำรายการ Check-out สำเร็จทั้งหมด ${successCount} รายการ`,
      count: successCount
    };
  } catch (e) {
    Logger.log("Error batchCheckOut: " + e.message);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}
