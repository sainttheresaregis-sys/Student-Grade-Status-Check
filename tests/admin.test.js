import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function harness(initial={}) {
 const props={ADMIN_PIN:'test-secret',...initial};
 const cache=new Map();
 const context={console,PropertiesService:{getScriptProperties:()=>({getProperties:()=>({...props}),getProperty:k=>props[k],setProperty:(k,v)=>props[k]=v})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},ContentService:{MimeType:{JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(){return this;}})}};
 vm.createContext(context);vm.runInContext(readFileSync(new URL('../apps-script/Code.gs',import.meta.url),'utf8'),context);
 return {context,props};
}
test('admin requires the configured secret for every change',()=>{
 const {context,props}=harness();
 assert.throws(()=>context.adminControl('wrong','close'));
 assert.equal(props.LOOKUP_ENABLED,undefined);
 assert.equal(context.adminControl('test-secret','close').enabled,false);
 assert.equal(props.LOOKUP_ENABLED,'false');
 assert.throws(()=>context.adminControl('wrong','open'));
 assert.equal(props.LOOKUP_ENABLED,'false');
 assert.equal(context.adminControl('test-secret','open').enabled,true);
});
test('admin fails closed without configured secret and rejects unknown actions',()=>{
 const {context}=harness({ADMIN_PIN:''});assert.throws(()=>context.adminControl('','open'));
 assert.throws(()=>harness().context.adminControl('test-secret','delete'));
});
test('repeated wrong PIN attempts are rate limited',()=>{
 const {context}=harness();for(let i=0;i<5;i++)assert.throws(()=>context.adminControl('wrong','status'));
 assert.throws(()=>context.adminControl('test-secret','open'),/ลองใหม่/);
});
test('closed lookup never reads the student spreadsheet',()=>{
 const {context}=harness({LOOKUP_ENABLED:'false'});
 const result=context.doGet({parameter:{studentId:'12345',callback:'__gradeLookup_test'}});
 assert.match(result.text,/SYSTEM_CLOSED/);
});
