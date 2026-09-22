/** 프록시/서버 오류의 HTML을 JSON으로 처리하지 않고, 사용자에게 오류를 전달합니다. */
export async function parseResponse(response) {
  let data;
  try { data = await response.json(); }
  catch { throw new Error(`서버 응답을 읽지 못했습니다 (HTTP ${response.status}). 백엔드와 프록시 설정을 확인해 주세요.`); }
  if (!response.ok || data?.isSuccess !== true) {
    throw new Error(typeof data?.message === 'string' ? data.message : `요청에 실패했습니다 (HTTP ${response.status}).`);
  }
  if (data.result === null || data.result === undefined) throw new Error('응답 데이터가 없습니다. API 형식을 확인해 주세요.');
  return data.result;
}
