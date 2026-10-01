import test from 'node:test';
import assert from 'node:assert/strict';
import {savedSession,rememberSession,recoverHistory} from '../src/chat-test/api/recovery.mjs';
const memory = () => { const map = new Map(); return {getItem:key=>map.get(key) ?? null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}; };
const history=(messages=[],execution=null,older=false,cursor=null)=>({messages,runningExecutionId:execution,hasOlderMessages:older,nextBeforeSequenceNo:cursor});
const message=(id,sequence,content='server answer',status='COMPLETED')=>({messageId:id,sequenceNo:sequence,content,status});
test('persist only an endpoint-scoped pointer, validate tampered values and clear on new chat',()=>{
 const storage=memory();rememberSession(storage,'backend-A',17);assert.equal(savedSession(storage,'backend-A'),17);assert.equal(savedSession(storage,'backend-B'),null);
 for(const value of ['-1','0','NaN','1.2','9007199254740992','17junk']){storage.setItem('backend-A',value);assert.equal(savedSession(storage,'backend-A'),null);}
 rememberSession(storage,'backend-A',null);assert.equal(savedSession(storage,'backend-A'),null);
 assert.equal(savedSession({getItem(){throw Error('denied')}},'key'),null);
});
test('restore all history pages in sequence and deduplicate by message ID using the newest record',async()=>{
 const paths=[];const latest=history([message(3,3),message(2,2,'latest')],null,true,2);
 const result=await recoverHistory(async path=>{paths.push(path);return paths.length===1?latest:history([message(1,1),message(2,2,'stale')]);},()=>{},new AbortController().signal);
 assert.deepEqual(result.messages.map(m=>m.messageId),[1,2,3]);assert.equal(result.messages[1].content,'latest');assert.equal(paths.length,2);assert(paths.every(p=>p.startsWith('/messages?')));
});
test('reconnect a running execution via GET history until completion, publish exactly one server record per ID',async()=>{
 const pages=[history([message(1,1,null,'GENERATING')],42),history([message(1,1,'guarded final')])];const seen=[];const paths=[];
 const result=await recoverHistory(async path=>{paths.push(path);return pages.shift();},h=>seen.push(h),new AbortController().signal,async()=>{});
 assert.equal(result.runningExecutionId,null);assert.equal(result.messages[0].content,'guarded final');assert.equal(seen[0].messages[0].content,null);assert.equal(seen[1].messages.length,1);assert.equal(paths.length,2);
});
test('failed execution is terminal and partial output is not invented',async()=>{
 let calls=0;const result=await recoverHistory(async()=>{calls++;return history([message(1,1,null,'FAILED')]);},()=>{},new AbortController().signal);
 assert.equal(calls,1);assert.equal(result.messages[0].status,'FAILED');assert.equal(result.messages[0].content,null);
});
test('network and ownership errors are surfaced without creating a session or retransmitting input',async()=>{
 for(const error of [Error('offline'),Error('not owned')]){let calls=0;await assert.rejects(recoverHistory(async path=>{calls++;assert(path.startsWith('/messages?'));throw error;},()=>{},new AbortController().signal),error);assert.equal(calls,1);}
});
test('abort and broken pagination cannot publish stale or fabricated state',async()=>{
 const abort=new AbortController();let published=0;
 await assert.rejects(recoverHistory(async()=>{abort.abort();return history();},()=>published++,abort.signal));assert.equal(published,0);
 await assert.rejects(recoverHistory(async()=>history([],null,true,5),()=>published++,new AbortController().signal),/페이지 연결/);assert.equal(published,0);
});
