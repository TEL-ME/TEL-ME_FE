// Only a session pointer is kept. Content, conditions and authority come from the server.
export function savedSession(storage, key) {
  try {
    const value = storage.getItem(key);
    if (!value || !/^[1-9]\d*$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
  } catch { return null; }
}
export function rememberSession(storage, key, id) {
  try { if (id === null) storage.removeItem(key); else storage.setItem(key, String(id)); }
  catch { /* Storage-disabled browsers still work within this page. */ }
}
export async function recoverHistory(request, publish, signal, pause = () => new Promise(resolve => setTimeout(resolve, 1000))) {
  for (;;) {
    signal.throwIfAborted();
    const latest = await request('/messages?size=50', signal);
    let page = latest;
    const messages = new Map(latest.messages.map(message => [message.messageId, message]));
    const cursors = new Set();
    while (page.hasOlderMessages) {
      const cursor = page.nextBeforeSequenceNo;
      if (!Number.isSafeInteger(cursor) || cursor < 1 || cursors.has(cursor)) throw new Error('대화 이력의 페이지 연결을 확인할 수 없습니다.');
      cursors.add(cursor);
      page = await request(`/messages?size=50&beforeSequenceNo=${cursor}`, signal);
      for (const message of page.messages) if (!messages.has(message.messageId)) messages.set(message.messageId, message);
    }
    const history = {...latest, messages: [...messages.values()].sort((a,b) => a.sequenceNo-b.sequenceNo)};
    signal.throwIfAborted();
    publish(history);
    if (latest.runningExecutionId === null) return history;
    await pause();
  }
}
