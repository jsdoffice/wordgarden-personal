import { ASRBrowserModel } from './hama/browser.js';
export const MAX_SECONDS = 20;
let enginePromise;
let referencePromise;
const targets = new Map();
function fail(code,message,quality) { const e=new Error(message);e.code=code;if(quality)e.quality=quality;throw e; }
export async function loadEngine() {
  if(!enginePromise)enginePromise=Promise.all([ASRBrowserModel.create(),loadReferences()]).then(([asr])=>({asr})).catch(error=>{enginePromise=undefined;if(error?.code)throw error;fail('load_failed','발음 분석 파일을 불러오지 못했어요. 다시 시도해 주세요.');});
  return enginePromise;
}
async function loadReferences(){
  if(!referencePromise)referencePromise=fetch(new URL('./pronunciation-targets.json',import.meta.url)).then(async response=>{if(!response.ok)throw Error('Reference unavailable');const data=await response.json();if(!data||typeof data.sentences!=='object'||typeof data.words!=='object')throw Error('Invalid reference');return data;}).catch(()=>{referencePromise=undefined;fail('load_failed','기준 발음 파일을 불러오지 못했어요. 다시 시도해 주세요.');});
  return referencePromise;
}
const canonical=s=>String(s).normalize('NFD').replace(/[ˈˌ]/gu,'').replace(/r/gu,'ɹ').replace(/g/gu,'ɡ');
const equivalent=(a,b)=>a===b||(a==='ᵻ'&&(b==='ɪ'||b==='ə'));
const multi=['t͡ʃ','d͡ʒ','t͜ʃ','d͜ʒ','tʃ','dʒ','aɪ','aʊ','eɪ','oʊ','ɔɪ','eə','ɪə','ʊə'];
const modifier=/[\p{M}ːˑʰʱʲʷ˞ˠˤ]/u;
export function tokenizeIpa(value) {
  if(Array.isArray(value)){const out=[];for(const part of value)for(const phone of tokenizeIpa(part)){if(/^[\p{M}ːˑʰʱʲʷ˞ˠˤ]+$/u.test(phone)&&out.length)out[out.length-1]+=phone;else out.push(phone);}return out;}
  const s=canonical(value),result=[];
  for(let i=0;i<s.length;) {
    const ch=String.fromCodePoint(s.codePointAt(i));
    if(/[\s.,;:!?()\[\]{}\/\\|"'—–…]/u.test(ch)){i+=ch.length;continue;}
    if(s.startsWith('<',i)){const end=s.indexOf('>',i);result.push(end<0?s.slice(i):s.slice(i,end+1));i=end<0?s.length:end+1;continue;}
    const group=multi.find(p=>s.startsWith(p,i));let token=group||ch;i+=token.length;
    token=token.replace(/[͜͡]/gu,'');
    while(i<s.length&&modifier.test(s[i])){token+=s[i];i++;}
    if(modifier.test(token[0])&&result.length)result[result.length-1]+=token;else result.push(token);
  }
  return result;
}
export function alignPhonemes(expected,heard) {
  if(expected.length>512||heard.length>768)fail('unclear_audio','분석할 소리를 안정적으로 구분하지 못했어요. 한 문장을 또렷하게 다시 읽어 주세요.');
  const n=expected.length,m=heard.length,cols=m+1,dp=new Uint16Array((n+1)*cols);
  for(let i=0;i<=n;i++)dp[i*cols]=i;for(let j=0;j<=m;j++)dp[j]=j;
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)dp[i*cols+j]=Math.min(dp[(i-1)*cols+j-1]+(equivalent(expected[i-1],heard[j-1])?0:1),dp[(i-1)*cols+j]+1,dp[i*cols+j-1]+1);
  const out=[];let i=n,j=m;
  while(i||j){const same=i&&j&&equivalent(expected[i-1],heard[j-1]);if(i&&j&&dp[i*cols+j]===dp[(i-1)*cols+j-1]+(same?0:1)){out.push({expected:expected[i-1],heard:heard[j-1],status:same?'match':'substitute',expectedIndex:i-1,heardIndex:j-1});i--;j--;}else if(i&&dp[i*cols+j]===dp[(i-1)*cols+j]+1){out.push({expected:expected[i-1],heard:'',status:'missing',expectedIndex:i-1,heardIndex:null});i--;}else{out.push({expected:'',heard:heard[j-1],status:'extra',expectedIndex:null,heardIndex:j-1});j--;}}
  return out.reverse();
}
export function inspectAudio(samples,sampleRate) {
  if(!(samples instanceof Float32Array)||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>96000||!samples.length)fail('invalid_audio','녹음 데이터를 읽지 못했어요. 다시 녹음해 주세요.');
  const durationSeconds=samples.length/sampleRate;if(durationSeconds>MAX_SECONDS+.001)fail('too_long','한 번에 20초 이내로 녹음해 주세요.');
  let sum=0,sumSq=0,peak=0,clipped=0,crossings=0;
  for(let i=0;i<samples.length;i++){const v=samples[i];if(!Number.isFinite(v))fail('invalid_audio','녹음 데이터가 올바르지 않아요.');sum+=v;sumSq+=v*v;peak=Math.max(peak,Math.abs(v));if(Math.abs(v)>=.985)clipped++;if(i&&((v>=0)!==(samples[i-1]>=0)))crossings++;}
  const mean=sum/samples.length,rms=Math.sqrt(Math.max(0,sumSq/samples.length-mean*mean)),frame=Math.max(1,Math.round(sampleRate*.02));let active=0,total=0;const activityThreshold=Math.max(.003,rms*.22);
  for(let start=0;start<samples.length;start+=frame){const end=Math.min(samples.length,start+frame);let energy=0;for(let k=start;k<end;k++)energy+=(samples[k]-mean)**2;if(Math.sqrt(energy/(end-start))>activityThreshold)active++;total++;}
  const activeFraction=active/total,clippedFraction=clipped/samples.length,zeroCrossingRate=crossings/Math.max(1,samples.length-1);
  return {durationSeconds,rms,peak,dcOffset:mean,clippedFraction,activeFraction,zeroCrossingRate,silence:rms<.002||peak<.008||active*.02<.14,clipping:clippedFraction>.02,noiseSuspected:zeroCrossingRate>.32&&activeFraction>.8,method:'Measured PCM levels and an explicitly heuristic noise screen; not a confidence score.'};
}
async function expectedTarget(text) {
  if(typeof text!=='string'||!text.trim()||text.length>400)fail('unsupported_text','분석할 영어 문장이나 단어를 확인해 주세요.');if(targets.has(text))return targets.get(text);
  const source=await loadReferences(),clean=text.trim(),own=(map,key)=>Object.prototype.hasOwnProperty.call(map,key)?map[key]:undefined;
  const entry=own(source.sentences,text)||own(source.sentences,clean)||own(source.words,clean.toLowerCase());
  if(!entry||typeof entry.ipa!=='string'||!entry.ipa.trim())fail('unsupported_text','이 항목의 기준 발음이 아직 준비되지 않았어요. 앱의 기본 문장이나 단어로 연습해 주세요.');
  const expectedWords=Array.isArray(entry.words)?entry.words:[],tokens=[],owners=[];
  if(expectedWords.length)for(let wordIndex=0;wordIndex<expectedWords.length;wordIndex++){const phones=tokenizeIpa(expectedWords[wordIndex].ipa);tokens.push(...phones);owners.push(...phones.map(()=>wordIndex));}
  else{tokens.push(...tokenizeIpa(entry.ipa));owners.push(...tokens.map(()=>null));}
  if(!tokens.length||tokens.length>512||tokens.some(p=>p.includes('<')))fail('unsupported_text','이 항목의 기준 소리를 안정적으로 읽지 못했어요. 다른 항목으로 연습해 주세요.');
  const value={expectedWords,tokens,owners,expectedIpa:entry.ipa};
  if(Array.isArray(entry.variants)&&expectedWords.length===1){
    value.variants=[{...value},...entry.variants.filter(ipa=>typeof ipa==='string'&&ipa!==entry.ipa).map(ipa=>{const tokens=tokenizeIpa(ipa);return {expectedIpa:ipa,tokens,owners:tokens.map(()=>0),expectedWords:[{word:expectedWords[0].word,ipa}]};}).filter(v=>v.tokens.length&&v.tokens.length<=512)];
  }
  targets.set(text,value);if(targets.size>80)targets.delete(targets.keys().next().value);return value;
}
export async function analyzeAudio({samples,sampleRate,text}) {
  const quality=inspectAudio(samples,sampleRate);
  if(quality.silence)fail('silence','목소리가 너무 작거나 녹음되지 않았어요. 다시 녹음해 주세요.',quality);
  if(quality.clipping)fail('clipping','소리가 너무 크게 녹음되어 찌그러졌어요. 마이크에서 조금 떨어져 다시 녹음해 주세요.',quality);
  if(quality.noiseSuspected)fail('noise_suspected','주변 소음이 많아 소리를 구분하기 어려워요. 조용한 곳에서 다시 녹음해 주세요.',quality);
  const started=performance.now(),{asr}=await loadEngine(),target=await expectedTarget(text);let observed;
  try{observed=await asr.transcribeWaveform(samples,sampleRate);}catch{fail('model_error','녹음을 분석하지 못했어요. 더 짧게 다시 녹음해 주세요.',quality);}
  const heard=tokenizeIpa(observed.phonemes);if(!heard.length)fail('no_speech','구분할 수 있는 말소리를 찾지 못했어요. 다시 녹음해 주세요.',quality);if(heard.some(p=>p.includes('<')))fail('unclear_audio','일부 소리를 알아듣지 못했어요. 조용한 곳에서 다시 읽어 주세요.',quality);
  // Isolated heteronyms can have multiple legitimate readings. Compare all
  // prepared dictionary variants rather than forcing one part of speech.
  const choices=(target.variants||[target]).map(reference=>({reference,alignment:alignPhonemes(reference.tokens,heard)}));
  const best=choices.reduce((a,b)=>b.alignment.filter(x=>x.status!=='match').length<a.alignment.filter(x=>x.status!=='match').length?b:a),reference=best.reference;
  const alignment=best.alignment.map(a=>({...a,wordIndex:a.expectedIndex===null?null:reference.owners[a.expectedIndex]})),count=status=>alignment.filter(a=>a.status===status).length;
  const matched=count('match'),substitutions=count('substitute'),missing=count('missing'),extra=count('extra');
  return {expectedIpa:reference.expectedIpa,heardIpa:observed.phonemes.join(' '),expectedWords:reference.expectedWords,alignment,summary:{matched,differences:substitutions+missing+extra,substitutions,missing,extra,expectedCount:reference.tokens.length,heardCount:heard.length},quality,engine:'hama-js 1.7.0 ASR; prepared reference',elapsedMs:Math.round(performance.now()-started),limitations:['바르게 읽어도 모델이 다르게 인식할 수 있어요.','차이는 연습 참고 후보이며 발음 오류 판정이나 점수가 아닙니다.','강세·억양·유창성·원어민 수준은 평가하지 않습니다.']};
}
