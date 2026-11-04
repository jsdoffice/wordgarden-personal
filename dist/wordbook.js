/* A single wordbook view: shared search/filter state, inline examples, stable headword navigation. */
window.Wordbook = (() => {
  const ui = {mode:'list',query:'',selected:'',expanded:new Set()};
  const keyOf = word => String(word).trim().toLowerCase();
  const selectionKey = word => wordFilter==='custom'?'custom:'+word.id:keyOf(word.word);
  const labels = [['all','전체'],['saved','저장한 단어'],['custom','직접 추가'],['learning','학습 중']];
  function groups() {
    const map = new Map();
    for (const word of words()) {
      const key=keyOf(word.word);
      if (!map.has(key)) map.set(key,[]);
      map.get(key).push(word);
    }
    return map;
  }
  function rows() {
    const query=ui.query.trim().toLowerCase(), grouped=groups();
    const candidates=wordFilter==='custom'?state.custom:vocabulary();
    return candidates.filter(word => {
      const peers=grouped.get(keyOf(word.word))||[word];
      return (!query||word.word.toLowerCase().includes(query)||word.meaning.includes(query)) &&
        (wordFilter==='all'||wordFilter==='custom'||wordFilter==='saved'&&peers.some(w=>state.progress[w.id]?.star)||wordFilter==='learning'&&peers.some(w=>state.progress[w.id]));
    });
  }
  function metadata(word) {
    const data=window.WORDBOOK_DATA?.[keyOf(word.word)]||{};
    return {ipa:word.ipaInput||data.ipa||word.ipa?.replace(/^\/|\/$/g,'')||'',pos:word.posInput?[word.posInput]:data.pos||[],meaning:word.id.startsWith('c')?word.meaning:data.meaning||word.meaning};
  }
  function examples(word) {
    const all=[];
    // Preserve a user's own bilingual example, including one imported in an older backup.
    const customRows=word.id.startsWith('c')?[word]:state.custom.filter(w=>keyOf(w.word)===keyOf(word.word));
    for(const custom of customRows) {
      const translation=custom.exampleTranslation||(custom.translation!==custom.meaning?custom.translation:'');
      if(custom.sentence&&keyOf(custom.sentence)!==keyOf(custom.word)&&translation&&/[가-힣]/.test(translation))all.push([custom.sentence,translation]);
    }
    all.push(...(window.WORDBOOK_DATA?.[keyOf(word.word)]?.examples||[]));
    const seen=new Set();
    return all.filter(pair=>{const key=pair[0].toLowerCase().trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ');if(seen.has(key))return false;seen.add(key);return true;}).slice(0,3);
  }
  function selection(items) {
    let index=items.findIndex(word=>selectionKey(word)===ui.selected);
    if(index<0)index=0;
    ui.selected=items[index]?selectionKey(items[index]):'';
    return index;
  }
  function pageView() {
    main.innerHTML=title('MY VOCABULARY','나의 단어장',`${fmt(vocabulary().length)}개 단어·표현 · 소리와 문맥으로 기억해요.`)+`
      <section class="wb-workspace" aria-label="나의 단어장">
        <div class="word-toolbar"><input id="search" type="search" value="${esc(ui.query)}" placeholder="영어 단어 또는 뜻 검색" aria-label="단어 검색"><button class="primary" id="addWord">+ 단어 추가</button></div>
        <div class="wb-controls"><div class="wb-filters" role="group" aria-label="단어 필터">${labels.map(([key,label])=>`<button class="${wordFilter===key?'primary':'secondary'}" data-filter="${key}" aria-pressed="${wordFilter===key}">${label}</button>`).join('')}</div>
        <div class="wb-modes" role="group" aria-label="단어장 보기 방식"><button data-wordbook-mode="list" aria-pressed="${ui.mode==='list'}">☷ 목록</button><button data-wordbook-mode="card" aria-pressed="${ui.mode==='card'}">▣ 카드</button></div></div>
        <div id="wordbookCount" class="wb-result-count" role="status"></div><div id="wordList" class="wb-results"></div><p class="wb-card-hint">미국 영어 기준 발음기호이며, 일부 단어는 강세 표시를 생략했어요.</p>
      </section>`;
    document.querySelector('#search').oninput=e=>{ui.query=e.target.value;wordLimit=40;ui.selected='';render();};
    document.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{wordFilter=button.dataset.filter;wordLimit=40;ui.selected='';pageView();});
    document.querySelectorAll('[data-wordbook-mode]').forEach(button=>button.onclick=()=>{ui.mode=button.dataset.wordbookMode;render();});
    document.querySelector('#addWord').onclick=()=>document.querySelector('#addDialog').showModal();
    render();
  }
  function exampleMarkup(word,cardMode) {
    const pairs=examples(word),key=keyOf(word.word);
    const content=pairs.length?`<ol class="wb-examples">${pairs.map(([en,ko],index)=>`<li><div><p lang="en">${esc(en)}</p><p lang="ko">${esc(ko)}</p></div><button class="wb-icon" data-wb-listen-example="${esc(word.id)}" data-example-index="${index}" aria-label="${esc(word.word)} 예문 ${index+1} 듣기">◖</button></li>`).join('')}</ol>`:`<p class="wb-empty-examples">연결된 영한 예문이 아직 없어요.${word.id.startsWith('c')?' 단어를 추가할 때 예문과 한국어 번역을 함께 입력할 수 있어요.':''}</p>`;
    return cardMode?`<div class="wb-example-section"><h3>문장으로 익히기 <span>${pairs.length}개</span></h3>${content}</div>`:`<details class="wb-inline-examples" data-wordbook-key="${esc(key)}" ${ui.expanded.has(key)?'open':''}><summary>영한 예문 ${pairs.length}개 <span aria-hidden="true">⌄</span></summary>${content}</details>`;
  }
  function wordMarkup(word,cardMode,grouped) {
    const data=metadata(word),peers=grouped.get(keyOf(word.word))||[word],star=peers.some(w=>state.progress[w.id]?.star);
    return `<article class="wb-item ${cardMode?'wb-flashcard':''}" aria-label="${esc(word.word)} 단어 카드">
      <div class="wb-card-top"><span class="wb-category">${esc(word.category)}</span><div class="wb-tools"><button class="wb-icon ${star?'is-saved':''}" data-wb-star="${esc(word.id)}" aria-label="${esc(word.word)} ${star?'저장 해제':'저장'}" aria-pressed="${star}">${star?'★':'☆'}</button>${word.id.startsWith('c')?`<button class="wb-icon" data-wb-delete="${esc(word.id)}" aria-label="${esc(word.word)} 직접 추가한 단어 삭제">×</button>`:''}</div></div>
      <div class="wb-heading"><h2 ${cardMode?'tabindex="-1" id="wordbookCurrent"':''} lang="en">${esc(word.word)}</h2><button class="wb-icon wb-word-audio" data-wb-listen="${esc(word.id)}" aria-label="${esc(word.word)} 발음 듣기">◖</button></div>
      <p class="wb-ipa" aria-label="미국식 발음기호">${data.ipa?`<span lang="en">/${esc(data.ipa)}/</span>`:'발음기호 미등록'}<span class="wb-ipa-label">미국식</span></p>
      <div class="wb-definition"><div class="wb-pos" aria-label="품사">${data.pos.length?data.pos.map(pos=>`<span>${esc(pos)}</span>`).join(''):'<span class="wb-unclassified">품사 미분류</span>'}</div><p>${esc(data.meaning)}</p></div>
      ${data.pos.length>1?'<p class="wb-sense-note">문맥에 따라 품사와 뜻이 달라질 수 있어요.</p>':''}
      ${exampleMarkup(word,cardMode)}
    </article>`;
  }
  function render(focus=false) {
    const container=document.querySelector('#wordList');if(!container)return;
    const items=rows(),index=selection(items),grouped=groups();
    document.querySelectorAll('[data-wordbook-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.wordbookMode===ui.mode)));
    document.querySelector('#wordbookCount').textContent=`${labels.find(([key])=>key===wordFilter)?.[1]||'전체'} · ${fmt(items.length)}개${ui.query.trim()?` · “${ui.query.trim()}” 검색 결과`:''}`;
    if(!items.length){container.innerHTML='<section class="card empty"><h2>표시할 단어가 없어요</h2><p class="muted">검색어를 바꾸거나 다른 필터를 선택해 보세요.</p></section>';return;}
    if(ui.mode==='card') {
      container.innerHTML=`<div class="wb-card-view"><div class="wb-navigation" role="group" aria-label="단어 카드 이동"><button class="secondary" id="wordbookPrev" ${index===0?'disabled':''}>← 이전</button><span role="status" aria-live="polite"><strong>${fmt(index+1)}</strong> / ${fmt(items.length)}</span><button class="primary" id="wordbookNext" ${index===items.length-1?'disabled':''}>다음 →</button></div>${wordMarkup(items[index],true,grouped)}<p class="wb-card-hint">영어 · 발음기호 · 품사와 뜻 · 영한 예문을 한 카드에서.</p></div>`;
      for(const [id,step]of [['wordbookPrev',-1],['wordbookNext',1]])document.querySelector('#'+id).onclick=()=>{if(index+step<0||index+step>=items.length)return;ui.selected=selectionKey(items[index+step]);if('speechSynthesis'in window)speechSynthesis.cancel();render(true);};
    } else {
      container.innerHTML=`<div class="wb-list-view">${items.slice(0,wordLimit).map(word=>wordMarkup(word,false,grouped)).join('')}</div>${items.length>wordLimit?`<button class="secondary wb-more" id="wordbookMore">더 보기 (${fmt(Math.min(wordLimit,items.length))} / ${fmt(items.length)})</button>`:''}`;
      const more=document.querySelector('#wordbookMore');if(more)more.onclick=()=>{wordLimit+=40;render();};
    }
    container.querySelectorAll('details[data-wordbook-key]').forEach(details=>details.ontoggle=()=>{if(details.open)ui.expanded.add(details.dataset.wordbookKey);else ui.expanded.delete(details.dataset.wordbookKey);});
    const find=id=>words().find(word=>word.id===id);
    container.querySelectorAll('[data-wb-listen]').forEach(button=>button.onclick=()=>{const word=find(button.dataset.wbListen);if(word)speak(word.word);});
    container.querySelectorAll('[data-wb-listen-example]').forEach(button=>button.onclick=()=>{const word=find(button.dataset.wbListenExample),pair=word&&examples(word)[Number(button.dataset.exampleIndex)];if(pair)speak(pair[0]);});
    container.querySelectorAll('[data-wb-star]').forEach(button=>button.onclick=()=>{
      const word=find(button.dataset.wbStar);if(!word)return;
      const peers=grouped.get(keyOf(word.word))||[word],saved=peers.some(w=>state.progress[w.id]?.star);
      if(saved)for(const peer of peers){if(state.progress[peer.id]?.star)state.progress[peer.id].star=false;}
      else {const progress=state.progress[word.id]||{level:0,attempts:0,correct:0,due:Date.now()};state.progress[word.id]={...progress,star:true};}
      save();render();
    });
    container.querySelectorAll('[data-wb-delete]').forEach(button=>button.onclick=()=>{if(confirm('직접 추가한 이 단어를 삭제할까요?')){state.custom=state.custom.filter(w=>w.id!==button.dataset.wbDelete);delete state.progress[button.dataset.wbDelete];save();render();}});
    if(focus)document.querySelector('#wordbookCurrent')?.focus({preventScroll:true});
  }
  return {page:pageView,render,examples,metadata,rows};
})();
