// Browser-only practice. No model API, account tokens, or audio uploads.
let practiceIndex = 0;
let practiceTarget = null;
let activeRecording = null;
let recordingURL = null;
let practiceTopic = '카페에서 주문하기';
let practiceLevel = '초급 A1–A2';

function stopPractice() {
  const rec = activeRecording;
  activeRecording = null;
  if (rec) {
    clearInterval(rec.timer);
    if (rec.recorder && rec.recorder.state !== 'inactive') {
      try { rec.recorder.stop(); } catch {}
    }
    rec.stream?.getTracks().forEach(track => track.stop());
  }
  const audio = document.querySelector('#myRecording');
  if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  if (recordingURL) URL.revokeObjectURL(recordingURL);
  recordingURL = null;
}

function practicePage() {
  stopPractice();
  const examples = words().filter(w => w.sentence && w.sentence !== w.word);
  if (!practiceTarget) practiceTarget = examples[practiceIndex % examples.length];
  const w = practiceTarget;
  main.innerHTML = title('SPEAK A LITTLE EVERY DAY', '소리 내어, 내 영어로.', '듣고 따라 말한 뒤, 같은 문장을 다시 들어 보세요.') + `
    <div class="practice-layout">
      <section class="card speaking-card">
        <div class="section-head"><h2>따라 말하기</h2><span class="pill">기기에서 녹음</span></div>
        <span class="practice-word">${esc(w.word)} <small>· ${esc(w.meaning)}</small></span>
        <p class="practice-sentence" lang="en">${esc(w.sentence)}</p>
        <p class="translation">${esc(w.translation)}</p>
        <div class="actions"><button class="listen" id="practiceListen">◖ 문장 듣기</button><button class="text-btn" id="nextPractice">다른 문장 ↗</button></div>
        <div class="recorder-box">
          <div class="record-status" id="recordStatus" role="status">준비되면 녹음 버튼을 눌러 주세요.</div>
          <div class="actions"><button class="primary" id="recordStart">● 내 목소리 녹음</button><button class="secondary" id="recordStop" disabled>녹음 끝내기</button></div>
          <audio id="myRecording" controls preload="metadata" hidden aria-label="내 녹음 다시 듣기"></audio>
          <button class="text-btn" id="discardRecording" hidden>녹음 지우기</button>
          <p class="muted">최대 30초. 녹음은 이 화면에서만 사용하며 서버로 전송하지 않아요. 다른 화면으로 이동하면 삭제됩니다.</p>
        </div>
        <details class="practice-checklist"><summary>내 발음 스스로 확인하기</summary><label><input type="checkbox"> 빠뜨린 단어 없이 끝까지 말했나요?</label><label><input type="checkbox"> 강하게 들리는 음절을 따라 말했나요?</label><label><input type="checkbox"> 단어 사이를 자연스럽게 이어 말했나요?</label></details>
        <p class="muted">이 기능은 녹음과 듣기 연습입니다. 음소·강세를 분석하는 자동 발음 채점은 제공하지 않아요.</p>
      </section>
      <section class="card chat-practice">
        <div class="eyebrow">CONTINUE IN CHATGPT</div><h2>ChatGPT와 영어로 대화하기</h2>
        <p class="muted">연습 내용을 복사해서 같은 계정의 ChatGPT에 붙여 넣으세요. 새로운 앱 연결이나 API 키 없이 기존 ChatGPT에서 대화합니다.</p>
        <div class="practice-options"><label for="practiceTopic">연습 상황</label><select id="practiceTopic">${['카페에서 주문하기','여행 중 길 묻기','호텔 체크인','일상 대화','업무 대화','이 문장과 단어 복습','음성으로 따라 말하기'].map(t=>`<option ${t===practiceTopic?'selected':''}>${t}</option>`).join('')}</select><label for="practiceLevel">영어 수준</label><select id="practiceLevel">${['초급 A1–A2','중급 B1–B2','고급 C1'].map(t=>`<option ${t===practiceLevel?'selected':''}>${t}</option>`).join('')}</select></div>
        <label class="prompt-label" for="chatPrompt">ChatGPT에 보낼 연습 내용</label><textarea id="chatPrompt" rows="8" readonly></textarea>
        <div class="actions"><button class="primary" id="copyPractice">① 연습 내용 복사</button><a class="secondary" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" id="openChatGPT">② ChatGPT 열기 ↗</a></div>
        <p id="copyStatus" role="status" class="muted">내용을 붙여 넣고 보내면 대화를 시작할 수 있어요.</p>
        <div class="practice-note"><strong>기존 계정의 기본 한도 안에서</strong><p>ChatGPT의 사용 한도가 적용됩니다. 한도에 도달하면 연습을 멈추고 초기화를 기다리세요. 추가 크레딧이나 유료 서비스는 이 웹앱에서 구매하지 않습니다.</p><p>음성 연습은 ChatGPT에서 제공되는 음성 버튼으로 시작하세요. 이 웹앱 안에서 AI가 답하는 방식은 아니며, 대화 내용과 사용량을 이 웹앱이 읽거나 제어하지 않습니다.</p></div>
      </section>
    </div>`;
  document.querySelector('#practiceListen').onclick = () => speak(w.sentence);
  document.querySelector('#nextPractice').onclick = () => { practiceIndex = (practiceIndex + 1) % examples.length; practiceTarget = examples[practiceIndex]; practicePage(); };
  document.querySelector('#recordStart').onclick = startPracticeRecording;
  document.querySelector('#recordStop').onclick = finishPracticeRecording;
  document.querySelector('#discardRecording').onclick = () => { stopPractice(); resetRecorderUI(); };
  for (const id of ['practiceTopic','practiceLevel']) document.querySelector('#'+id).onchange = () => {
    practiceTopic = document.querySelector('#practiceTopic').value;
    practiceLevel = document.querySelector('#practiceLevel').value;
    updatePracticePrompt();
  };
  document.querySelector('#copyPractice').onclick = copyPracticePrompt;
  document.querySelector('#openChatGPT').onclick = () => { stopPractice(); resetRecorderUI(); };
  updatePracticePrompt();
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    document.querySelector('#recordStart').disabled = true;
    document.querySelector('#recordStatus').textContent = '이 브라우저에서 녹음을 사용할 수 없어요. 최신 Safari에서 HTTPS 주소로 열어 주세요.';
  }
}

function updatePracticePrompt() {
  const w = practiceTarget;
  document.querySelector('#copyStatus').textContent = '내용을 붙여 넣고 보내면 대화를 시작할 수 있어요.';
  document.querySelector('#chatPrompt').value = `한국어를 쓰는 나의 영어 연습 파트너가 되어 줘. 수준은 ${practiceLevel}, 상황은 '${practiceTopic}'야.
오늘의 단어: ${w.word} (${w.meaning})
연습 문장: ${w.sentence}
뜻: ${w.translation}
한 번에 영어 질문 하나만 하고 내 답을 기다려 줘. 내 답을 받으면 잘한 점과 가장 중요한 교정 한 가지를 한국어로 짧게 알려 주고, 자연스러운 영어 표현을 제시해 줘. 5번 대화한 뒤 복습할 표현 3개를 정리해 줘.
음성 연습이면 문장을 한 번씩 읽어 주고 내가 따라 할 시간을 줘. 실제 음성을 분석할 수 있을 때만 들리는 발음을 설명하고, 텍스트만 받은 경우 발음 평가가 불가능함을 알려 줘. 근거 없는 발음 점수는 만들지 마.
추가 앱, 외부 API, 유료 기능을 연결하지 않고 이 ChatGPT 대화에서 연습하자. 먼저 상황에 맞는 짧은 영어 질문으로 시작해 줘.`;
}

async function copyPracticePrompt() {
  const field = document.querySelector('#chatPrompt');
  const status = document.querySelector('#copyStatus');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(field.value);
    status.textContent = '복사했어요. ChatGPT를 열어 붙여 넣고 보내세요.';
    toast('연습 내용을 복사했어요.');
  } catch {
    field.focus(); field.select(); field.setSelectionRange(0, field.value.length);
    status.textContent = '자동 복사를 사용할 수 없어요. 선택된 내용을 길게 눌러 복사해 주세요.';
  }
}

function resetRecorderUI() {
  const start = document.querySelector('#recordStart');
  if (!start) return;
  start.disabled = !window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder;
  document.querySelector('#recordStop').disabled = true;
  document.querySelector('#myRecording').hidden = true;
  document.querySelector('#discardRecording').hidden = true;
  document.querySelector('#recordStatus').textContent = '준비되면 녹음 버튼을 눌러 주세요.';
}

async function startPracticeRecording() {
  stopPractice();
  resetRecorderUI();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const rec = { stream: null, recorder: null, timer: null, chunks: [], failed: false };
  activeRecording = rec;
  const status = document.querySelector('#recordStatus');
  document.querySelector('#recordStart').disabled = true;
  status.textContent = '마이크 권한을 확인하고 있어요…';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    if (activeRecording !== rec || page !== 'practice') { stream.getTracks().forEach(t=>t.stop()); return; }
    rec.stream = stream;
    const mime = ['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.recorder = recorder;
    recorder.ondataavailable = event => { if (event.data.size) rec.chunks.push(event.data); };
    recorder.onerror = () => {
      rec.failed = true;
      if (recorder.state !== 'inactive') finishPracticeRecording();
      else {
        clearInterval(rec.timer);
        stream.getTracks().forEach(t=>t.stop());
        if (activeRecording === rec) { activeRecording = null; resetRecorderUI(); status.textContent = '녹음 중 오류가 발생했어요. 다시 시도해 주세요.'; }
      }
    };
    recorder.onstop = () => {
      clearInterval(rec.timer);
      stream.getTracks().forEach(t=>t.stop());
      if (activeRecording !== rec || page !== 'practice') return;
      activeRecording = null;
      document.querySelector('#recordStart').disabled = false;
      document.querySelector('#recordStop').disabled = true;
      if (rec.failed || !rec.chunks.length) { status.textContent = '녹음을 저장하지 못했어요. 다시 시도해 주세요.'; return; }
      const blob = new Blob(rec.chunks, { type: recorder.mimeType || rec.chunks[0].type });
      recordingURL = URL.createObjectURL(blob);
      const audio = document.querySelector('#myRecording');
      audio.src = recordingURL; audio.hidden = false;
      document.querySelector('#discardRecording').hidden = false;
      status.textContent = '녹음했어요. 문장 소리와 내 목소리를 번갈아 들어 보세요.';
    };
    recorder.start();
    const began = Date.now();
    document.querySelector('#recordStop').disabled = false;
    status.textContent = '● 녹음 중 · 0 / 30초';
    rec.timer = setInterval(() => {
      const elapsed = Math.min(30, Math.floor((Date.now() - began) / 1000));
      status.textContent = `● 녹음 중 · ${elapsed} / 30초`;
      if (elapsed >= 30) finishPracticeRecording();
    }, 250);
  } catch (error) {
    rec.stream?.getTracks().forEach(t=>t.stop());
    if (activeRecording !== rec || page !== 'practice') return;
    activeRecording = null;
    document.querySelector('#recordStart').disabled = false;
    status.textContent = error.name === 'NotAllowedError' ? '마이크 사용이 허용되지 않았어요. Safari의 웹사이트 설정에서 마이크 권한을 확인해 주세요.' : '마이크를 사용할 수 없어요. 다른 녹음 앱을 닫고 다시 시도해 주세요.';
  }
}

function finishPracticeRecording() {
  const rec = activeRecording;
  if (!rec?.recorder || rec.recorder.state === 'inactive') return;
  clearInterval(rec.timer);
  document.querySelector('#recordStop').disabled = true;
  document.querySelector('#recordStatus').textContent = '녹음을 마무리하고 있어요…';
  rec.recorder.stop();
}

async function showOfflineStatus() {
  const el = document.querySelector('#offlineStatus');
  if (!el) return;
  try {
    const cache = await caches.open('wordgarden-v6-lab');
    const urls = ['./index.html','./dictionary.js','./questions.js','./app.js','./practice.js','./style.css','./lab-data.js','./lab.js','./lab.css','./lab-attribution.txt'];
    const cached = await Promise.all(urls.map(url => cache.match(url)));
    el.textContent = cached.every(Boolean) ? '학습 자료가 이 기기에 저장되어 있어요. 인터넷 없이 단어·예문 학습, 영어 연구실 전체 자료와 녹음을 사용할 수 있습니다. 발음 재생은 기기에 설치된 음성에 따라 달라요.' : '오프라인 자료를 준비 중이에요. 인터넷에 연결한 상태로 잠시 뒤 다시 확인해 주세요.';
  } catch { el.textContent = '오프라인 저장 상태를 확인할 수 없어요. Safari에서 다시 열어 주세요.'; }
}

window.addEventListener('pagehide', stopPractice);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden || !activeRecording) return;
  if (activeRecording.recorder) finishPracticeRecording();
  else { stopPractice(); resetRecorderUI(); }
});
