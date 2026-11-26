/* Shared sentence preferences and reversible mode IDs. No new progress storage. */
(() => {
  'use strict';
  const validMode = mode => mode === 'cards' || mode === 'typing';
  const validLevel = level => Number.isInteger(level) && level >= 0 && level <= 5;
  const getMode = () => typeof state !== 'undefined' && validMode(state.sentenceAnswerMode) ? state.sentenceAnswerMode : 'cards';
  const getLevel = () => typeof state !== 'undefined' && validLevel(state.sentenceLevel) ? state.sentenceLevel : 0;
  function setMode(mode) {
    if (!validMode(mode)) return false;
    state.sentenceAnswerMode = mode; save(); return true;
  }
  function setLevel(level) {
    if (!validLevel(level)) return false;
    state.sentenceLevel = level; save(); return true;
  }
  function sourceKey(item) {
    const id = String(item?.sourceId || item?.id || '');
    if (/^(?:ec|et)\d{4}$/.test(id)) return id.replace(/^(?:ec|et)/, 'everyday-');
    return id.replace(/^tt(?=\d{4}$)/, 'tr');
  }
  const isSentence = item => Boolean(item?.english && /^(?:tr\d{4}|everyday-\d{4})$/.test(sourceKey(item)));
  function toMode(item, mode = getMode()) {
    if (!validMode(mode) || !isSentence(item)) return item;
    const sourceId = sourceKey(item), everyday = sourceId.startsWith('everyday-');
    const id = everyday ? sourceId.replace('everyday-', mode === 'typing' ? 'et' : 'ec') : sourceId.replace(/^tr/, mode === 'typing' ? 'tt' : 'tr');
    return {...item, id, sourceId, kind:mode === 'typing' ? 'typing' : 'translation', ...(everyday ? {collection:'everyday'} : {})};
  }
  function levelOf(item) {
    const id = sourceKey(item), everyday = id.startsWith('everyday-');
    const number = Number(id.replace(everyday ? 'everyday-' : 'tr', ''));
    const levels = window.SENTENCE_LEVELS?.[everyday ? 'everyday' : 'translation'];
    const level = Number(levels?.[number - 1]);
    return level >= 1 && level <= 5 ? level : 3;
  }
  const filter = (items, level = getLevel()) => !validLevel(level) || level === 0 ? [...items] : items.filter(item => !isSentence(item) || levelOf(item) === level);
  const names = ['전체 단계','1단계 · 아주 쉬움','2단계 · 쉬움','3단계 · 보통','4단계 · 어려움','5단계 · 도전'];
  const levelOptions = (selected = getLevel()) => names.map((name, value) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${name}</option>`).join('');
  window.SentencePractice = {getMode,setMode,getLevel,setLevel,levelOf,filter,toMode,sourceKey,isSentence,levelOptions,label:item=>`${levelOf(item)}단계`};
})();
