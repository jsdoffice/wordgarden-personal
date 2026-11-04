// Local experimental sound comparison. No uploads or persistent learning records.
(() => {
  'use strict';
  const P={mode:'sentence',query:'',category:'',item:null,run:0,phase:'idle',worker:null,pending:new Map(),seq:0,loaded:null,capture:null,url:null};
  const $=id=>document.getElementById(id),html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normal=value=>String(value||'').toLocaleLowerCase().trim();
  const supportedWords=new Set(DICTIONARY.map(w=>normal(w.word)));
  let referenceData=null,referenceLoad=null;
  const currentText=()=>P.item?(P.mode==='sentence'?P.item.english:P.item.word):'';
  const isHere=()=>Boolean($('pronunciationPage'));
  function status(message){const el=$('pronStatus');if(el)el.textContent=message;}
  function controls(){
    const busy=P.phase!=='idle',ready=Boolean(P.item);
    for(const id of ['pronRecord','pronFile','pronListen','pronRandom','pronSearch','pronCategory','pronChoice','pronSentence','pronWord'])if($(id))$(id).disabled=busy||!ready;
    // Empty results must still allow searching and switching modes.
    for(const id of ['pronSearch','pronCategory','pronSentence','pronWord'])if($(id))$(id).disabled=busy;
    if($('pronRecord'))$('pronRecord').disabled=busy||!ready||!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!(window.AudioContext||window.webkitAudioContext);
    if($('pronPrepare'))$('pronPrepare').disabled=busy||Boolean(P.loaded);
    if($('pronStop'))$('pronStop').disabled=!['requesting','recording'].includes(P.phase);
    if($('pronCancel'))$('pronCancel').hidden=!busy;
    if($('pronStatus'))$('pronStatus').setAttribute('aria-busy',String(P.phase==='analyzing'));
  }
  function releaseCapture(){
    const c=P.capture;P.capture=null;if(!c)return;clearInterval(c.timer);
    if(c.processor){c.processor.onaudioprocess=null;try{c.processor.disconnect();}catch{}}
    for(const node of [c.source,c.gain])try{node?.disconnect();}catch{}
    c.stream?.getTracks().forEach(t=>t.stop());if(c.context?.state!=='closed')c.context?.close().catch(()=>{});
  }
  function releasePlayback(){const audio=$('pronRecording');if(audio){audio.pause();audio.removeAttribute('src');audio.load();}if(P.url)URL.revokeObjectURL(P.url);P.url=null;}
  function discardWorker(){P.worker?.terminate();P.worker=null;P.loaded=null;for(const {reject,timer}of P.pending.values()){clearTimeout(timer);reject(Object.assign(new Error('분석을 중단했어요.'),{code:'aborted'}));}P.pending.clear();}
  function resetAttempt(terminate=false){
    ++P.run;window.TranslationAudio?.stop();if('speechSynthesis'in window)speechSynthesis.cancel();releaseCapture();releasePlayback();if(terminate)discardWorker();P.phase='idle';
    if($('pronResult'))$('pronResult').innerHTML='';if($('pronPlayback'))$('pronPlayback').hidden=true;controls();
  }
  function stop(){resetAttempt(true);}
  function rpc(type,payload={}){
    if(!P.worker){
      P.worker=new Worker('pronunciation-worker.js',{type:'module'});
      P.worker.onmessage=({data})=>{const pending=P.pending.get(data?.id);if(!pending)return;clearTimeout(pending.timer);P.pending.delete(data.id);if(data.ok)pending.resolve(data.result??data);else pending.reject(Object.assign(new Error(data.error?.message||'분석하지 못했어요.'),data.error||{}));};
      P.worker.onerror=()=>{discardWorker();status('분석 자료를 실행하지 못했어요. Safari를 업데이트하거나 다시 시도해 주세요.');controls();};
    }
    const id=++P.seq;return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{P.pending.delete(id);reject(Object.assign(new Error('분석 시간이 길어졌어요. 짧게 다시 녹음해 주세요.'),{code:'timeout'}));discardWorker();},90000);
      P.pending.set(id,{resolve,reject,timer});try{P.worker.postMessage({id,type,...payload});}catch(error){clearTimeout(timer);P.pending.delete(id);reject(error);}
    });
  }
  function model(){if(!P.loaded)P.loaded=rpc('load').catch(error=>{P.loaded=null;throw error;});return P.loaded;}
  function pool(){return P.mode==='sentence'?translationItems():vocabulary().filter(w=>supportedWords.has(normal(w.word)));}
  function categoryOf(item){return P.mode==='sentence'?item.topic||'기타':item.category||'내 단어';}
  function refreshList(){
    const found=pool().filter(item=>(!P.category||categoryOf(item)===P.category)&&(!P.query||normal([item.english,item.korean,item.word,item.meaning].filter(Boolean).join(' ')).includes(normal(P.query))));
    const visible=found.slice(0,300),prior=P.item;P.item=found.find(item=>item.id===prior?.id)||visible[0]||null;if(P.item&&!visible.some(w=>w.id===P.item.id))visible.unshift(P.item);
    $('pronChoice').innerHTML=visible.map(item=>`<option value="${html(item.id)}">${html(P.mode==='sentence'?item.english:item.word+' — '+item.meaning)}</option>`).join('');$('pronChoice').disabled=!visible.length;if(P.item)$('pronChoice').value=P.item.id;
    $('pronCount').textContent=found.length>300?`검색 결과 ${found.length.toLocaleString('ko-KR')}개 중 앞 300개를 표시해요. 검색어로 좁혀 보세요.`:`${found.length.toLocaleString('ko-KR')}개를 선택할 수 있어요.`;
    if(prior?.id!==P.item?.id)resetAttempt();renderTarget();
  }
  function renderTarget(){
    const item=P.item,wordIpa=item&&P.mode==='word'?referenceData?.words?.[normal(item.word)]?.ipa||'':'';
    $('pronTarget').innerHTML=item?`<p class="pron-target-en" lang="en">${html(currentText())}</p><p class="pron-target-ko">${html(P.mode==='sentence'?item.korean:item.meaning)}</p>${wordIpa?`<p class="pron-dictionary-ipa">미국 영어 발음 참고 <span lang="en">${html(wordIpa)}</span></p>`:''}`:'<p class="muted">검색 결과가 없어요. 검색어나 분류를 바꿔 주세요.</p>';
    if(P.mode==='word'&&!referenceData&&!referenceLoad)referenceLoad=fetch('pronunciation-targets.json').then(r=>{if(!r.ok)throw Error('reference');return r.json();}).then(data=>{referenceData=data;if(isHere()&&P.mode==='word'&&P.phase==='idle')renderTarget();}).catch(()=>{referenceLoad=null;});
    controls();status(item?'기준 음성을 듣고, 자연스럽게 한 번 읽어 보세요.':'다른 단어나 문장을 찾아보세요.');
  }
  function renderCategories(){$('pronCategory').innerHTML='<option value="">모든 주제</option>'+[...new Set(pool().map(categoryOf))].sort((a,b)=>a.localeCompare(b,'ko')).map(c=>`<option value="${html(c)}">${html(c)}</option>`).join('');}
  function pageView(){
    stop();
    main.innerHTML=title('SPEAK & COMPARE','내 목소리로, 한 번 더.','문장과 단어를 읽고 감지된 소리 차이를 살펴보세요.')+`<div id="pronunciationPage" class="pron-page"><section class="card pron-intro"><span class="pron-badge">음소 비교 · 실험 기능</span><p>기기 안에서 소리를 분석해요. 인식 오류가 있을 수 있으며, 결과는 발음 점수나 강세 정답 판정이 아닙니다.</p><p class="muted">첫 분석 때 약 5MB의 모델 자료를 내려받아요. 녹음은 서버로 전송하지 않으며, 화면을 나가면 삭제됩니다.</p><button id="pronPrepare" class="secondary" type="button">분석 자료 준비</button></section><section class="card pron-workspace"><div class="pron-modes" role="group" aria-label="연습 종류"><button id="pronSentence" type="button">문장 연습</button><button id="pronWord" type="button">단어 연습</button></div><div class="pron-filters"><label>검색<input id="pronSearch" type="search" placeholder="영어 또는 한국어로 찾기" autocomplete="off"></label><label>주제<select id="pronCategory"></select></label></div><label class="pron-choice-label">연습할 항목<select id="pronChoice" aria-describedby="pronCount"></select></label><p id="pronCount" class="muted" role="status"></p><div id="pronTarget" class="pron-target"></div><div class="pron-actions"><button id="pronListen" class="secondary" type="button">기준 음성 듣기</button><button id="pronRandom" class="secondary" type="button">무작위 선택</button><button id="pronRecord" class="primary" type="button">녹음 시작</button><button id="pronStop" class="secondary" type="button" disabled>녹음 끝내기</button><button id="pronCancel" class="text-btn" type="button" hidden>분석 취소</button></div><p id="pronStatus" class="pron-status" role="status" aria-live="polite"></p><p class="pron-help">최대 20초. 조용한 곳에서 마이크를 입에서 조금 떨어뜨려 읽어 주세요.</p><label class="pron-file-label">녹음 파일 선택<input id="pronFile" name="녹음 파일 선택" type="file" accept="audio/*" aria-describedby="pronFileHelp"></label><p id="pronFileHelp" class="pron-help">20초 이하, 10MB 이하의 음성 파일도 기기 안에서 분석할 수 있어요. 지원 형식은 브라우저마다 달라요.</p><section id="pronPlayback" class="pron-playback" hidden><h2>내 녹음 다시 듣기</h2><audio id="pronRecording" controls playsinline aria-label="내 녹음 다시 듣기"></audio><h3>내 목소리의 리듬</h3><div id="pronBars" class="pron-bars" role="img" aria-label="내 녹음의 상대 음량 흐름"></div><p class="pron-help">높이는 녹음 안에서의 상대 음량이에요. 강세의 옳고 그름을 판단하지 않습니다. 기준 음성과 번갈아 들어보세요.</p></section><section id="pronResult" class="pron-result" aria-live="polite"></section></section></div>`;
    $('pronSentence').setAttribute('aria-pressed',String(P.mode==='sentence'));$('pronWord').setAttribute('aria-pressed',String(P.mode==='word'));
    for(const [id,mode]of [['pronSentence','sentence'],['pronWord','word']])$(id).onclick=()=>{if(P.mode===mode)return;resetAttempt();P.mode=mode;P.query='';P.category='';P.item=null;$('pronSearch').value='';$('pronSentence').setAttribute('aria-pressed',String(mode==='sentence'));$('pronWord').setAttribute('aria-pressed',String(mode==='word'));renderCategories();refreshList();};
    $('pronSearch').value=P.query;$('pronSearch').oninput=e=>{P.query=e.target.value;refreshList();};$('pronCategory').onchange=e=>{P.category=e.target.value;refreshList();};
    $('pronChoice').onchange=e=>{resetAttempt();P.item=pool().find(x=>x.id===e.target.value)||null;renderTarget();};
    $('pronListen').onclick=()=>{if(!P.item)return;$('pronRecording')?.pause();if(P.mode==='sentence')TranslationAudio.start([P.item],0,true);else{TranslationAudio.stop();speak(P.item.word);}};
    $('pronRandom').onclick=()=>{const candidates=pool().filter(item=>(!P.category||categoryOf(item)===P.category)&&(!P.query||normal([item.english,item.korean,item.word,item.meaning].filter(Boolean).join(' ')).includes(normal(P.query))));const other=candidates.filter(w=>w.id!==P.item?.id),choices=other.length?other:candidates;if(!choices.length)return;resetAttempt();P.item=choices[Math.floor(Math.random()*choices.length)];refreshList();};
    $('pronPrepare').onclick=async()=>{resetAttempt();const run=P.run;P.phase='preparing';controls();status('분석 모델을 이 기기에 준비하고 있어요…');try{await model();if(run===P.run&&isHere())status('기기 내 분석 준비가 끝났어요. 문장이나 단어를 녹음해 보세요.');}catch(error){if(run===P.run&&isHere())status('분석 자료를 받지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');}finally{if(run===P.run&&isHere()){P.phase='idle';controls();}}};
    $('pronRecord').onclick=startRecording;$('pronStop').onclick=()=>{if(P.phase==='requesting'){resetAttempt();status('마이크 연결을 취소했어요.');}else finishRecording();};
    $('pronCancel').onclick=()=>{resetAttempt(true);status('분석을 취소했어요. 다시 시작할 수 있어요.');};$('pronFile').onchange=loadFile;
    $('pronRecording').onplay=()=>{TranslationAudio.stop();if('speechSynthesis'in window)speechSynthesis.cancel();};
    renderCategories();$('pronCategory').value=P.category;refreshList();
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!(window.AudioContext||window.webkitAudioContext)){status('이 브라우저에서는 마이크 녹음이 지원되지 않아요. 지원되는 음성 파일을 선택하거나 Safari에서 열어 주세요.');}
  }
  async function startRecording(){
    if(!P.item)return;resetAttempt();const run=P.run;P.phase='requesting';controls();status('마이크 사용을 허용해 주세요.');TranslationAudio.stop();if('speechSynthesis'in window)speechSynthesis.cancel();const AC=window.AudioContext||window.webkitAudioContext;
    try{
      const context=new AC(),capture={context,stream:null,chunks:[],length:0,sampleRate:context.sampleRate};P.capture=capture;await context.resume();if(run!==P.run||P.capture!==capture||!isHere()){if(context.state!=='closed')await context.close();return;}
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      if(run!==P.run||!isHere()){stream.getTracks().forEach(t=>t.stop());if(context.state!=='closed')await context.close();return;}
      capture.stream=stream;capture.source=context.createMediaStreamSource(stream);capture.processor=context.createScriptProcessor(2048,1,1);capture.gain=context.createGain();capture.gain.gain.value=0;
      capture.processor.onaudioprocess=event=>{if(P.capture!==capture||P.phase!=='recording')return;const input=event.inputBuffer.getChannelData(0),remaining=Math.max(0,Math.round(20*capture.sampleRate)-capture.length);if(remaining){const part=input.slice(0,remaining);capture.chunks.push(part);capture.length+=part.length;}if(capture.length>=20*capture.sampleRate)finishRecording();};
      capture.source.connect(capture.processor);capture.processor.connect(capture.gain);capture.gain.connect(context.destination);P.phase='recording';controls();status('녹음 중 · 0 / 20초');const started=Date.now();
      capture.timer=setInterval(()=>{if(P.capture!==capture)return;const elapsed=(Date.now()-started)/1000;status(`녹음 중 · ${Math.min(20,Math.floor(elapsed))} / 20초`);if(elapsed>=20)finishRecording();},250);
    }catch(error){if(run!==P.run)return;releaseCapture();P.phase='idle';controls();status(error.name==='NotAllowedError'?'마이크 권한이 꺼져 있어요. Safari의 웹사이트 설정에서 마이크를 허용하고 다시 눌러 주세요.':'마이크를 열지 못했어요. 다른 녹음 앱을 닫고 다시 시도해 주세요.');}
  }
  function finishRecording(){if(P.phase!=='recording'||!P.capture)return;const c=P.capture,run=P.run,samples=new Float32Array(c.length);let offset=0;for(const part of c.chunks){samples.set(part,offset);offset+=part.length;}releaseCapture();analyze(samples,c.sampleRate,run);}
  async function loadFile(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;resetAttempt();const run=P.run;
    if(file.size>10*1024*1024){status('10MB 이하의 음성 파일을 선택해 주세요.');return;}
    P.phase='analyzing';controls();status('선택한 파일을 기기에서 읽고 있어요.');TranslationAudio.stop();if('speechSynthesis'in window)speechSynthesis.cancel();let context;
    try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('unsupported');context=new AC();const bytes=await file.arrayBuffer();if(run!==P.run)return;const audio=await context.decodeAudioData(bytes);if(run!==P.run)return;if(!audio.duration||audio.duration>20){status('20초 이하의 음성 파일을 선택해 주세요.');P.phase='idle';controls();return;}const samples=new Float32Array(audio.length);for(let c=0;c<audio.numberOfChannels;c++){const channel=audio.getChannelData(c);for(let i=0;i<samples.length;i++)samples[i]+=channel[i]/audio.numberOfChannels;}await analyze(samples,audio.sampleRate,run);}catch(error){if(run===P.run){P.phase='idle';controls();status('이 음성 파일을 읽지 못했어요. WAV, MP3 또는 M4A 파일을 다시 선택해 주세요.');}}finally{if(context&&context.state!=='closed')context.close().catch(()=>{});}
  }
  function wavBlob(samples,rate){const buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);const text=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};text(0,'RIFF');view.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);for(let i=0;i<samples.length;i++){const s=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,s<0?s*32768:s*32767,true);}return new Blob([buffer],{type:'audio/wav'});}
  function playback(samples,rate){releasePlayback();P.url=URL.createObjectURL(wavBlob(samples,rate));$('pronRecording').src=P.url;$('pronPlayback').hidden=false;const bins=64,energy=[];for(let b=0;b<bins;b++){const start=Math.floor(b*samples.length/bins),end=Math.floor((b+1)*samples.length/bins);let sum=0;for(let i=start;i<end;i++)sum+=samples[i]*samples[i];energy.push(Math.sqrt(sum/Math.max(1,end-start)));}const peak=Math.max(...energy,.00001);$('pronBars').innerHTML=energy.map(v=>`<i style="height:${Math.max(3,Math.round(v/peak*100))}%"></i>`).join('');}
  async function analyze(samples,sampleRate,run){
    if(run!==P.run||!isHere())return;P.phase='analyzing';controls();const text=currentText();
    if(!samples.length||samples.some(x=>!Number.isFinite(x))){P.phase='idle';controls();status('녹음된 소리가 없어요. 다시 시도해 주세요.');return;}
    playback(samples,sampleRate);status('분석 자료를 준비하고 있어요. 첫 실행에는 잠시 시간이 걸릴 수 있어요.');
    try{await model();if(run!==P.run||!isHere())return;status('기기 안에서 소리 차이를 비교하고 있어요…');const result=await rpc('analyze',{samples,sampleRate,text});if(run!==P.run||!isHere())return;renderResult(result);status('비교를 마쳤어요. 차이 후보를 듣고 다시 연습해 보세요.');}
    catch(error){if(run!==P.run||!isHere())return;const messages={silence:'소리가 너무 작거나 거의 없어요. 마이크를 확인하고 다시 녹음해 주세요.',clipping:'소리가 너무 커서 찌그러졌어요. 마이크에서 조금 떨어져 다시 읽어 주세요.',noise_suspected:'주변 소리가 많아 비교하기 어려워요. 조용한 곳에서 다시 녹음해 주세요.',no_speech:'읽은 소리를 충분히 찾지 못했어요. 문장 전체를 다시 읽어 주세요.',too_long:'20초 이하로 녹음해 주세요.',unsupported_text:'이 항목은 아직 안정적으로 비교하기 어려워요. 다른 항목을 골라 주세요.',load_failed:'분석 자료를 받지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',model_error:'소리를 분석하지 못했어요. 조금 더 짧게 다시 읽어 주세요.',aborted:'분석이 중단됐어요. 다시 시작할 수 있어요.'};status(messages[error.code]||error.message||'분석하지 못했어요. 다시 시도해 주세요.');}
    finally{if(run===P.run&&isHere()){P.phase='idle';controls();}}
  }
  function renderResult(result){
    const differences=(result.alignment||[]).filter(x=>x.status!=='match'),words=result.expectedWords||[],indices=[...new Set(differences.map(x=>x.wordIndex).filter(Number.isInteger))],candidates=indices.map(i=>words[i]?.word).filter(Boolean),label={match:'비슷하게 감지',substitute:'다르게 감지',missing:'감지되지 않음',extra:'추가로 감지'};
    $('pronResult').innerHTML=`<div class="pron-result-head"><span class="pron-badge">소리 비교 결과</span><h2>${differences.length?'다시 들어볼 소리 차이가 있어요.':'이번 녹음에서는 소리 차이가 감지되지 않았어요.'}</h2><p>바르게 읽어도 모델이 다르게 인식할 수 있어요. 아래 내용은 소리 차이의 참고 정보이며 발음 오류 판정이 아닙니다.</p></div>${candidates.length?`<p class="pron-candidate-label">다시 들어볼 단어</p><div class="pron-candidates">${[...new Set(candidates)].slice(0,24).map(w=>`<span lang="en">${html(w)}</span>`).join('')}</div>`:''}<details class="pron-details"><summary>감지한 소리 자세히 보기</summary><p class="pron-help">기준 소리는 준비된 미국 영어 발음 표기입니다. ‘감지되지 않음’은 실제로 발음을 빠뜨렸다는 확정이 아닙니다.</p><p><strong>기준 소리</strong> <span class="pron-ipa" lang="en">${html(result.expectedIpa)}</span></p><p><strong>감지한 소리</strong> <span class="pron-ipa" lang="en">${html(result.heardIpa)}</span></p>${differences.length?`<div class="pron-table-wrap"><table><caption>감지된 소리 차이 후보</caption><thead><tr><th scope="col">기준</th><th scope="col">감지</th><th scope="col">비교</th></tr></thead><tbody>${differences.slice(0,60).map(x=>`<tr><td>${html(x.expected||'—')}</td><td>${html(x.heard||'—')}</td><td>${html(label[x.status]||'차이 후보')}</td></tr>`).join('')}</tbody></table></div>`:''}</details><p class="pron-help">이 결과는 이번 화면에서만 사용해요. 기존 정답률이나 복습 기록에 반영하지 않습니다.</p>`;
  }
  window.pronunciationPage=pageView;window.Pronunciation={stop};window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&isHere()){stop();status('화면이 숨겨져 녹음과 분석을 중단했어요. 다시 시작해 주세요.');}});
})();
