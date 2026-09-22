import test from 'node:test';
import assert from 'node:assert/strict';
import { parseResponse } from '../src/chat-test/api/response.mjs';

test('세션 생성 응답 result를 반환한다', async () => {
  const response = Response.json({isSuccess:true,result:{sessionId:7}}, {status:201});
  assert.deepEqual(await parseResponse(response), {sessionId:7});
});
test('권한 오류 메시지를 유지한다', async () => {
  await assert.rejects(parseResponse(Response.json({isSuccess:false,message:'접근할 수 없습니다'}, {status:403})), /접근할 수 없습니다/);
});
test('프록시 HTML 오류를 안내한다', async () => {
  await assert.rejects(parseResponse(new Response('<html>Bad gateway</html>',{status:502})), /HTTP 502/);
});
test('HTTP 성공이어도 서버 실패 응답을 거부한다', async () => {
  await assert.rejects(parseResponse(Response.json({isSuccess:false,message:'처리 실패'})), /처리 실패/);
});
test('데이터 없는 성공 응답을 거부한다', async () => {
  await assert.rejects(parseResponse(Response.json({isSuccess:true,result:null})), /응답 데이터가 없습니다/);
});
