/* Original everyday English: mobile reading cards and existing practice/audio. */
(() => {
  'use strict';
  const E={topic:'',query:'',view:'card',index:0,visible:20,reveal:true,filters:false,audioOptions:false};
  const bank=()=>window.EVERYDAY_BANK||[],sources=()=>window.EVERYDAY_SOURCES||[];
  const normal=text=>String(text||'').toLocaleLowerCase().trim();
  const filtered=()=>window.SentencePractice.filter(bank().filter(item=>(!E.topic||item.topic===E.topic)&&(!E.query||normal(`${item.english} ${item.korean} ${item.note}`).includes(normal(E.query)))));
  const topicOptions=selected=>'<option value="">모든 상황</option>'+[...new Set(bank().map(item=>item.topic))].map(topic=>`<option value="${esc(topic)}" ${topic===selected?'selected':''}>${esc(topic)}</option>`).join('');
  function progressCount(){const progress=state.progress||{};return bank().filter(item=>{const n=item.id.replace(/^everyday-/,'');return progress[`ec${n}`]?.attempts>0||progress[`et${n}`]?.attempts>0;}).length;}
  function startPractice(sourceId){
    const ids=new Set(filtered().map(item=>item.id));
    const items=(window.everydayLearningItems?.()||[]).filter(item=>ids.has(item.sourceId)&&(!sourceId||item.sourceId===sourceId));
    if(!items.length){toast('학습할 문장이 없어요.');return;}
    window.MobileUI?.cardMode(false);startTranslation(items,window.SentencePractice.getMode());
  }
  function references(item){return(item.sourceIds||[]).map(id=>sources().find(source=>source.id===id)).filter(Boolean).flatMap(source=>{try{const url=new URL(source.url);if(url.protocol!=='https:'||!['learnenglish.britishcouncil.org','learnenglishteens.britishcouncil.org','dictionary.cambridge.org','americanenglish.state.gov','www.americanenglish.org','americanenglish.org'].includes(url.hostname))return[];return[`<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a>`];}catch{return[];}}).join('');}
  function card(item){const showEnglish=E.view==='list'||E.reveal;return`<article class="card everyday-card sentence-card" data-everyday-id="${esc(item.id)}"><div class="sentence-card-meta"><span class="pill">${esc(item.topic)}</span><span class="pill sentence-level-badge">${esc(window.SentencePractice.label(item))}</span><details class="everyday-reference sentence-details" data-everyday-details="${esc(item.id)}"><summary>해설·출처</summary><div class="sentence-detail-panel"><button class="text-btn sentence-panel-close" data-everyday-close-detail="${esc(item.id)}">닫기 ×</button><h3>표현과 용법</h3><p class="everyday-note" ${!showEnglish?'hidden':''}>${esc(item.note)}</p><p>자체 작성 예문·번역입니다. 공식 자료는 용법 참고용이에요.</p>${references(item)}</div></details></div><div class="sentence-copy" data-language="${showEnglish?'english':'korean'}"><p class="everyday-english sentence-english" lang="en" ${!showEnglish?'hidden':''}>${esc(item.english)}</p><p class="everyday-korean sentence-korean">${esc(item.korean)}</p></div><div class="sentence-card-actions"><button class="listen" data-everyday-listen="${esc(item.id)}">듣기</button><button class="primary" data-everyday-practice="${esc(item.id)}" aria-label="이 문장 연습">연습하기</button><button class="secondary" data-everyday-score="${esc(item.id)}">발음 평가</button></div></article>`;}
  function queueMatches(items){const ids=new Set(TranslationAudio.queue.map(item=>item.sourceId||item.id));return items.length===TranslationAudio.queue.length&&items.every(item=>ids.has(item.id));}
  function cardMotion(stage){
    const target=()=>stage?.querySelectorAll('.sentence-card')[0]||null;
    const key=()=>target()?.dataset.everydayId||null;
    const isActive=()=>Boolean(stage&&stage.isConnected!==false&&document.querySelector('#everydayResults')===stage&&E.view==='card'&&!E.filters&&!E.audioOptions&&!Array.from(stage.querySelectorAll('[data-everyday-details]')).some(detail=>detail.open)&&key()&&key()===filtered()[E.index]?.id);
    const canMove=direction=>isActive()&&(direction===-1||direction===1)&&E.index+direction>=0&&E.index+direction<filtered().length;
    return{target,key,isActive,canMove};
  }
  function turn(delta,motion=cardMotion(document.querySelector('#everydayResults'))){
    if(!motion.canMove(delta))return false;
    E.index+=delta;renderResults();return true;
  }
  function animateTurn(delta,stage){
    const motion=cardMotion(stage),key=motion.key(),target=motion.target();
    if(!motion.canMove(delta))return;
    const navigate=()=>{if(motion.isActive()&&motion.key()===key&&motion.target()===target)return turn(delta,motion);return false;};
    if(window.MobileUI?.transitionCard)window.MobileUI.transitionCard({direction:delta,...motion,navigate});else navigate();
  }
  function setPanel(kind,open){const filter=kind==='filters';if(open){E.filters=false;E.audioOptions=false;document.querySelector('#everydayFilters').hidden=true;document.querySelector('#everydayAudioOptionsPanel').hidden=true;document.querySelector('#everydayFilterToggle').setAttribute('aria-expanded','false');document.querySelector('#everydayAudioOptions').setAttribute('aria-expanded','false');}E[filter?'filters':'audioOptions']=open;document.querySelector(filter?'#everydayFilters':'#everydayAudioOptionsPanel').hidden=!open;document.querySelector(filter?'#everydayFilterToggle':'#everydayAudioOptions').setAttribute('aria-expanded',String(open));}
  function syncStudySettings(){
    for(const button of document.querySelectorAll('[data-sentence-default]'))button.setAttribute('aria-pressed',String(button.dataset.sentenceDefault===window.SentencePractice.getMode()));
    const level=document.querySelector('#everydayLevel');if(level)level.value=String(window.SentencePractice.getLevel());
  }
  function renderResults(){
    window.MobileUI?.cancelMotion?.();syncStudySettings();
    const items=filtered();E.index=Math.max(0,Math.min(E.index,items.length-1));
    document.querySelector('#everydayCount').textContent=`${items.length.toLocaleString('ko-KR')}문장`;
    document.querySelector('#everydayLearnedCount').textContent=`${progressCount().toLocaleString('ko-KR')} / ${bank().length.toLocaleString('ko-KR')} 학습`;
    document.querySelector('#everydayPracticeInfo').textContent=items.length?`${items.length.toLocaleString('ko-KR')}문장 · 오늘의 학습에 반영`:'검색 결과가 없어요';
    const selected=E.view==='card'?items.slice(E.index,E.index+1):items.slice(0,E.visible);
    document.querySelector('#everydayResults').innerHTML=selected.length?selected.map(card).join(''):`<section class="card sentence-empty"><h2>이 단계·조건에는 생활영어 문장이 없어요</h2><p>다른 단계를 골라 주세요.</p>${window.SentencePractice.getLevel()>=4?'<p>4~5단계 문장은 번역 연습에서 학습할 수 있어요.</p><button class="primary" data-page="translation">번역 연습으로</button>':''}<button class="secondary" id="everydayResetFilters">필터 초기화</button></section>`;
    document.querySelector('#everydayPagination').innerHTML=E.view==='card'?`<button class="secondary" id="everydayPrevious" ${!items.length||E.index===0?'disabled':''}>← 이전</button><span>${items.length?E.index+1:0} / ${items.length.toLocaleString('ko-KR')}<small class="sentence-swipe-hint">좌우로 밀기</small></span><button class="secondary" id="everydayNext" ${!items.length||E.index>=items.length-1?'disabled':''}>다음 →</button>`:(E.visible<items.length?`<button class="secondary" id="everydayMore">더 보기 (${Math.min(E.visible,items.length)} / ${items.length})</button>`:'');
    const stage=document.querySelector('#everydayResults');
    document.querySelector('#everydayPrevious')?.addEventListener('click',()=>animateTurn(-1,stage));document.querySelector('#everydayNext')?.addEventListener('click',()=>animateTurn(1,stage));
    document.querySelector('#everydayMore')?.addEventListener('click',()=>{E.visible+=20;renderResults();});
    document.querySelector('#everydayResetFilters')?.addEventListener('click',()=>{E.topic='';E.query='';E.index=0;E.visible=20;window.SentencePractice.setLevel(0);TranslationAudio.stop();everydayPage();});
    for(const b of document.querySelectorAll('[data-everyday-listen]'))b.onclick=()=>{const item=bank().find(row=>row.id===b.dataset.everydayListen);if(item)TranslationAudio.start([item],0,true);};
    for(const b of document.querySelectorAll('[data-everyday-score]'))b.onclick=()=>window.Pronunciation.open('everyday',b.dataset.everydayScore);
    for(const b of document.querySelectorAll('[data-everyday-practice]'))b.onclick=()=>startPractice(b.dataset.everydayPractice);
    for(const b of document.querySelectorAll('[data-everyday-close-detail]'))b.onclick=()=>{document.querySelector(`[data-everyday-details="${b.dataset.everydayCloseDetail}"]`).open=false;};
    for(const id of ['everydayStart','everydayPlay','everydayRandom','everydayOpenPronunciation'])document.querySelector('#'+id).disabled=!items.length;
    window.MenuAudio?.refresh();
  }
  window.everydayPage=function(){
    E.filters=false;E.audioOptions=false;window.MobileUI?.lessonMode?.(false);window.MobileUI?.cardMode(E.view==='card');
    main.innerHTML=`<section class="sentence-browser everyday-browser ${E.view==='card'?'is-card':'is-list'}" aria-label="생활영어 1,000문장">
      <header class="sentence-browser-header"><div><h1>생활영어</h1><p id="everydayLearnedCount" class="sentence-learning-count" role="status"></p></div><button class="secondary sentence-filter-toggle" id="everydayFilterToggle" aria-expanded="false" aria-controls="everydayFilters">필터</button></header>
      <div class="browser-popover" id="everydayFilters" hidden><div class="sentence-panel-heading"><h2>문장 찾기</h2><button class="text-btn" id="everydayFilterClose">닫기 ×</button></div><div class="everyday-filters"><label>상황<select id="everydayTopic">${topicOptions(E.topic)}</select></label><label>검색<input id="everydaySearch" type="search" value="${esc(E.query)}" placeholder="영어·한국어" autocomplete="off"></label></div><div class="actions"><button class="secondary" id="everydayRandom">무작위 카드</button><button class="primary" id="everydayFilterDone">적용</button></div></div>
      <div class="sentence-viewbar"><div class="sentence-view-switch" role="group" aria-label="읽기 보기 방식"><button id="everydayCardView" aria-pressed="${E.view==='card'}">카드 보기</button><button id="everydayListView" aria-pressed="${E.view==='list'}">목록 보기</button></div><label class="sentence-reveal" ${E.view==='list'?'hidden':''}><input id="everydayReveal" type="checkbox" ${E.reveal?'checked':''}> <span class="sentence-reveal-normal">영어 보기</span><span class="sentence-reveal-compact">영어 ↔ 한국어</span></label><span id="everydayCount" class="sentence-count"></span></div>
      <div class="sentence-practicebar"><div class="sentence-study-settings"><div class="sentence-default-mode" role="group" aria-label="전체 문장 풀이 방식"><button type="button" data-sentence-default="cards" aria-pressed="${window.SentencePractice.getMode()==='cards'}">카드 배열</button><button type="button" data-sentence-default="typing" aria-pressed="${window.SentencePractice.getMode()==='typing'}">직접 입력</button></div><label class="sentence-level-select"><span>난이도</span><select id="everydayLevel" aria-label="문장 난이도">${window.SentencePractice.levelOptions()}</select></label></div><button class="primary" id="everydayStart">학습 시작</button><span id="everydayPracticeInfo" class="sentence-sr-only"></span></div>
      <section id="everydayResults" class="everyday-results sentence-stage" aria-label="생활영어 문장, 좌우로 밀어서 이동" tabindex="0"></section><div id="everydayPagination" class="everyday-pagination sentence-pagination"></div>
      <section class="sentence-audio everyday-player" aria-label="생활영어 연속 듣기"><div class="sentence-audio-controls"><button class="secondary" id="everydayAudioPrevious" aria-label="이전 음성">⏮</button><button class="primary" id="everydayPlay">연속 듣기</button><button class="secondary" id="everydayAudioNext" aria-label="다음 음성">⏭</button><button class="secondary" id="everydayAudioOptions" aria-controls="everydayAudioOptionsPanel" aria-expanded="false">옵션</button></div><p id="everydayAudioStatus" class="sentence-audio-status" role="status">Michael · 미국 영어</p><div id="everydayAudioOptionsPanel" class="browser-popover" hidden><div class="sentence-panel-heading"><h2>듣기 옵션</h2><button class="text-btn" id="everydayAudioClose">닫기 ×</button></div><p id="everydayNow" lang="en">문장을 골라 들을 수 있어요.</p><p id="everydayNowKo" class="muted"></p><div class="actions"><button class="secondary" id="everydayPause">일시 정지</button><button class="secondary" id="everydayOpenPronunciation">생활영어 발음 평가</button></div><p class="sentence-audio-note">음성 재생은 인터넷 연결이 필요해요.</p></div></section>
    </section>`;
    document.querySelector('#everydayFilterToggle').onclick=()=>setPanel('filters',!E.filters);for(const id of ['everydayFilterClose','everydayFilterDone'])document.querySelector('#'+id).onclick=()=>setPanel('filters',false);
    document.querySelector('#everydayAudioOptions').onclick=()=>setPanel('audio',!E.audioOptions);document.querySelector('#everydayAudioClose').onclick=()=>setPanel('audio',false);
    document.querySelector('#everydayTopic').onchange=e=>{E.topic=e.target.value;E.index=0;E.visible=20;renderResults();};document.querySelector('#everydaySearch').oninput=e=>{E.query=e.target.value;E.index=0;E.visible=20;renderResults();};
    for(const button of document.querySelectorAll('[data-sentence-default]'))button.onclick=()=>{if(window.SentencePractice.setMode(button.dataset.sentenceDefault)){window.MobileUI?.cancelMotion?.();syncStudySettings();}};
    document.querySelector('#everydayLevel').onchange=e=>{if(window.SentencePractice.setLevel(Number(e.target.value))){E.index=0;E.visible=20;TranslationAudio.stop();renderResults();}};
    document.querySelector('#everydayStart').onclick=()=>startPractice();
    for(const[id,view]of[['everydayCardView','card'],['everydayListView','list']])document.querySelector('#'+id).onclick=()=>{E.view=view;E.index=0;E.visible=20;everydayPage();};
    document.querySelector('#everydayReveal').onchange=e=>{E.reveal=e.target.checked;renderResults();};
    document.querySelector('#everydayRandom').onclick=()=>{const size=filtered().length;if(size){E.view='card';E.index=Math.floor(Math.random()*size);everydayPage();}};
    document.querySelector('#everydayPlay').onclick=()=>{const items=filtered();if(queueMatches(items)){if(TranslationAudio.playing)TranslationAudio.pause();else TranslationAudio.resume();}else TranslationAudio.start(items);};
    document.querySelector('#everydayPause').onclick=()=>TranslationAudio.pause();
    document.querySelector('#everydayAudioPrevious').onclick=()=>{if((TranslationAudio.queue[0]?.sourceId||TranslationAudio.queue[0]?.id||'').startsWith('everyday-'))TranslationAudio.step(-1);};document.querySelector('#everydayAudioNext').onclick=()=>{if((TranslationAudio.queue[0]?.sourceId||TranslationAudio.queue[0]?.id||'').startsWith('everyday-'))TranslationAudio.step(1);};
    document.querySelector('#everydayOpenPronunciation').onclick=()=>window.Pronunciation.open('everyday',filtered()[E.index]?.id);
    renderResults();if(E.view==='card'){const stage=document.querySelector('#everydayResults'),motion=cardMotion(stage);window.MobileUI?.bindSwipe(stage,{prev:()=>turn(-1,motion),next:()=>turn(1,motion),motion});}
  };
  window.Everyday={items:bank,filtered,topicOptions,audioUpdated(item,status){if(!document.querySelector('#everydayNow')||!(item?.sourceId||item?.id||'').startsWith('everyday-'))return;document.querySelector('#everydayNow').textContent=item.english;document.querySelector('#everydayNowKo').textContent=item.korean;document.querySelector('#everydayAudioStatus').textContent=status;document.querySelector('#everydayPlay').textContent=queueMatches(filtered())?(TranslationAudio.playing?'일시 정지':'이어 듣기'):'연속 듣기';}};
})();
