# ระบบลงทะเบียนการอบรม/ประชุม/สัมมนา (Check-in / Check-out By Watpon NAN1)

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)](https://sheets.google.com)
[![Bootstrap 5](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

ระบบบริหารจัดการการลงทะเบียน บันทึกเวลาเข้าร่วม (Check-in) และเวลาเสร็จสิ้น (Check-out) สำหรับการประชุม อบรม และสัมมนา พัฒนาด้วย Google Apps Script ร่วมกับ Google Sheets ทำงานในรูปแบบ Single Page Application (SPA) ที่ทันสมัย รองรับการใช้งานทั้งบนคอมพิวเตอร์ แท็บเล็ต และสมาร์ตโฟน

> 📖 **เอกสารทางเทคนิคและสถาปัตยกรรมระบบฉบับสมบูรณ์**: อ่านเพิ่มเติมได้ที่ [SYSTEM_SUMMARY.md](SYSTEM_SUMMARY.md)

---

## ✨ คุณสมบัติเด่นของระบบ (Key Features)

- 📅 **ระบบจัดการกิจกรรม (Multi-Event Management)**:
  - สร้าง แก้ไข และลบกิจกรรมการประชุม/อบรม
  - เปิด-ปิดการรับลงทะเบียนแยกตามกิจกรรม
  - สร้าง QR Code ประจำกิจกรรมอัตโนมัติสำหรับติดหน้าห้องประชุม
- 👥 **ระบบทะเบียนผู้เข้าร่วม (Participant Management)**:
  - จัดการรายชื่อผู้เข้าร่วมล่วงหน้า พร้อมระบบค้นหาอัจฉริยะ (ชื่อ, เบอร์โทร, สังกัด, PID)
  - นำเข้ารายชื่อผู้เข้าร่วมจำนวนมากผ่านไฟล์ CSV
  - ระบบลงทะเบียนหน้างานแบบเร่งด่วน (Self-registration)
- ⏱️ **ระบบบันทึกเวลา Check-in / Check-out**:
  - Check-in ผ่านกล้องสแกน QR Code (HTML5 QR Scanner)
  - Check-in ด้วยการค้นหาชื่อหรือเบอร์โทรศัพท์
  - Check-in ผ่านการสแกน QR Code ประจำงานด้วยสมาร์ตโฟนของผู้เข้าร่วม
  - Check-out รายบุคคล พร้อมคำนวณระยะเวลาการเข้าร่วมให้อัตโนมัติ
  - **Batch Check-out**: ฟังก์ชันเช็คเอาต์ผู้เข้าร่วมพร้อมกันหลายคนหรือทั้งโครงการ
  - บันทึกพิกัด GPS, ชนิดอุปกรณ์, และเว็บเบราว์เซอร์ เพื่อความโปร่งใส
- 📊 **แดชบอร์ดสรุปผลแบบ Real-time (Analytics Dashboard)**:
  - การ์ดสถิติสรุปยอด: ผู้ลงทะเบียนทั้งหมด, เช็คอินแล้ว, เช็คเอาต์แล้ว, ยังไม่มา, อยู่ในงาน
  - กราฟเส้นแสดงสถิติการเช็คอินรายชั่วโมง
  - กราฟวงกลมแสดงสัดส่วนสถานะการเข้าร่วม
  - กราฟแท่งจำแนกตามหน่วยงาน / โรงเรียน / องค์กรต้นสังกัด
- 📑 **ระบบส่งออกรายงาน (Export CSV)**:
  - ส่งออกใบลงนามรับเงินค่าพาหนะ/เบี้ยเลี้ยงตามแบบฟอร์มมาตรฐานของหน่วยงานราชการ
  - ส่งออกรายงานสรุปการเข้าร่วมฉบับสมบูรณ์
  - รองรับ UTF-8 with BOM สำหรับเปิดใน Microsoft Excel ภาษาไทยได้ทันที

---

## 🗂️ โครงสร้างไฟล์ในระบบ

```
├── Config.gs               # ค่าคงที่ โครงสร้างตาราง และการตั้งค่าระบบ
├── Auth.gs                 # ระบบความปลอดภัย Login และ Session Token
├── Sheet.gs                # โมดูลติดต่อและจัดการฐานข้อมูล Google Sheets
├── Attendance.gs           # ตรรกะการประมวลผล Check-in/Out และ Dashboard
├── Export.gs               # โมดูลสร้างและส่งออกไฟล์ CSV มาตรฐาน
├── Utility.gs              # ฟังก์ชันช่วยเหลือ การตรวจสอบอุปกรณ์ และความปลอดภัย
├── Code.gs                 # จุดเชื่อมต่อหลัก (doGet, doPost, apiGateway)
│
├── Index.html              # โครงสร้างหน้าหลัก (SPA Template)
├── Style.html              # สไตล์ CSS และธีมของระบบ
├── Dashboard.html          # หน้าจอแสดงแดชบอร์ดและกราฟสถิติ
├── Admin.html              # หน้าจัดการกิจกรรมและผู้เข้าร่วมสำหรับแอดมิน
├── Attendance-html.html    # หน้าบันทึกเวลา เช็คอิน/เอาต์ และกล้องสแกน
├── Export-html.html        # หน้าส่งออกรายงานและแบบฟอร์ม
├── Script-html.html        # สคริปต์ JavaScript ฝั่งหน้าบ้าน (Client Logic)
│
├── appsscript.json         # Manifest ตั้งค่าการ Deploy ของ Google Apps Script
├── vercel_index.html       # Standalone HTML รวมไฟล์สำหรับโฮสต์ภายนอก (Vercel)
└── SYSTEM_SUMMARY.md       # สรุปโครงสร้างเชิงเทคนิคและสเปก API
```

---

## 🚀 ขั้นตอนการติดตั้งและการนำไปใช้งาน

1. **สร้าง Google Sheets**:
   - สร้าง Google Sheets เปล่าขึ้นมา 1 ไฟล์
   - ไปที่ **Extensions (ส่วนขยาย)** ➔ **Apps Script**
2. **คัดลอกไฟล์**:
   - นำไฟล์โค้ด `.gs` และไฟล์ `.html` ทั้งหมดไปวางใน Apps Script Editor
3. **ตั้งค่าเริ่มต้น (First-time Setup)**:
   - เปิดไฟล์ `Config.gs` ปรับแก้ `SPREADSHEET_ID` ให้ตรงกับ Spreadsheet ของท่าน (หากปล่อยว่างจะใช้ Sheet ปัจจุบัน)
   - เลือกฟังก์ชัน `setupSystem()` แล้วกด **Run (เรียกใช้)** 1 ครั้ง เพื่อให้ระบบสร้างตาราง `Event`, `Participants`, `Attendance`, `Config` และหัวคอลัมน์อัตโนมัติ
4. **Deploy Web App**:
   - กดปุ่ม **Deploy (การทำให้ใช้งานได้)** ➔ **New deployment (การทำให้ใช้งานได้ใหม่)**
   - เลือกประเภท **Web app (เว็บแอป)**
   - ตั้งค่า Execute as: **Me (ฉัน)**
   - ตั้งค่า Who has access: **Anyone (ทุกคน)**
   - กด **Deploy** และคัดลอก Web App URL เพื่อเริ่มใช้งาน

---

## 🔒 ข้อมูลการเข้าสู่ระบบเริ่มต้น

- **ชื่อผู้ใช้ (Username)**: `admin`
- **รหัสผ่าน (Password)**: `admin1234`
*(สามารถเปลี่ยนแปลงได้ผ่านเมนูการตั้งค่าในหน้าผู้ดูแลระบบ หรือแก้ไขใน Sheet Config)*

---

## 📄 ลิขสิทธิ์ (License)

โครงการนี้เผยแพร่ภายใต้ลิขสิทธิ์ [MIT License](LICENSE) สามารถนำไปใช้งาน ปรับปรุง และพัฒนาต่อยอดได้อย่างอิสระเพื่อประโยชน์ทางการศึกษาและการทำงานของหน่วยงาน
