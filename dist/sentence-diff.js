/* Example-answer comparison only. This module never grades or records learning. */
((root,factory)=>{
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.SentenceDiff=api;
})(typeof window!=='undefined'?window:globalThis,root=>{
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Browser calls use the grading engine's live normalizer. The identical fallback
  // lets this small, independent module be inspected/tested before that script loads.
  function fallback(text){
    return String(text??'').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/(?:[—–]|--+)/g,' ').replace(/[.,!?;:"()…]/g,'').trim().split(/\s+/).filter(Boolean).join(' ').toLowerCase()
      .replace(/\b(can't)\b/g,'cannot').replace(/\bwon't\b/g,'will not').replace(/\bshan't\b/g,'shall not').replace(/\b(\w+)n't\b/g,'$1 not').replace(/\bi'm\b/g,'i am').replace(/\b(you|we|they)'re\b/g,'$1 are').replace(/\b(i|you|we|they)'ve\b/g,'$1 have').replace(/\b(i|you|he|she|it|we|they)'ll\b/g,'$1 will').replace(/\bcan not\b/g,'cannot').replace(/\b(colour|colours|organise|organised|organisation|centre|centres|travelling|travelled|learnt)\b/g,w=>({colour:'color',colours:'colors',organise:'organize',organised:'organized',organisation:'organization',centre:'center',centres:'centers',travelling:'traveling',travelled:'traveled',learnt:'learned'}[w]));
  }
  const normalize=text=>String((root.TranslationCards?.normaliseTyped||fallback)(text)).trim().split(/\s+/).filter(Boolean);
  function mapped(text){
    text=String(text??'');
    const raw=[];
    for(const match of text.matchAll(/\S+/gu)){
      let at=match.index;
      for(const piece of match[0].split(/([—–]|--+)/u)){
        if(piece&&!/^(?:[—–]|--+)$/u.test(piece))raw.push({text:piece,start:at,end:at+piece.length});
        at+=piece.length;
      }
    }
    let words=[];
    // An appended token can alter earlier output (e.g. "can" + "not"). Retain
    // provenance for that replaced suffix instead of normalizing tokens separately.
    raw.forEach((token,index)=>{
      const next=normalize(text.slice(0,token.end));let same=0;
      while(same<words.length&&same<next.length&&words[same].value===next[same])same++;
      const owners=[...new Set([...words.slice(same).flatMap(w=>w.owners),index])];
      words=words.slice(0,same).concat(next.slice(same).map(value=>({value,owners})));
    });
    return{text,raw,words};
  }
  function align(expected,typed){
    const n=expected.length,m=typed.length,width=m+1,dp=new Uint16Array((n+1)*width);
    for(let i=0;i<=n;i++)dp[i*width]=i;
    for(let j=0;j<=m;j++)dp[j]=j;
    for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)dp[i*width+j]=Math.min(dp[(i-1)*width+j]+1,dp[i*width+j-1]+1,dp[(i-1)*width+j-1]+(expected[i-1].value===typed[j-1].value?0:1));
    const operations=[];let i=n,j=m;
    while(i||j){
      if(i&&j&&expected[i-1].value===typed[j-1].value&&dp[i*width+j]===dp[(i-1)*width+j-1]){operations.push({type:'match',expected:--i,typed:--j});}
      else if(i&&j&&dp[i*width+j]===dp[(i-1)*width+j-1]+1){operations.push({type:'replace',expected:--i,typed:--j});}
      else if(j&&dp[i*width+j]===dp[i*width+j-1]+1){operations.push({type:'extra',typed:--j});}
      else{operations.push({type:'missing',expected:--i});}
    }
    operations.reverse();return{distance:dp[n*width+m],operations};
  }
  function missingText(reference,index,missing){
    const word=reference.words[index],ownerSet=new Set(word.owners);
    const siblings=reference.words.map((w,i)=>({w,i})).filter(({w})=>w.owners.some(owner=>ownerSet.has(owner)));
    if(siblings.every(({i})=>missing.has(i))){
      const text=word.owners.map(owner=>reference.raw[owner].text).join(' ').replace(/^[.,!?;:"()…“”]+|[.,!?;:"()…“”]+$/g,'');
      return{text:text||word.value,key:'raw:'+word.owners.join(',')};
    }
    return{text:word.value==='i'?'I':word.value,key:'word:'+index};
  }
  function compare(item,text,{accepted=false}={}){
    const input=mapped(text),answers=[String(item?.english??''),...(Array.isArray(item?.alternatives)?item.alternatives.filter(a=>typeof a==='string'):[])];
    let best=null;
    for(const answer of [...new Set(answers)]){
      const reference=mapped(answer),alignment=align(reference.words,input.words),matches=alignment.operations.filter(op=>op.type==='match').length;
      if(!best||alignment.distance<best.distance||(alignment.distance===best.distance&&matches>best.matches))best={...alignment,reference,matches};
    }
    const wrong=new Set(),missing=new Set();
    const acceptedResult=Boolean(accepted||best.distance===0);
    if(!acceptedResult)for(const op of best.operations){if(op.type==='replace'||op.type==='extra')input.words[op.typed].owners.forEach(owner=>wrong.add(owner));else if(op.type==='missing')missing.add(op.expected);}
    const seen=new Set(),missingWords=[];
    for(const index of [...missing].sort((a,b)=>a-b)){const entry=missingText(best.reference,index,missing);if(!seen.has(entry.key)){seen.add(entry.key);missingWords.push(entry.text);}}
    const segments=[];let end=0;
    input.raw.forEach((token,index)=>{if(token.start>end)segments.push({text:input.text.slice(end,token.start),wrong:false});segments.push({text:token.text,wrong:wrong.has(index)});end=token.end;});
    if(end<input.text.length)segments.push({text:input.text.slice(end),wrong:false});
    return{accepted:acceptedResult,reference:best.reference.text,distance:best.distance,segments,wrongTokenIndices:[...wrong].sort((a,b)=>a-b),missingWords,normalisedInput:input.words.map(w=>w.value).join(' '),normalisedReference:best.reference.words.map(w=>w.value).join(' '),operations:best.operations};
  }
  function render(item,text,options={}){
    const result=compare(item,text,options);
    const input=result.segments.map(segment=>segment.wrong?`<span class="sentence-diff-wrong">${escape(segment.text)}</span>`:escape(segment.text)).join('');
    return`<section class="sentence-diff" aria-label="예시 답안과 내 문장 비교"><p class="sentence-diff-note">${result.accepted?'내 문장':'예시 답안과 비교한 표시예요.'}</p><p class="sentence-diff-input" lang="en">${input||'<span class="sentence-diff-empty">입력한 문장이 없어요.</span>'}</p>${result.missingWords.length?`<div class="sentence-diff-missing-group"><span class="sentence-diff-missing-label">빠진 표현</span>${result.missingWords.map(word=>`<span class="sentence-diff-missing" lang="en">${escape(word)}</span>`).join('')}</div>`:''}</section>`;
  }
  return{compare,render};
});
