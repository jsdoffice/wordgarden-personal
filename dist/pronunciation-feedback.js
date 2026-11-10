// Practice feedback from discrete ASR phone matches, not a human-calibrated
// pronunciation, stress, confidence, or native-likeness assessment.
export const GRADE_BANDS = [
  {grade:'great',min:90,range:'90–100'},
  {grade:'good',min:75,range:'75–89'},
  {grade:'soso',min:55,range:'55–74'},
  {grade:'bad',min:30,range:'30–54'},
  {grade:'worst',min:0,range:'0–29'}
];
export const gradeFor = score => GRADE_BANDS.find(b=>score>=b.min)?.grade ?? 'worst';
const base = p=>p.normalize('NFD').replace(/\p{M}|[ːˑʰʱʲʷ˞ˠˤ]/gu,'');
const vowel = p=>/^[aeiouyɑɒæɐɜɞəɛɘɚɝɪᵻɔʊʌœøɤɯɨʉɶ]/u.test(base(p));
const nucleus = p=>vowel(p)||/[\u0329\u030d]/u.test(p);
// Maximal legal English onset, within an already known reference word.
// These are estimated phonetic syllables, not dictionary spelling divisions.
const onsets = new Set(('p b t d k ɡ f v θ ð s z ʃ ʒ h tʃ dʒ m n l ɹ w j '+
  'pl pɹ pj bl bɹ bj tɹ tw tj dɹ dw dj kl kɹ kw kj ɡl ɡɹ ɡw ɡj '+
  'fl fɹ fj vj θɹ θw θj ʃɹ ʃw mj nj lj hj sp st sk sm sn sl sw sj '+
  'spl spɹ spj stɹ stw stj skl skɹ skw skj').split(' '));
export function syllabify(phones) {
  const nuclei=[];phones.forEach((p,i)=>{
    // Misaki can write a final syllabic n after a glottal stop without n̩.
    const glottalN=base(p)==='n'&&phones[i-1]&&base(phones[i-1])==='ʔ'&&(!phones[i+1]||!vowel(phones[i+1]));
    if(nucleus(p)||glottalN)nuclei.push(i);
  });
  if(!nuclei.length)return [];
  const starts=[0];
  for(let n=1;n<nuclei.length;n++){
    const left=nuclei[n-1]+1,right=nuclei[n];let start=right;
    for(let i=left;i<right;i++)if(onsets.has(phones.slice(i,right).map(base).join(''))){start=i;break;}
    starts.push(start);
  }
  return starts.map((start,i)=>({start,end:starts[i+1]??phones.length,ipa:phones.slice(start,starts[i+1]??phones.length).join('')}));
}
const scoreFor = (matched,total)=>total?Math.round(100*matched/total):null;
export function buildFeedback({words,tokens,alignment,tokenize}) {
  // A score exists only after the core's audio and ASR validity checks pass.
  if(!tokens?.length||!alignment?.length)return null;
  const syllables=[],owners=new Array(tokens.length);let offset=0;
  const groups=words?.length?words:[{word:'',phones:tokens}];
  for(let wordIndex=0;wordIndex<groups.length;wordIndex++){
    const word=groups[wordIndex],pieces=word.phones?[word.phones]:word.ipa.trim().split(/\s+/u).map(tokenize),phones=pieces.flat(),segments=[];
    let pieceOffset=0;
    for(const piece of pieces){for(const s of syllabify(piece))segments.push({...s,start:s.start+pieceOffset,end:s.end+pieceOffset});pieceOffset+=piece.length;}
    // Non-vocalic abbreviations/interjections have no inferred syllable.
    // Preserve their phones for the total, without inventing a syllable grade.
    for(let i=0;i<segments.length;i++){
      const part=segments[i],index=syllables.length;
      syllables.push({wordIndex,word:word.word,number:i+1,ipa:part.ipa,expectedCount:part.end-part.start,matched:0,substitute:0,missing:0,extra:0});
      for(let p=part.start;p<part.end;p++)owners[offset+p]=index;
    }
    offset+=phones.length;
  }
  if(offset!==tokens.length)throw Error('Reference syllable ownership mismatch');
  let matched=0,extra=0,lastExpected=null;
  for(let i=0;i<alignment.length;i++){
    const row=alignment[i];
    if(row.status==='match')matched++;
    if(row.status==='extra')extra++;
    let index=row.expectedIndex;
    // Insertions have no reference syllable. Attach to the preceding reference
    // phone (or the first at the beginning); disclose this convention in the UI.
    if(index===null)index=lastExpected??alignment.slice(i+1).find(r=>r.expectedIndex!==null)?.expectedIndex;
    else lastExpected=index;
    const owner=owners[index];if(owner===undefined)continue;
    const key={match:'matched',substitute:'substitute',missing:'missing',extra:'extra'}[row.status];
    if(key)syllables[owner][key]++;
  }
  for(const s of syllables){s.score=scoreFor(s.matched,s.expectedCount+s.extra);s.grade=gradeFor(s.score);}
  const score=scoreFor(matched,tokens.length+extra);
  return {version:1,score,grade:gradeFor(score),matched,total:tokens.length+extra,expectedCount:tokens.length,extra,syllables,bands:GRADE_BANDS,method:'matched / (reference phones + inserted phones); rounded to integer percent',syllableMethod:'estimated IPA nuclei and maximal English onsets within prepared reference words'};
}
