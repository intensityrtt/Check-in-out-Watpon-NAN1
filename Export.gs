// ============================================================
// Export.gs
// ระบบ Check-in / Check-out สำหรับการประชุม อบรม สัมมนา
// ไฟล์: ส่งออกข้อมูลเป็น CSV
// ============================================================

/**
 * exportAttendanceCSV(token, eventID) — Export ข้อมูลเป็น CSV ตาม Template
 * Template:
 *   Column 1: ที่ (ลำดับ)
 *   Column 2: ชื่อ-นามสกุล
 *   Column 3: (ว่าง)
 *   Column 4: บรรทัดที่ 1 (กำหนดจาก Settings)
 *   Column 5: บรรทัดที่ 2 (กำหนดจาก Settings)
 * @param {string} token — Session Token
 * @param {string} eventID — ID ของกิจกรรม (ถ้าว่างจะ export ทั้งหมด)
 * @returns {Object} — {success, csvContent, filename}
 */
function exportAttendanceCSV(token, eventID) {
  if (!isAuthenticated(token)) {
    return { success: false, message: "Session หมดอายุ" };
  }

  try {
    // ดึงค่า Config
    const config = getSystemConfig();
    const line1Text = config.CSV_LINE1 || "ลงชื่อรับเงินค่าพาหนะ";
    const line2Text = config.CSV_LINE2 || "จำนวน ............. บาท";

    // ดึงรายชื่อผู้เข้าร่วมที่ Check-in แล้ว
    let attendanceData = [];
    if (eventID) {
      const result = getAttendanceByEvent(eventID);
      attendanceData = result.success ? result.data : [];
    } else {
      const result = getAllAttendance();
      attendanceData = result.success ? result.data : [];
    }

    // ดึงข้อมูลผู้เข้าร่วมทั้งหมด
    const participantsResult = getAllParticipants();
    const participants = participantsResult.success ? participantsResult.data : [];

    // สร้าง Map PID -> Participant
    const pidMap = {};
    for (const p of participants) {
      pidMap[p.PID] = p;
    }

    // สร้างรายการผู้ Check-in แล้ว (เอาเฉพาะที่มีข้อมูลผู้เข้าร่วม)
    const checkedInList = [];
    const addedPIDs = new Set(); // ป้องกันซ้ำ

    for (const att of attendanceData) {
      if (!addedPIDs.has(att.PID) && pidMap[att.PID]) {
        checkedInList.push({
          pid: att.PID,
          participant: pidMap[att.PID],
          attendance: att
        });
        addedPIDs.add(att.PID);
      }
    }

    // สร้าง Header ของ CSV
    // ใช้ BOM สำหรับรองรับ UTF-8 ใน Excel ภาษาไทย
    const rows = [];

    // Header Row
    rows.push([
      "ที่",
      "ชื่อ-นามสกุล",
      "",
      line1Text,
      line2Text
    ]);

    // Data Rows
    checkedInList.forEach((item, index) => {
      const p = item.participant;
      const fullName = `${p.Title}${p.FirstName} ${p.LastName}`;
      rows.push([
        (index + 1).toString(),
        fullName,
        "",       // Column 3 ว่าง
        "",       // Column 4 ว่าง (เป็น Label row)
        ""        // Column 5 ว่าง
      ]);
    });

    // แปลงเป็น CSV String
    const csvContent = rows.map(row =>
      row.map(cell => {
        // ถ้ามี comma หรือ double quote ให้ wrap ด้วย quotes
        const str = String(cell || "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ).join("\n");

    // ชื่อไฟล์
    const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyyMMdd_HHmmss");
    const eventName = eventID ? (getEventByID(eventID)?.EventName || eventID) : "all";
    const filename = `attendance_${eventName}_${now}.csv`;

    Logger.log(`Export CSV: ${filename} — ${checkedInList.length} รายการ`);

    return {
      success: true,
      csvContent: "\uFEFF" + csvContent, // เพิ่ม BOM สำหรับ Excel
      filename: filename,
      count: checkedInList.length
    };
  } catch (e) {
    Logger.log("Error exportAttendanceCSV: " + e.message);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

/**
 * exportFullReportCSV(token, eventID) — Export รายงานเต็มรูปแบบ
 * รวมข้อมูล Check-in, Check-out, ระยะเวลา, อุปกรณ์ ฯลฯ
 * @param {string} token
 * @param {string} eventID
 * @returns {Object} — {success, csvContent, filename}
 */
function exportFullReportCSV(token, eventID) {
  if (!isAuthenticated(token)) {
    return { success: false, message: "Session หมดอายุ" };
  }

  try {
    const reportResult = getFullAttendanceReport(token, eventID);
    if (!reportResult.success) return reportResult;

    const data = reportResult.data;

    const header = [
      "ที่", "PID", "คำนำหน้า", "ชื่อ", "นามสกุล",
      "ชื่อ-นามสกุล", "องค์กร/หน่วยงาน", "ตำแหน่ง",
      "เบอร์โทร", "อีเมล",
      "เวลา Check-in", "เวลา Check-out",
      "ระยะเวลาเข้าร่วม", "สถานะ",
      "Browser", "Device"
    ];

    const rows = [header];

    for (const item of data) {
      const statusTH = {
        "checked-in": "Check-in แล้ว",
        "checked-out": "Check-out แล้ว",
        "not-arrived": "ยังไม่มา"
      }[item.Status] || item.Status;

      rows.push([
        item.no.toString(),
        item.PID,
        item.Title || "",
        item.FirstName || "",
        item.LastName || "",
        item.FullName,
        item.Organization,
        item.Position,
        item.Phone,
        item.Email,
        item.CheckInTime,
        item.CheckOutTime,
        item.Duration,
        statusTH,
        item.Browser,
        item.Device
      ]);
    }

    const csvContent = rows.map(row =>
      row.map(cell => {
        const str = String(cell || "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ).join("\n");

    const now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyyMMdd_HHmmss");
    const filename = `full_report_${eventID || "all"}_${now}.csv`;

    return {
      success: true,
      csvContent: "\uFEFF" + csvContent,
      filename: filename,
      count: data.length
    };
  } catch (e) {
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}
