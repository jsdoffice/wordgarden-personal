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
  // Suppress only the synthetic click following a swipe, including after a rerender.
  let swipeClickUntil = 0;
  const clearSwipeClick = () => { swipeClickUntil = 0; };
  document.addEventListener('pointerdown',clearSwipeClick,true);
  document.addEventListener('touchstart',clearSwipeClick,{capture:true,passive:true});
  document.addEventListener('click',event => {
    if(event.detail > 0 && performance.now() < swipeClickUntil){event.preventDefault();event.stopPropagation();}
  },true);
  function bindSwipe(element, {prev, next}) {
    if (!element) return () => {};
    let start = null;
    const oldTouchAction=element.style.touchAction;
    const nativeControl=target => target?.closest?.('a,input,textarea,select,audio,summary,[contenteditable="true"],[data-no-swipe]');
    const keyboardControl=target => target?.closest?.('button,a,input,textarea,select,audio,summary,[contenteditable="true"]');
    const begin=(kind,id,x,y,target)=>{
      start=null;
      if(nativeControl(target))return;
      start={kind,id,x,y,time:performance.now(),axis:null,captured:false};
    };
    const cancel=()=>{start=null;};
    const move=(kind,id,x,y,event)=>{
      if(!start||start.kind!==kind||start.id!==id)return;
      const dx=x-start.x,dy=y-start.y;
      if(!start.axis){
        if(Math.abs(dy)>14&&Math.abs(dy)>Math.abs(dx)*1.3)start.axis='vertical';
        else if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.2)start.axis='horizontal';
      }
      if(start.axis!=='horizontal')return;
      if(kind==='pointer'&&!start.captured){try{element.setPointerCapture?.(id);start.captured=true;}catch{}}
      if(event.cancelable)event.preventDefault();
    };
    const finish=(kind,id,x,y,event)=>{
      if(!start||start.kind!==kind||start.id!==id)return;
      const gesture=start;start=null;
      if(gesture.axis==='vertical')return;
      const dx=x-gesture.x,dy=y-gesture.y,elapsed=Math.max(1,performance.now()-gesture.time);
      const distance=Math.abs(dx),flick=distance>=20&&elapsed<=300&&distance/elapsed>=.45;
      if((distance<36&&!flick)||distance<Math.abs(dy)*1.3)return;
      if(event.cancelable)event.preventDefault();
      swipeClickUntil=performance.now()+350;
      if(dx<0)next?.();else prev?.();
    };
    const pointerDown=event=>{
      if(event.pointerType==='touch'||event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
      begin('pointer',event.pointerId,event.clientX,event.clientY,event.target);
    };
    const pointerMove=event=>{if(event.pointerType!=='touch')move('pointer',event.pointerId,event.clientX,event.clientY,event);};
    const pointerUp=event=>{if(event.pointerType!=='touch')finish('pointer',event.pointerId,event.clientX,event.clientY,event);};
    const pointerCancel=event=>{if(event.pointerType!=='touch'&&start?.kind==='pointer')cancel();};
    const touchStart=event=>{
      if(event.touches.length!==1){cancel();return;}
      const t=event.touches[0];begin('touch',t.identifier,t.clientX,t.clientY,event.target);
    };
    const touchMove=event=>{
      if(event.touches.length!==1){cancel();return;}
      const t=event.touches[0];move('touch',t.identifier,t.clientX,t.clientY,event);
    };
    const touchEnd=event=>{
      if(!start||start.kind!=='touch')return;
      const t=Array.from(event.changedTouches).find(t=>t.identifier===start.id);
      if(t)finish('touch',t.identifier,t.clientX,t.clientY,event);
    };
    const key=event=>{
      if(keyboardControl(event.target)||event.altKey||event.ctrlKey||event.metaKey)return;
      if(event.key==='ArrowLeft'){event.preventDefault();prev?.();}
      if(event.key==='ArrowRight'){event.preventDefault();next?.();}
    };
    element.style.touchAction='pan-y pinch-zoom';element.classList?.add('swipe-surface');
    for(const [type,handler] of [['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',pointerCancel],['touchstart',touchStart],['touchmove',touchMove],['touchend',touchEnd],['touchcancel',cancel],['keydown',key]])element.addEventListener(type,handler,type==='touchmove'?{passive:false}:type==='touchstart'?{passive:true}:false);
    return ()=>{
      cancel();element.style.touchAction=oldTouchAction;element.classList?.remove('swipe-surface');
      for(const [type,handler] of [['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',pointerCancel],['touchstart',touchStart],['touchmove',touchMove],['touchend',touchEnd],['touchcancel',cancel],['keydown',key]])element.removeEventListener(type,handler);
    };
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
