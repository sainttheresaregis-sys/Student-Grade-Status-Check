# คู่มือติดตั้งและเผยแพร่

คู่มือนี้แบ่งเป็นสองส่วน: Google Apps Script สำหรับอ่านชีตส่วนตัว และ GitHub Pages สำหรับหน้าเว็บสาธารณะ

## 1. เตรียม Google Sheet

ตรวจสอบว่าแถวแรกมีหัวคอลัมน์ต่อไปนี้:

- `รหัสประจำตัวนักเรียน` — ระบบรองรับหัวเดิม `รหัสประจำนนักเรียน` ด้วย
- `ชื่อ - นามสกุล`
- `ชั้น`
- `รายวิชา`
- `ผลการเรียน`

เก็บค่าในคอลัมน์ผลการเรียนเป็น `ร` หรือ `0` เท่านั้นสำหรับรายการที่ต้องประกาศ ไม่ต้องคัดลอกข้อมูลหรือ CSV เข้า GitHub

ในช่วงติดตั้งให้คงสิทธิ์เดิมของชีตไว้ก่อน เมื่อทดสอบ Apps Script สำเร็จแล้วจึงเปลี่ยน General access ของชีตเป็น **Restricted**

## 2. สร้าง Google Apps Script

1. เปิด [script.google.com](https://script.google.com/) ด้วยบัญชีโรงเรียนและสร้างโปรเจกต์ใหม่
2. คัดลอกเนื้อหาจาก `apps-script/Code.gs` ไปแทนไฟล์ `Code.gs`
3. ใน Project Settings เปิดการแสดงไฟล์ manifest แล้วคัดลอก `apps-script/appsscript.json` ไปยัง `appsscript.json`
4. หากสร้าง Apps Script จากเมนู **ส่วนขยาย → Apps Script** ภายในชีต ระบบจะใช้ชีตนี้และแท็บแรกโดยอัตโนมัติ ไม่ต้องตั้งค่า Script properties
5. สำหรับโปรเจกต์ Apps Script แบบแยกอิสระเท่านั้น ให้เพิ่ม `SPREADSHEET_ID` และ `SHEET_NAME` ใน Project Settings → Script properties
6. บันทึก แล้วเลือกฟังก์ชัน `verifyConfiguration` จากแถบเครื่องมือและกด **Run** หนึ่งครั้ง
7. อนุญาตสิทธิ์อ่านชีตเมื่อ Google แสดงหน้าขอสิทธิ์ จากนั้นตรวจว่า Execution log แสดงผลลัพธ์ `พร้อมใช้งาน`

ฟังก์ชัน `verifyConfiguration` จะเปิดชีตจริง ตรวจชื่อแท็บ และตรวจหัวคอลัมน์ จึงช่วยพบค่าที่ตั้งผิดก่อน deploy โดยไม่แสดงข้อมูลนักเรียนใน log

อย่าใส่รหัสผ่าน, OAuth token หรือ API key ลงใน Script properties หรือ repository ระบบนี้ไม่ต้องใช้ค่าเหล่านั้น

## 3. Deploy Apps Script เป็น Web App

1. เลือก **Deploy → New deployment**
2. เลือกชนิด **Web app**
3. ตั้ง **Execute as** เป็นบัญชีผู้ deploy (Me / User deploying)
4. ตั้ง **Who has access** เป็น **Anyone** หรือ **Anyone anonymous** ตามตัวเลือกของ Google Workspace
5. กด Deploy และคัดลอก URL ที่ลงท้ายด้วย `/exec`

ทดสอบ URL ในเบราว์เซอร์ด้วยรูปแบบต่อไปนี้ โดยใช้รหัสทดสอบที่โรงเรียนอนุญาต:

```text
APPS_SCRIPT_URL?studentId=TEST_ID&callback=__gradeLookup_test
```

ผลสำเร็จจะเป็น JavaScript ลักษณะ `__gradeLookup_test({...});` และต้องไม่มีข้อมูลของนักเรียนคนอื่น

## 4. เชื่อมหน้าเว็บ

แก้ `config.js`:

```js
window.APP_CONFIG = Object.freeze({
  appsScriptUrl: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec",
});
```

จากนั้นรัน:

```bash
npm run check
```

ตรวจอย่างน้อยสองกรณี:

1. รหัสที่มีผล `ร` หรือ `0` แสดงชื่อ ชั้น และทุกรายวิชาที่เกี่ยวข้อง
2. รหัสที่ไม่พบแสดงข้อความ `ไม่พบข้อมูลผลการเรียน ร หรือ 0 สำหรับรหัสนี้`

เมื่อทั้งสองกรณีผ่านแล้ว ให้เปลี่ยน Google Sheet เป็น **Restricted** และทดสอบซ้ำ เว็บไซต์ควรยังค้นหาได้เพราะ Apps Script ทำงานด้วยสิทธิ์ผู้ deploy

## 5. เปิดใช้ GitHub Pages

1. push โค้ดไปยังสาขา `main`
2. เปิด repository → **Settings → Pages**
3. เลือก Source เป็น **GitHub Actions**
4. เปิดแท็บ Actions และตรวจ workflow `Deploy website to GitHub Pages`
5. เมื่อ workflow สำเร็จ URL เว็บไซต์จะแสดงใน deployment environment ชื่อ `github-pages`

ทุก push ไป `main` จะรันทดสอบ ตรวจการฝังข้อมูล และ deploy ใหม่อัตโนมัติ หากการทดสอบไม่ผ่าน เว็บไซต์รุ่นเดิมจะไม่ถูกแทนที่

## 6. ตรวจสอบก่อนประกาศใช้

- ทดลองบนมือถือและคอมพิวเตอร์
- ทดลองกรอกรหัสผิดรูปแบบและรหัสที่ไม่พบ
- ยืนยันว่าชีตเป็น Restricted
- เปิด DevTools → Network และยืนยันว่าไม่มีการดาวน์โหลด CSV หรือข้อมูลนักเรียนทั้งชุด
- แจ้งนักเรียนว่ารหัสนักเรียนอย่างเดียวไม่ใช่รหัสลับ และไม่ควรค้นหาข้อมูลของผู้อื่น

## การอัปเดตข้อมูล

ฝ่ายทะเบียนแก้ข้อมูลใน Google Sheet ได้ตามปกติ การค้นหาครั้งถัดไปจะอ่านข้อมูลล่าสุดโดยไม่ต้อง build หรือ deploy เว็บไซต์ใหม่ หากแก้ชื่อแท็บ ต้องอัปเดต `SHEET_NAME` ใน Script properties ด้วย
