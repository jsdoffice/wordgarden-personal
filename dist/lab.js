(function () {
  'use strict';

  const view = { section: 'vocabulary', query: '', visible: 40 };
  let source, entries = [];
  const number = value => value.toLocaleString('ko-KR');

  function loadLibrary() {
    const current = window.WORDGARDEN_LAB;
    if (!current || !current.library || !Array.isArray(current.sections)) return null;
    if (source !== current) {
      source = current;
      entries = source.sections.flatMap(section => (source.library[section.id] || []).map((item, index) => ({
        section: section.id, item, index, search: JSON.stringify(item).toLocaleLowerCase()
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

  function card({ section, item, index }) {
    const label = source.sections.find(value => value.id === section).label;
    const badge = `<span class="lab-badge">${esc(label)}</span>`;
    const open = `<article class="lab-card${Array.isArray(item) ? '' : ' lab-card-wide'}" data-lab-entry="${esc(section)}-${index}">`;
    if (Array.isArray(item)) {
      const [word, meaning, example, type, ipa, englishGloss] = item;
      return open + `<div class="lab-card-top"><div><h3>${highlight(word)}</h3>${ipa ? `<p class="lab-pronunciation">${highlight(ipa)}</p>` : ''}</div>${badge}</div>
        ${type ? `<p class="lab-type">${highlight(type)}</p>` : ''}
        <p class="lab-meaning">${highlight(meaning)}</p>
        ${englishGloss ? `<p class="lab-gloss">${highlight(englishGloss)}</p>` : ''}
        ${example ? `<p class="lab-example">${highlight(example)}</p>` : ''}
        <div class="lab-card-actions">${speech(word, '단어·표현 듣기')}${speech(example)}</div></article>`;
    }
    const heading = `<div class="lab-card-top"><h3>${highlight(item.title)}</h3>${badge}</div>`;
    if (section === 'grammar') {
      return open + heading + `<p class="lab-formula">${highlight(item.formula)}</p>
        <p class="lab-meaning">${highlight(item.meaning)}</p>
        <div class="lab-example-pair"><p class="lab-example">${highlight(item.example)}</p><p class="lab-translation">${highlight(item.translation)}</p>${speech(item.example)}</div>
        ${item.moreExamples?.length ? `<ol class="lab-more-examples">${item.moreExamples.map(([en, ko]) => `<li><p>${highlight(en)}</p><p class="lab-translation">${highlight(ko)}</p>${speech(en)}</li>`).join('')}</ol>` : ''}
        ${item.note ? `<p class="lab-note"><strong>기억하기</strong> ${highlight(item.note)}</p>` : ''}</article>`;
    }
    if (section === 'groups') {
      return open + heading + `<p class="lab-meaning">${highlight(item.meaning)}</p>
        <div class="lab-compare-list">${(item.rows || []).map(([term, use, example]) => `<div class="lab-compare-row"><strong>${highlight(term)}</strong><div><p>${highlight(use)}</p><p class="lab-compare-example">${highlight(example)}</p>${speech(example, '표현 듣기')}</div></div>`).join('')}</div>
        ${item.note ? `<p class="lab-note"><strong>기억하기</strong> ${highlight(item.note)}</p>` : ''}</article>`;
    }
    const correct = item.correct || item.example;
    return open + heading + `<p class="lab-formula">${highlight(item.formula)}</p>
      <p class="lab-meaning">${highlight(item.meaning)}</p>
      ${correct ? `<div class="lab-correct"><span class="lab-example-label">✓ 맞는 문장</span><p>${highlight(correct)}</p>${speech(correct)}</div>` : ''}
      ${item.correct && item.example && item.correct !== item.example ? `<p class="lab-example">${highlight(item.example)}</p>` : ''}
      ${item.wrong ? `<div class="lab-wrong"><span class="lab-example-label">✕ 틀린 문장</span><p>${highlight(item.wrong)}</p></div>` : ''}
      ${item.note ? `<p class="lab-note"><strong>기억하기</strong> ${highlight(item.note)}</p>` : ''}</article>`;
  }

  function matching() {
    return view.query ? entries.filter(entry => entry.search.includes(view.query.toLocaleLowerCase())) : entries.filter(entry => entry.section === view.section);
  }

  function render(root) {
    if (!root?.isConnected) return;
    const selected = source.sections.find(section => section.id === view.section) || source.sections[0];
    const results = matching();
    root.querySelector('#lab-categories').innerHTML = source.sections.map(section => `<button type="button" class="lab-category" data-lab-section="${esc(section.id)}" aria-pressed="${view.section === section.id && !view.query}"><span class="lab-category-icon" aria-hidden="true">${esc(section.icon)}</span><span>${esc(section.label)}<small>${number((source.library[section.id] || []).length)}개 항목</small></span></button>`).join('');
    root.querySelector('#lab-kicker').textContent = view.query ? 'SEARCH RESULTS' : selected.english;
    root.querySelector('#lab-section-title').textContent = view.query ? `“${view.query}” 검색 결과` : selected.label;
    root.querySelector('#lab-description').textContent = view.query ? '단어·숙어·구동사·문법 자료 전체에서 찾은 결과입니다.' : selected.description;
    const tip = root.querySelector('#lab-tip');
    tip.textContent = view.query ? '검색어와 일치하는 부분을 표시했어요. 분류를 선택하면 해당 자료 전체로 돌아갑니다.' : selected.tip;
    root.querySelector('#lab-count').textContent = `${number(results.length)}개 항목 · ${number(Math.min(view.visible, results.length))}개 표시`;
    root.querySelector('#lab-clear').hidden = !view.query;
    root.querySelector('#lab-results').innerHTML = results.length ? results.slice(0, view.visible).map(card).join('') : '<div class="lab-empty"><span aria-hidden="true">⌕</span><h3>검색 결과가 없어요</h3><p>영어 표현이나 한국어 뜻을 짧게 입력해 보세요.</p><button type="button" class="secondary" data-lab-clear>검색 지우기</button></div>';
    root.querySelector('#lab-more').innerHTML = results.length > view.visible ? `<button type="button" class="secondary" data-lab-more>더 보기 (${number(view.visible)} / ${number(results.length)}) <span aria-hidden="true">↓</span></button>` : '';
  }

  function changeQuery(root, query, focus) {
    view.query = String(query).trim();
    view.visible = 40;
    const input = root.querySelector('#lab-search');
    input.value = query;
    render(root);
    if (focus) input.focus();
  }

  window.labPage = function labPage() {
    if (!loadLibrary()) {
      main.innerHTML = title('ENGLISH STUDY LIBRARY', '영어 연구실', '학습 자료를 불러오지 못했어요.') + '<section class="card"><p>인터넷에 연결한 뒤 페이지를 새로고침해 주세요.</p></section>';
      return;
    }
    main.innerHTML = `<div class="wg-lab">${title('ENGLISH STUDY LIBRARY', '영어 연구실', '토익 어휘부터 문장 구조까지, 필요한 영어를 바로 찾아 익히세요.', `<span class="lab-total">${number(entries.length)}개 학습 자료</span>`)}
      <section class="lab-search-panel" aria-label="영어 연구실 검색">
        <label for="lab-search">전체 자료 빠른 검색</label><div class="lab-search-box"><span class="lab-search-icon" aria-hidden="true">⌕</span><input id="lab-search" type="search" autocomplete="off" maxlength="160" placeholder="단어, 숙어, 뜻, 문법 규칙 검색" aria-describedby="lab-search-help" value="${esc(view.query)}"><button type="button" id="lab-clear" data-lab-clear aria-label="연구실 검색어 지우기">×</button><kbd aria-hidden="true">⌘ / Ctrl K</kbd></div>
        <div id="lab-search-help" class="lab-search-help"><span>이렇게 찾아보세요</span>${['accommodate', '동사원형', '목적격보어'].map(query => `<button type="button" data-lab-query="${esc(query)}">${esc(query)} ↗</button>`).join('')}</div>
      </section>
      <div id="lab-categories" class="lab-categories" role="group" aria-label="영어 연구실 자료 분류"></div>
      <section class="lab-library" aria-labelledby="lab-section-title"><div class="lab-section-heading"><div><p id="lab-kicker" class="eyebrow"></p><h2 id="lab-section-title"></h2><p id="lab-description"></p></div><p id="lab-count" class="lab-count" role="status" aria-live="polite" aria-atomic="true"></p></div><p id="lab-tip" class="lab-tip"></p><div id="lab-results" class="lab-results"></div><div id="lab-more" class="lab-more"></div></section>
      <p class="lab-footnote">사전의 뜻과 예문은 문맥에 따라 다른 의미일 수 있어요. 뜻풀이와 문장 속 쓰임을 함께 확인하세요. <a href="data-credits.html" target="_blank" rel="noopener">자료 출처와 이용 조건 ↗</a></p></div>`;
    const root = main.querySelector('.wg-lab');
    root.querySelector('#lab-search').addEventListener('input', event => {
      view.query = event.target.value.trim();
      view.visible = 40;
      render(root);
    });
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      if (button.hasAttribute('data-lab-section')) {
        view.section = button.dataset.labSection;
        changeQuery(root, '', false);
        root.querySelector(`[data-lab-section="${view.section}"]`)?.focus({ preventScroll: true });
      } else if (button.hasAttribute('data-lab-query')) {
        changeQuery(root, button.dataset.labQuery, true);
      } else if (button.hasAttribute('data-lab-clear')) {
        changeQuery(root, '', true);
      } else if (button.hasAttribute('data-lab-more')) {
        view.visible += 40;
        render(root);
        root.querySelector('[data-lab-more]')?.focus({ preventScroll: true });
      } else if (button.hasAttribute('data-lab-speech')) {
        speak(button.dataset.labSpeech);
      }
    });
    render(root);
  };

  document.addEventListener('keydown', event => {
    const root = document.querySelector('#main .wg-lab');
    if (!root) return;
    const input = root.querySelector('#lab-search');
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      input.focus();
      input.select();
    } else if (event.key === 'Escape' && document.activeElement === input) {
      event.preventDefault();
      changeQuery(root, '', false);
      input.blur();
    }
  });
})();
