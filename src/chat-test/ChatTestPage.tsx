import { chatRequest as api } from './api/chat';
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, BookOpen, Check, ChevronDown, MapPin, MessageCircle, MoreHorizontal, Plus, Radio, RefreshCw, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, Wifi, X } from 'lucide-react';

type Store = { storeId: number; name: string; address?: string; demo?: boolean };
type Feedback = { rating: "LIKE" | "DISLIKE"; reason?: string; comment?: string };
type Message = { messageId: number; role: string; messageType: string; content: string | null; status: string; sources?: string[]; storeResults?: Store[] };
type History = { messages: Message[]; runningExecutionId: number | null };
type Thread = { key: string; session: number | null; title: string; messages: Message[] };
const prompts = [
  { icon: Wifi, title: '해외에서도 편하게', text: '해외여행 전 로밍은 어떻게 준비하나요?', label: '로밍 · 해외 이용' },
  { icon: MapPin, title: '가까운 매장을 찾고 싶어요', text: '가까운 매장을 찾아주세요', label: '매장 · 방문 상담' },
  { icon: ShieldCheck, title: '휴대폰을 잃어버렸어요', text: '휴대폰을 분실했을 때 어떻게 하나요?', label: '분실 · 이용 정지' },
];
export default function ChatTestPage() {
  const [mode, setMode] = useState<'demo'|'api'>('demo');
  const [session, setSession] = useState<number|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadKey, setThreadKey] = useState<string>(() => crypto.randomUUID());
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [reasonTarget, setReasonTarget] = useState<number|null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState('normal');
  const [mobileHistory, setMobileHistory] = useState(false);
  const lock = useRef(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const bottom = useRef<HTMLDivElement>(null);
  const feedbackDialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (reasonTarget === null) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = feedbackDialog.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []);
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setReasonTarget(null); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [reasonTarget]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { bottom.current?.scrollIntoView({behavior:'smooth'}); }, [messages, busy]);
  function archive() {
    if (!messages.length) return;
    const item = {key:threadKey,session,title:messages.find(m=>m.role==='USER')?.content || '새 상담',messages};
    setThreads(prev => [item, ...prev.filter(t=>t.key!==threadKey)]);
  }
  function fresh() { if(lock.current)return; archive();setThreadKey(crypto.randomUUID());setSession(null);setMessages([]);setInput('');setError(''); }
  function changeMode(next:'demo'|'api') { if(lock.current || next === mode)return;setMode(next);setThreads([]);setMessages([]);setSession(null);setFeedback({});setError('');setInput('');setPreview('normal');setThreadKey(crypto.randomUUID()); }
  async function send(text = input) {
    const query = text.trim(); if(lock.current || !query || query.length > 2000)return;
    lock.current=true;setBusy(true);setError('');
    const abort=new AbortController();controller.current=abort;
    const timer=window.setTimeout(()=>abort.abort(),180000);
    try {
      if(mode==='demo') {
        const user:Message={messageId:Date.now(),role:'USER',messageType:'QUESTION',content:query,status:'COMPLETED'};
        const waiting=messages[messages.length - 1]?.messageType==='CLARIFICATION';
        setMessages(prev=>[...prev,user]);
        await new Promise(resolve=>window.setTimeout(resolve,550));
        if(abort.signal.aborted)return;
        const clarification=!waiting && /매장|가까운/.test(query);
        if (preview === 'error') { setMessages(prev => [...prev, {messageId:user.messageId+1,role:'ASSISTANT',messageType:'ERROR',status:'FAILED',content:'답변을 생성하지 못했어요. 잠시 후 다시 질문해 주세요. (실패 화면 예시)'}]); setInput(''); return; }
        const answer:Message={messageId:user.messageId+1,role:'ASSISTANT',messageType:clarification?'CLARIFICATION':'ANSWER',status:'COMPLETED',content:clarification?'어느 지역의 매장을 찾고 계신가요?\n동네 이름이나 가까운 역을 알려주세요.':waiting?`말씀해주신 “${query}”을 지역 조건으로 받았습니다.\n\n여기까지는 되묻기 화면을 확인하는 예시입니다. 실제 매장 검색 결과는 백엔드 연결 후 표시됩니다.`:'문의 내용을 확인했습니다.\n\n이 답변은 화면 확인용 예시입니다. 실제 FAQ에 근거한 안내는 API 연결 모드에서 확인할 수 있어요. 아래에서 참고 자료와 평가 화면을 살펴보세요.',sources:clarification?undefined:['화면 예시 · 실제 FAQ 근거가 아닙니다']};
        if (waiting || preview === 'stores' || preview === 'empty') {
          answer.messageType = 'STORE_RESULT';
          answer.content = preview === 'empty' ? '조건에 맞는 매장이 없어요. 지역이나 방문 목적을 바꿔 다시 찾아보세요.' : '매장 결과 화면 예시입니다. 아래 매장은 실제 검색 결과가 아닙니다.';
          answer.sources = undefined;
          answer.storeResults = preview === 'empty' ? [] : [{storeId:1,name:'TEL-ME 예시 매장 A',address:'데모 주소 · 실제 방문 안내 아님',demo:true},{storeId:2,name:'TEL-ME 예시 매장 B',address:'데모 주소 · 실제 방문 안내 아님',demo:true}];
        }
        setMessages(prev=>[...prev,answer]);setInput('');return;
      }
      let id=session;
      if(id===null){id=(await api<{sessionId:number}>('',abort.signal,{})).sessionId;setSession(id);}
      await api(`/${id}/messages`,abort.signal,{content:query});
      setInput('');
      for(;;){const h=await api<History>(`/${id}/messages?size=50`,abort.signal);setMessages(h.messages);if(h.runningExecutionId===null)break;await new Promise(resolve=>window.setTimeout(resolve,1000));if(abort.signal.aborted)throw new Error('조회 대기 시간이 초과되었습니다.');}
    } catch(e){setError(e instanceof Error && e.name!=='AbortError'?e.message:'응답 확인 시간이 초과되었습니다. 서버 작업은 계속될 수 있으니 이력을 새로고침해 주세요.');}
    finally{window.clearTimeout(timer);lock.current=false;setBusy(false);}
  }
  async function refresh(){if(session===null||lock.current)return;lock.current=true;setBusy(true);setError('');try{const h=await api<History>(`/${session}/messages?size=50`,AbortSignal.timeout(10000));setMessages(h.messages);if(h.runningExecutionId!==null)setError('아직 서버에서 처리 중입니다. 잠시 후 다시 조회해 주세요.');}catch(e){setError(e instanceof Error?e.message:'조회 실패');}finally{lock.current=false;setBusy(false);}}
  return <div className="app-shell">
    <aside className={`sidebar ${mobileHistory ? "mobile-open" : ""}`}><a className="brand" href="#"><span className="brand-icon"><Radio size={23}/></span>TEL<span className="brand-dot">·</span>ME</a><button className="mobile-close icon-button" aria-label="상담 목록 닫기" onClick={()=>setMobileHistory(false)}><X size={20}/></button><p className="brand-caption">당신의 통신 생활, 더 쉽게</p>
      <button className="new-chat" disabled={busy} onClick={()=>{fresh();setMobileHistory(false);}}><Plus size={18}/>새로운 상담 시작</button>
      <div className="nav-label">WORKSPACE</div><div className="nav-active"><MessageCircle size={18}/>AI 상담<span className="small-tag">BETA</span></div>
      <div className="history-heading">이 브라우저의 상담 <span>{threads.length}</span></div>
      <div className="history-list">{threads.length?threads.map(t=><button key={t.key} disabled={busy} onClick={()=>{archive();setThreadKey(t.key);setSession(t.session);setMessages(t.messages);setError('');setInput('');setMobileHistory(false);}}><MessageCircle size={15}/><span>{t.title}</span></button>):<p>시작한 상담이 이곳에 모여요.</p>}</div>
      <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={19}/><div><strong>편안하게 질문하세요</strong><p>비밀번호와 주민등록번호 등<br/>민감한 정보는 입력하지 마세요.</p></div></div><div className="profile"><span>G</span><div><strong>{mode === 'demo' ? '게스트 데모' : 'API 테스트'}</strong><small>{mode === 'demo' ? '화면 미리보기' : '서버 인증 상태 확인 전'}</small></div><MoreHorizontal size={18}/></div></div>
    </aside>
    <main className="workspace"><header className="topbar"><div><span className="breadcrumb">TEL-ME</span><span className="slash">/</span><strong>AI 상담</strong></div><button className="mobile-new icon-button" aria-label="상담 목록 열기" onClick={()=>setMobileHistory(true)}><MessageCircle size={18}/></button><div className="mode-switch" aria-label="연결 모드"><button disabled={busy} className={mode==='demo'?'selected':''} onClick={()=>changeMode('demo')}>화면 데모</button><button disabled={busy} className={mode==='api'?'selected':''} onClick={()=>changeMode('api')}>API 연결</button></div><button className="mobile-new icon-button" aria-label="새 상담" disabled={busy} onClick={fresh}><Plus size={20}/></button></header>
      <div className="mode-banner"><span className="status-dot"/>{mode==='demo'?'화면 미리보기 · 예시 응답과 평가는 서버에 저장되지 않아요.':'실제 백엔드 연결 · 이력 조회 방식 · SSE와 피드백 API는 아직 미연결'}{mode==='api'&&session!==null&&<button disabled={busy} onClick={refresh}><RefreshCw size={13}/>이력 새로고침</button>}</div>
      {mode==='demo'&&<div className="preview-controls"><label htmlFor="preview-case">화면 확인</label><select id="preview-case" disabled={busy} value={preview} onChange={e=>setPreview(e.target.value)}><option value="normal">기본 상담 · 되묻기</option><option value="stores">매장 결과</option><option value="empty">매장 결과 없음</option><option value="error">답변 생성 실패</option></select><span>선택 후 질문을 보내세요</span></div>}
      <section className="conversation" aria-label="상담 대화"><div className="conversation-inner">
        {!messages.length?<div className="welcome"><div className="eyebrow"><span/>YOUR EVERYDAY TELECOM GUIDE</div><div className="welcome-symbol"><Sparkles size={32}/></div><h1>통신 생활의 궁금함,<br/><span>편하게 물어보세요.</span></h1><p className="intro">복잡한 이용 안내부터 가까운 매장까지.<br/>필요한 정보를 함께 찾아드릴게요.</p><div className="prompt-grid">{prompts.map(p=><button key={p.title} disabled={busy} onClick={()=>void send(p.text)}><p.icon size={22}/><small>{p.label}</small><strong>{p.title}</strong><ArrowUpRight className="card-arrow" size={17}/></button>)}</div><div className="welcome-foot"><BookOpen size={14}/>FAQ를 참고해 답변하고, 필요한 정보는 다시 여쭤봐요.</div></div>:<div className="message-list"><div className="day-label">오늘의 상담</div>{messages.map(m=>{const user=m.role==='USER';const clarify=m.messageType==='CLARIFICATION';const rateable=!user&&m.status==='COMPLETED'&&['ANSWER','STORE_RESULT'].includes(m.messageType);return <article key={m.messageId} className={`message ${user?'user-message':''}`}>{!user&&<span className="assistant-avatar"><Radio size={19}/></span>}<div className="message-body">{!user&&<div className="message-author">TEL-ME <span>{clarify?'추가 정보 확인':m.status==='FAILED'?'응답 실패':'AI 상담'}</span></div>}<div className={`bubble ${clarify?'clarification':''} ${m.status==='FAILED'?'failed-bubble':''}`}>{clarify&&<div className="clarify-label"><MessageCircle size={14}/>조금만 더 알려주세요</div>}<p>{m.content||(m.status==='GENERATING'?'답변을 작성하고 있어요…':'표시할 텍스트가 없습니다.')}</p></div>{m.messageType==='STORE_RESULT'&&<div className="store-results">{m.storeResults?.length ? m.storeResults.map(store=><div className="store-card" key={store.storeId}><div className="store-card-icon"><MapPin size={20}/></div><div><strong>{store.name}</strong><p>{store.address || '주소 정보 없음'}</p><span>{store.demo?'화면 예시':'매장 정보'}</span></div></div>) : <div className="empty-stores"><MapPin size={20}/><span>표시할 매장 결과가 없습니다.</span></div>}</div>}{m.sources&&<details className="sources"><summary><BookOpen size={14}/>참고 자료 {m.sources.length}건<ChevronDown size={14}/></summary>{m.sources.map(s=><p key={s}>{s}</p>)}</details>}{rateable&&<div className="feedback"><span>도움이 되었나요?</span><button aria-label="도움이 됐어요" disabled={mode==='api'} className={feedback[m.messageId]?.rating==='LIKE'?'voted':''} onClick={()=>setFeedback(p=>({...p,[m.messageId]:{rating:'LIKE'}}))}><ThumbsUp size={14}/></button><button aria-label="아쉬워요" disabled={mode==='api'} className={feedback[m.messageId]?.rating==='DISLIKE'?'voted':''} onClick={()=>{setReasonTarget(m.messageId);setReason(feedback[m.messageId]?.reason || '');setNote(feedback[m.messageId]?.comment || '');}}><ThumbsDown size={14}/></button><small>{mode==='api'?'평가 연결 준비 중':feedback[m.messageId]?'데모 평가 반영됨':'데모'}</small>{mode==='demo'&&feedback[m.messageId]&&<button aria-label="평가 취소" onClick={()=>setFeedback(p=>{const next={...p};delete next[m.messageId];return next;})}>취소</button>}</div>}</div></article>})}{busy&&<div className="thinking" role="status"><Sparkles size={16}/><span>답변을 확인하고 있어요</span><i/><i/><i/></div>}<div ref={bottom}/></div>}
      </div></section>
      <footer className="composer-area">{error&&<div className="error-box" role="alert">{error}</div>}<form className="composer" onSubmit={e=>{e.preventDefault();void send();}}><textarea aria-label="상담 질문" placeholder="어떤 도움이 필요하신가요?" rows={2} maxLength={2000} value={input} disabled={busy} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/><div className="composer-bottom"><span><Sparkles size={13}/>TEL-ME AI <span className="divider">|</span> {input.length}/2,000</span><button className="send-button" aria-label="질문 전송" disabled={busy||!input.trim()}><ArrowUp size={20}/></button></div></form><p className="disclaimer">가상 통신사 기반 서비스입니다. 중요한 내용은 제공된 근거를 함께 확인해 주세요.</p></footer>
    </main>
    {reasonTarget!==null&&<div className="modal-overlay" onClick={()=>setReasonTarget(null)}><section ref={feedbackDialog} role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="feedback-modal" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')setReasonTarget(null);}}><button className="close-modal icon-button" aria-label="닫기" onClick={()=>setReasonTarget(null)}><X size={20}/></button><h2 id="feedback-title">어떤 점이 아쉬웠나요?</h2><p>사유를 선택해 주세요. 의견은 선택 사항이에요.</p><div className="reason-options">{['답변이 정확하지 않아요','질문과 관련이 없어요','설명이 부족해요','기타'].map(r=><label key={r}><input type="radio" name="reason" value={r} checked={reason===r} onChange={()=>setReason(r)}/>{r}</label>)}</div><textarea aria-label="추가 의견 (선택)" value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} placeholder="추가로 남기고 싶은 의견 (선택)"/><small>화면 데모입니다. 서버에 전송하지 않습니다.</small><button className="submit-feedback" disabled={!reason} onClick={()=>{setFeedback(p=>({...p,[reasonTarget]:{rating:'DISLIKE',reason,comment:note.trim() || undefined}}));setReasonTarget(null);}}><Check size={16}/>데모 평가 적용</button></section></div>}
  </div>;
}
