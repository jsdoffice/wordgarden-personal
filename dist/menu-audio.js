/* Menu-wide English listening. Existing Michael clips or device speech; no API. */
(() => {
  'use strict';
  if (window.MenuAudio) return;
  const titles={home:'전체 문장',words:'단어장',everyday:'생활영어',translation:'번역 연습',lab:'문법·패턴',pronunciation:'발음 연습',review:'복습',stats:'전체 문장',settings:'전체 문장'};
  let page='',rows=[],signature='',index=0,active=false,paused=false,engine='',message='',run=0,nextTimer=null,utterance=null,ownedQueue=null,segmentStart=0,segmentEnd=0,savedPlayback=null,ownCall=0,subscription=null,audioAPI=null;
  let repeatAll=true;
  const rawId=item=>String(item?.sourceId||item?.id||'').replace(/^(?:ec|et)(?=\d{4}$)/,'everyday-').replace(/^tt(?=\d{4}$)/,'tr');
  function normalise(items){
    const result=[],seen=new Set();
    for(const item of Array.isArray(items)?items:[]){
      const values=item?.english?[item]:item?.word?[{...item,english:item.word,tts:true},...(item.sentence&&item.sentence!==item.word?[{...item,id:item.id+':example',english:item.sentence,tts:true}]:[])]:[];
      for(const value of values){
        const text=String(value.english||'').trim();if(!text||!/[a-z]/i.test(text)||/[가-힣]/.test(text))continue;
        const id=rawId(value),recorded=!value.tts&&/^(?:tr\d{4}|everyday-\d{4})$/.test(id),key=(recorded?id:'tts')+'|'+text.toLowerCase().replace(/\s+/g,' ');
        if(seen.has(key))continue;seen.add(key);
        result.push({...value,english:text,...(recorded?{sourceId:id}:{}),menuAudioKind:recorded?'recorded':'tts'});
      }
    }
    return result;
  }
  function items(forPage=page){
    let selected=[];
    try{
      if(['home','stats','settings'].includes(forPage))selected=[...(window.EVERYDAY_BANK||[]),...(window.TRANSLATION_BANK||[])];
      else if(forPage==='words')selected=window.Wordbook?.audioItems?.()||[];
      else if(forPage==='everyday')selected=window.Everyday?.filtered?.()||[];
      else if(forPage==='translation')selected=window.TranslationLibrary?.items?.()||[];
      else if(forPage==='lab')selected=window.LabAudio?.items?.()||[];
      else if(forPage==='pronunciation')selected=window.Pronunciation?.audioItems?.()||[];
      else if(forPage==='review')selected=typeof due==='function'?due():[];
    }catch{selected=[];}
    return normalise(selected);
  }
  const fingerprint=values=>values.map(item=>item.menuAudioKind+'|'+(item.sourceId||item.id||'')+'|'+item.english).join('\n');
  const inside=fn=>{ownCall++;try{return fn();}finally{ownCall--;}};
  function rememberPlayback(){if(!savedPlayback&&window.TranslationAudio)savedPlayback={repeat:TranslationAudio.repeat,random:TranslationAudio.random,loopQueue:TranslationAudio.loopQueue};}
  function restorePlayback(){if(savedPlayback&&window.TranslationAudio){Object.assign(TranslationAudio,savedPlayback);savedPlayback=null;}}
  function clearNext(){if(nextTimer!==null){clearTimeout(nextTimer);nextTimer=null;}}
  function mount(){
    const bar=document.querySelector('#menuAudioBar');if(!bar)return null;
    if(!bar.querySelector('#menuAudioToggle')){
      bar.innerHTML='<div class="menu-audio-copy"><strong id="menuAudioTitle">전체 듣기</strong><span id="menuAudioStatus" class="menu-audio-status" aria-live="off"></span></div><label class="menu-audio-repeat"><input type="checkbox" id="menuAudioRepeat" checked>전체 반복</label><button type="button" id="menuAudioToggle" class="menu-audio-play" aria-label="메뉴 전체 영어 재생">재생</button><button type="button" id="menuAudioStop" class="menu-audio-stop" aria-label="전체 음성 정지">정지</button><span id="menuAudioMessage" class="sentence-sr-only" role="status"></span>';
      bar.querySelector('#menuAudioToggle').onclick=()=>active&&!paused?pause():play();
      bar.querySelector('#menuAudioStop').onclick=()=>stop();
      bar.querySelector('#menuAudioRepeat').onchange=event=>{repeatAll=Boolean(event.target.checked);render();};
    }
    return bar;
  }
  function render(){
    const bar=mount();if(!bar)return;
    const title=bar.querySelector('#menuAudioTitle'),status=bar.querySelector('#menuAudioStatus'),toggle=bar.querySelector('#menuAudioToggle');
    title.textContent=(titles[page]||'전체')+' 듣기';
    const count=rows.length?`${Math.min(index+1,rows.length).toLocaleString('ko-KR')} / ${rows.length.toLocaleString('ko-KR')}개`:'0개';
    const kind=rows.length&&rows[index]?.menuAudioKind==='tts'?'기기 영어 음성':'Michael';
    const text=message||(!rows.length?'들을 영어가 없어요':active?(paused?'일시 정지':engine==='loading'?'음성 준비 중':`${kind} · 재생 중`):'재생을 눌러 시작');
    if(status.textContent!==count+' · '+text)status.textContent=count+' · '+text;
    status.title=text;
    toggle.textContent=active&&!paused?'일시 정지':paused?'이어 듣기':'재생';
    toggle.setAttribute('aria-label',active&&!paused?'메뉴 전체 영어 일시 정지':paused?'메뉴 전체 영어 이어 듣기':'메뉴 전체 영어 재생');
    toggle.disabled=!rows.length;bar.querySelector('#menuAudioStop').disabled=!active&&!paused;
    bar.querySelector('#menuAudioRepeat').checked=repeatAll;
    const notice=bar.querySelector('#menuAudioMessage');if(notice.textContent!==message)notice.textContent=message;
  }
  function resetPlayback(){
    ++run;clearNext();utterance=null;ownedQueue=null;
    inside(()=>{window.TranslationAudio?.stop();if('speechSynthesis'in window)speechSynthesis.cancel();});
    active=false;paused=false;engine='';restorePlayback();
  }
  function stop(note=''){
    resetPlayback();index=0;message=typeof note==='string'?note:'';render();
  }
  function fail(text){resetPlayback();message=text;render();}
  function complete(){
    if(repeatAll&&rows.length){index=0;next(run);return;}
    active=false;paused=false;engine='';ownedQueue=null;restorePlayback();message='전체 재생을 마쳤어요.';render();
  }
  function schedule(token){clearNext();nextTimer=setTimeout(()=>{nextTimer=null;if(token===run&&active&&!paused)next(token);},40);}
  function next(token){
    if(token!==run||!active||paused)return;
    if(index>=rows.length){complete();return;}
    const item=rows[index];
    if(item.menuAudioKind==='recorded'){
      if(!window.TranslationAudio?.subscribe){fail('문장 음성을 불러오지 못했어요. 새로고침 후 다시 눌러 주세요.');return;}
      segmentStart=index;segmentEnd=index+1;while(segmentEnd<rows.length&&rows[segmentEnd].menuAudioKind==='recorded')segmentEnd++;
      engine='loading';message='';rememberPlayback();
      inside(()=>{if('speechSynthesis'in window)speechSynthesis.cancel();TranslationAudio.repeat=false;TranslationAudio.random=false;TranslationAudio.loopQueue=false;TranslationAudio.start(rows.slice(segmentStart,segmentEnd));});
      ownedQueue=TranslationAudio.queue;render();return;
    }
    if(!('speechSynthesis'in window)||typeof window.SpeechSynthesisUtterance!=='function'){fail('이 브라우저는 기기 영어 음성을 지원하지 않아요. Safari나 Chrome에서 다시 열어 주세요.');return;}
    engine='tts';message='';ownedQueue=null;
    inside(()=>window.TranslationAudio?.stop());
    const current=new SpeechSynthesisUtterance(item.english);utterance=current;current.lang='en-US';current.rate=.92;
    const voices=speechSynthesis.getVoices?.()||[];current.voice=voices.find(voice=>/^en-US$/i.test(voice.lang)&&/Alex|Aaron|David|Guy|Tom|Matthew/i.test(voice.name))||voices.find(voice=>/^en-US$/i.test(voice.lang))||voices.find(voice=>/^en\b/i.test(voice.lang))||null;
    current.onend=()=>{if(token!==run||!active||paused||utterance!==current)return;utterance=null;index++;schedule(token);};
    current.onerror=event=>{if(token!==run||!active||utterance!==current)return;fail(event.error==='not-allowed'?'재생을 한 번 더 눌러 기기 음성을 시작해 주세요.':'기기 음성 재생이 중단됐어요. 재생을 눌러 다시 시작해 주세요.');};
    try{inside(()=>{speechSynthesis.cancel();speechSynthesis.speak(current);});render();}catch{fail('기기 영어 음성을 시작하지 못했어요. 재생을 한 번 더 눌러 주세요.');}
  }
  function play(){
    refresh();if(!rows.length)return false;
    attach();
    if(active&&paused){paused=false;message='';if(engine==='recorded'||engine==='loading'){engine='loading';inside(()=>TranslationAudio.resume());render();}else{++run;next(run);}return true;}
    resetPlayback();index=0;active=true;paused=false;message='';rememberPlayback();next(run);return true;
  }
  function pause(){
    if(!active||paused)return false;
    paused=true;message='';clearNext();
    if(engine==='recorded'||engine==='loading')inside(()=>TranslationAudio.pause());
    else{++run;utterance=null;inside(()=>{if('speechSynthesis'in window)speechSynthesis.cancel();});}
    render();return true;
  }
  function refresh(){
    const selected=items(),nextSignature=fingerprint(selected);
    if(nextSignature!==signature){if(active||paused)resetPlayback();rows=selected;signature=nextSignature;index=0;message='';}
    render();return rows.length;
  }
  function update(nextPage){
    if(page!==nextPage){resetPlayback();page=nextPage;signature='';index=0;message='';}
    attach();return refresh();
  }
  function onAudio(snapshot){
    if(!active||!ownedQueue)return;
    if(snapshot.queue!==ownedQueue){
      if(!ownCall&&!snapshot.length){resetPlayback();message='재생을 멈췄어요.';render();}
      return;
    }
    index=segmentStart+Math.min(snapshot.index,Math.max(0,snapshot.length-1));
    if(snapshot.ended){ownedQueue=null;index=segmentEnd;engine='';if(!paused)schedule(run);render();return;}
    if(snapshot.message&&!snapshot.playing&&!snapshot.transitioning){fail(snapshot.message);return;}
    if(snapshot.transitioning)engine='loading';else if(snapshot.playing){engine='recorded';paused=false;}else if(engine==='recorded')paused=true;
    render();
  }
  function attach(){
    const api=window.TranslationAudio;
    if(api&&audioAPI!==api){
      subscription?.();audioAPI=api;
      for(const method of ['start','resume','step']){
        const original=api[method];if(typeof original!=='function')continue;
        api[method]=function(...args){
          if(!ownCall&&(active||paused)){
            // Lock-screen transport controls keep controlling the owned clip queue.
            if(method!=='start'&&ownedQueue===api.queue&&(engine==='recorded'||engine==='loading')){
              paused=false;message='';return inside(()=>original.apply(this,args));
            }
            stop();
          }
          return original.apply(this,args);
        };
      }
      subscription=api.subscribe?.(onAudio)||null;
    }
  }
  if('speechSynthesis'in window){
    const original=speechSynthesis.speak.bind(speechSynthesis);
    try{speechSynthesis.speak=function(value){if(!ownCall&&(active||paused))stop();return original(value);};}catch{}
  }
  document.addEventListener('change',event=>{if(!ownCall&&(active||paused)&&['tr-repeat','tr-shuffle'].includes(event.target?.id))stop();},true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&engine==='tts')pause();});
  window.addEventListener('pagehide',()=>stop());
  window.MenuAudio={update,refresh,stop,play,pause,items,getState:()=>({page,index,count:rows.length,active,paused,engine,repeatAll,message})};
})();
