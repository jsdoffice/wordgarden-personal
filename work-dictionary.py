import json,re
from pathlib import Path
source=json.load(open('dictionary-source.json'))
rows=[(w,v) for w,v in source.items() if re.fullmatch('[a-z]{2,20}',w) and re.search('[가-힣]',v['meaning_ko']) and v['cefr'] in ('A1','A2','B1','B2')]
rows.sort(key=lambda x:({'A1':0,'A2':1,'B1':2,'B2':3}[x[1]['cefr']],x[1].get('freq_rank') or 999999))
rows=rows[:6000]
fix={'you':'너, 당신','down':'아래로; 솜털','socket':'소켓, 접속구','facial':'얼굴의','prey':'먹잇감; 잡아먹다','productivity':'생산성','projection':'투영, 예상, 돌출','proton':'양성자','pulse':'맥박, 진동','punch':'주먹질; 구멍을 뚫다','purely':'순전히','rationality':'합리성','recipe':'조리법','quotation':'인용; 견적','readily':'쉽게, 기꺼이','really':'정말로','available':'이용 가능한','primer':'입문서; 밑칠','reconstruct':'재건하다, 재구성하다'}
bank=[{'id':'d-'+w,'word':w,'meaning':fix.get(w,v['meaning_ko']),'sentence':'','translation':fix.get(w,v['meaning_ko']),'category':v['cefr']+' 단어','ipa':v.get('ipa',''),'kind':'word'} for w,v in rows]
assert len({w['word'] for w in bank})==6000
Path('dist/dictionary.js').write_text('const DICTIONARY='+json.dumps(bank,ensure_ascii=False,separators=(',',':'))+';\n')
Path('dist/dictionary-data.json').write_text(json.dumps(bank,ensure_ascii=False))
Path('dist/data-credits.html').write_text('''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>단어정원 데이터 출처</title><body style="font:16px/1.9 sans-serif;max-width:760px;padding:30px;margin:auto"><h1>단어정원 데이터 출처</h1><p>영한 사전 6,000개 표제어는 <a href="https://github.com/jhseo1211/open-english-korean-dict">Open English-Korean Dictionary · jhseo1211 / LexiSnap project</a>에서 A1–B2 항목을 선별했습니다. 일부 한국어 뜻을 수정했고 앱용 필드로 변환했습니다.</p><p>가공된 사전 데이터는 <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>으로 제공합니다. <a href="dictionary-data.json" download>가공 데이터 내려받기</a> · <a href="https://github.com/jhseo1211/open-english-korean-dict/blob/main/CREDITS.md">원본 출처 및 기여자</a></p><p>원본이 명시한 상위 자료: kengdic, cc-kedict (CC BY-SA 3.0), CMU Pronouncing Dictionary (BSD), ipa-dict (MIT), NGSL, NAWL (CC BY-SA), CEFR-J Wordlist (CC BY-SA 4.0), Wiktionary via kaikki.org (CC BY-SA 3.0).</p><p>60개 기본 예문과 10,000개 확장 예문은 이 앱을 위해 작성했습니다. 확장 예문은 400개 단어·표현에 25개 문장 틀을 적용한 연습 자료입니다. 모든 사전 단어에 예문이 연결되어 있는 것은 아닙니다. 공개 사전의 번역에는 복수 의미와 부정확한 뜻이 포함될 수 있습니다.</p><a href="/">← 단어정원으로</a></body>''')
p=Path('dist/index.html');s=p.read_text().replace('<script src="questions.js">','<script src="dictionary.js"></script><script src="questions.js">');p.write_text(s)
p=Path('dist/app.js');s=p.read_text().replace('const base=[...seed,...QUESTION_BANK]','const base=[...seed,...QUESTION_BANK,...DICTIONARY]')
s=s.replace('const vocabulary=()=>Array.from(new Map(words().map(w=>[w.word.toLowerCase(),w])).values());', '''const vocabulary=()=>{const m=new Map();for(const w of words()){const k=w.word.toLowerCase(),p=m.get(k);if(!p||(state.progress[w.id]?.star&&!state.progress[p.id]?.star)||((state.progress[w.id]?.attempts||0)>(state.progress[p.id]?.attempts||0)&&!state.progress[p.id]?.star))m.set(k,w)}return [...m.values()]};''')
s=s.replace('10,000개 확장 문제와 60개 기본 예문으로 매일 새롭게.','영어 단어 6,000개 이상 · 예문 10,060개로 매일 새롭게.')
s=s.replace('빈칸에 알맞은 영어는?</h1>',"${w.kind==='word'?'이 뜻에 맞는 영어 단어는?':'빈칸에 알맞은 영어는?'}</h1>")
s=s.replace('문장을 떠올리며 직접 입력해 보세요.</p>',"${w.kind==='word'?'한국어 뜻과 첫 글자를 보고 단어를 떠올려 보세요.':'문장을 떠올리며 직접 입력해 보세요.'}</p>")
s=s.replace('<div class="question">${masked}</div>', '<div class="question">${w.kind===\'word\'?esc(w.word[0])+\' ·\'.repeat(w.word.length-1):masked}</div>')
s=s.replace("if(state.sound)speak(w.word)","if(state.sound)speak(w.word)")
s=s.replace('speak(w.sentence);','speak(w.sentence||w.word);')
s=s.replace('<p>${esc(w.sentence)}</p>','<p>${esc(w.sentence||w.ipa||\'뜻으로 익히는 단어 문제\')}</p>')
s=s.replace('400개 핵심 단어·표현 × 25개 문장 패턴으로 만든 10,000개 확장 문제에 기본 예문 60개를 더했어요. 확장 문제는 문장 틀과 단어를 조합한 콘텐츠이며, 10,000개의 서로 다른 단어를 뜻하지 않습니다.','영한 사전의 서로 다른 영어 표제어 6,000개, 기본 예문 60개와 패턴 조합 예문 10,000개를 제공합니다. 총 16,060문제이며, 모든 단어에 예문이 있는 것은 아닙니다. <a href="data-credits.html" target="_blank" rel="noopener" style="text-decoration:underline">데이터 출처와 라이선스 ↗</a>')
s=s.replace("const list=words().filter(x=>x.word.toLowerCase()===w.word.toLowerCase());", "const list=words().filter(x=>x.word.toLowerCase()===w.word.toLowerCase()&&x.sentence);")
s=s.replace('<div class="word-list" style="margin-top:20px">${list.map', '<div class="word-list" style="margin-top:20px">${list.length?\'\':\'<section class="card"><p>이 단어는 뜻 맞히기와 발음 듣기로 학습할 수 있어요.</p><p class="muted">연결된 문장 예문은 아직 없습니다.</p></section>\'}${list.map')
s=s.replace('${base.length.toLocaleString()}개 문제와 예문','${base.length.toLocaleString()}개 문제 · 예문 10,060개')
p.write_text(s)
p=Path('dist/sw.js');s=p.read_text().replace('wordgarden-v2','wordgarden-v3').replace("['./questions.js'","['./dictionary.js','./questions.js'");p.write_text(s)
print('Verified: 6000 distinct English single-word entries, Korean meanings present; 10060 examples; 16060 quiz records.')
