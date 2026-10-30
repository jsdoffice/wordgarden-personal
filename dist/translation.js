/* Word-card translation and prerecorded listening. No model API or account tokens. */
(() => {
  const tokenise = text => String(text).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[.,!?;:"()]/g, '').trim().split(/\s+/).filter(Boolean);
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
  let topic = 'all', search = '', visible = 12, mode = 'cards';
  const bank = () => window.TRANSLATION_BANK || [];
  const filtered = () => bank().filter(w => (topic === 'all' || w.topic === topic) && (!search || `${w.english} ${w.korean} ${w.grammar}`.toLowerCase().includes(search.toLowerCase())));
  const progressCount = () => bank().filter(w => state.progress[w.id]?.attempts > 0 || state.progress[w.id.replace(/^tr/,'tt')]?.attempts > 0).length;
  const badgeText = () => `${progressCount().toLocaleString()} / ${bank().length.toLocaleString()}문장 학습`;

  window.translationPage = function () {
    const topics = [...new Set(bank().map(w => w.topic))];
    main.innerHTML = title('BUILD YOUR ENGLISH', '생각을 영어로, 한 문장씩.', '중급 중심 B1–B2 문장 3,000개를 카드 배열과 직접 입력, 두 가지 방법으로 익히세요.') + `
      <section class="card tr-intro"><div><span class="pill">중급 중심 · B1–B2</span><h2>알고 있는 단어를 문장으로</h2><p class="muted">일상·여행·업무에서 바로 쓰는 짧고 자연스러운 문장.<br>카드 배열과 직접 입력 모두 오늘의 목표와 복습에 반영돼요.</p><p class="tr-completed">${badgeText()}</p>${state.translationArchives?.length?'<p class="tr-small">새 문장으로 개편했어요. 이전 번역 복습 기록은 백업에 보관하고, 누적 학습 기록은 유지합니다.</p>':''}</div><div class="tr-start-options"><label for="translationMode">연습 방식</label><select id="translationMode"><option value="cards" ${mode === 'cards' ? 'selected' : ''}>단어 카드 배열</option><option value="typing" ${mode === 'typing' ? 'selected' : ''}>처음부터 직접 입력</option><option value="mixed" ${mode === 'mixed' ? 'selected' : ''}>두 방식 번갈아 연습</option></select><button class="primary" id="translationStart">번역 학습 시작 ↗</button></div></section>
      <div class="tr-filters"><label>주제<select id="translationTopic"><option value="all">모든 주제</option>${topics.map(t => `<option value="${esc(t)}" ${topic === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label><label>문장 찾기<input id="translationSearch" type="search" value="${esc(search)}" placeholder="한국어, 영어, 문법 검색"></label></div>
      <section class="card tr-player" aria-label="미국 영어 연속 듣기"><div class="section-head"><div><div class="eyebrow">LISTEN & SHADOW</div><h2>미국 영어 연속 듣기</h2></div><span class="pill">Joe · 남성 합성음성</span></div><p class="muted">3,000문장의 실제 음성 파일을 재생합니다. 선택한 주제·검색 결과를 이어 듣거나 한 문장씩 반복해 보세요.</p><div class="tr-now"><p id="tr-now-en" lang="en">재생을 누르면 첫 문장부터 시작해요.</p><p id="tr-now-ko" class="muted"></p></div><div class="tr-audio-progress"><div id="tr-audio-bar"></div></div><div class="tr-player-buttons"><button class="secondary" id="tr-prev" aria-label="이전 문장">⏮</button><button class="primary" id="tr-play">▶ 연속 듣기</button><button class="secondary" id="tr-next" aria-label="다음 문장">⏭</button></div><div class="tr-player-options"><label>속도<select id="tr-speed">${[.75,.9,1,1.1,1.25].map(r => `<option value="${r}" ${r === TranslationAudio.rate ? 'selected' : ''}>${r}×</option>`).join('')}</select></label><label><input type="checkbox" id="tr-repeat" ${TranslationAudio.repeat ? 'checked' : ''}> 한 문장 반복</label><label><input type="checkbox" id="tr-shuffle" ${TranslationAudio.random ? 'checked' : ''}> 무작위 재생</label></div><p id="tr-audio-status" role="status" class="muted">음성 파일은 인터넷으로 재생합니다. 문장 학습은 저장 후 오프라인에서도 가능해요.</p><p class="tr-small">끝까지 들으면 처음부터 이어 재생해요. 듣기만 한 문장은 학습 완료로 집계하지 않습니다. iPhone의 화면 잠금·절전 상태에서는 연속 재생이 중단될 수 있어요.</p></section>
      <div class="section-head tr-list-head"><h2>문장 둘러보기</h2><span id="translationCount" class="muted"></span></div><div id="translationList" class="tr-library"></div><p class="tr-small">서로 다른 메시지와 상황으로 구성한 3,000개 문장입니다. 문장마다 한국어 뜻과 실용 표현을 함께 익혀 보세요. <a href="translation-data.json" download>전체 문장 내려받기</a> · <a href="translation-audio-attribution.txt" target="_blank" rel="noopener">음성 출처</a></p>`;
    document.querySelector('#translationStart').onclick = () => startTranslation(filtered(), mode);
    document.querySelector('#translationMode').onchange = e => { mode = e.target.value; };
    document.querySelector('#translationTopic').onchange = e => { topic = e.target.value; visible = 12; TranslationAudio.stop(); renderLibrary(); };
    document.querySelector('#translationSearch').oninput = e => { search = e.target.value; visible = 12; TranslationAudio.stop(); renderLibrary(); };
    document.querySelector('#tr-play').onclick = () => { if (TranslationAudio.playing) TranslationAudio.pause(); else if (TranslationAudio.queue.length) TranslationAudio.resume(); else TranslationAudio.start(filtered()); };
    document.querySelector('#tr-prev').onclick = () => TranslationAudio.step(-1);
    document.querySelector('#tr-next').onclick = () => TranslationAudio.step(1);
    document.querySelector('#tr-speed').onchange = e => TranslationAudio.setRate(Number(e.target.value));
    document.querySelector('#tr-repeat').onchange = e => { TranslationAudio.repeat = e.target.checked; };
    document.querySelector('#tr-shuffle').onchange = e => { TranslationAudio.random = e.target.checked; if (TranslationAudio.queue.length) TranslationAudio.start(filtered()); };
    renderLibrary(); updatePlayer();
  };
  function renderLibrary() {
    const rows = filtered();
    document.querySelector('#translationCount').textContent = `${rows.length.toLocaleString()}문장`;
    document.querySelector('#translationStart').disabled = !rows.length;
    document.querySelector('#translationList').innerHTML = rows.slice(0, visible).map(w => `<article class="card tr-library-card"><div class="section-head"><span class="pill">${esc(w.topic)}</span><span class="tr-small">${esc(w.grammar)}</span></div><p>${esc(w.korean)}</p><details><summary>영어 문장 보기</summary><p lang="en">${esc(w.english)}</p><p class="muted">${esc(w.note)}</p></details><div class="actions"><button class="listen" data-tr-listen="${w.id}">◖ 듣기</button><button class="text-btn" data-tr-practice="${w.id}">이 문장 연습하기 ↗</button></div></article>`).join('') || '<section class="card"><p>검색 결과가 없어요. 다른 단어나 주제를 선택해 주세요.</p></section>';
    if (rows.length > visible) document.querySelector('#translationList').insertAdjacentHTML('beforeend', `<button class="secondary tr-more" id="translationMore">더 보기 (${Math.min(visible, rows.length)} / ${rows.length})</button>`);
    document.querySelector('#translationMore')?.addEventListener('click', () => { visible += 12; renderLibrary(); });
    document.querySelectorAll('[data-tr-listen]').forEach(b => b.onclick = () => TranslationAudio.start([bank().find(w => w.id === b.dataset.trListen)], 0, true));
    document.querySelectorAll('[data-tr-practice]').forEach(b => b.onclick = () => startTranslation([bank().find(w => w.id === b.dataset.trPractice)], mode));
    // A new filter starts a fresh playlist on the next play gesture.
    if (!TranslationAudio.playing) { TranslationAudio.stop(); updatePlayer(); }
  }

  window.renderTranslationQuiz = function (w, s) {
    TranslationAudio.stop();
    const source = tokenise(w.english).map((word, id) => ({id, word: word === 'I' ? word : word.toLowerCase()}));
    let cards = shuffle(source), selected = [], hinted = false;
    if (cards.every((card, i) => card.id === i)) cards = [...cards.slice(1), cards[0]];
    main.innerHTML = `<div class="quiz tr-quiz"><div class="quiz-top"><button class="text-btn" id="exitQuiz">✕ 학습 끝내기</button><div class="progress"><div style="width:${s.index / s.items.length * 100}%"></div></div><span class="muted">${s.index + 1} / ${s.items.length}</span></div><div class="eyebrow">TRANSLATE WITH WORD CARDS</div><h1>이 문장을 영어로 만들어 보세요.</h1><p class="muted">카드를 눌러 순서대로 놓으세요. 선택한 카드를 다시 누르면 돌아갑니다.</p><section class="card tr-question"><div class="section-head"><span class="pill">중급 · ${esc(w.topic)}</span><span class="tr-small">${esc(w.grammar)}</span></div><p class="tr-korean">${esc(w.korean)}</p><p class="tr-small" id="tr-answer-label">나의 영어 문장 · 모든 카드를 사용하세요</p><div class="tr-answer" id="tr-answer" role="group" aria-labelledby="tr-answer-label"></div><div class="tr-bank" id="tr-bank" role="group" aria-label="무작위 영어 단어 카드"></div><div class="tr-tools"><button class="text-btn" id="tr-undo">↶ 한 장 되돌리기</button><button class="text-btn" id="tr-clear">처음부터</button><button class="text-btn" id="tr-hint">다음 카드 힌트</button><button class="text-btn" id="tr-skip">잘 모르겠어요</button></div><p id="tr-card-status" class="muted" role="status"></p><button class="primary tr-check" id="tr-check">정답 확인하기</button><div id="tr-feedback" aria-live="polite"></div></section></div>`;
    const draw = focusId => {
      document.querySelector('#tr-answer').innerHTML = selected.length ? selected.map(id => `<button class="tr-token selected" data-tr-remove="${id}" lang="en" aria-label="${esc(source[id].word)} 빼기">${esc(source[id].word)}</button>`).join('') : '<span class="tr-placeholder">이곳에 영어 문장이 완성돼요.</span>';
      document.querySelector('#tr-bank').innerHTML = cards.map(card => `<button class="tr-token ${selected.includes(card.id) ? 'used' : ''}" data-tr-add="${card.id}" lang="en" ${selected.includes(card.id) ? 'disabled' : ''} aria-label="${esc(card.word)} 추가">${esc(card.word)}</button>`).join('');
      document.querySelector('#tr-card-status').textContent = `${selected.length} / ${source.length}개 카드 선택${hinted ? ' · 힌트 사용' : ''}`;
      document.querySelector('#tr-undo').disabled = !selected.length;
      document.querySelector('#tr-clear').disabled = !selected.length;
      document.querySelector('#tr-check').disabled = selected.length !== source.length;
      document.querySelectorAll('[data-tr-add]').forEach(b => b.onclick = () => { if (s.answered) return; selected.push(Number(b.dataset.trAdd)); draw(); });
      document.querySelectorAll('[data-tr-remove]').forEach(b => b.onclick = () => { if (s.answered) return; const id = Number(b.dataset.trRemove); selected = selected.filter(n => n !== id); draw(id); });
      if (focusId !== undefined) document.querySelector(`[data-tr-add="${focusId}"]`)?.focus({preventScroll:true});
    };
    const submit = skipped => {
      if (s.answered) return;
      if (!skipped && selected.length !== source.length) return;
      const text = selected.map(id => source[id].word).join(' ');
      const ok = !skipped && accepts(w, text);
      recordLearning(w, ok); s.answered = true;
      document.querySelectorAll('.tr-question button').forEach(b => b.disabled = true);
      document.querySelector('#tr-feedback').innerHTML = `<div class="feedback ${ok ? '' : 'wrong'}"><div>${ok ? '✓ 문장을 완성했어요!' : '이 문장 구조를 다시 익혀 보세요.'}</div>${!ok && text ? `<p class="tr-your-answer">내 문장: ${esc(text)}</p>` : ''}<p lang="en" class="tr-correct">${esc(w.english)}</p><p>${esc(w.korean)}</p><p class="tr-explanation"><strong>${esc(w.grammar)}</strong><br>${esc(w.note)}</p>${hinted ? '<p class="tr-small">힌트를 사용했어요. 다음에는 혼자 도전해 보세요.</p>' : ''}</div><div class="actions"><button class="listen" id="tr-listen-answer">◖ 미국 남성 음성 듣기</button></div><p id="tr-quiz-audio-status" role="status" class="muted"></p><button class="primary tr-check" id="tr-next-question">${s.index + 1 === s.items.length ? '학습 결과 보기' : '다음 문장 →'}</button>`;
      document.querySelector('#tr-listen-answer').onclick = () => TranslationAudio.start([w], 0, true);
      document.querySelector('#tr-next-question').onclick = () => { TranslationAudio.stop(); s.index++; quiz(); };
      if (state.sound) TranslationAudio.start([w], 0, true);
    };
    document.querySelector('.tr-korean').insertAdjacentHTML('afterend', '<button class="text-btn" id="tr-korean-listen">◖ 한국어 문장 듣기</button>');
    document.querySelector('#tr-korean-listen').onclick = () => speakKorean(w.korean);
    document.querySelector('#exitQuiz').onclick = () => show('home');
    document.querySelector('#tr-undo').onclick = () => { const id = selected.pop(); draw(id); };
    document.querySelector('#tr-clear').onclick = () => { selected = []; draw(); };
    document.querySelector('#tr-hint').onclick = () => {
      const prefix = selected.every((id, i) => source[id].word === source[i].word);
      if (!prefix) { toast('놓은 카드의 순서를 먼저 살펴보세요. 첫 카드: ' + source[0].word); return; }
      const next = source[selected.length];
      if (!next) return;
      const unused = source.find(card => card.word === next.word && !selected.includes(card.id));
      selected.push(unused.id); hinted = true; draw();
    };
    document.querySelector('#tr-skip').onclick = () => submit(true);
    document.querySelector('#tr-check').onclick = () => submit(false);
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
    TranslationAudio.stop();
    main.innerHTML = `<div class="quiz tr-quiz"><div class="quiz-top"><button class="text-btn" id="exitQuiz">✕ 학습 끝내기</button><div class="progress"><div style="width:${s.index / s.items.length * 100}%"></div></div><span class="muted">${s.index + 1} / ${s.items.length}</span></div><div class="eyebrow">TRANSLATE IN YOUR OWN WORDS</div><h1>이번에는 처음부터 써 보세요.</h1><p class="muted">한국어를 읽거나 듣고 영어 문장 전체를 입력하세요.</p><section class="card tr-question"><div class="section-head"><span class="pill">중급 · 직접 입력</span><span class="tr-small">${esc(w.grammar)}</span></div><p class="tr-korean">${esc(w.korean)}</p><button class="text-btn" id="tr-korean-listen">◖ 한국어 문장 듣기</button><form id="tr-typing-form"><label for="tr-typed-answer">나의 영어 번역</label><textarea id="tr-typed-answer" rows="4" maxlength="600" autocomplete="off" autocapitalize="sentences" spellcheck="false" lang="en" placeholder="Write the complete sentence in English."></textarea><div class="tr-tools"><button type="button" class="text-btn" id="tr-type-hint">첫 구절 힌트</button><button type="button" class="text-btn" id="tr-type-skip">잘 모르겠어요</button></div><p id="tr-type-hint-text" role="status" class="muted"></p><button class="primary tr-check">번역 확인하기</button><p class="tr-small">대소문자·문장부호·일부 축약형은 허용해요. 준비된 정답 표현과 비교하는 채점이며, 모든 자연스러운 번역을 판단하는 AI 채점은 아닙니다.</p></form><div id="tr-feedback" aria-live="polite"></div></section></div>`;
    document.querySelector('#exitQuiz').onclick = () => show('home');
    document.querySelector('#tr-korean-listen').onclick = () => speakKorean(w.korean);
    document.querySelector('#tr-type-hint').onclick = () => { document.querySelector('#tr-type-hint-text').textContent = `시작 힌트: ${tokenise(w.english).slice(0, 3).join(' ')}…`; };
    const submit = skipped => {
      if (s.answered) return;
      const value = document.querySelector('#tr-typed-answer').value.trim();
      if (!skipped && !value) { toast('영어 문장을 입력하거나 ‘잘 모르겠어요’를 눌러 주세요.'); return; }
      if (!skipped && /[가-힣]/.test(value)) { toast('번역은 영어로 입력해 주세요.'); return; }
      const previous = {...(state.progress[w.id] || {level:0,attempts:0,correct:0})};
      const recordedDay = dayKey();
      const ok = !skipped && acceptsTyped(w, value);
      recordLearning(w, ok); s.answered = true;
      document.querySelector('#tr-typing-form').hidden = true;
      document.querySelector('#tr-feedback').innerHTML = `<div class="feedback ${ok ? '' : 'wrong'}"><div>${ok ? '✓ 자연스럽게 완성했어요!' : skipped ? '예시 문장을 살펴보세요.' : '예시 답안과 다른 부분이 있어요.'}</div>${value ? `<p class="tr-your-answer">내 번역: ${esc(value)}</p>` : ''}<p lang="en" class="tr-correct">${esc(w.english)}</p><p>${esc(w.korean)}</p><p class="tr-explanation"><strong>${esc(w.grammar)}</strong><br>${esc(w.note)}</p></div>${!ok && !skipped ? '<p class="tr-small">의미가 같은 다른 번역일 수도 있어요. 예시와 비교한 뒤 직접 정답으로 기록할 수 있습니다.</p><button class="secondary" id="tr-self-correct">내 번역도 같은 뜻이에요 · 정답으로 기록</button>' : ''}<div class="actions"><button class="listen" id="tr-listen-answer">◖ 미국 남성 음성 듣기</button></div><p id="tr-quiz-audio-status" role="status" class="muted"></p><button class="primary tr-check" id="tr-next-question">${s.index + 1 === s.items.length ? '학습 결과 보기' : '다음 문장 →'}</button>`;
      document.querySelector('#tr-self-correct')?.addEventListener('click', e => {
        if (e.target.disabled) return; e.target.disabled = true;
        const p = state.progress[w.id], h = state.history[recordedDay] || state.history[dayKey()];
        const level = Math.min(previous.level + 1, 7);
        Object.assign(p, {level,correct:p.correct + 1,due:Date.now() + [1,1,3,7,14,30,60,90][level] * 86400000});
        h.correct++; h.translationCorrect = (h.translationCorrect || 0) + 1; h.typingCorrect = (h.typingCorrect || 0) + 1; s.correct++; save();
        e.target.textContent = '✓ 직접 확인한 정답으로 기록했어요';
      });
      document.querySelector('#tr-listen-answer').onclick = () => TranslationAudio.start([w], 0, true);
      document.querySelector('#tr-next-question').onclick = () => { TranslationAudio.stop(); s.index++; quiz(); };
      if (state.sound) TranslationAudio.start([w], 0, true);
    };
    document.querySelector('#tr-typing-form').onsubmit = e => { e.preventDefault(); submit(false); };
    document.querySelector('#tr-type-skip').onclick = () => submit(true);
    if (innerWidth > 760) document.querySelector('#tr-typed-answer').focus();
  };

  let manifestPromise, manifest, audio, interval, ticket = 0, transitioning = false;
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
  function loadManifest() {
    if (!manifestPromise) manifestPromise = fetch('translation-audio-v2.json').then(r => { if (!r.ok) throw Error('manifest'); return r.json(); }).then(data => manifest = data).catch(e => { manifestPromise = null; throw e; });
    return manifestPromise;
  }
  function current() { return TranslationAudio.queue[TranslationAudio.index]; }
  function clipFor() { return manifest?.clips[current()?.sourceId || current()?.id]; }
  async function playCurrent(reset = true) {
    const run = ++ticket, a = getAudio();
    transitioning = true; TranslationAudio.message = '음성을 준비하고 있어요…'; updatePlayer();
    try {
      if (!manifest) await loadManifest(); if (run !== ticket) return;
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
        if (typeof MediaMetadata === 'function') navigator.mediaSession.metadata = new MediaMetadata({title:current().english,artist:'단어정원 · Joe · 미국 영어',album:'중급 번역 3,000문장'});
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
    if (TranslationAudio.single && !TranslationAudio.repeat) { TranslationAudio.pause(); return; }
    if (TranslationAudio.repeat) { playCurrent(); return; }
    TranslationAudio.index = (TranslationAudio.index + 1) % TranslationAudio.queue.length;
    const next = clipFor();
    if (next && old && next.src === old.src && next.start >= old.end && next.start - old.end < .6 && !audio.ended) { updatePlayer(); return; }
    playCurrent();
  }
  function updatePlayer() {
    const w = current(), status = TranslationAudio.message || (w ? `${TranslationAudio.index + 1} / ${TranslationAudio.queue.length}문장 · ${TranslationAudio.playing ? '재생 중' : '일시 정지'}` : '음성 파일은 인터넷으로 재생합니다. 문장 학습은 저장 후 오프라인에서도 가능해요.');
    const en = document.querySelector('#tr-now-en'); if (en) en.textContent = w?.english || '재생을 누르면 첫 문장부터 시작해요.';
    const ko = document.querySelector('#tr-now-ko'); if (ko) ko.textContent = w?.korean || '';
    for (const id of ['tr-audio-status','tr-quiz-audio-status']) { const el = document.getElementById(id); if (el) el.textContent = status; }
    const play = document.querySelector('#tr-play'); if (play) play.textContent = TranslationAudio.playing ? 'Ⅱ 일시 정지' : w ? '▶ 이어 듣기' : '▶ 연속 듣기';
    const repeat = document.querySelector('#tr-repeat'); if (repeat) repeat.checked = TranslationAudio.repeat;
  }
  window.TranslationAudio = {
    queue:[], index:0, playing:false, rate:1, repeat:false, random:false, single:false, message:'',
    start(items, index = 0, single = false) {
      if (!items.length) { toast('재생할 문장이 없어요.'); return; }
      this.stop(); if ('speechSynthesis' in window) speechSynthesis.cancel();
      this.queue = this.random && !single ? shuffle(items) : [...items]; this.index = Math.min(index, items.length - 1); this.single = single;
      if (single) this.repeat = false;
      playCurrent();
    },
    pause() { ++ticket; transitioning = false; getAudio().pause(); this.playing = false; clearInterval(interval); updatePlayer(); },
    resume() { if (this.queue.length) playCurrent(false); },
    stop() { this.pause(); this.queue = []; this.index = 0; this.message = ''; this.single = false; },
    step(delta) { if (!this.queue.length) return; this.index = (this.index + delta + this.queue.length) % this.queue.length; playCurrent(); },
    setRate(rate) { if (![.75,.9,1,1.1,1.25].includes(rate)) return; this.rate = rate; getAudio().playbackRate = rate; }
  };
  window.addEventListener('pagehide', () => TranslationAudio.stop());
  // Load only the small cue index, never the 3,000-sentence audio collection.
  loadManifest().catch(() => {});
})();
