/* Everyday English: original bilingual practice, with official usage references. */
(() => {
  'use strict';
  const E = {topic:'', query:'', view:'card', index:0, visible:20, reveal:true, mode:'cards'};
  const bank = () => window.EVERYDAY_BANK || [];
  const sources = () => window.EVERYDAY_SOURCES || [];
  const normal = text => String(text || '').toLocaleLowerCase().trim();
  const filtered = () => bank().filter(item => (!E.topic || item.topic === E.topic) && (!E.query || normal(`${item.english} ${item.korean} ${item.note}`).includes(normal(E.query))));
  const topicOptions = selected => '<option value="">모든 상황</option>' + [...new Set(bank().map(item => item.topic))].map(topic => `<option value="${esc(topic)}" ${topic === selected ? 'selected' : ''}>${esc(topic)}</option>`).join('');
  function progressCount() {
    const progress = state.progress || {};
    return bank().filter(item => {
      const suffix = item.id.replace(/^everyday-/, '');
      return progress[`ec${suffix}`]?.attempts > 0 || progress[`et${suffix}`]?.attempts > 0;
    }).length;
  }
  function startPractice(sourceId) {
    const visibleIds = new Set(filtered().map(item => item.id));
    const items = (window.everydayLearningItems?.() || []).filter(item => visibleIds.has(item.sourceId) && (!sourceId || item.sourceId === sourceId));
    if (!items.length) { toast('학습할 문장이 없어요.'); return; }
    startTranslation(items, E.mode);
  }
  function references(item) {
    return (item.sourceIds || []).map(id => sources().find(source => source.id === id)).filter(Boolean).flatMap(source => {
      try {
        const url = new URL(source.url);
        if (url.protocol !== 'https:' || !['learnenglish.britishcouncil.org','learnenglishteens.britishcouncil.org','dictionary.cambridge.org','americanenglish.state.gov','www.americanenglish.org','americanenglish.org'].includes(url.hostname)) return [];
        return [`<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>`];
      } catch { return []; }
    }).join('');
  }
  function card(item, number) {
    return `<article class="card everyday-card" data-everyday-id="${esc(item.id)}"><div class="section-head"><span class="pill">${esc(item.topic)}</span><span class="muted">${number} · ${esc(item.level)}</span></div><p class="everyday-korean">${esc(item.korean)}</p><p class="everyday-english" lang="en" ${!E.reveal ? 'hidden' : ''}>${esc(item.english)}</p><p class="everyday-note" ${!E.reveal ? 'hidden' : ''}>${esc(item.note)}</p><div class="actions"><button class="primary" data-everyday-practice="${esc(item.id)}">이 문장 연습</button><button class="listen" data-everyday-listen="${esc(item.id)}">문장 듣기</button><button class="secondary" data-everyday-speak="${esc(item.id)}">따라 말하기</button><button class="secondary" data-everyday-score="${esc(item.id)}">발음 평가</button></div><details class="everyday-reference"><summary>표현·용법 참고 자료</summary><p>공식 교육 자료의 표현과 용법을 참고해 문장과 한국어 번역을 자체 작성했어요. 아래 자료를 인용한 원문이나 해당 기관이 검수한 예문은 아닙니다.</p>${references(item)}</details></article>`;
  }
  function queueMatches(items) {
    const ids = new Set(TranslationAudio.queue.map(item => item.sourceId || item.id));
    return items.length === TranslationAudio.queue.length && items.every(item => ids.has(item.id));
  }
  function renderResults() {
    const items = filtered();
    E.index = Math.max(0, Math.min(E.index, items.length - 1));
    document.querySelector('#everydayCount').textContent = `${items.length.toLocaleString('ko-KR')}문장${E.view === 'card' && items.length ? ` · ${E.index + 1} / ${items.length}` : ''}`;
    document.querySelector('#everydayLearnedCount').textContent = `${progressCount().toLocaleString('ko-KR')} / ${bank().length.toLocaleString('ko-KR')}`;
    document.querySelector('#everydayPracticeInfo').textContent = items.length ? `선택한 상황과 검색 결과 ${items.length.toLocaleString('ko-KR')}문장에서 출제해요.` : '연습할 문장이 없어요. 검색어나 상황을 바꿔 보세요.';
    const selected = E.view === 'card' ? items.slice(E.index,E.index + 1) : items.slice(0,E.visible);
    document.querySelector('#everydayResults').innerHTML = selected.length ? selected.map((item, index) => card(item,E.view === 'card' ? E.index + 1 : index + 1)).join('') : '<section class="card empty"><h2>찾는 문장이 없어요</h2><p>검색어나 상황을 바꿔 보세요.</p></section>';
    document.querySelector('#everydayPagination').innerHTML = E.view === 'card' ? `<button class="secondary" id="everydayPrevious" ${!items.length || E.index === 0 ? 'disabled' : ''}>이전</button><span>${items.length ? E.index + 1 : 0} / ${items.length}</span><button class="primary" id="everydayNext" ${!items.length || E.index >= items.length - 1 ? 'disabled' : ''}>다음</button>` : (E.visible < items.length ? `<button class="secondary" id="everydayMore">더 보기 (${Math.min(E.visible,items.length)} / ${items.length})</button>` : '');
    document.querySelector('#everydayPrevious')?.addEventListener('click', () => { E.index--; renderResults(); });
    document.querySelector('#everydayNext')?.addEventListener('click', () => { E.index++; renderResults(); });
    document.querySelector('#everydayMore')?.addEventListener('click', () => { E.visible += 20; renderResults(); });
    for (const control of document.querySelectorAll('[data-everyday-listen]')) control.onclick = () => {
      const item = bank().find(row => row.id === control.dataset.everydayListen);
      if (item) TranslationAudio.start([item],0,true);
    };
    for (const control of document.querySelectorAll('[data-everyday-speak]')) control.onclick = () => window.openSpeakingPractice('everyday',control.dataset.everydaySpeak);
    for (const control of document.querySelectorAll('[data-everyday-score]')) control.onclick = () => window.Pronunciation.open('everyday',control.dataset.everydayScore);
    for (const control of document.querySelectorAll('[data-everyday-practice]')) {
      control.disabled = !items.length;
      control.onclick = () => startPractice(control.dataset.everydayPractice);
    }
    for (const id of ['everydayStart','everydayPlay','everydayRandom','everydayOpenSpeaking','everydayOpenPronunciation']) document.querySelector('#'+id).disabled = !items.length;
  }
  window.everydayPage = function () {
    main.innerHTML = title('EVERYDAY ENGLISH','매일 쓰는 영어, 한 문장씩.','생활영어 1,000문장을 20가지 상황으로 나눴어요. 한국어를 보고 영어 문장으로 만들어 보세요.') + `
      <section class="card everyday-intro"><span class="pill">A2–B1 중심 · 생활영어 1,000문장</span><p>British Council·Cambridge·미국 국무부의 공식 교육 자료를 참고한 자체 제작 학습 문장입니다. 문장마다 참고 자료를 확인하고, 같은 문장으로 말하기와 발음 평가를 이어갈 수 있어요.</p><div class="actions"><button class="secondary" id="everydayOpenSpeaking">생활영어 말하기</button><button class="secondary" id="everydayOpenPronunciation">생활영어 발음 평가</button></div></section>
      <div class="everyday-filters"><label>상황<select id="everydayTopic">${topicOptions(E.topic)}</select></label><label>문장 찾기<input id="everydaySearch" type="search" value="${esc(E.query)}" placeholder="영어 또는 한국어 검색" autocomplete="off"></label></div>
      <section class="card everyday-practice" aria-labelledby="everydayPracticeTitle"><div class="section-head"><h2 id="everydayPracticeTitle">생활영어 번역 연습</h2><div class="everyday-learning-count"><span>학습한 문장</span><strong id="everydayLearnedCount" role="status" aria-live="polite"></strong></div></div><div class="everyday-practice-controls"><label for="everydayMode">문제 풀이 방식<select id="everydayMode" aria-describedby="everydayPracticeInfo"><option value="cards" ${E.mode === 'cards' ? 'selected' : ''}>카드 배열</option><option value="typing" ${E.mode === 'typing' ? 'selected' : ''}>직접 입력</option><option value="mixed" ${E.mode === 'mixed' ? 'selected' : ''}>카드 배열·직접 입력 번갈아</option></select></label><button class="primary" id="everydayStart">학습 시작 ↗</button></div><p id="everydayPracticeInfo" class="muted"></p><p class="everyday-practice-note">생활영어 연습도 오늘의 학습 기록과 복습에 함께 반영돼요.</p></section>
      <div class="everyday-toolbar"><div role="group" aria-label="생활영어 읽기 보기 방식"><button class="secondary" id="everydayCardView" aria-pressed="${E.view === 'card'}">카드 보기</button><button class="secondary" id="everydayListView" aria-pressed="${E.view === 'list'}">목록 보기</button></div><label><input id="everydayReveal" type="checkbox" ${E.reveal ? 'checked' : ''}> 영어·표현 설명 보기</label><p id="everydayCount" role="status"></p></div>
      <section class="card everyday-player"><div class="section-head"><h2>생활영어 연속 듣기</h2><span class="pill">Michael · 미국 영어 남성 합성음성</span></div><p id="everydayNow" lang="en">선택한 상황과 검색 결과를 이어서 들어 보세요.</p><p id="everydayNowKo" class="muted"></p><div class="actions"><button class="primary" id="everydayPlay">연속 듣기</button><button class="secondary" id="everydayPause">일시 정지</button><button class="secondary" id="everydayAudioPrevious" aria-label="이전 음성">이전 문장</button><button class="secondary" id="everydayAudioNext" aria-label="다음 음성">다음 문장</button><button class="secondary" id="everydayRandom">무작위 카드</button></div><p class="muted" id="everydayAudioStatus" role="status">음성 파일은 인터넷으로 재생해요. 텍스트는 저장 후 오프라인에서도 볼 수 있어요.</p></section><section id="everydayResults" class="everyday-results" aria-label="생활영어 문장"></section><div id="everydayPagination" class="everyday-pagination"></div>`;
    document.querySelector('#everydayTopic').onchange = event => { E.topic = event.target.value; E.index = 0; E.visible = 20; renderResults(); };
    document.querySelector('#everydaySearch').oninput = event => { E.query = event.target.value; E.index = 0; E.visible = 20; renderResults(); };
    document.querySelector('#everydayMode').onchange = event => { if (['cards','typing','mixed'].includes(event.target.value)) E.mode = event.target.value; };
    document.querySelector('#everydayStart').onclick = () => startPractice();
    for (const [id,view] of [['everydayCardView','card'],['everydayListView','list']]) document.querySelector('#'+id).onclick = () => { E.view = view; E.index = 0; E.visible = 20; everydayPage(); };
    document.querySelector('#everydayReveal').onchange = event => { E.reveal = event.target.checked; renderResults(); };
    document.querySelector('#everydayRandom').onclick = () => { const size = filtered().length; if (size) { E.view = 'card'; E.index = Math.floor(Math.random()*size); everydayPage(); } };
    document.querySelector('#everydayPlay').onclick = () => { const items = filtered(); if (queueMatches(items)) TranslationAudio.resume(); else TranslationAudio.start(items); };
    document.querySelector('#everydayPause').onclick = () => TranslationAudio.pause();
    document.querySelector('#everydayAudioPrevious').onclick = () => { if (TranslationAudio.queue[0]?.id?.startsWith('everyday-')) TranslationAudio.step(-1); };
    document.querySelector('#everydayAudioNext').onclick = () => { if (TranslationAudio.queue[0]?.id?.startsWith('everyday-')) TranslationAudio.step(1); };
    document.querySelector('#everydayOpenSpeaking').onclick = () => window.openSpeakingPractice('everyday',filtered()[E.index]?.id);
    document.querySelector('#everydayOpenPronunciation').onclick = () => window.Pronunciation.open('everyday',filtered()[E.index]?.id);
    renderResults();
  };
  window.Everyday = {
    items:bank,
    topicOptions,
    audioUpdated(item,status) {
      if (!document.querySelector('#everydayNow') || !item?.id?.startsWith('everyday-')) return;
      document.querySelector('#everydayNow').textContent = item.english;
      document.querySelector('#everydayNowKo').textContent = item.korean;
      document.querySelector('#everydayAudioStatus').textContent = status;
      document.querySelector('#everydayPlay').textContent = queueMatches(filtered()) ? (TranslationAudio.playing ? '재생 중' : '이어 듣기') : '연속 듣기';
    }
  };
})();
