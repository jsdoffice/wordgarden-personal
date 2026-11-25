/* Word gaps: typing and four choices, with original tense/plural practice. */
(() => {
  'use strict';
  let active = null;
  const items = () => window.FORM_BANK || [];
  const format = () => ['typing','choice','mixed'].includes(state.wordAnswerMode) ? state.wordAnswerMode : 'typing';
  const normal = value => String(value ?? '').normalize('NFKC').toLowerCase().trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
  function pool() {
    const ordinary = uniqueWords(learningPool(words())), forms = learningPool(items()), mixed = [];
    for (let i=0;i<Math.max(ordinary.length,forms.length);i++) {
      if (ordinary[i]) mixed.push(ordinary[i]);
      if (forms[i]) mixed.push(forms[i]);
    }
    return mixed;
  }
  function references(item) {
    return (item.sourceIds || []).flatMap(id => {
      const source = (window.FORM_SOURCES || []).find(ref => ref.id === id);
      if (!source) return [];
      try {
        const url = new URL(source.url);
        if (url.protocol !== 'https:' || !['dictionary.cambridge.org','learnenglish.britishcouncil.org'].includes(url.hostname)) return [];
        return [`<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>`];
      } catch { return []; }
    }).join('');
  }
  function choicesFor(item) {
    if (Array.isArray(item.choices) && item.choices.length === 4) return TranslationCards.shuffle(item.choices);
    const answer = normal(item.word), meaning = normal(item.meaning), seen = new Set([answer]);
    const candidates = TranslationCards.shuffle(vocabulary().filter(candidate => normal(candidate.word) !== answer && normal(candidate.meaning) !== meaning));
    const same = candidates.filter(candidate => candidate.category === item.category);
    const choices = [item.word];
    for (const candidate of [...same,...candidates]) {
      const value = normal(candidate.word);
      if (!value || seen.has(value)) continue;
      seen.add(value);choices.push(candidate.word);
      if (choices.length === 4) break;
    }
    return TranslationCards.shuffle(choices);
  }
  function home() {
    return `<section class="card form-home"><div class="section-head"><div><div class="eyebrow">WORDS & GRAMMAR</div><h2>단어·문법, 나에게 맞는 방식으로.</h2></div></div><label class="form-format-label" for="wordAnswerMode">단어 빈칸 풀이 방식<select id="wordAnswerMode"><option value="typing" ${format()==='typing'?'selected':''}>직접 입력</option><option value="choice" ${format()==='choice'?'selected':''}>보기 4개에서 선택</option><option value="mixed" ${format()==='mixed'?'selected':''}>입력·보기 선택 번갈아</option></select></label><p class="muted">오늘의 학습과 단어·문법 연습에 적용해요. 문제 화면에서도 입력과 보기 선택을 바꿀 수 있어요.</p><div class="form-focus"><div><strong>시제 ${items().filter(item=>item.focus==='tense').length}문제 · 단수·복수 ${items().filter(item=>item.focus==='plural').length}문제</strong><p class="muted">문장 속 시제와 수 일치를 집중해서 익혀요.</p></div><div class="actions"><button class="secondary" id="formTenseStart">시제 집중 연습</button><button class="secondary" id="formPluralStart">단수·복수 집중 연습</button></div></div></section>`;
  }
  function bindHome() {
    document.querySelector('#wordAnswerMode').onchange = event => {
      if (!['typing','choice','mixed'].includes(event.target.value)) return;
      state.wordAnswerMode = event.target.value;save();toast('단어·문법 문제 풀이 방식을 저장했어요.');
    };
    document.querySelector('#formTenseStart').onclick = () => startFormPractice('tense');
    document.querySelector('#formPluralStart').onclick = () => startFormPractice('plural');
  }
  function render(item,s) {
    const isForm = item.kind === 'grammar-gap';
    const wordIndex = s.items.slice(0,s.index).filter(row => row.kind !== 'translation' && row.kind !== 'typing').length;
    let mode = format() === 'mixed' ? (wordIndex%2 ? 'choice' : 'typing') : format();
    const choices = choicesFor(item), isCurrent = () => session === s && s.items[s.index]?.id === item.id;
    let submitted = false, advanced = false;
    const blank = '<span class="blank">'+ '＿'.repeat(Math.min(8,item.word.length))+'</span>';
    const parts = String(item.sentence || '').split(new RegExp(item.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'));
    const masked = isForm ? esc(item.prompt).replace('____',blank) : parts.length>1 ? parts.map(esc).join(blank) : blank;
    const question = item.kind === 'word' ? esc(item.word[0])+' ·'.repeat(Math.max(0,item.word.length-1)) : masked;
    main.innerHTML = `<div class="quiz word-gap-quiz"><div class="quiz-top"><button class="text-btn" id="exitQuiz">학습 끝내기</button><div class="progress"><div style="width:${s.index/s.items.length*100}%"></div></div><span class="muted">${s.index+1} / ${s.items.length}</span></div><div class="eyebrow">${isForm?'TENSE & NUMBER':'GROW YOUR ENGLISH'}</div><h1>${item.kind==='word'?'이 뜻에 맞는 영어 단어는?':'빈칸에 알맞은 영어는?'}</h1><p class="muted">${isForm?'문장 속 시간과 단수·복수 단서를 확인해 보세요.':'뜻과 문맥을 보고 알맞은 단어나 표현을 골라 보세요.'}</p><section class="card quiz-card"><span class="pill">${esc(item.category)}</span><div class="question">${question}</div><p class="translation">${esc(item.translation||item.meaning)}</p><p class="muted">${esc(item.meaning)}</p><div class="word-mode-buttons" role="group" aria-label="단어 문제 풀이 방식"><button class="secondary" id="wordTypingMode" aria-pressed="${mode==='typing'}">직접 입력</button><button class="secondary" id="wordChoiceMode" aria-pressed="${mode==='choice'}">보기 선택</button></div><form id="answerForm"><label class="muted" for="answer">정답 입력</label><input id="answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="영어 단어 또는 표현 입력" aria-label="정답 입력"><div class="actions"><button type="button" class="text-btn" id="hint">첫 글자 힌트</button><button type="button" class="text-btn" id="unknown">잘 모르겠어요</button></div><button class="primary">정답 확인하기</button></form><div id="word-choice-panel"><p class="muted">보기 중 하나를 누르면 정답을 확인해요.</p><div class="word-choices" role="group" aria-label="정답 보기">${choices.map((choice,index)=>`<button class="word-choice" data-word-choice="${index}" lang="en"><span>${String.fromCharCode(65+index)}</span><strong>${esc(choice)}</strong></button>`).join('')}</div><button type="button" class="text-btn" id="wordChoiceSkip">잘 모르겠어요</button></div><div id="feedback" aria-live="polite"></div></section></div>`;
    function updateMode() {
      document.querySelector('#answerForm').hidden = mode !== 'typing';
      document.querySelector('#word-choice-panel').hidden = mode !== 'choice';
      document.querySelector('#wordTypingMode').setAttribute('aria-pressed',String(mode==='typing'));
      document.querySelector('#wordChoiceMode').setAttribute('aria-pressed',String(mode==='choice'));
    }
    function submit(input,skipped=false) {
      if (submitted || s.answered || !isCurrent()) return false;
      const value = String(input ?? '').trim();
      if (!skipped && !value) { toast('정답을 입력하거나 ‘잘 모르겠어요’를 눌러 주세요.');return false; }
      const ok = !skipped && normal(value) === normal(item.word);
      submitted = true;
      if (!recordLearning(item,ok)) { submitted = false;return false; }
      document.querySelector('#answerForm').hidden = true;
      document.querySelector('#word-choice-panel').hidden = true;
      document.querySelector('.word-mode-buttons').hidden = true;
      document.querySelector('#feedback').innerHTML = `<div class="feedback ${ok?'':'wrong'}"><div>${ok?'잘했어요!':'다음에 다시 기억해 봐요.'}</div><strong lang="en">${esc(item.word)}</strong> <span>· ${esc(item.meaning)}</span>${!ok&&value?`<p>내 답: ${esc(value)}</p>`:''}<p lang="en">${esc(item.sentence||item.word)}</p><p>${esc(item.translation||'')}</p>${item.explanation?`<p class="form-explanation">${esc(item.explanation)}</p>`:''}${isForm?`<div class="form-references"><span>문법 참고 자료</span>${references(item)}<p>예문·번역·문제는 자체 작성했어요.</p></div>`:''}</div><div class="actions"><button class="listen" id="listen">발음 듣기</button>${!isForm?`<button class="text-btn" id="saveWord">${state.progress[item.id].star?'★ 저장됨':'☆ 단어 저장'}</button>`:''}</div><button class="primary" id="next">${s.index+1===s.items.length?'학습 결과 보기':'다음 문제'}</button>`;
      document.querySelector('#listen').onclick = () => { if(isCurrent()) speak(item.sentence||item.word); };
      document.querySelector('#saveWord')?.addEventListener('click',event => { if(!isCurrent())return;state.progress[item.id].star=!state.progress[item.id].star;save();event.currentTarget.textContent=state.progress[item.id].star?'★ 저장됨':'☆ 단어 저장'; });
      document.querySelector('#next').onclick = () => { if(advanced||!isCurrent())return;advanced=true;s.index++;quiz(); };
      if(state.sound)speak(item.word);
      return true;
    }
    active = {session:s,item,submit};
    document.querySelector('#wordTypingMode').onclick = () => { if(!submitted&&isCurrent()){mode='typing';updateMode();} };
    document.querySelector('#wordChoiceMode').onclick = () => { if(!submitted&&isCurrent()){mode='choice';updateMode();} };
    document.querySelector('#answerForm').onsubmit = event => {event.preventDefault();if(submitted||s.answered||!isCurrent())return;const field=document.querySelector('#answer');if(field)submit(field.value);};
    document.querySelector('#hint').onclick = () => { if(!submitted&&isCurrent())toast(`힌트: ${item.word[0]}${' ·'.repeat(Math.min(12,item.word.length-1))}`); };
    document.querySelector('#unknown').onclick = () => submit('',true);
    document.querySelector('#wordChoiceSkip').onclick = () => submit('',true);
    for(const button of document.querySelectorAll('[data-word-choice]')) button.onclick = () => submit(choices[Number(button.dataset.wordChoice)]);
    document.querySelector('#exitQuiz').onclick = () => { if(isCurrent())show(s.returnPage||'home'); };
    updateMode();
    if(mode==='typing'&&innerWidth>760)document.querySelector('#answer').focus();
  }
  window.WordGap = {items,pool,home,bindHome,render,answer(input){if(!active||active.session!==session||session.items[session.index]?.id!==active.item.id)return false;return active.submit(input,input==='');}};
})();
