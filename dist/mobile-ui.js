/* Shared mobile navigation and card gestures. Learning storage keeps its original identity. */
(() => {
  'use strict';
  let editingHeight = 0;
  const editable = () => document.activeElement?.matches?.('input:not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]');
  function viewport() {
    const height = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
    const editing = editable();
    if (!editing) editingHeight = 0;
    const keyboard = Boolean(editing && editingHeight && height < editingHeight - 120);
    document.body.classList.toggle('keyboard-open', keyboard);
    document.documentElement.style.setProperty('--viewport-top', `${Math.round(window.visualViewport?.offsetTop || 0)}px`);
  }
  function homeMode(enabled) {
    document.body.classList.toggle('home-mode',Boolean(enabled));
    if(enabled){document.body.classList.remove('card-mode','lesson-mode');}
    viewport();
  }
  function lessonMode(enabled) {
    document.body.classList.toggle('lesson-mode',Boolean(enabled));
    if(enabled){document.body.classList.remove('card-mode','home-mode');window.scrollTo(0,0);}
    viewport();
  }
  function fitLesson(){viewport();}
  function cardMode(enabled) {
    document.body.classList.toggle('card-mode', Boolean(enabled));
    if(enabled)document.body.classList.remove('home-mode','lesson-mode');
    viewport();
    if (enabled) window.scrollTo(0, 0);
  }
  function bindSwipe(element, {prev, next}) {
    if (!element) return () => {};
    let start = null, suppressClickUntil = 0;
    const interactive = target => target.closest('button,a,input,textarea,select,audio,summary,[contenteditable="true"]');
    const down = event => {
      if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0) || interactive(event.target)) return;
      start = {id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now()};
      suppressClickUntil = 0;
      try { element.setPointerCapture?.(event.pointerId); } catch {}
    };
    const cancel = () => { start = null; };
    const up = event => {
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y, elapsed = performance.now() - start.time;
      start = null;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4 || elapsed > 900) return;
      suppressClickUntil = performance.now() + 250;
      if (dx < 0) next?.(); else prev?.();
    };
    const click = event => {
      if(event.detail > 0 && performance.now() < suppressClickUntil){event.preventDefault();event.stopPropagation();}
      suppressClickUntil = 0;
    };
    const key = event => {
      if (interactive(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
      if(event.key==='ArrowLeft'){event.preventDefault();prev?.();}
      if(event.key==='ArrowRight'){event.preventDefault();next?.();}
    };
    element.style.touchAction = 'pan-y pinch-zoom';
    element.addEventListener('pointerdown',down);
    element.addEventListener('pointerup',up);
    element.addEventListener('pointercancel',cancel);
    element.addEventListener('click',click,true);
    element.addEventListener('keydown',key);
    return () => {element.removeEventListener('pointerdown',down);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',cancel);element.removeEventListener('click',click,true);element.removeEventListener('keydown',key);};
  }
  function updateNav(page) {
    const section = page;
    document.querySelectorAll('aside nav [data-page]').forEach(button => {
      const active = button.dataset.page === section;
      button.classList.toggle('active',active);
      if(active){button.setAttribute('aria-current','page');button.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'auto'});}else button.removeAttribute('aria-current');
    });
  }
  window.MobileUI = {cardMode,homeMode,lessonMode,fitLesson,bindSwipe,updateNav};
  window.addEventListener('resize',viewport);
  window.visualViewport?.addEventListener('resize',viewport);
  window.visualViewport?.addEventListener('scroll',viewport);
  document.addEventListener('focusin',()=>{
    if(editable()&&!editingHeight)editingHeight=Math.max(window.innerHeight,window.visualViewport?.height||0);
    viewport();
  });
  document.addEventListener('focusout',()=>{setTimeout(viewport,0);});
  viewport();
})();
