(function () {
  'use strict';

  const view = { section: 'rules', query: '', topic: '', visible: 40, mode: 'card', position: 0, tab: 'core', example: 0, reference: 0, tools: false, quizDetail: false };
  const quizAnswers = new Map();
  let source, entries = [];
  const number = value => value.toLocaleString('ko-KR');

  function loadLibrary() {
    const current = window.WORDGARDEN_LAB;
    if (!current || !current.library || !Array.isArray(current.sections)) return null;
    if (source !== current) {
      source = current;
      entries = source.sections.flatMap(section => (source.library[section.id] || []).map((item, index) => ({
        section: section.id, item, index, search: (JSON.stringify(item)+' '+(section.id==='rules'?source.ruleTopics?.[index]||'':'')).toLocaleLowerCase()
      })));
    }
    return source;
  }

  function highlight(value) {
    const plain = String(value ?? '');
    if (!view.query) return esc(plain);
    const query = view.query.toLocaleLowerCase(), lower = plain.toLocaleLowerCase();
    let output = '', start = 0, index;
    while ((index = lower.indexOf(query, start)) !== -1) {
      output += esc(plain.slice(start, index)) + '<mark class="lab-highlight">' + esc(plain.slice(index, index + query.length)) + '</mark>';
      start = index + query.length;
    }
    return output + esc(plain.slice(start));
  }

  function speech(text, label = '예문 듣기') {
    if (!text) return '';
    return `<button type="button" class="lab-listen" data-lab-speech="${esc(text)}" aria-label="${esc(label)}"><span aria-hidden="true">◖</span> ${esc(label)}</button>`;
  }

  function topicOf(entry) {
    return entry.item.category || (entry.section === 'rules' ? source.ruleTopics?.[entry.index] : '') || '기타';
  }

  function references(item) {
    const sources=(item.sources||[]).filter(value=>{
      try { const url=new URL(value.url);return url.protocol==='https:'&&['learnenglish.britishcouncil.org','learnenglishteens.britishcouncil.org','dictionary.cambridge.org'].includes(url.hostname); } catch { return false; }
    });
    return sources.length ? `<div class="lab-pattern-sources"><span>용법 참고</span>${sources.map(value=>`<a href="${esc(value.url)}" target="_blank" rel="noopener noreferrer">${esc(value.publisher)} · ${esc(value.title)}</a>`).join('')}<small>예문·한국어 설명은 정보카에서 작성했어요.</small></div>` : '';
  }

  function miniQuiz(item, section, index) {
    const quiz = item.quiz;
    if (!quiz || !Array.isArray(quiz.options)) return '';
    const key = `${section}-${index}`, answer = quizAnswers.get(key), answered = answer !== undefined;
    const correct = answer === quiz.answer;
    return `<fieldset class="lab-mini-quiz"><legend>확인 문제</legend><p class="lab-quiz-question" lang="en">${highlight(quiz.question)}</p><div class="lab-quiz-options">${quiz.options.map((option, i) => `<button type="button" data-lab-quiz="${esc(key)}" data-option="${i}" ${answered?'disabled':''} data-result="${answered && i===quiz.answer?'correct':answered && i===answer?'wrong':''}"><b>${String.fromCharCode(65+i)}</b>${esc(option)}</button>`).join('')}</div><div class="lab-quiz-feedback" role="status" ${answered?'':'hidden'}>${answered?`<strong>${correct?'정답이에요.':'다시 확인해 보세요.'} 정답 ${String.fromCharCode(65+quiz.answer)} · ${esc(quiz.options[quiz.answer])}</strong><p>${esc(quiz.explanation)}</p><button type="button" class="text-btn" data-lab-retry="${esc(key)}">다시 풀기 ↻</button>`:''}</div></fieldset>`;
  }

  function listCard({ section, item, index }) {
    const label = source.sections.find(value => value.id === section).label;
    const badge = `<span class="lab-badge">${esc(label)}</span>`;
    const open = `<article class="lab-card${section === 'patterns' ? ' lab-pattern-card' : Array.isArray(item) ? '' : ' lab-card-wide'}" data-lab-entry="${esc(section)}-${index}">`;
    if (section === 'patterns') {
      return open + `<div class="lab-pattern-meta"><span>${highlight(item.category)}</span><span>${esc(item.level)} 중심</span></div><div class="lab-card-top"><h3 lang="en">${highlight(item.title)}</h3>${badge}</div>
        <p class="lab-meaning">${highlight(item.meaning)}</p><p class="lab-formula" lang="en">${highlight(item.formula)}</p>
        <h4 class="lab-pattern-caption">이렇게 말해 보세요 <span>영한 예문 3개</span></h4>
        <ol class="lab-pattern-examples">${(item.examples||[]).map(([en,ko],i)=>`<li><p lang="en">${highlight(en)}</p><p class="lab-translation" lang="ko">${highlight(ko)}</p>${speech(en,`예문 ${i+1} 듣기`)}</li>`).join('')}</ol>
        <p class="lab-note"><strong>쓰임과 주의점</strong> ${highlight(item.note)}</p>
        ${references(item)}</article>`;
    }
    if (Array.isArray(item)) {
      const [word, meaning, example, type, ipa, englishGloss, translation] = item;
      return open + `<div class="lab-card-top"><div><h3>${highlight(word)}</h3>${ipa ? `<p class="lab-pronunciation">${highlight(ipa)}</p>` : ''}</div>${badge}</div>
        ${type ? `<p class="lab-type">${highlight(type)}</p>` : ''}
        <p class="lab-meaning">${highlight(meaning)}</p>
        ${englishGloss ? `<p class="lab-gloss">${highlight(englishGloss)}</p>` : ''}
        ${example ? `<p class="lab-example" lang="en">${highlight(example)}</p>` : ''}${translation ? `<p class="lab-translation">${highlight(translation)}</p>` : ''}
        <div class="lab-card-actions">${speech(word, '단어·표현 듣기')}${speech(example)}</div></article>`;
    }
    const heading = `<div class="lab-card-top"><h3>${highlight(item.title)}</h3>${badge}</div>`;
    if (section === 'grammar') {
      return open + heading + `<p class="lab-formula">${highlight(item.formula)}</p>
        <p class="lab-meaning">${highlight(item.meaning)}</p>
        <div class="lab-example-pair"><p class="lab-example">${highlight(item.example)}</p><p class="lab-translation">${highlight(item.translation)}</p>${speech(item.example)}</div>
        ${item.moreExamples?.length ? `<ol class="lab-more-examples">${item.moreExamples.map(([en, ko]) => `<li><p>${highlight(en)}</p><p class="lab-translation">${highlight(ko)}</p>${speech(en)}</li>`).join('')}</ol>` : ''}
        ${item.note ? `<p class="lab-note"><strong>기억하기</strong> ${highlight(item.note)}</p>` : ''}${miniQuiz(item, section, index)}</article>`;
    }
    if (section === 'groups') {
      return open + heading + `<p class="lab-meaning">${highlight(item.meaning)}</p>
        <div class="lab-compare-list">${(item.rows || []).map(([term, use, example]) => `<div class="lab-compare-row"><strong>${highlight(term)}</strong><div><p>${highlight(use)}</p><p class="lab-compare-example">${highlight(example)}</p>${speech(example, '표현 듣기')}</div></div>`).join('')}</div>
        ${item.note ? `<p class="lab-note"><strong>기억하기</strong> ${highlight(item.note)}</p>` : ''}${miniQuiz(item, section, index)}</article>`;
    }
    const correct = item.correct || item.example;
    return open + `<p class="lab-rule-topic">${highlight(topicOf({section,item,index}))}</p>` + heading + `<p class="lab-formula">${highlight(item.formula)}</p>
      <p class="lab-meaning">${highlight(item.meaning)}</p>
      ${correct ? `<div class="lab-correct"><span class="lab-example-label">✓ 맞는 문장</span><p>${highlight(correct)}</p>${speech(correct)}</div>` : ''}
      ${item.correct && item.example && item.correct !== item.example ? `<p class="lab-example">${highlight(item.example)}</p>` : ''}
      ${item.translation ? `<p class="lab-translation">${highlight(item.translation)}</p>` : ''}
      ${item.moreExamples?.length ? `<ol class="lab-more-examples">${item.moreExamples.map(([en,ko])=>`<li><p lang="en">${highlight(en)}</p><p class="lab-translation" lang="ko">${highlight(ko)}</p>${speech(en)}</li>`).join('')}</ol>` : ''}
      ${item.wrong ? `<div class="lab-wrong"><span class="lab-example-label">✕ 틀린 문장</span><p>${highlight(item.wrong)}</p></div>` : ''}
      ${item.note ? `<p class="lab-note"><strong>기억하기</strong> ${highlight(item.note)}</p>` : ''}${miniQuiz(item, section, index)}${references(item)}</article>`;
  }

  function matching() {
    return view.query ? entries.filter(entry => entry.search.includes(view.query.toLocaleLowerCase())) : entries.filter(entry => entry.section === view.section && (!view.topic || topicOf(entry) === view.topic));
  }

  function examplesFor({section,item}) {
    if (Array.isArray(item)) return item[2] ? [{en:item[2],ko:item[6]||''}] : [];
    if (section==='patterns') return (item.examples||[]).map(([en,ko])=>({en,ko}));
    if (section==='groups') return (item.rows||[]).map(([term,use,en])=>({term,use,en}));
    const rows=[],first=item.correct||item.example;
    if (first) rows.push({en:first,ko:item.translation||'',correct:Boolean(item.correct)});
    if (item.correct&&item.example&&item.correct!==item.example) rows.push({en:item.example,ko:''});
    for (const [en,ko] of item.moreExamples||[]) rows.push({en,ko});
    if (item.wrong) rows.push({en:item.wrong,wrong:true});
    return rows;
  }

  function sourcesFor(item) {
    return (item.sources||[]).filter(value=>{
      try {const url=new URL(value.url);return url.protocol==='https:'&&['learnenglish.britishcouncil.org','learnenglishteens.britishcouncil.org','dictionary.cambridge.org'].includes(url.hostname);}catch{return false;}
    });
  }

  function referencePages(item) {
    const pages=[];
    if (item.note) pages.push(`<h4>기억하기</h4><p class="lab-reference-note">${highlight(item.note)}</p>`);
    const refs=sourcesFor(item);
    for(let i=0;i<refs.length;i+=2)pages.push(`<h4>용법 참고</h4><div class="lab-reference-links">${refs.slice(i,i+2).map(ref=>`<a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(ref.publisher)}</span>${esc(ref.title)} <span aria-hidden="true">↗</span></a>`).join('')}</div><p class="lab-origin">예문·설명은 정보카에서 작성했어요.</p>`);
    return pages;
  }

  function subNavigation(kind,index,total,label) {
    return total>1?`<div class="lab-subnav"><button type="button" data-lab-${kind}="-1" aria-label="이전 ${label}" ${index===0?'disabled':''}>‹</button><span>${label} ${index+1} / ${total}</span><button type="button" data-lab-${kind}="1" aria-label="다음 ${label}" ${index===total-1?'disabled':''}>›</button></div>`:'';
  }

  function compactQuiz(entry) {
    const {item,section,index}=entry,quiz=item.quiz,key=`${section}-${index}`,answer=quizAnswers.get(key),answered=answer!==undefined;
    if(answered&&!view.quizDetail)return `<div class="lab-compact-feedback ${answer===quiz.answer?'':'is-wrong'}" role="status"><p class="lab-answer-state">${answer===quiz.answer?'✓ 정답이에요':'다시 확인해 보세요'}</p><p class="lab-answer-value" lang="en">${esc(quiz.options[quiz.answer])}</p><p class="lab-feedback-explanation">${highlight(quiz.explanation)}</p><div class="lab-feedback-actions"><button type="button" data-lab-quiz-detail>문제 보기</button><button type="button" data-lab-retry="${esc(key)}">다시 풀기</button></div></div>`;
    return `<fieldset class="lab-mini-quiz lab-compact-quiz"><legend class="sr-only">확인 문제</legend><p class="lab-quiz-question" lang="en">${highlight(quiz.question)}</p><div class="lab-quiz-options">${quiz.options.map((option,i)=>`<button type="button" data-lab-quiz="${esc(key)}" data-option="${i}" ${answered?'disabled':''} data-result="${answered&&i===quiz.answer?'correct':answered&&i===answer?'wrong':''}"><b>${String.fromCharCode(65+i)}</b><span>${esc(option)}</span></button>`).join('')}</div>${answered?'<button type="button" class="lab-detail-return" data-lab-quiz-detail>해설 보기</button>':''}</fieldset>`;
  }

  function compactCard(entry) {
    const {item,section,index}=entry,isWord=Array.isArray(item),titleText=isWord?item[0]:item.title;
    const examples=examplesFor(entry),refs=isWord?[]:referencePages(item),hasQuiz=Boolean(item.quiz&&Array.isArray(item.quiz.options));
    const tabs=[['core',isWord?'뜻':'핵심']];
    if(examples.length)tabs.push(['examples',section==='groups'?'비교':'예문']);
    if(hasQuiz)tabs.push(['quiz',quizAnswers.has(`${section}-${index}`)?'해설':'문제']);
    if(refs.length)tabs.push(['reference','참고']);
    if(!tabs.some(([id])=>id===view.tab))view.tab='core';
    let body='';
    if(view.tab==='core'){
      body=isWord?`${item[4]?`<p class="lab-pronunciation">${highlight(item[4])}</p>`:''}${item[3]?`<p class="lab-type">${highlight(item[3])}</p>`:''}<p class="lab-card-meaning">${highlight(item[1])}</p>${item[5]?`<p class="lab-gloss">${highlight(item[5])}</p>`:''}${speech(item[0],'표현 듣기')}`:`<p class="lab-card-meaning">${highlight(item.meaning)}</p>${item.formula?`<p class="lab-formula" lang="en">${highlight(item.formula)}</p>`:''}`;
    }else if(view.tab==='examples'){
      view.example=Math.min(view.example,examples.length-1);const example=examples[view.example];
      body=`<div class="lab-single-example ${example.wrong?'is-wrong':''}">${example.term?`<h4>${highlight(example.term)}</h4><p class="lab-example-use">${highlight(example.use)}</p>`:''}${example.wrong?'<p class="lab-example-status">주의할 문장</p>':example.correct?'<p class="lab-example-status">맞는 문장</p>':''}<p class="lab-example" lang="en">${highlight(example.en)}</p>${example.ko?`<p class="lab-translation" lang="ko">${highlight(example.ko)}</p>`:''}${example.wrong?'':speech(example.en)}</div>${subNavigation('example',view.example,examples.length,section==='groups'?'비교':'예문')}`;
    }else if(view.tab==='quiz')body=compactQuiz(entry);
    else{view.reference=Math.min(view.reference,refs.length-1);body=`<div class="lab-reference-page">${refs[view.reference]}</div>${subNavigation('reference',view.reference,refs.length,'참고')}`;}
    const meta=section==='rules'||section==='patterns'?topicOf(entry):(view.query?source.sections.find(s=>s.id===section).label:'');
    return `<article class="lab-card lab-focus-card" data-lab-entry="${esc(section)}-${index}"><div class="lab-focus-heading">${meta?`<p class="lab-card-meta">${highlight(meta)}${item.level?` <span>· ${esc(item.level)}</span>`:''}</p>`:''}<h2 class="lab-card-title" ${isWord||section==='patterns'?'lang="en"':''}>${highlight(titleText)}</h2></div><div class="lab-card-tabs" role="tablist" aria-label="카드 내용">${tabs.map(([id,label])=>`<button type="button" role="tab" id="lab-tab-${id}" data-lab-tab="${id}" aria-selected="${view.tab===id}" aria-controls="lab-card-body">${label}</button>`).join('')}</div><div class="lab-card-body lab-body-${view.tab}" id="lab-card-body" role="tabpanel" aria-labelledby="lab-tab-${view.tab}">${body}</div></article>`;
  }

  function resetCard(){view.position=0;view.tab='core';view.example=0;view.reference=0;view.quizDetail=false;}
  function move(root,delta){
    if(view.mode!=='card'||view.tools)return;
    const next=Math.max(0,Math.min(matching().length-1,view.position+delta));
    if(next===view.position)return;
    view.position=next;view.tab='core';view.example=0;view.reference=0;view.quizDetail=false;render(root);
  }

  function render(root) {
    if (!root?.isConnected) return;
    const selected=source.sections.find(section=>section.id===view.section)||source.sections[0],results=matching();
    view.position=Math.max(0,Math.min(view.position,results.length-1));
    root.classList.toggle('is-card',view.mode==='card');root.classList.toggle('is-list',view.mode==='list');
    window.MobileUI?.cardMode(view.mode==='card');
    root.querySelector('#lab-section-title').textContent=view.query?'검색 결과':selected.label;
    root.querySelector('#lab-count').textContent=view.mode==='card'?(results.length?`${number(view.position+1)} / ${number(results.length)}`:'0개'):`${number(results.length)}개`;
    root.querySelector('#lab-tools').hidden=!view.tools;
    root.querySelector('#lab-tools-toggle').setAttribute('aria-expanded',String(view.tools));
    root.querySelector('#lab-tools-toggle').classList.toggle('has-filter',Boolean(view.query||view.topic));
    root.querySelector('#lab-clear').hidden=!view.query;
    const topicEntries=entries.filter(entry=>entry.section===view.section),topics=[...new Set(topicEntries.map(topicOf))];
    root.querySelector('#lab-topic-wrap').hidden=Boolean(view.query)||!['rules','patterns'].includes(view.section);
    root.querySelector('#lab-topic').innerHTML='<option value="">전체 주제</option>'+topics.map(topic=>`<option value="${esc(topic)}" ${view.topic===topic?'selected':''}>${esc(topic)} · ${number(topicEntries.filter(entry=>topicOf(entry)===topic).length)}</option>`).join('');
    root.querySelector('#lab-categories').innerHTML=source.sections.map(section=>`<button type="button" class="lab-category" data-lab-section="${esc(section.id)}" aria-pressed="${view.section===section.id&&!view.query}">${esc(section.label)}<small>${number((source.library[section.id]||[]).length)}</small></button>`).join('');
    root.querySelectorAll('[data-lab-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.labMode===view.mode)));
    root.querySelector('#lab-results').innerHTML=results.length?(view.mode==='card'?compactCard(results[view.position]):results.slice(0,view.visible).map(listCard).join('')):'<div class="lab-empty"><h2>검색 결과가 없어요</h2><button type="button" class="secondary" data-lab-clear>검색 지우기</button></div>';
    root.querySelector('#lab-more').innerHTML=view.mode==='list'&&results.length>view.visible?`<button type="button" class="secondary" data-lab-more>더 보기 · ${number(view.visible)} / ${number(results.length)}</button>`:'';
    const nav=root.querySelector('#lab-card-nav');nav.hidden=view.mode!=='card'||!results.length;
    root.querySelector('#lab-previous').disabled=view.position===0;
    root.querySelector('#lab-next').disabled=view.position>=results.length-1;
  }

  function changeQuery(root,query,focus){
    view.query=String(query).trim();view.topic='';view.visible=40;resetCard();
    const input=root.querySelector('#lab-search');input.value=query;render(root);if(focus)input.focus();
  }

  window.labPage=function labPage(){
    if(!loadLibrary()){window.MobileUI?.cardMode(false);main.innerHTML='<section class="card"><h1>영어 연구실</h1><p>자료를 불러오지 못했어요.</p></section>';return;}
    view.tools=false;
    main.innerHTML=`<div class="wg-lab ${view.mode==='card'?'is-card':'is-list'}"><header class="lab-header"><h1 id="lab-section-title"></h1><div class="lab-header-actions"><div class="lab-view-switch" role="group" aria-label="보기 방식"><button type="button" data-lab-mode="card" aria-pressed="${view.mode==='card'}">카드</button><button type="button" data-lab-mode="list" aria-pressed="${view.mode==='list'}">목록</button></div><button type="button" id="lab-tools-toggle" class="lab-tools-toggle" aria-expanded="false" aria-controls="lab-tools" aria-label="검색과 필터 열기">⌕</button></div></header><div class="lab-result-line"><span id="lab-count" role="status" aria-live="polite" aria-atomic="true"></span><span class="lab-card-gesture">좌우로 넘겨 보세요</span></div><section class="lab-tools" id="lab-tools" aria-label="검색과 분류" hidden><div class="lab-tools-heading"><strong>검색·필터</strong><button type="button" data-lab-tools-close aria-label="검색과 필터 닫기">×</button></div><label class="lab-search-label" for="lab-search">표현·뜻 검색</label><div class="lab-search-box"><input id="lab-search" type="search" autocomplete="off" maxlength="160" placeholder="한국어 또는 영어" value="${esc(view.query)}"><button type="button" id="lab-clear" data-lab-clear aria-label="검색어 지우기">×</button></div><div id="lab-categories" class="lab-categories" role="group" aria-label="자료 분류"></div><label id="lab-topic-wrap" class="lab-topic-filter" hidden>주제<select id="lab-topic" aria-controls="lab-results"></select></label><a class="lab-credits-link" href="data-credits.html" target="_blank" rel="noopener">자료 출처·이용 조건 ↗</a><button type="button" class="lab-tools-apply" data-lab-tools-close>결과 보기</button></section><section class="lab-results" id="lab-results" aria-label="학습 자료"></section><div id="lab-more" class="lab-more"></div><nav class="lab-card-nav" id="lab-card-nav" aria-label="카드 이동"><button type="button" id="lab-previous">‹ 이전</button><button type="button" id="lab-next">다음 ›</button></nav></div>`;
    const root=main.querySelector('.wg-lab');
    root.querySelector('#lab-search').addEventListener('input',event=>changeQuery(root,event.target.value,false));
    root.querySelector('#lab-topic').addEventListener('change',event=>{view.topic=event.target.value;view.visible=40;resetCard();render(root);});
    root.querySelector('#lab-tools-toggle').onclick=()=>{view.tools=!view.tools;render(root);if(view.tools)root.querySelector('#lab-search').focus();};
    root.querySelector('#lab-previous').onclick=()=>move(root,-1);root.querySelector('#lab-next').onclick=()=>move(root,1);
    window.MobileUI?.bindSwipe(root.querySelector('#lab-results'),{prev:()=>move(root,-1),next:()=>move(root,1)});
    root.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button||!root.contains(button))return;
      if(button.hasAttribute('data-lab-mode')){view.mode=button.dataset.labMode;view.tools=false;render(root);}
      else if(button.hasAttribute('data-lab-tools-close')){view.tools=false;render(root);root.querySelector('#lab-tools-toggle').focus({preventScroll:true});}
      else if(button.hasAttribute('data-lab-tab')){view.tab=button.dataset.labTab;render(root);if(event.detail===0)root.querySelector(`[data-lab-tab="${view.tab}"]`)?.focus({preventScroll:true});}
      else if(button.hasAttribute('data-lab-example')){view.example=Math.max(0,view.example+Number(button.dataset.labExample));render(root);}
      else if(button.hasAttribute('data-lab-reference')){view.reference=Math.max(0,view.reference+Number(button.dataset.labReference));render(root);}
      else if(button.hasAttribute('data-lab-quiz-detail')){view.quizDetail=!view.quizDetail;render(root);}
      else if(button.hasAttribute('data-lab-quiz')){
        const key=button.dataset.labQuiz;if(quizAnswers.has(key))return;
        const entry=entries.find(value=>`${value.section}-${value.index}`===key),option=Number(button.dataset.option);
        if(!entry?.item.quiz||!Number.isInteger(option)||option<0||option>=entry.item.quiz.options.length)return;
        quizAnswers.set(key,option);view.quizDetail=false;render(root);
      }else if(button.hasAttribute('data-lab-retry')){quizAnswers.delete(button.dataset.labRetry);view.quizDetail=false;render(root);}
      else if(button.hasAttribute('data-lab-section')){view.section=button.dataset.labSection;changeQuery(root,'',false);}
      else if(button.hasAttribute('data-lab-clear'))changeQuery(root,'',true);
      else if(button.hasAttribute('data-lab-more')){view.visible+=40;render(root);}
      else if(button.hasAttribute('data-lab-speech'))speak(button.dataset.labSpeech);
    });
    render(root);
  };

  window.openPatternLibrary=function(){view.section='patterns';view.query='';view.topic='';view.visible=40;resetCard();show('lab');};
  window.openGrammarLibrary=function(){view.section='rules';view.query='';view.topic='';view.visible=40;resetCard();show('lab');};

  document.addEventListener('keydown',event=>{
    const root=document.querySelector('#main .wg-lab');if(!root)return;
    const input=root.querySelector('#lab-search');
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();view.tools=true;render(root);input.focus();input.select();}
    else if(event.key==='Escape'&&view.tools){event.preventDefault();view.tools=false;render(root);root.querySelector('#lab-tools-toggle').focus();}
    else if(view.mode==='card'&&!view.tools&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'')&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();move(root,event.key==='ArrowLeft'?-1:1);}
  });
})();
