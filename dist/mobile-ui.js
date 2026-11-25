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
    if(enabled)cancelCardMotion();
    document.body.classList.toggle('home-mode',Boolean(enabled));
    if(enabled){document.body.classList.remove('card-mode','lesson-mode');}
    viewport();
  }
  function lessonMode(enabled) {
    if(enabled)cancelCardMotion();
    document.body.classList.toggle('lesson-mode',Boolean(enabled));
    if(enabled){document.body.classList.remove('card-mode','home-mode');window.scrollTo(0,0);}
    viewport();
  }
  function fitLesson(){viewport();}
  function cardMode(enabled) {
    if(!enabled)cancelCardMotion();
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
  const motionPreference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reducedMotion=()=>Boolean(motionPreference?.matches);
  let activeCardMotion=null;
  const call=(fn,fallback=null)=>{try{return typeof fn==='function'?fn():fallback;}catch{return fallback;}};
  const allowed=(options,direction)=>{try{return !options.canMove||Boolean(options.canMove(direction));}catch{return false;}};
  const active=options=>typeof options.isActive!=='function'||call(options.isActive,false)===true;
  function captureVisual(element){
    const original={};for(const property of ['transform','opacity','transition','willChange'])original[property]=element.style[property]||'';
    element.classList?.add('card-motion-target');element.style.willChange='transform, opacity';element.style.transition='none';
    return{element,original,width:element.getBoundingClientRect?.().width||320};
  }
  function restoreVisual(visual){
    if(!visual)return;for(const [property,value]of Object.entries(visual.original))visual.element.style[property]=value;
    visual.element.classList?.remove('card-motion-target');
  }
  function clearMotionAnimation(state){
    state.animation?.cancel();state.animation=null;
    if(state.timer!==null){clearTimeout(state.timer);state.timer=null;}
    if(state.frame!==null){window.cancelAnimationFrame?.(state.frame);state.frame=null;}
    state.fallbackResolve?.(false);state.fallbackResolve=null;
  }
  function releaseMotion(state){
    if(!state||state.cancelled)return;state.cancelled=true;state.abortGesture?.();state.observer?.disconnect();
    clearMotionAnimation(state);restoreVisual(state.visual);
    if(activeCardMotion===state)activeCardMotion=null;
  }
  function cancelCardMotion(){
    // Wordbook deliberately destroys its old binding inside this synchronous swap.
    if(activeCardMotion?.phase!=='swap')releaseMotion(activeCardMotion);
  }
  function validMotion(state){
    return !state.cancelled&&active(state.options)&&state.visual?.element.isConnected!==false&&call(state.options.target)===state.visual?.element&&call(state.options.key)===state.key;
  }
  function createMotion(options,owner=null){
    const element=call(options.target),key=call(options.key);
    if(!element||element.isConnected===false||key===null||key===undefined||key===''||!active(options))return null;
    const state={options,owner,key,visual:captureVisual(element),phase:'drag',offset:0,cancelled:false,animation:null,timer:null,frame:null,observer:null,abortGesture:null};
    activeCardMotion=state;
    if(window.MutationObserver&&document.body){
      state.observer=new MutationObserver(()=>{
        if(state.phase==='swap'||state.cancelled)return;
        if(!validMotion(state)||(state.phase==='out'&&!allowed(state.options,state.direction)))releaseMotion(state);
      });
      state.observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});
    }
    return state;
  }
  function animateVisual(state,frames,duration,easing='cubic-bezier(.2,.8,.2,1)'){
    if(!validMotion(state))return Promise.resolve(false);
    const element=state.visual.element;
    if(typeof element.animate==='function'){
      try{
        const animation=element.animate(frames,{duration,easing,fill:'forwards'});state.animation=animation;
        return animation.finished.then(()=>!state.cancelled,()=>false);
      }catch{}
    }
    return new Promise(resolve=>{
      state.fallbackResolve=resolve;
      Object.assign(element.style,frames[0]);void element.offsetWidth;
      element.style.transition=`transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
      const tick=()=>{state.frame=null;if(state.cancelled)return;Object.assign(element.style,frames[frames.length-1]);state.timer=setTimeout(()=>{state.timer=null;state.fallbackResolve=null;resolve(!state.cancelled);},duration+32);};
      if(window.requestAnimationFrame)state.frame=requestAnimationFrame(tick);else tick();
    });
  }
  function paintDrag(state,dx){
    if(state.phase!=='drag')return;
    if(!validMotion(state)){releaseMotion(state);return;}
    const direction=dx<0?1:-1,width=state.visual.width;
    state.offset=allowed(state.options,direction)?Math.max(-width*.95,Math.min(width*.95,dx)):Math.max(-28,Math.min(28,dx*.18));
    const progress=Math.min(1,Math.abs(state.offset)/width);
    state.visual.element.style.transform=`translate3d(${state.offset}px,0,0) scale(${1-progress*.012})`;
    state.visual.element.style.opacity=String(1-progress*.07);
  }
  function queueDrag(state,dx){
    state.pendingDx=dx;
    if(state.frame!==null)return;
    const tick=()=>{state.frame=null;paintDrag(state,state.pendingDx);};
    if(window.requestAnimationFrame)state.frame=requestAnimationFrame(tick);else tick();
  }
  function flushDrag(state,dx){
    if(state.frame!==null){window.cancelAnimationFrame?.(state.frame);state.frame=null;}paintDrag(state,dx);
  }
  function returnCard(state){
    if(!state||state.cancelled)return;
    if(state.frame!==null){window.cancelAnimationFrame?.(state.frame);state.frame=null;}
    if(!validMotion(state)||reducedMotion()||Math.abs(state.offset)<.5){releaseMotion(state);return;}
    state.phase='return';state.abortGesture=null;
    const element=state.visual.element;
    animateVisual(state,[{transform:element.style.transform,opacity:element.style.opacity},{transform:'translate3d(0px,0,0) scale(1)',opacity:1}],190).then(()=>releaseMotion(state));
  }
  function transitionCard(options,dragState=null){
    const direction=options.direction;
    if(typeof options.navigate!=='function'||![-1,1].includes(direction)||!active(options)||!allowed(options,direction)){if(dragState)returnCard(dragState);return false;}
    if(activeCardMotion&&activeCardMotion!==dragState){
      if(['in','return'].includes(activeCardMotion.phase))releaseMotion(activeCardMotion);else return false;
    }
    const element=call(options.target),key=call(options.key);
    if(!element||element.isConnected===false||key===null||key===undefined||key==='')return false;
    if(reducedMotion()){
      if(dragState)releaseMotion(dragState);
      if(active(options)&&call(options.target)===element&&call(options.key)===key&&allowed(options,direction)){try{options.navigate();return true;}catch{return false;}}return false;
    }
    const state=dragState||createMotion(options);
    if(!state)return false;
    state.options=options;state.phase='out';state.direction=direction;state.abortGesture=null;
    if(!validMotion(state)){releaseMotion(state);return false;}
    const width=state.visual.width,exit=-direction*(width+24),duration=Math.round(160-Math.min(Math.abs(state.offset)/width,.6)*70);
    const from={transform:element.style.transform||'translate3d(0px,0,0) scale(1)',opacity:element.style.opacity||1};
    animateVisual(state,[from,{transform:`translate3d(${exit}px,0,0) scale(.985)`,opacity:.15}],duration,'cubic-bezier(.4,0,1,1)').then(async finished=>{
      if(!finished||!validMotion(state)||!allowed(options,direction)){releaseMotion(state);return;}
      state.phase='swap';clearMotionAnimation(state);restoreVisual(state.visual);state.visual=null;
      try{options.navigate();}catch{releaseMotion(state);return;}
      const fresh=call(options.target),freshKey=call(options.key);
      if(!active(options)||!fresh||fresh.isConnected===false||fresh===element||freshKey===key||freshKey===null||freshKey===undefined){releaseMotion(state);return;}
      state.visual=captureVisual(fresh);state.key=freshKey;state.owner=fresh.closest?.('.swipe-surface')||state.owner;state.phase='in';
      const enter=direction*Math.max(52,state.visual.width*.75);
      const incoming=[{transform:`translate3d(${enter}px,0,0) scale(.985)`,opacity:.5},{transform:'translate3d(0px,0,0) scale(1)',opacity:1}];
      if(!reducedMotion())await animateVisual(state,incoming,220,'cubic-bezier(.16,1,.3,1)');
      releaseMotion(state);
    });
    return true;
  }
  function bindSwipe(element, {prev, next,motion}) {
    if (!element) return () => {};
    let start = null;
    const oldTouchAction=element.style.touchAction;
    const nativeControl=target => target?.closest?.('a,input,textarea,select,audio,summary,[contenteditable="true"],[data-no-swipe]');
    const keyboardControl=target => target?.closest?.('button,a,input,textarea,select,audio,summary,[contenteditable="true"]');
    const begin=(kind,id,x,y,target)=>{
      start=null;
      if(nativeControl(target))return;
      if(motion){
        if(activeCardMotion&&['in','return'].includes(activeCardMotion.phase))releaseMotion(activeCardMotion);
        if(activeCardMotion||!active(motion))return;
      }
      start={kind,id,x,y,time:performance.now(),axis:null,captured:false,motionState:null,motionTarget:motion?call(motion.target):null,motionKey:motion?call(motion.key):null};
    };
    const cancel=()=>{const gesture=start;start=null;if(gesture?.motionState)returnCard(gesture.motionState);};
    const move=(kind,id,x,y,event)=>{
      if(!start||start.kind!==kind||start.id!==id)return;
      const dx=x-start.x,dy=y-start.y;
      if(!start.axis){
        if(Math.abs(dy)>14&&Math.abs(dy)>Math.abs(dx)*1.3)start.axis='vertical';
        else if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.2)start.axis='horizontal';
      }
      if(start.axis!=='horizontal')return;
      if(motion){
        if(!active(motion)||call(motion.target)!==start.motionTarget||call(motion.key)!==start.motionKey){cancel();return;}
        if(!reducedMotion()){
          if(!start.motionState){start.motionState=createMotion(motion,element);if(start.motionState)start.motionState.abortGesture=()=>{start=null;};}
          if(start.motionState)queueDrag(start.motionState,dx);
        }
      }
      if(kind==='pointer'&&!start.captured){try{element.setPointerCapture?.(id);start.captured=true;}catch{}}
      if(event.cancelable)event.preventDefault();
    };
    const finish=(kind,id,x,y,event)=>{
      if(!start||start.kind!==kind||start.id!==id)return;
      const gesture=start;start=null;
      if(gesture.axis==='vertical'){if(gesture.motionState)returnCard(gesture.motionState);return;}
      const dx=x-gesture.x,dy=y-gesture.y,elapsed=Math.max(1,performance.now()-gesture.time);
      const distance=Math.abs(dx),flick=distance>=20&&elapsed<=300&&distance/elapsed>=.45;
      if((distance<36&&!flick)||distance<Math.abs(dy)*1.3){if(gesture.motionState)returnCard(gesture.motionState);return;}
      if(event.cancelable)event.preventDefault();
      swipeClickUntil=performance.now()+350;
      if(motion){
        if(!active(motion)||call(motion.target)!==gesture.motionTarget||call(motion.key)!==gesture.motionKey){if(gesture.motionState)releaseMotion(gesture.motionState);return;}
        if(gesture.motionState)flushDrag(gesture.motionState,dx);
        transitionCard({direction:dx<0?1:-1,...motion,navigate:dx<0?next:prev},gesture.motionState);
      }else if(dx<0)next?.();else prev?.();
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
      start=null;if(activeCardMotion?.owner===element&&activeCardMotion.phase!=='swap')releaseMotion(activeCardMotion);
      element.style.touchAction=oldTouchAction;element.classList?.remove('swipe-surface');
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
  window.MobileUI = {cardMode,homeMode,lessonMode,fitLesson,bindSwipe,transitionCard,cancelMotion:cancelCardMotion,updateNav};
  window.addEventListener('resize',viewport);
  window.addEventListener('resize',cancelCardMotion);
  window.addEventListener('pagehide',cancelCardMotion);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelCardMotion();});
  if(motionPreference?.addEventListener)motionPreference.addEventListener('change',cancelCardMotion);else motionPreference?.addListener?.(cancelCardMotion);
  window.visualViewport?.addEventListener('resize',viewport);
  window.visualViewport?.addEventListener('scroll',viewport);
  document.addEventListener('focusin',()=>{
    if(editable()&&!editingHeight)editingHeight=Math.max(window.innerHeight,window.visualViewport?.height||0);
    viewport();
  });
  document.addEventListener('focusout',()=>{setTimeout(viewport,0);});
  viewport();
})();
