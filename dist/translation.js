/* Word-card translation and prerecorded listening. No model API or account tokens. */
(() => {
  const tokenise = text => String(text).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/(?:[—–]|--+)/g, ' ').replace(/[.,!?;:"()…]/g, '').trim().split(/\s+/).filter(Boolean);
  const normalise = text => tokenise(text).join(' ').toLowerCase();
  const normaliseTyped = text => normalise(text).replace(/\b(can't)\b/g, 'cannot').replace(/\bwon't\b/g, 'will not').replace(/\bshan't\b/g, 'shall not').replace(/\b(\w+)n't\b/g, '$1 not').replace(/\bi'm\b/g, 'i am').replace(/\b(you|we|they)'re\b/g, '$1 are').replace(/\b(i|you|we|they)'ve\b/g, '$1 have').replace(/\b(i|you|he|she|it|we|they)'ll\b/g, '$1 will').replace(/\bcan not\b/g, 'cannot').replace(/\b(colour|colours|organise|organised|organisation|centre|centres|travelling|travelled|learnt)\b/g, word => ({colour:'color',colours:'colors',organise:'organize',organised:'organized',organisation:'organization',centre:'center',centres:'centers',travelling:'traveling',travelled:'traveled',learnt:'learned'}[word]));
  const shuffle = values => {
    const a = [...values];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const accepts = (item, text) => [item.english, ...(item.alternatives || [])].some(answer => normalise(answer) === normalise(text));
  const acceptsTyped = (item, text) => [item.english, ...(item.alternatives || [])].some(answer => normaliseTyped(answer) === normaliseTyped(text));
  window.TranslationCards = { tokenise, normalise, normaliseTyped, shuffle, accepts, acceptsTyped };
  const isEveryday = item => item?.collection === 'everyday' || (item?.sourceId || item?.id || '').startsWith('everyday-');
  const quizLevel = item => isEveryday(item) ? '생활영어' : 'VOA 번역';
  let lessonRender = 0;
  const lessonDrafts = new WeakMap();
  const currentQuestion = (item, quizSession, index, render) => session === quizSession && quizSession.index === index && quizSession.items[index]?.id === item.id && render === lessonRender && document.querySelector('.tr-quiz')?.dataset.lessonRender === String(render);
  function draftFor(item, quizSession, index) {
    let drafts = lessonDrafts.get(quizSession);
    if (!drafts) { drafts = new Map(); lessonDrafts.set(quizSession, drafts); }
    const key = `${index}:${item.sourceId || item.id.replace(/^tt/, 'tr').replace(/^et/, 'ec')}`;
    if (!drafts.has(key)) drafts.set(key, { english:item.english, selected:[], order:null, text:'', hinted:false, typingHint:false });
    const draft = drafts.get(key);
    if (draft.english !== item.english) { const replacement={english:item.english,selected:[],order:null,text:'',hinted:false,typingHint:false};drafts.set(key,replacement);return replacement; }
    return draft;
  }
  function sourceHTML(w) {
    if (isEveryday(w)) {
      const officialHosts = new Set(['learnenglish.britishcouncil.org','learnenglishteens.britishcouncil.org','dictionary.cambridge.org','americanenglish.state.gov','www.americanenglish.org','americanenglish.org']);
      const links = [...new Set(w.sourceIds || [])].map(id => (window.EVERYDAY_SOURCES || []).find(source => source.id === id)).filter(Boolean).flatMap(source => {
        try {
          const url = new URL(source.url);
          if (url.protocol !== 'https:' || !officialHosts.has(url.hostname) || url.username || url.password) return [];
          return [`<span><a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a> · ${esc(source.publisher)}</span>`];
        } catch { return []; }
      });
      return `<div class="tr-source"><p class="tr-small">표현·용법 참고 자료입니다. 영어 문장과 한국어 번역은 자체 작성했으며, 아래 자료의 인용 원문이나 해당 기관이 검수한 예문은 아닙니다.</p>${links.join('')}</div>`;
    }
    const s = w?.source; if (!s?.url) return '';
    let url; try { url = new URL(s.url); } catch { return ''; }
    if (url.protocol !== 'https:' || url.hostname !== 'learningenglish.voanews.com' || !url.pathname.startsWith('/a/')) return '';
    const details = [s.author, s.date?.slice(0, 10)].filter(Boolean).join(' · ');
    return `<div class="tr-source"><a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">VOA 원문 ↗ · ${esc(s.title || 'Learning English')}</a>${details ? `<span>${esc(details)}</span>` : ''}</div>`;
  }
  const defaultMode = () => window.SentencePractice?.getMode() || 'cards';
  const filterLevel = rows => window.SentencePractice?.filter(rows) || rows;
  const levelBadge = item => window.SentencePractice?.label(item) || quizLevel(item);
  const modeLabel = mode => mode === 'typing' ? '직접 입력' : '카드 배열';
  let topic='all',search='',visible=12,view='card',cardIndex=0,reveal=true,filtersOpen=false,audioOptionsOpen=false,libraryRender=0;
  const currentLibrary = render => document.querySelector('.translation-browser')?.dataset.libraryRender===String(render);
  const bank=()=>window.TRANSLATION_BANK||[];
  const filtered=()=>filterLevel(bank()).filter(w=>(topic==='all'||w.topic===topic)&&(!search||`${w.english} ${w.korean} ${w.grammar}`.toLowerCase().includes(search.toLowerCase())));
  window.TranslationLibrary={items:()=>filtered()};
  const progressCount=()=>bank().filter(w=>state.progress[w.id]?.attempts>0||state.progress[w.id.replace(/^tr/,'tt')]?.attempts>0).length;
  const badgeText=()=>`${progressCount().toLocaleString()} / ${bank().length.toLocaleString()} 학습`;
  function practiceRows(rows){if(!rows.length){toast('학습할 문장이 없어요.');return;}window.MobileUI?.cardMode(false);startTranslation(rows,defaultMode());}
  function cardMotion(stage){
    const target=()=>stage?.querySelectorAll('.sentence-card')[0]||null;
    const key=()=>target()?.dataset.trCard||null;
    const isActive=()=>Boolean(stage&&stage.isConnected!==false&&document.querySelector('#translationList')===stage&&view==='card'&&!filtersOpen&&!audioOptionsOpen&&!Array.from(stage.querySelectorAll('[data-tr-details]')).some(detail=>detail.open)&&key()&&key()===filtered()[cardIndex]?.id);
    const canMove=direction=>isActive()&&(direction===-1||direction===1)&&cardIndex+direction>=0&&cardIndex+direction<filtered().length;
    return{target,key,isActive,canMove};
  }
  function turnCard(delta,motion=cardMotion(document.querySelector('#translationList'))){
    if(!motion.canMove(delta))return false;
    cardIndex+=delta;renderLibrary();return true;
  }
  function animateTurnCard(delta,stage){
    const motion=cardMotion(stage),key=motion.key(),target=motion.target();
    if(!motion.canMove(delta))return;
    const navigate=()=>{if(motion.isActive()&&motion.key()===key&&motion.target()===target)return turnCard(delta,motion);return false;};
    if(window.MobileUI?.transitionCard)window.MobileUI.transitionCard({direction:delta,...motion,navigate});else navigate();
  }
  function panel(kind,open){
    const filter=kind==='filters';
    if(open){filtersOpen=false;audioOptionsOpen=false;document.querySelector('#translationFilters').hidden=true;document.querySelector('#trAudioOptionsPanel').hidden=true;document.querySelector('#translationFilterToggle').setAttribute('aria-expanded','false');document.querySelector('#trAudioOptions').setAttribute('aria-expanded','false');}
    if(filter)filtersOpen=open;else audioOptionsOpen=open;
    document.querySelector(filter?'#translationFilters':'#trAudioOptionsPanel').hidden=!open;
    document.querySelector(filter?'#translationFilterToggle':'#trAudioOptions').setAttribute('aria-expanded',String(open));
  }
  function readingCard(w){const showEnglish=view==='list'||reveal;return`<article class="card tr-library-card sentence-card" data-tr-card="${esc(w.id)}"><div class="sentence-card-meta"><span class="pill">${esc(w.topic)}</span><span class="sentence-level-badge">${esc(levelBadge(w))}</span><details class="sentence-details" data-tr-details="${esc(w.id)}"><summary>해설·출처</summary><div class="sentence-detail-panel"><button class="text-btn sentence-panel-close" data-tr-close-detail="${esc(w.id)}">닫기 ×</button><h3>표현과 원문</h3><p>${esc(w.note)}</p>${sourceHTML(w)}</div></details></div><div class="sentence-copy" data-language="${showEnglish?'english':'korean'}"><p class="sentence-english" lang="en" ${!showEnglish?'hidden':''}>${esc(w.english)}</p><p class="sentence-korean">${esc(w.korean)}</p></div><div class="sentence-card-actions tr-reading-actions"><button class="listen" data-tr-listen="${esc(w.id)}">문장 듣기</button><button class="primary" data-tr-practice="${esc(w.id)}">이 문장 연습</button></div></article>`;}
  window.translationPage=function(){
    const render=++libraryRender,guard=callback=>(...args)=>{if(currentLibrary(render))return callback(...args);};
    const topics=[...new Set(bank().map(w=>w.topic))];filtersOpen=false;audioOptionsOpen=false;window.MobileUI?.lessonMode?.(false);window.MobileUI?.cardMode(view==='card');
    main.innerHTML=`<section class="sentence-browser translation-browser ${view==='card'?'is-card':'is-list'}" data-library-render="${render}" aria-label="VOA 번역 연습 3,000문장">
      <header class="sentence-browser-header"><div><h1>번역 연습</h1><p class="sentence-learning-count tr-completed">${badgeText()}</p></div><button class="secondary sentence-filter-toggle" id="translationFilterToggle" aria-expanded="false" aria-controls="translationFilters">필터</button></header>
      <div id="translationFilters" class="browser-popover" hidden><div class="sentence-panel-heading"><h2>문장 찾기</h2><button class="text-btn" id="translationFilterClose">닫기 ×</button></div><div class="tr-filters"><label>주제<select id="translationTopic"><option value="all">모든 주제</option>${topics.map(t=>`<option value="${esc(t)}" ${topic===t?'selected':''}>${esc(t)}</option>`).join('')}</select></label><label>검색<input id="translationSearch" type="search" value="${esc(search)}" placeholder="한국어·영어·문법"></label></div><button class="primary" id="translationFilterDone">적용</button></div>
      <div class="sentence-viewbar"><div class="sentence-view-switch" role="group" aria-label="읽기 보기 방식"><button id="translationCardView" aria-pressed="${view==='card'}">카드 보기</button><button id="translationListView" aria-pressed="${view==='list'}">목록 보기</button></div><label class="sentence-reveal" ${view==='list'?'hidden':''}><input id="translationReveal" type="checkbox" ${reveal?'checked':''}> <span class="sentence-reveal-normal">영어 보기</span><span class="sentence-reveal-compact">영어 ↔ 한국어</span></label><span id="translationCount" class="sentence-count"></span></div>
      <div class="sentence-practicebar"><div class="sentence-study-settings"><div class="sentence-default-mode" role="group" aria-label="전체 문장 풀이 방식">${['cards','typing'].map(method=>`<button type="button" class="secondary" data-sentence-default="${method}" aria-pressed="${defaultMode()===method}">${modeLabel(method)}</button>`).join('')}</div><label>난이도<select class="sentence-level-select" id="translationLevel" aria-label="문장 난이도">${window.SentencePractice?.levelOptions() || '<option value="0">전체</option>'}</select></label></div><button class="primary" id="translationStart">학습 시작</button></div>
      <section id="translationList" class="tr-library sentence-stage" aria-label="번역 문장, 좌우로 밀어서 이동" tabindex="0"></section><div id="translationPagination" class="sentence-pagination"></div>
      <section class="sentence-audio tr-player" aria-label="VOA 연속 듣기"><div class="sentence-audio-controls"><button class="secondary" id="tr-prev" aria-label="이전 음성">⏮</button><button class="primary" id="tr-play">연속 듣기</button><button class="secondary" id="tr-next" aria-label="다음 음성">⏭</button><button class="secondary" id="trAudioOptions" aria-controls="trAudioOptionsPanel" aria-expanded="false">옵션</button></div><div class="tr-audio-progress"><div id="tr-audio-bar"></div></div><p id="tr-audio-status" role="status" class="sentence-audio-status">Michael · 미국 영어</p><div class="browser-popover" id="trAudioOptionsPanel" hidden><div class="sentence-panel-heading"><h2>듣기 설정</h2><button class="text-btn" id="trAudioClose">닫기 ×</button></div><p id="tr-now-en" lang="en"></p><p id="tr-now-ko" class="muted"></p><div id="tr-now-source"></div><div class="tr-player-options"><label>속도<select id="tr-speed">${[.75,.9,1,1.1,1.25].map(r=>`<option value="${r}" ${r===TranslationAudio.rate?'selected':''}>${r}×</option>`).join('')}</select></label><label><input type="checkbox" id="tr-repeat" ${TranslationAudio.repeat?'checked':''}> 한 문장 반복</label><label><input type="checkbox" id="tr-shuffle" ${TranslationAudio.random?'checked':''}> 무작위 재생</label></div><p class="sentence-audio-note">음성 재생은 인터넷 연결이 필요해요.</p><details class="tr-small"><summary>자료·이용 안내</summary><p>VOA 자체 제작 원문 3,000문장 · 글 700편</p><a href="translation-data.json" download>전체 문장</a> · <a href="translation-sources.json" download>기사별 출처</a> · <a href="translation-attribution.txt" target="_blank" rel="noopener">원문 이용 안내</a> · <a href="translation-audio-attribution.txt" target="_blank" rel="noopener">음성 출처</a></details></div></section>
    </section>`;
    document.querySelector('#translationFilterToggle').onclick=guard(()=>panel('filters',!filtersOpen));for(const id of ['translationFilterClose','translationFilterDone'])document.querySelector('#'+id).onclick=guard(()=>panel('filters',false));
    document.querySelector('#trAudioOptions').onclick=guard(()=>panel('audio',!audioOptionsOpen));document.querySelector('#trAudioClose').onclick=guard(()=>panel('audio',false));
    document.querySelector('#translationStart').onclick=guard(()=>practiceRows(filtered()));
    document.querySelectorAll('[data-sentence-default]').forEach(button=>button.onclick=guard(()=>{if(!window.SentencePractice?.setMode(button.dataset.sentenceDefault))return;document.querySelectorAll('[data-sentence-default]').forEach(control=>control.setAttribute('aria-pressed',String(control.dataset.sentenceDefault===defaultMode())));}));
    document.querySelector('#translationLevel').onchange=guard(event=>{if(!window.SentencePractice?.setLevel(Number(event.target.value)))return;visible=12;cardIndex=0;TranslationAudio.stop();window.MobileUI?.cancelMotion?.();renderLibrary();});
    document.querySelector('#translationTopic').onchange=guard(e=>{topic=e.target.value;visible=12;cardIndex=0;TranslationAudio.stop();renderLibrary();});document.querySelector('#translationSearch').oninput=guard(e=>{search=e.target.value;visible=12;cardIndex=0;TranslationAudio.stop();renderLibrary();});
    for(const[id,next]of[['translationCardView','card'],['translationListView','list']])document.querySelector('#'+id).onclick=guard(()=>{view=next;visible=12;cardIndex=0;translationPage();});
    document.querySelector('#translationReveal').onchange=guard(e=>{reveal=e.target.checked;renderLibrary();});
    document.querySelector('#tr-play').onclick=guard(()=>{const rows=filtered(),ids=new Set(rows.map(w=>w.id)),same=rows.length===TranslationAudio.queue.length&&TranslationAudio.queue.every(w=>ids.has(w.sourceId||w.id));if(same&&TranslationAudio.playing)TranslationAudio.pause();else if(same&&rows.length)TranslationAudio.resume();else TranslationAudio.start(rows);});
    document.querySelector('#tr-prev').onclick=guard(()=>TranslationAudio.step(-1));document.querySelector('#tr-next').onclick=guard(()=>TranslationAudio.step(1));
    document.querySelector('#tr-speed').onchange=guard(e=>TranslationAudio.setRate(Number(e.target.value)));document.querySelector('#tr-repeat').onchange=guard(e=>{TranslationAudio.repeat=e.target.checked;});document.querySelector('#tr-shuffle').onchange=guard(e=>{TranslationAudio.random=e.target.checked;if(TranslationAudio.queue.length)TranslationAudio.start(filtered());});
    renderLibrary();if(view==='card'){const stage=document.querySelector('#translationList'),motion=cardMotion(stage);window.MobileUI?.bindSwipe(stage,{prev:()=>turnCard(-1,motion),next:()=>turnCard(1,motion),motion});}
  };
  function renderLibrary(){
    const render=libraryRender,guard=callback=>(...args)=>{if(currentLibrary(render))return callback(...args);};
    if(!currentLibrary(render))return;
    const rows=filtered();cardIndex=Math.max(0,Math.min(cardIndex,rows.length-1));document.querySelector('#translationCount').textContent=`${rows.length.toLocaleString()}문장`;document.querySelector('#translationStart').disabled=!rows.length;document.querySelector('#tr-play').disabled=!rows.length;
    const selected=view==='card'?rows.slice(cardIndex,cardIndex+1):rows.slice(0,visible);
    document.querySelector('#translationList').innerHTML=selected.length?selected.map(readingCard).join(''):'<section class="card sentence-empty"><h2>문장이 없어요</h2><button class="secondary" id="translationResetFilters">필터 초기화</button></section>';
    document.querySelector('#translationPagination').innerHTML=view==='card'?`<button class="secondary" id="translationPrevious" ${!rows.length||cardIndex===0?'disabled':''}>← 이전</button><span>${rows.length?cardIndex+1:0} / ${rows.length.toLocaleString()}<small class="sentence-swipe-hint">좌우로 밀기</small></span><button class="secondary" id="translationNext" ${!rows.length||cardIndex>=rows.length-1?'disabled':''}>다음 →</button>`:(visible<rows.length?`<button class="secondary tr-more" id="translationMore">더 보기 (${Math.min(visible,rows.length)} / ${rows.length})</button>`:'');
    const stage=document.querySelector('#translationList');
    document.querySelector('#translationPrevious')?.addEventListener('click',guard(()=>animateTurnCard(-1,stage)));document.querySelector('#translationNext')?.addEventListener('click',guard(()=>animateTurnCard(1,stage)));document.querySelector('#translationMore')?.addEventListener('click',guard(()=>{visible+=12;renderLibrary();}));
    document.querySelector('#translationResetFilters')?.addEventListener('click',guard(()=>{topic='all';search='';cardIndex=0;window.SentencePractice?.setLevel(0);translationPage();}));
    document.querySelectorAll('[data-tr-listen]').forEach(b=>b.onclick=guard(()=>TranslationAudio.start([bank().find(w=>w.id===b.dataset.trListen)],0,true)));document.querySelectorAll('[data-tr-practice]').forEach(b=>b.onclick=guard(()=>practiceRows([bank().find(w=>w.id===b.dataset.trPractice)])));
    document.querySelectorAll('[data-tr-close-detail]').forEach(b=>b.onclick=guard(()=>{const detail=document.querySelector(`[data-tr-details="${b.dataset.trCloseDetail}"]`);if(detail)detail.open=false;}));
    updatePlayer();
    window.MenuAudio?.refresh?.();
  }

  function lessonMethodHTML(w) {
    const method = w.kind === 'typing' ? 'typing' : 'cards';
    return `<div class="tr-mode-settings"><div class="sentence-method-switch" role="group" aria-label="현재 문장 풀이 방식">${['cards','typing'].map(value=>`<button type="button" class="secondary" data-sentence-method="${value}" aria-pressed="${method===value}">${modeLabel(value)}</button>`).join('')}</div><button type="button" class="text-btn" id="tr-default-toggle" aria-expanded="false" aria-controls="tr-default-panel">전체: ${modeLabel(defaultMode())}</button><section class="sentence-default-panel" id="tr-default-panel" hidden role="dialog" aria-label="전체 문장 풀이 방식"><div class="sentence-panel-heading"><h2>전체 문장 풀이 방식</h2><button type="button" class="text-btn" id="tr-default-close">닫기 ×</button></div><p>기본 방식으로 저장하고, 이번 학습의 아직 풀지 않은 문장에 적용해요.</p><div class="sentence-default-mode" role="group" aria-label="전체 문장 풀이 방식">${['cards','typing'].map(value=>`<button type="button" class="secondary" data-sentence-default="${value}" aria-pressed="${defaultMode()===value}">${modeLabel(value)}</button>`).join('')}</div></section></div>`;
  }
  function bindLessonMethods(w,s,isCurrent,saveDraft) {
    const editable = () => isCurrent() && !s.answered;
    const switchMethod = (method,all) => {
      const api = window.SentencePractice;
      if (!editable() || !api || !['cards','typing'].includes(method)) return false;
      if (!all && method === (w.kind === 'typing' ? 'typing' : 'cards')) return false;
      const nextItems = s.items.map((item,index) => (all ? index >= s.index : index === s.index) ? api.toMode(item,method) : item);
      if (all && !api.setMode(method)) return false;
      saveDraft();
      window.MobileUI?.cancelMotion?.();TranslationAudio.stop();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      document.querySelector('#tr-typed-answer')?.blur?.();
      s.items = nextItems;
      if (all) s.sentenceMode = method;
      quiz();
      return true;
    };
    document.querySelectorAll('[data-sentence-method]').forEach(button=>button.onclick=()=>switchMethod(button.dataset.sentenceMethod,false));
    document.querySelectorAll('[data-sentence-default]').forEach(button=>button.onclick=()=>switchMethod(button.dataset.sentenceDefault,true));
    const toggle=document.querySelector('#tr-default-toggle'),panel=document.querySelector('#tr-default-panel');
    const close=()=>{if(!isCurrent())return;panel.hidden=true;toggle.setAttribute('aria-expanded','false');fitLesson();};
    toggle.onclick=()=>{if(!editable())return;window.MobileUI?.cancelMotion?.();panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));fitLesson();};
    document.querySelector('#tr-default-close').onclick=close;
    panel.onkeydown=event=>{if(event.key==='Escape')close();};
  }
  function lockLessonMethods() {
    document.querySelectorAll('[data-sentence-method]').forEach(button=>button.disabled=true);
    document.querySelectorAll('[data-sentence-default]').forEach(button=>button.disabled=true);
    const toggle=document.querySelector('#tr-default-toggle');
    if(toggle){toggle.disabled=true;toggle.setAttribute('aria-expanded','false');}
    const panel=document.querySelector('#tr-default-panel');if(panel)panel.hidden=true;
  }
  const fitLesson = () => window.MobileUI?.fitLesson?.();
  function lessonMotion(s,canAdvance) {
    const target=()=>main.querySelector('.quiz-card')||main.querySelector('.tr-question')||main.querySelector('.lesson-summary');
    const key=()=>main.querySelector('.quiz')?.dataset.lessonKey||(main.querySelector('.lesson-summary')?`summary:${s.index}:${s.items.length}:${s.correct}`:'');
    const isActive=()=>Boolean(session===s&&document.querySelector('#main')===main&&main.isConnected!==false&&target()&&target().isConnected!==false&&!Array.from(main.querySelectorAll('details')).some(panel=>panel.open)&&!(main.querySelector('#tr-help-panel')&&!main.querySelector('#tr-help-panel').hidden)&&!(main.querySelector('#tr-default-panel')&&!main.querySelector('#tr-default-panel').hidden));
    return {target,key,isActive,canMove:direction=>direction===1&&isActive()&&canAdvance()};
  }
  function bindLessonAdvance(s,isCurrent,getAdvanced,setAdvanced) {
    const motion=lessonMotion(s,()=>!getAdvanced()&&isCurrent()&&s.answered);
    const advanceCore=()=>{if(getAdvanced()||!isCurrent()||!s.answered)return false;setAdvanced();TranslationAudio.stop();s.index++;quiz();return true;};
    document.querySelector('#tr-next-question').onclick=()=>{if(window.MobileUI?.transitionCard){if(!motion.canMove(1))return false;return window.MobileUI.transitionCard({direction:1,...motion,navigate:advanceCore});}return advanceCore();};
    window.MobileUI?.bindSwipe(main.querySelector('.quiz'),{prev:()=>false,next:advanceCore,motion});
  }
  function bindLessonPanels(isCurrent) {
    for (const button of document.querySelectorAll('[data-tr-close-panel]')) button.onclick = () => {
      if (!isCurrent()) return;
      const panel = document.getElementById(button.dataset.trClosePanel);
      if (panel) panel.open = false;
    };
  }
  function lessonFeedback(w,{ok,text='',typed=false,skipped=false,hinted=false}) {
    const heading=ok?'✓ 정답이에요':skipped?'예시 문장을 살펴보세요':'예시 답안과 달라요';
    const diff=typed&&!ok&&!skipped?(window.SentenceDiff?.render(w,text,{accepted:ok})||`<section class="sentence-diff"><p class="sentence-diff-label">내가 쓴 문장</p><p lang="en">${esc(text)}</p></section>`):'';
    return `<div class="feedback tr-lesson-result ${ok?'':'wrong'}"><div class="tr-result-heading">${heading}</div><p lang="en" class="tr-correct">${esc(w.english)}</p><p class="tr-feedback-korean">${esc(w.korean)}</p>${diff}</div>${typed&&!ok&&!skipped?'<button class="secondary tr-self-correct" id="tr-self-correct">내 답도 정답으로 기록</button>':''}<div class="tr-feedback-actions"><button class="listen" id="tr-listen-answer">영어 듣기</button><details class="tr-lesson-details" id="tr-feedback-more"><summary class="secondary">해설·출처</summary><section class="tr-lesson-panel"><button class="text-btn" data-tr-close-panel="tr-feedback-more">닫기 ×</button><h2>문장 해설</h2><p lang="en" class="tr-detail-english">${esc(w.english)}</p><p>${esc(w.korean)}</p>${text?`<p class="tr-your-answer">${typed?'내 번역':'내 문장'}: ${esc(text)}</p>`:''}<p class="tr-explanation"><strong>${esc(w.grammar)}</strong><br>${esc(w.note)}</p>${hinted?'<p>힌트를 사용했어요.</p>':''}${typed?'<p>예시 답안과 비교하는 채점이에요. 뜻이 같은 다른 번역도 가능해요. 모든 자연스러운 번역을 판단하는 AI 채점은 아닙니다.</p>':''}${sourceHTML(w)}</section></details></div><p id="tr-quiz-audio-status" role="status" class="muted"></p><button class="primary tr-check" id="tr-next-question">다음 문장 →</button>`;
  }

  window.renderTranslationQuiz = function (w, s) {
    window.MobileUI?.cardMode(false);window.MobileUI?.lessonMode?.(true);
    TranslationAudio.stop();
    const render = ++lessonRender, questionIndex = s.index, draft = draftFor(w,s,questionIndex), isCurrent = () => currentQuestion(w,s,questionIndex,render);
    const source = tokenise(w.english).map((word, id) => ({id, word: word === 'I' ? word : word.toLowerCase()}));
    let cards = draft.order?.length===source.length ? draft.order.map(id=>source[id]) : shuffle(source), selected = [...draft.selected], hinted = draft.hinted, submitted = false, advanced = false;
    const saveDraft = () => {draft.order=cards.map(card=>card.id);draft.selected=[...selected];draft.hinted=hinted;};
    const canEdit = () => isCurrent() && !s.answered && !submitted;
    if (cards.every((card, i) => card.id === i)) cards = [...cards.slice(1), cards[0]];
    main.innerHTML = `<div class="quiz tr-quiz tr-cards-lesson" data-lesson-key="${esc(w.id)}" data-lesson-render="${render}"><div class="quiz-top"><button class="text-btn" id="exitQuiz" aria-label="학습 끝내기">✕</button><div class="progress"><div style="width:${s.index/s.items.length*100}%"></div></div><span class="muted">${s.index+1} / ${s.items.length}</span><button class="text-btn" id="tr-korean-listen" aria-label="한국어 문장 듣기">듣기</button><button class="text-btn" id="tr-help-toggle" aria-expanded="false" aria-controls="tr-help-panel">도움</button></div><section class="tr-help-panel" id="tr-help-panel" hidden role="dialog" aria-label="카드 배열 도움"><div class="tr-help-heading"><strong>카드 배열 도움</strong><button class="text-btn" id="tr-help-close">닫기 ×</button></div><div class="tr-tools"><button class="text-btn" id="tr-undo">되돌리기</button><button class="text-btn" id="tr-clear">비우기</button><button class="text-btn" id="tr-hint">힌트</button><button class="text-btn" id="tr-skip">모르겠어요</button></div></section><h1 class="tr-lesson-heading">영어로 만들어 보세요</h1>${lessonMethodHTML(w)}<section class="card tr-question"><div class="section-head"><span class="pill">${esc(quizLevel(w))}</span><span class="sentence-level-badge">${esc(levelBadge(w))}</span><span id="tr-card-status" role="status" class="muted"></span></div><p class="tr-korean">${esc(w.korean)}</p><div class="tr-workspace" id="tr-workspace"><span class="sentence-sr-only" id="tr-answer-label">나의 영어 문장</span><div class="tr-answer" id="tr-answer" role="group" aria-labelledby="tr-answer-label"></div><div class="tr-bank" id="tr-bank" role="group" aria-label="영어 단어 카드"></div></div><div class="tr-question-controls" id="tr-question-controls"><button class="primary tr-check" id="tr-check">정답 확인</button></div><div id="tr-feedback" aria-live="polite"></div></section></div>`;
    function closeCardHelp(){if(!isCurrent())return;document.querySelector('#tr-help-panel').hidden=true;document.querySelector('#tr-help-toggle').setAttribute('aria-expanded','false');}
    document.querySelector('#tr-help-toggle').onclick=()=>{if(!canEdit())return;const panel=document.querySelector('#tr-help-panel');panel.hidden=!panel.hidden;document.querySelector('#tr-help-toggle').setAttribute('aria-expanded',String(!panel.hidden));};
    document.querySelector('#tr-help-close').onclick=()=>{if(isCurrent())closeCardHelp();};
    document.querySelector('#tr-help-panel').onkeydown=event=>{if(event.key==='Escape')closeCardHelp();};
    const draw = focusId => {
      saveDraft();
      document.querySelector('#tr-answer').innerHTML = selected.length ? selected.map(id => `<button class="tr-token selected" data-tr-remove="${id}" lang="en" aria-label="${esc(source[id].word)} 빼기">${esc(source[id].word)}</button>`).join('') : '<span class="tr-placeholder">단어 카드를 눌러 문장을 완성하세요.</span>';
      document.querySelector('#tr-bank').innerHTML = cards.map(card => `<button class="tr-token ${selected.includes(card.id) ? 'used' : ''}" data-tr-add="${card.id}" lang="en" ${selected.includes(card.id) ? 'disabled' : ''} aria-label="${esc(card.word)} 추가">${esc(card.word)}</button>`).join('');
      document.querySelector('#tr-card-status').textContent = `${selected.length} / ${source.length}개 카드 선택${hinted ? ' · 힌트 사용' : ''}`;
      document.querySelector('#tr-undo').disabled = !selected.length;
      document.querySelector('#tr-clear').disabled = !selected.length;
      document.querySelector('#tr-check').disabled = selected.length !== source.length;
      document.querySelectorAll('[data-tr-add]').forEach(b => b.onclick = () => { const id = Number(b.dataset.trAdd); if (!canEdit() || selected.includes(id) || !source[id]) return; selected.push(id); draw(); });
      document.querySelectorAll('[data-tr-remove]').forEach(b => b.onclick = () => { if (!canEdit()) return; const id = Number(b.dataset.trRemove); selected = selected.filter(n => n !== id); draw(id); });
      if (focusId !== undefined) document.querySelector(`[data-tr-add="${focusId}"]`)?.focus({preventScroll:true});
      fitLesson();
    };
    const submit = skipped => {
      if (submitted || s.answered || !isCurrent()) return;
      if (!skipped && selected.length !== source.length) return;
      const text = selected.map(id => source[id].word).join(' ');
      const ok = !skipped && accepts(w, text);
      submitted = true;
      if (!recordLearning(w, ok)) { submitted = false; return; }
      s.answered = true;lockLessonMethods();closeCardHelp();document.querySelector('#tr-help-toggle').disabled=true;
      document.querySelectorAll('.tr-question button').forEach(b => b.disabled = true);
      document.querySelector('.tr-quiz').classList.add('is-answered');document.querySelector('#tr-workspace').hidden=true;document.querySelector('#tr-question-controls').hidden=true;
      document.querySelector('#tr-feedback').innerHTML=lessonFeedback(w,{ok,text,hinted,skipped});
      document.querySelector('#tr-next-question').textContent=s.index+1===s.items.length?'학습 결과 보기':'다음 문장 →';
      bindLessonPanels(isCurrent);fitLesson();
      document.querySelector('#tr-listen-answer').onclick = () => {if(isCurrent())TranslationAudio.start([w],0,true);};
      bindLessonAdvance(s,isCurrent,()=>advanced,()=>{advanced=true;});
      if (state.sound) TranslationAudio.start([w], 0, true);
    };

    document.querySelector('#tr-korean-listen').onclick = () => {if(isCurrent())speakKorean(w.korean);};
    document.querySelector('#exitQuiz').onclick = () => { if (isCurrent()) show(s.returnPage || 'home'); };
    document.querySelector('#tr-undo').onclick = () => { if (!canEdit()) return; closeCardHelp();const id = selected.pop(); draw(id); };
    document.querySelector('#tr-clear').onclick = () => { if (!canEdit()) return; closeCardHelp();selected = []; draw(); };
    document.querySelector('#tr-hint').onclick = () => {
      if (!canEdit()) return;closeCardHelp();
      const prefix = selected.every((id, i) => source[id].word === source[i].word);
      if (!prefix) { toast('놓은 카드의 순서를 먼저 살펴보세요. 첫 카드: ' + source[0].word); return; }
      const next = source[selected.length];
      if (!next) return;
      const unused = source.find(card => card.word === next.word && !selected.includes(card.id));
      selected.push(unused.id); hinted = true; draw();
    };
    document.querySelector('#tr-skip').onclick = () => submit(true);
    document.querySelector('#tr-check').onclick = () => submit(false);
    bindLessonMethods(w,s,isCurrent,saveDraft);
    draw();
  };

  function speakKorean(text) {
    TranslationAudio.stop();
    if (!('speechSynthesis' in window)) { toast('이 기기에서는 한국어 읽기를 지원하지 않아요.'); return; }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'ko-KR'; utterance.rate = .9;
    const voice = speechSynthesis.getVoices().find(v => v.lang.startsWith('ko')); if (voice) utterance.voice = voice;
    utterance.onerror = () => toast('한국어 음성을 재생할 수 없어요. 화면의 문장을 읽어 주세요.');
    speechSynthesis.speak(utterance);
  }
  window.renderTypingQuiz = function (w, s) {
    window.MobileUI?.cardMode(false);window.MobileUI?.lessonMode?.(true);
    TranslationAudio.stop();
    const render = ++lessonRender, questionIndex = s.index, draft = draftFor(w,s,questionIndex), isCurrent = () => currentQuestion(w,s,questionIndex,render);
    let submitted = false, advanced = false, selfCorrected = false;
    main.innerHTML = `<div class="quiz tr-quiz tr-typing-lesson" data-lesson-key="${esc(w.id)}" data-lesson-render="${render}"><div class="quiz-top"><button class="text-btn" id="exitQuiz" aria-label="학습 끝내기">✕</button><div class="progress"><div style="width:${s.index/s.items.length*100}%"></div></div><span class="muted">${s.index+1} / ${s.items.length}</span><button class="text-btn" id="tr-korean-listen" aria-label="한국어 문장 듣기">듣기</button></div><h1 class="tr-lesson-heading">영어 문장을 써 보세요</h1>${lessonMethodHTML(w)}<section class="card tr-question"><div class="section-head"><span class="pill">${esc(quizLevel(w))}</span><span class="sentence-level-badge">${esc(levelBadge(w))}</span><details class="tr-lesson-details tr-prehelp" id="tr-typing-help"><summary class="text-btn">채점 안내</summary><section class="tr-lesson-panel"><button class="text-btn" data-tr-close-panel="tr-typing-help">닫기 ×</button><h2>채점 안내</h2><p>대소문자·문장부호·일부 축약형은 허용해요.</p><p>${isEveryday(w)?'자체 작성한 생활영어 예시 답안':'VOA 원문'}과 비교해요. 뜻이 같은 다른 번역도 가능하며, 모든 자연스러운 번역을 판단하는 AI 채점은 아닙니다.</p></section></details></div><p class="tr-korean">${esc(w.korean)}</p><form id="tr-typing-form"><label class="sentence-sr-only" for="tr-typed-answer">나의 영어 번역</label><textarea id="tr-typed-answer" rows="3" maxlength="600" autocomplete="off" autocapitalize="sentences" spellcheck="false" lang="en" placeholder="Write in English."></textarea><div class="tr-tools"><button type="button" class="text-btn" id="tr-type-hint">첫 구절 힌트</button><button type="button" class="text-btn" id="tr-type-skip">모르겠어요</button></div><p id="tr-type-hint-text" role="status" class="muted"></p><button class="primary tr-check" id="tr-type-check">정답 확인</button></form><div id="tr-feedback" aria-live="polite"></div></section></div>`;
    document.querySelector('#tr-typed-answer').value=draft.text;
    const saveDraft=()=>{draft.text=document.querySelector('#tr-typed-answer').value;};
    document.querySelector('#tr-typed-answer').oninput=()=>{if(isCurrent()&&!submitted&&!s.answered)saveDraft();};
    if(draft.typingHint)document.querySelector('#tr-type-hint-text').textContent=`시작: ${tokenise(w.english).slice(0,3).join(' ')}…`;
    bindLessonMethods(w,s,isCurrent,saveDraft);
    document.querySelector('#exitQuiz').onclick = () => { if (isCurrent()) show(s.returnPage || 'home'); };
    document.querySelector('#tr-korean-listen').onclick = () => {if(isCurrent())speakKorean(w.korean);};
    document.querySelector('#tr-type-hint').onclick = () => {if(submitted||s.answered||!isCurrent())return;draft.hinted=true;draft.typingHint=true;document.querySelector('#tr-type-hint-text').textContent=`시작: ${tokenise(w.english).slice(0,3).join(' ')}…`;fitLesson();};
    const submit = skipped => {
      if (submitted || s.answered || !isCurrent()) return;
      const value = document.querySelector('#tr-typed-answer').value.trim();
      if (!skipped && !value) { toast('영어 문장을 입력하거나 ‘잘 모르겠어요’를 눌러 주세요.'); return; }
      if (!skipped && /[가-힣]/.test(value)) { toast('번역은 영어로 입력해 주세요.'); return; }
      const previous = {...(state.progress[w.id] || {level:0,attempts:0,correct:0})};
      const recordedDay = dayKey();
      const ok = !skipped && acceptsTyped(w, value);
      submitted = true;
      if (!recordLearning(w, ok)) { submitted = false; return; }
      s.answered = true;lockLessonMethods();saveDraft();
      const recordedProgress = state.progress[w.id], recordedHistory = state.history[recordedDay];
      document.querySelector('#tr-typing-form').hidden = true;
      document.querySelector('#tr-typed-answer')?.blur?.();document.querySelector('.tr-quiz').classList.add('is-answered');
      document.querySelector('#tr-feedback').innerHTML=lessonFeedback(w,{ok,text:value,typed:true,skipped,hinted:draft.hinted});
      document.querySelector('#tr-next-question').textContent=s.index+1===s.items.length?'학습 결과 보기':'다음 문장 →';
      bindLessonPanels(isCurrent);fitLesson();
      document.querySelector('#tr-self-correct')?.addEventListener('click', e => {
        const button = e.currentTarget || e.target;
        if (selfCorrected || button.disabled || !isCurrent() || !s.answered) return;
        const p = state.progress[w.id], h = state.history[recordedDay];
        if (!p || !h || p !== recordedProgress || h !== recordedHistory) return;
        selfCorrected = true; button.disabled = true;
        const level = Math.min(previous.level + 1, 7);
        const correctedHistory = {...h,correct:h.correct + 1,translationCorrect:(h.translationCorrect || 0) + 1,typingCorrect:(h.typingCorrect || 0) + 1};
        if (isEveryday(w)) {
          correctedHistory.everydayCorrect = (h.everydayCorrect || 0) + 1;
          correctedHistory.everydayTypingCorrect = (h.everydayTypingCorrect || 0) + 1;
        }
        state.progress[w.id] = {...p,level,correct:p.correct + 1,due:Date.now() + [1,1,3,7,14,30,60,90][level] * 86400000};
        state.history[recordedDay] = correctedHistory;
        s.correct++; save();
        button.textContent = '✓ 직접 확인한 정답으로 기록했어요';
      });
      document.querySelector('#tr-listen-answer').onclick = () => {if(isCurrent())TranslationAudio.start([w],0,true);};
      bindLessonAdvance(s,isCurrent,()=>advanced,()=>{advanced=true;});
      if (state.sound) TranslationAudio.start([w], 0, true);
    };
    document.querySelector('#tr-typing-form').onsubmit = e => { e.preventDefault(); submit(false); };
    document.querySelector('#tr-type-skip').onclick = () => submit(true);
    bindLessonPanels(isCurrent);fitLesson();
    if (innerWidth > 760) document.querySelector('#tr-typed-answer').focus();
  };

  const manifests = new Map(), manifestPromises = new Map(), audioListeners = new Set();
  let audio, interval, ticket = 0, transitioning = false;
  function getAudio() {
    if (!audio) {
      audio = document.createElement('audio'); audio.preload = 'auto'; audio.setAttribute('playsinline', '');
      audio.id = 'translationAudio'; document.body.append(audio);
      audio.addEventListener('error', () => { audio.pause(); clearInterval(interval); TranslationAudio.playing = false; TranslationAudio.message = '음성을 불러오지 못했어요. 인터넷 연결을 확인한 뒤 재생을 눌러 주세요.'; updatePlayer(); });
      audio.addEventListener('ended', advance);
      audio.addEventListener('timeupdate', tick);
    }
    return audio;
  }
  function collectionFor(item) { return (item?.sourceId || item?.id || '').startsWith('everyday-') ? 'everyday' : 'translation'; }
  function loadManifest(collection = 'translation') {
    if (!manifestPromises.has(collection)) {
      const path = collection === 'everyday' ? 'everyday-audio.json' : 'translation-audio-v5.json';
      manifestPromises.set(collection, fetch(path).then(response => { if (!response.ok) throw Error('manifest'); return response.json(); }).then(data => { manifests.set(collection,data); return data; }).catch(error => { manifestPromises.delete(collection); throw error; }));
    }
    return manifestPromises.get(collection);
  }
  function current() { return TranslationAudio.queue[TranslationAudio.index]; }
  function clipFor() { return manifests.get(collectionFor(current()))?.clips[current()?.sourceId || current()?.id]; }
  async function playCurrent(reset = true) {
    const run = ++ticket, a = getAudio();
    transitioning = true; TranslationAudio.message = '음성을 준비하고 있어요…'; updatePlayer();
    try {
      const collection = collectionFor(current());
      if (!manifests.has(collection)) await loadManifest(collection); if (run !== ticket) return;
      const clip = clipFor(); if (!clip) throw Error('missing clip');
      const url = new URL(clip.src, document.baseURI).href;
      let started;
      if (a.src !== url || a.error || a.readyState === 0) {
        a.src = url; a.load();
        // Call play during the tap before awaiting metadata, which is required on iOS.
        started = a.play(); started.catch(() => {});
        await new Promise((resolve, reject) => {
          if (a.readyState >= 1) { resolve(); return; }
          const timer = setTimeout(() => { clear(); reject(Error('timeout')); }, 20000);
          const clear = () => { clearTimeout(timer); a.removeEventListener('loadedmetadata', ready); a.removeEventListener('error', failed); };
          const ready = () => { clear(); resolve(); }; const failed = () => { clear(); reject(Error('audio')); };
          a.addEventListener('loadedmetadata', ready); a.addEventListener('error', failed);
        });
      }
      if (run !== ticket) return;
      if (reset || a.currentTime < clip.start || a.currentTime >= clip.end) a.currentTime = clip.start;
      a.playbackRate = TranslationAudio.rate;
      await (started || a.play()); if (run !== ticket) return;
      transitioning = false; TranslationAudio.playing = true; TranslationAudio.message = '';
      clearInterval(interval); interval = setInterval(tick, 70);
      updatePlayer();
      if ('mediaSession' in navigator) {
        if (typeof MediaMetadata === 'function') navigator.mediaSession.metadata = new MediaMetadata({title:current().english,artist:'정보카 · Michael · 미국 영어',album:collectionFor(current()) === 'everyday' ? '생활영어 1,000문장' : 'VOA 원문 번역 3,000문장'});
        for (const [name, action] of [['play', () => TranslationAudio.resume()], ['pause', () => TranslationAudio.pause()], ['nexttrack', () => TranslationAudio.step(1)], ['previoustrack', () => TranslationAudio.step(-1)]]) { try { navigator.mediaSession.setActionHandler(name, action); } catch {} }
      }
    } catch (error) {
      if (run !== ticket) return;
      a.pause(); clearInterval(interval);
      transitioning = false; TranslationAudio.playing = false;
      TranslationAudio.message = error.name === 'NotAllowedError' ? '재생 버튼을 한 번 더 눌러 음성을 시작해 주세요.' : '음성 연결이 끊겼어요. 인터넷 연결 후 재생 버튼으로 다시 시도해 주세요.';
      updatePlayer();
    }
  }
  function tick() {
    if (!TranslationAudio.playing || transitioning) return;
    const clip = clipFor(); if (!clip) return;
    const bar = document.querySelector('#tr-audio-bar');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, (audio.currentTime - clip.start) / (clip.end - clip.start) * 100))}%`;
    if (audio.currentTime >= clip.end) advance();
  }
  function advance() {
    if (transitioning || !TranslationAudio.playing) return;
    const old = clipFor();
    if (TranslationAudio.single && !TranslationAudio.repeat) { finishQueue(); return; }
    if (TranslationAudio.repeat) { playCurrent(); return; }
    if (!TranslationAudio.loopQueue && TranslationAudio.index >= TranslationAudio.queue.length - 1) { finishQueue(); return; }
    TranslationAudio.index = (TranslationAudio.index + 1) % TranslationAudio.queue.length;
    const next = clipFor();
    if (next && old && next.src === old.src && next.start >= old.end && next.start - old.end < .6 && !audio.ended) { updatePlayer(); return; }
    playCurrent();
  }
  function audioState(ended=false) {
    return Object.freeze({item:current(),index:TranslationAudio.index,length:TranslationAudio.queue.length,queue:TranslationAudio.queue,playing:TranslationAudio.playing,message:TranslationAudio.message,transitioning,ended:Boolean(ended),rate:TranslationAudio.rate,repeat:TranslationAudio.repeat,loopQueue:TranslationAudio.loopQueue,single:TranslationAudio.single});
  }
  function pauseAudio(ended=false) {
    ++ticket; transitioning=false;getAudio().pause();TranslationAudio.playing=false;clearInterval(interval);updatePlayer(ended);
  }
  function finishQueue() {
    TranslationAudio.message=TranslationAudio.single?'문장 재생을 마쳤어요.':'전체 문장 재생을 마쳤어요.';
    pauseAudio(true);
  }
  function updatePlayer(ended=false) {
    const w = current(), status = TranslationAudio.message || (w ? `${TranslationAudio.index + 1} / ${TranslationAudio.queue.length}문장 · ${TranslationAudio.playing ? '재생 중' : '일시 정지'}` : 'Michael · 미국 영어');
    const en = document.querySelector('#tr-now-en'); if (en) en.textContent = w?.english || '재생을 누르면 첫 문장부터 시작해요.';
    const ko = document.querySelector('#tr-now-ko'); if (ko) ko.textContent = w?.korean || '';
    const source = document.querySelector('#tr-now-source'); if (source) source.innerHTML = sourceHTML(w);
    for (const id of ['tr-audio-status','tr-quiz-audio-status']) { const el = document.getElementById(id); if (el) el.textContent = status; }
    window.Everyday?.audioUpdated(w,status);
    const play = document.querySelector('#tr-play'); if (play) play.textContent = TranslationAudio.playing ? 'Ⅱ 일시 정지' : w ? '▶ 이어 듣기' : '▶ 연속 듣기';
    const repeat = document.querySelector('#tr-repeat'); if (repeat) repeat.checked = TranslationAudio.repeat;
    const snapshot=audioState(ended);
    for(const listener of [...audioListeners]) {try{listener(snapshot);}catch{}}
  }
  window.TranslationAudio = {
    queue:[], index:0, playing:false, rate:1, repeat:false, loopQueue:true, random:false, single:false, message:'',
    subscribe(listener) {if(typeof listener!=='function')return()=>{};audioListeners.add(listener);try{listener(audioState());}catch{}return()=>audioListeners.delete(listener);},
    start(items, index = 0, single = false) {
      if (!items.length) { toast('재생할 문장이 없어요.'); return; }
      this.stop(); if ('speechSynthesis' in window) speechSynthesis.cancel();
      this.queue = this.random && !single ? shuffle(items) : [...items]; this.index = Math.min(index, items.length - 1); this.single = single;
      if (single) this.repeat = false;
      playCurrent();
    },
    pause() { pauseAudio(); },
    resume() { if (this.queue.length) playCurrent(false); },
    stop() { this.pause(); this.queue = []; this.index = 0; this.message = ''; this.single = false; updatePlayer(); },
    step(delta) { if (!this.queue.length) return; this.index = (this.index + delta + this.queue.length) % this.queue.length; playCurrent(); },
    setRate(rate) { if (![.75,.9,1,1.1,1.25].includes(rate)) return; this.rate = rate; getAudio().playbackRate = rate; }
  };
  window.addEventListener('pagehide', () => TranslationAudio.stop());
  // Load only the small cue index, never the 3,000-sentence audio collection.
  loadManifest().catch(() => {});
  loadManifest('everyday').catch(() => {});
})();
