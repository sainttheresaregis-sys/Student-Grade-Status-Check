import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const headers=['รหัสนักเรียน','ชื่อ-นามสกุล','ชั้น','รายวิชา','ผลการเรียน'];
function harness(rows=[headers]) {
 const data=rows.map(r=>[...r]);let reads=0, releases=0;
 const sheet={getDataRange(){reads++;return {getDisplayValues:()=>data.map(r=>r.map(String))};},getLastRow:()=>data.length,getMaxRows:()=>1000,
  getRange(row,col,height,width){return {setNumberFormat(){return this;},setValues(values){data[row-1]=[...values[0]];return this;}};},deleteRow(row){data.splice(row-1,1);}};
 const props={ADMIN_PIN:'test-secret'};const cache=new Map();
 const ctx={console,PropertiesService:{getScriptProperties:()=>({getProperties:()=>props,getProperty:k=>props[k]})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){releases++;}})},SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheets:()=>[sheet]}),flush(){}}};
 vm.createContext(ctx);vm.runInContext(readFileSync(new URL('../apps-script/Code.gs',import.meta.url),'utf8'),ctx);
 return {call:(action,payload,pin='test-secret')=>JSON.parse(JSON.stringify(ctx.adminControl(pin,action,payload))),lookup:id=>JSON.parse(JSON.stringify(ctx.buildLookupResponse_(data,id))),data,reads:()=>reads,releases:()=>releases};
}
const record={studentId:'01234',name:'นักเรียนทดสอบ',className:'ม.6/3',subject:'ท99999 วิชาทดสอบ',status:'ร'};
test('record actions authenticate before reading or writing',()=>{
 const h=harness();for(const action of ['records','addRecord','deleteRecord'])assert.throws(()=>h.call(action,record,'wrong'));
 assert.equal(h.reads(),0);assert.equal(h.data.length,1);assert.equal(h.releases(),3);
});
test('adding preserves a five digit ID and lookup-compatible columns',()=>{
 const h=harness();const result=h.call('addRecord',record);
 assert.deepEqual(h.data[1],Object.values(record));assert.equal(result.records[0].studentId,'01234');
 assert.equal(h.call('records',{studentId:'01234'}).records.length,1);
});
test('rejects malformed fields, unsupported status and spreadsheet formulas',()=>{
 const h=harness();for(const patch of [{studentId:'1234'},{studentId:'123456'},{name:''},{subject:'=IMPORTXML("x")'},{name:' +formula'},{status:'มผ.'},{className:'x'.repeat(61)}])assert.throws(()=>h.call('addRecord',{...record,...patch}));
 assert.equal(h.data.length,1);
});
test('duplicate subjects and conflicting identity cannot be appended',()=>{
 const h=harness([headers,Object.values(record)]);
 assert.throws(()=>h.call('addRecord',record),/มีรายวิชานี้/);
 assert.throws(()=>h.call('addRecord',{...record,status:'0'}),/มีรายวิชานี้/);
 assert.throws(()=>h.call('addRecord',{...record,name:'คนอื่น',subject:'วิชาใหม่'}),/ชื่อหรือชั้น/);
 assert.equal(h.data.length,2);
});
test('list and delete only the requested R/0 row, retaining other subjects and MP',()=>{
 const h=harness([headers,Object.values(record),['01234',record.name,record.className,'วิชาอื่น','0'],['01234',record.name,record.className,'แนะแนว','มผ.'],['54321','อีกคน','ม.6/4','วิชาอื่น','ร']]);
 const listing=h.call('records',{studentId:'01234'});assert.equal(listing.records.length,2);
 const result=h.call('deleteRecord',listing.records[0]);assert.equal(result.records.length,1);assert.equal(h.data.length,4);assert.equal(h.data[2][4],'มผ.');
 assert.throws(()=>h.call('deleteRecord',{row:3,studentId:'01234',snapshot:JSON.stringify(h.data[2])}));
});
test('stale or shifted row cannot delete a different record',()=>{
 const h=harness([headers,Object.values(record),['54321','อีกคน','ม.6/4','วิชาอื่น','0']]);
 const item=h.call('records',{studentId:'01234'}).records[0];h.data.splice(1,1);
 assert.throws(()=>h.call('deleteRecord',item),/เปลี่ยนแปลง/);assert.equal(h.data[1][0],'54321');
 assert.throws(()=>h.call('deleteRecord',{...item,row:1}));
});
test('respects reordered sheet headers and leaves other columns untouched',()=>{
 const h=harness([['หมายเหตุ',headers[4],headers[3],headers[2],headers[1],headers[0]]]);
 h.call('addRecord',record);assert.deepEqual(h.data[1],['','ร',record.subject,record.className,record.name,'01234']);
});

test('student lookup reflects add and delete immediately without changing other subjects',()=>{
 const h=harness();h.call('addRecord',record);h.call('addRecord',{...record,subject:'วิชาที่สอง',status:'0'});
 assert.equal(h.lookup('01234').student.results.length,2);
 const first=h.call('records',{studentId:'01234'}).records[0];h.call('deleteRecord',first);
 assert.deepEqual(h.lookup('01234').student.results,[{subject:'วิชาที่สอง',status:'0'}]);
 h.call('deleteRecord',h.call('records',{studentId:'01234'}).records[0]);
 assert.equal(h.lookup('01234').found,false);assert.equal(h.data.length,1);
});
test('edited row contents invalidate a previously loaded delete request',()=>{
 const h=harness([headers,Object.values(record)]);const item=h.call('records',{studentId:'01234'}).records[0];
 h.data[1][3]='ชื่อวิชาที่แก้ไข';assert.throws(()=>h.call('deleteRecord',item),/เปลี่ยนแปลง/);
 assert.equal(h.data.length,2);
});
