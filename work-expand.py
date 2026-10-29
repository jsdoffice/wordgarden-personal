import json,re
from pathlib import Path
nouns='''bag|가방
backpack|배낭
suitcase|여행 가방
wallet|지갑
purse|핸드백
umbrella|우산
coat|코트
jacket|재킷
shirt|셔츠
sweater|스웨터
scarf|목도리
hat|모자
cap|야구 모자
glove|장갑
shoe|신발
sock|양말
belt|허리띠
watch|손목시계
ring|반지
necklace|목걸이
bracelet|팔찌
mirror|거울
comb|빗
brush|솔
hairdryer|헤어드라이어
razor|면도기
toothbrush|칫솔
towel|수건
blanket|담요
pillow|베개
sheet|시트
mattress|매트리스
curtain|커튼
carpet|카펫
rug|작은 깔개
lamp|램프
candle|양초
clock|시계
vase|꽃병
frame|액자
shelf|선반
cabinet|수납장
drawer|서랍
desk|책상
table|탁자
chair|의자
sofa|소파
stool|스툴
bench|벤치
basket|바구니
box|상자
container|용기
bottle|병
jar|단지
cup|컵
mug|머그잔
glass|유리잔
plate|접시
bowl|그릇
fork|포크
spoon|숟가락
knife|칼
pan|팬
pot|냄비
kettle|주전자
tray|쟁반
lid|뚜껑
opener|따개
strainer|체
ladle|국자
spatula|뒤집개
peeler|껍질 벗기는 도구
grater|강판
blender|믹서기
toaster|토스터
microwave|전자레인지
oven|오븐
refrigerator|냉장고
freezer|냉동고
dishwasher|식기세척기
vacuum cleaner|진공청소기
washing machine|세탁기
fan|선풍기
heater|난방기
humidifier|가습기
air purifier|공기청정기
thermometer|온도계
scale|저울
flashlight|손전등
battery|건전지
charger|충전기
cable|케이블
adapter|어댑터
plug|플러그
extension cord|연장선
phone|전화기
smartphone|스마트폰
tablet|태블릿
laptop|노트북
computer|컴퓨터
keyboard|키보드
mouse|마우스
monitor|모니터
printer|프린터
speaker|스피커
microphone|마이크
camera|카메라
tripod|삼각대
projector|프로젝터
radio|라디오
television|텔레비전
remote control|리모컨
calculator|계산기
notebook|공책
textbook|교과서
dictionary|사전
novel|소설책
magazine|잡지
newspaper|신문
calendar|달력
diary|일기장
planner|수첩
folder|폴더
binder|바인더
envelope|봉투
postcard|엽서
stamp|우표
label|라벨
sticker|스티커
pen|펜
pencil|연필
marker|마커
highlighter|형광펜
eraser|지우개
ruler|자
stapler|스테이플러
paper clip|클립
sharpener|연필깎이
paintbrush|붓
canvas|캔버스
palette|팔레트
guitar|기타
violin|바이올린
piano|피아노
drum|북
flute|플루트
ball|공
racket|라켓
helmet|헬멧
bicycle|자전거
skateboard|스케이트보드
scooter|스쿠터
tent|텐트
sleeping bag|침낭
compass|나침반
map|지도
binoculars|쌍안경
whistle|호루라기
rope|밧줄
hammer|망치
screwdriver|드라이버
wrench|렌치
ladder|사다리'''
verbs='''open the window|창문 열기|창문을 열
close the door|문 닫기|문을 닫을
turn on the light|불 켜기|불을 켤
turn off the TV|텔레비전 끄기|텔레비전을 끌
wash the dishes|설거지하기|설거지를 할
clean the kitchen|주방 청소하기|주방을 청소할
make the bed|침대 정리하기|침대를 정리할
do the laundry|빨래하기|빨래를 할
fold the clothes|옷 개기|옷을 갤
water the plants|식물에 물 주기|식물에 물을 줄
take out the trash|쓰레기 버리기|쓰레기를 버릴
feed the cat|고양이 밥 주기|고양이에게 밥을 줄
walk the dog|개 산책시키기|개를 산책시킬
sweep the floor|바닥 쓸기|바닥을 쓸
mop the floor|바닥 닦기|바닥을 닦을
organize the closet|옷장 정리하기|옷장을 정리할
change the sheets|시트 갈기|시트를 갈
fix the sink|싱크대 고치기|싱크대를 고칠
check the mail|우편물 확인하기|우편물을 확인할
lock the door|문 잠그기|문을 잠글
prepare breakfast|아침 식사 준비하기|아침 식사를 준비할
cook dinner|저녁 요리하기|저녁을 요리할
make coffee|커피 만들기|커피를 만들
boil some water|물 끓이기|물을 끓일
bake a cake|케이크 굽기|케이크를 구울
cut the vegetables|채소 썰기|채소를 썰
peel the potatoes|감자 껍질 벗기기|감자 껍질을 벗길
set the table|식탁 차리기|식탁을 차릴
clear the table|식탁 치우기|식탁을 치울
order some food|음식 주문하기|음식을 주문할
try a new recipe|새 조리법 시도하기|새 조리법을 시도할
pack a lunch|도시락 싸기|도시락을 쌀
eat breakfast|아침 먹기|아침을 먹을
drink some water|물 마시기|물을 마실
buy groceries|식료품 사기|식료품을 살
visit the market|시장 방문하기|시장에 갈
make a reservation|예약하기|예약을 할
book a table|식당 자리 예약하기|식당 자리를 예약할
pay the bill|계산하기|계산을 할
leave a tip|팁 남기기|팁을 남길
catch a bus|버스 타기|버스를 탈
take the subway|지하철 타기|지하철을 탈
call a taxi|택시 부르기|택시를 부를
rent a car|차 빌리기|차를 빌릴
fill up the tank|연료 채우기|연료를 채울
check the route|경로 확인하기|경로를 확인할
buy a ticket|표 사기|표를 살
book a flight|항공편 예약하기|항공편을 예약할
pack a suitcase|여행 가방 싸기|여행 가방을 쌀
check the weather|날씨 확인하기|날씨를 확인할
visit a museum|박물관 방문하기|박물관을 방문할
explore the city|도시 둘러보기|도시를 둘러볼
take some photos|사진 찍기|사진을 찍을
ask for directions|길 묻기|길을 물을
find a hotel|호텔 찾기|호텔을 찾을
exchange some money|환전하기|환전을 할
check in online|온라인 체크인하기|온라인으로 체크인할
print the boarding pass|탑승권 인쇄하기|탑승권을 인쇄할
visit the beach|해변 방문하기|해변을 방문할
climb a mountain|등산하기|산에 오를
send an email|이메일 보내기|이메일을 보낼
write a report|보고서 쓰기|보고서를 쓸
attend a meeting|회의 참석하기|회의에 참석할
prepare a presentation|발표 준비하기|발표를 준비할
finish the project|프로젝트 끝내기|프로젝트를 끝낼
meet the deadline|기한 맞추기|기한을 맞출
update the schedule|일정 갱신하기|일정을 갱신할
check the details|세부 사항 확인하기|세부 사항을 확인할
contact the client|고객에게 연락하기|고객에게 연락할
review the contract|계약 검토하기|계약을 검토할
sign the document|서류에 서명하기|서류에 서명할
print the document|서류 인쇄하기|서류를 인쇄할
save the file|파일 저장하기|파일을 저장할
share the results|결과 공유하기|결과를 공유할
solve the problem|문제 해결하기|문제를 해결할
make a decision|결정하기|결정을 할
set a goal|목표 정하기|목표를 정할
plan the budget|예산 계획하기|예산을 계획할
hire an assistant|보조 직원 채용하기|보조 직원을 채용할
train the team|팀 교육하기|팀을 교육할
learn a new word|새 단어 배우기|새 단어를 배울
read a book|책 읽기|책을 읽을
listen to a podcast|팟캐스트 듣기|팟캐스트를 들을
practice speaking|말하기 연습하기|말하기를 연습할
study grammar|문법 공부하기|문법을 공부할
review the notes|필기 복습하기|필기를 복습할
ask a question|질문하기|질문을 할
look up a word|단어 찾아보기|단어를 찾아볼
take an exam|시험 보기|시험을 볼
join a class|수업 참여하기|수업에 참여할
write an essay|에세이 쓰기|에세이를 쓸
check the answers|답 확인하기|답을 확인할
solve a puzzle|퍼즐 풀기|퍼즐을 풀
watch a tutorial|학습 영상 보기|학습 영상을 볼
visit the library|도서관 방문하기|도서관을 방문할
borrow a book|책 빌리기|책을 빌릴
return the book|책 반납하기|책을 반납할
improve my pronunciation|발음 개선하기|내 발음을 개선할
memorize the vocabulary|어휘 암기하기|어휘를 암기할
complete the assignment|과제 완성하기|과제를 완성할
call a friend|친구에게 전화하기|친구에게 전화할
visit my parents|부모님 방문하기|부모님을 방문할
meet my friends|친구들 만나기|내 친구들을 만날
send a message|메시지 보내기|메시지를 보낼
write a letter|편지 쓰기|편지를 쓸
plan a party|파티 계획하기|파티를 계획할
buy a gift|선물 사기|선물을 살
invite the neighbors|이웃 초대하기|이웃을 초대할
celebrate a birthday|생일 축하하기|생일을 축하할
help a friend|친구 돕기|친구를 도울
keep a promise|약속 지키기|약속을 지킬
make a phone call|전화 걸기|전화를 걸
join a club|동호회 가입하기|동호회에 가입할
introduce myself|자기소개하기|나를 소개할
say thank you|감사 인사하기|감사 인사를 할
apologize for the mistake|실수에 사과하기|실수에 대해 사과할
share my opinion|의견 나누기|내 의견을 나눌
listen to the story|이야기 듣기|이야기를 들을
explain the situation|상황 설명하기|상황을 설명할
ask for help|도움 요청하기|도움을 요청할
go for a walk|산책하기|산책을 할
get some exercise|운동하기|운동을 할
stretch my legs|다리 스트레칭하기|내 다리를 스트레칭할
take a break|잠시 쉬기|잠시 쉴
get some rest|휴식 취하기|휴식을 취할
make an appointment|예약 잡기|예약을 잡을
see a doctor|진료받기|진료를 받을
check my temperature|체온 재기|내 체온을 잴
brush my teeth|양치하기|내 이를 닦을
wash my hands|손 씻기|내 손을 씻을
go swimming|수영하기|수영을 할
ride a bicycle|자전거 타기|자전거를 탈
play tennis|테니스 치기|테니스를 칠
practice yoga|요가 연습하기|요가를 연습할
start a journal|일기 쓰기 시작하기|일기 쓰기를 시작할
learn to cook|요리 배우기|요리를 배울
plant a tree|나무 심기|나무를 심을
draw a picture|그림 그리기|그림을 그릴
paint the wall|벽 칠하기|벽을 칠할
play the guitar|기타 연주하기|기타를 연주할
listen to music|음악 듣기|음악을 들을
watch a movie|영화 보기|영화를 볼
visit an exhibition|전시회 방문하기|전시회를 방문할
buy some flowers|꽃 사기|꽃을 살
organize my photos|사진 정리하기|내 사진을 정리할
back up my files|파일 백업하기|내 파일을 백업할
change my password|비밀번호 바꾸기|내 비밀번호를 바꿀
charge my phone|휴대폰 충전하기|내 휴대폰을 충전할
install the update|업데이트 설치하기|업데이트를 설치할
restart the computer|컴퓨터 재시작하기|컴퓨터를 재시작할
compare the prices|가격 비교하기|가격을 비교할
try on the jacket|재킷 입어보기|재킷을 입어 볼
return the item|물건 반품하기|물건을 반품할
request a refund|환불 요청하기|환불을 요청할
check the receipt|영수증 확인하기|영수증을 확인할
order a replacement|교체품 주문하기|교체품을 주문할
measure the room|방 치수 재기|방의 치수를 잴
repair the bicycle|자전거 수리하기|자전거를 수리할
recycle the bottles|병 재활용하기|병을 재활용할
donate old clothes|헌 옷 기부하기|헌 옷을 기부할'''
# Adjective, dictionary meaning, subject, Korean predicative translation.
adjectives='''quiet|조용한|room|그 방은 조용해요
clean|깨끗한|kitchen|그 주방은 깨끗해요
bright|밝은|room|그 방은 밝아요
dark|어두운|hallway|그 복도는 어두워요
warm|따뜻한|soup|그 수프는 따뜻해요
cold|차가운|water|그 물은 차가워요
hot|뜨거운|coffee|그 커피는 뜨거워요
cool|시원한|room|그 방은 시원해요
fresh|신선한|bread|그 빵은 신선해요
stale|신선하지 않은|bread|그 빵은 신선하지 않아요
sweet|달콤한|cake|그 케이크는 달콤해요
sour|신맛이 나는|sauce|그 소스는 신맛이 나요
salty|짠|soup|그 수프는 짜요
spicy|매운|curry|그 카레는 매워요
bitter|쓴|coffee|그 커피는 써요
delicious|맛있는|meal|그 식사는 맛있어요
crispy|바삭한|chicken|그 닭고기는 바삭해요
soft|부드러운|pillow|그 베개는 부드러워요
hard|딱딱한|mattress|그 매트리스는 딱딱해요
smooth|매끄러운|surface|그 표면은 매끄러워요
rough|거친|surface|그 표면은 거칠어요
heavy|무거운|bag|그 가방은 무거워요
light|가벼운|backpack|그 배낭은 가벼워요
large|큰|room|그 방은 커요
small|작은|desk|그 책상은 작아요
wide|넓은|road|그 도로는 넓어요
narrow|좁은|hallway|그 복도는 좁아요
long|긴|bridge|그 다리는 길어요
short|짧은|cable|그 케이블은 짧아요
thick|두꺼운|blanket|그 담요는 두꺼워요
thin|얇은|jacket|그 재킷은 얇아요
deep|깊은|pool|그 수영장은 깊어요
shallow|얕은|pool|그 수영장은 얕아요
comfortable|편안한|chair|그 의자는 편안해요
uncomfortable|불편한|seat|그 좌석은 불편해요
convenient|편리한|location|그 위치는 편리해요
useful|유용한|tool|그 도구는 유용해요
helpful|도움이 되는|guide|그 안내서는 도움이 돼요
practical|실용적인|design|그 디자인은 실용적이에요
reliable|믿을 만한|service|그 서비스는 믿을 만해요
safe|안전한|building|그 건물은 안전해요
dangerous|위험한|road|그 도로는 위험해요
secure|보안이 확실한|system|그 시스템은 보안이 확실해요
stable|안정적인|connection|그 연결은 안정적이에요
fast|빠른|train|그 기차는 빨라요
slow|느린|computer|그 컴퓨터는 느려요
cheap|저렴한|ticket|그 표는 저렴해요
expensive|비싼|watch|그 손목시계는 비싸요
affordable|가격이 적당한|apartment|그 아파트는 가격이 적당해요
valuable|가치 있는|painting|그 그림은 가치가 있어요
beautiful|아름다운|garden|그 정원은 아름다워요
lovely|사랑스러운|garden|그 정원은 사랑스러워요
attractive|매력적인|design|그 디자인은 매력적이에요
colorful|다채로운|painting|그 그림은 다채로워요
plain|수수한|shirt|그 셔츠는 수수해요
modern|현대적인|building|그 건물은 현대적이에요
traditional|전통적인|house|그 집은 전통적이에요
elegant|우아한|dress|그 드레스는 우아해요
simple|단순한|plan|그 계획은 단순해요
complicated|복잡한|process|그 과정은 복잡해요
easy|쉬운|task|그 작업은 쉬워요
difficult|어려운|question|그 질문은 어려워요
clear|명확한|explanation|그 설명은 명확해요
confusing|혼란스러운|instruction|그 지시는 혼란스러워요
accurate|정확한|report|그 보고서는 정확해요
incorrect|틀린|answer|그 답은 틀렸어요
complete|완성된|report|그 보고서는 완성됐어요
incomplete|미완성인|report|그 보고서는 미완성이에요
necessary|필요한|change|그 변화는 필요해요
optional|선택 사항인|course|그 강좌는 선택 사항이에요
important|중요한|meeting|그 회의는 중요해요
urgent|긴급한|request|그 요청은 긴급해요
reasonable|합리적인|price|그 가격은 합리적이에요
fair|공정한|rule|그 규칙은 공정해요
unfair|불공정한|decision|그 결정은 불공정해요
flexible|유연한|schedule|그 일정은 유연해요
strict|엄격한|rule|그 규칙은 엄격해요
busy|붐비는|restaurant|그 식당은 붐벼요
crowded|혼잡한|station|그 역은 혼잡해요
empty|텅 빈|room|그 방은 텅 비어 있어요
full|가득 찬|container|그 용기는 가득 차 있어요
available|이용 가능한|room|그 방은 이용 가능해요
popular|인기 있는|restaurant|그 식당은 인기가 있어요
famous|유명한|museum|그 박물관은 유명해요
familiar|익숙한|place|그 장소는 익숙해요
unusual|특이한|design|그 디자인은 특이해요
ordinary|평범한|house|그 집은 평범해요
unique|독특한|pattern|그 무늬는 독특해요
similar|비슷한|pattern|그 무늬는 비슷해요
different|다른|pattern|그 무늬는 달라요
interesting|흥미로운|story|그 이야기는 흥미로워요
boring|지루한|lecture|그 강의는 지루해요
exciting|신나는|game|그 게임은 신나요
relaxing|편안함을 주는|music|그 음악은 편안함을 줘요
surprising|놀라운|result|그 결과는 놀라워요
disappointing|실망스러운|result|그 결과는 실망스러워요
impressive|인상적인|performance|그 공연은 인상적이에요
inspiring|영감을 주는|story|그 이야기는 영감을 줘요
memorable|기억에 남는|trip|그 여행은 기억에 남아요
successful|성공적인|event|그 행사는 성공적이에요
peaceful|평화로운|village|그 마을은 평화로워요
noisy|시끄러운|street|그 거리는 시끄러워요
wet|젖은|towel|그 수건은 젖어 있어요
dry|마른|towel|그 수건은 말라 있어요
flat|평평한|surface|그 표면은 평평해요
round|둥근|table|그 탁자는 둥글어요
square|정사각형인|table|그 탁자는 정사각형이에요
portable|휴대 가능한|speaker|그 스피커는 휴대 가능해요
washable|세탁 가능한|cover|그 커버는 세탁 가능해요
durable|내구성이 좋은|material|그 소재는 내구성이 좋아요'''
N=[x.split('|') for x in nouns.splitlines()][:150];V=[x.split('|') for x in verbs.splitlines()][:150];A=[x.split('|') for x in adjectives.splitlines()][:100]
assert [len(N),len(V),len(A)]==[150,150,100]
# Every combination retains a valid grammatical role and matching Korean meaning.
nt=[
('I need {a} {w}.','{k} 하나가 필요해요.'),
("I am looking for {a} {w}.",'{k} 하나를 찾고 있어요.'),
('Do you have {a} {w}?','{k} 하나가 있나요?'),
('Where can I find {a} {w}?','어디에서 {k} 하나를 찾을 수 있나요?'),
('I would like to buy {a} {w}.','{k} 하나를 사고 싶어요.'),
('How much does this {w} cost?','이 {k}의 가격은 얼마인가요?'),
('Please check the {w}.','그 {k}을(를) 확인해 주세요.'),
('I cannot find my {w}.','제 {k}을(를) 찾을 수 없어요.'),
('Do we need another {w}?','우리에게 {k} 하나가 더 필요한가요?'),
('This {w} belongs to me.','이 {k}은(는) 제 것이에요.'),
('Is this your {w}?','이것이 당신의 {k}인가요?'),
('I bought this {w} yesterday.','이 {k}을(를) 어제 샀어요.'),
('We should replace the {w}.','우리는 그 {k}을(를) 교체하는 것이 좋겠어요.'),
('I am going to clean the {w}.','그 {k}을(를) 청소할 거예요.'),
('Please be careful with the {w}.','그 {k}을(를) 조심해서 다뤄 주세요.'),
('Someone moved the {w}.','누군가 그 {k}을(를) 옮겼어요.'),
('I forgot where I put the {w}.','그 {k}을(를) 어디에 두었는지 잊어버렸어요.'),
('Have you seen my {w}?','제 {k}을(를) 보셨나요?'),
('The store sells this {w}.','그 가게에서는 이 {k}을(를) 팔아요.'),
('I found the {w} online.','온라인에서 그 {k}을(를) 찾았어요.'),
('This {w} was a gift.','이 {k}은(는) 선물이었어요.'),
('Can you show me the {w}?','그 {k}을(를) 보여 주실 수 있나요?'),
('I need some information about this {w}.','이 {k}에 관한 정보가 필요해요.'),
('Let us compare this {w} with that one.','이 {k}과(와) 저것을 비교해 봅시다.'),
('I chose this {w} because of its design.','디자인 때문에 이 {k}을(를) 골랐어요.')]
vt=[
('I want to {w}.','나는 {k} 마음이 있어요.'),
('I need to {w}.','나는 {k} 필요가 있어요.'),
('I plan to {w}.','나는 {k} 계획이에요.'),
('I hope to {w}.','나는 {k} 수 있기를 바라요.'),
('I am going to {w}.','나는 {k} 거예요.'),
('I would like to {w}.','나는 {k} 마음이 있어요.'),
('I decided to {w}.','나는 {k} 결심을 했어요.'),
('I forgot to {w}.','나는 {k} 것을 잊어버렸어요.'),
('I remembered to {w}.','나는 {k} 것을 잊지 않았어요.'),
('I promised to {w}.','나는 {k} 것을 약속했어요.'),
('Can you {w}?','당신은 {k} 수 있나요?'),
('Could you {w}?','당신이 {k} 수 있을까요?'),
('Will you {w}?','당신이 {k} 건가요?'),
('When can we {w}?','우리는 언제 {k} 수 있나요?'),
('Where can we {w}?','우리는 어디에서 {k} 수 있나요?'),
('How can I {w}?','나는 어떻게 {k} 수 있나요?'),
('Why do we need to {w}?','우리가 {k} 필요가 있는 이유는 무엇인가요?'),
('Do you want to {w}?','당신은 {k} 마음이 있나요?'),
('Are you going to {w}?','당신은 {k} 건가요?'),
('Do we have time to {w}?','우리에게 {k} 시간이 있나요?'),
('I have enough time to {w}.','나는 {k} 시간이 충분해요.'),
('I do not have time to {w}.','나는 {k} 시간이 없어요.'),
('We might {w} tomorrow.','우리는 내일 {k} 수도 있어요.'),
('I will {w} after work.','나는 퇴근 후에 {k} 거예요.'),
('We should {w} before we leave.','우리는 떠나기 전에 {k} 필요가 있어요.')]
# Predicative adjectives avoid article/countability or verb agreement ambiguity.
at=[
('The {s} is {w}.','{k}.'),
('I think the {s} is {w}.','내 생각에 {k}.'),
('I believe the {s} is {w}.','내가 믿기로는 {k}.'),
('I know the {s} is {w}.','내가 알기로는 {k}.'),
('I heard that the {s} is {w}.','내가 듣기로는 {k}.'),
('They said the {s} is {w}.','그들 말에 따르면 {k}.'),
('She thinks the {s} is {w}.','그녀 생각에는 {k}.'),
('He says the {s} is {w}.','그의 말에 따르면 {k}.'),
('We agree that the {s} is {w}.','우리의 공통된 생각은 이래요. {k}.'),
('Everyone says the {s} is {w}.','모두의 말에 따르면 {k}.'),
('My friend thinks the {s} is {w}.','내 친구 생각에는 {k}.'),
('My sister says the {s} is {w}.','내 여동생 말에 따르면 {k}.'),
('My brother thinks the {s} is {w}.','내 남동생 생각에는 {k}.'),
('My mother says the {s} is {w}.','우리 어머니 말에 따르면 {k}.'),
('My father thinks the {s} is {w}.','우리 아버지 생각에는 {k}.'),
('The review says the {s} is {w}.','후기에 따르면 {k}.'),
('The guide says the {s} is {w}.','안내서에 따르면 {k}.'),
('I am sure the {s} is {w}.','확실히 {k}.'),
('I am glad the {s} is {w}.','{k}. 나는 그 점이 기뻐요.'),
('I am surprised that the {s} is {w}.','{k}. 나는 그 점이 놀라워요.'),
('I noticed that the {s} is {w}.','내가 보니 {k}.'),
('I found out that the {s} is {w}.','나는 이 사실을 알게 됐어요. {k}.'),
('Now I understand why the {s} is {w}.','{k}. 이제 나는 그 이유를 이해해요.'),
('It is clear that the {s} is {w}.','명백히 {k}.'),
('You can see that the {s} is {w}.','당신도 알 수 있듯이 {k}.')]
def final_consonant(k):
 c=ord(k[-1]);return 0xac00<=c<=0xd7a3 and (c-0xac00)%28!=0
def josa(text,k):
 for x,y in [('을(를)','을' if final_consonant(k) else '를'),('은(는)','은' if final_consonant(k) else '는'),('과(와)','과' if final_consonant(k) else '와')]:text=text.replace(x,y)
 return text
bank=[]
for group,rows,templates in [('n',N,nt),('v',V,vt),('a',A,at)]:
 for i,row in enumerate(rows):
  w,m=row[:2];k=row[2] if group=='v' else row[3] if group=='a' else m
  for j,(en,ko) in enumerate(templates):
   values={'w':w,'a':'an' if w[0] in 'aeiou' else 'a','s':row[2] if group=='a' else '', 'k':k}
   bank.append({'id':f'{group}{i}-{j}','lexeme':f'{group}{i}','word':w,'meaning':m,'sentence':en.format(**values),'translation':josa(ko.format(**values),k),'category':{'n':'생활 단어','v':'핵심 표현','a':'상태와 묘사'}[group],'pattern':j})
assert len(bank)==10000,len(bank)
assert len({x['sentence'].lower() for x in bank})==10000
assert all(x['word'].lower() in x['sentence'].lower() for x in bank)
Path('dist/questions.js').write_text('const QUESTION_BANK='+json.dumps(bank,ensure_ascii=False,separators=(',',':'))+';\n')
Path('dist/bank-info.json').write_text(json.dumps({'questions':len(bank),'targets':400,'examplesPerTarget':25,'groups':{'생활 단어':3750,'핵심 표현':3750,'상태와 묘사':2500}},ensure_ascii=False))
p=Path('dist/index.html');s=p.read_text().replace('<script src="app.js">','<script src="questions.js"></script><script src="app.js">');p.write_text(s)
p=Path('dist/app.js');s=p.read_text();s=s.replace("const base=raw.map", "const seed=raw.map");s=s.replace("const key='wordgarden-v1'", "const base=[...seed,...QUESTION_BANK];\nconst key='wordgarden-v1'")
s=s.replace("state.progress[w.id]={level,attempts:","state.progress[w.id]={...prev,level,attempts:")
s=s.replace("const level=ok?Math.min(prev.level+1,7):0;", "const level=ok?Math.min(prev.level+1,7):0;")
# Deduplicate vocabulary entries, keep progress at question level for spaced repetition.
s=s.replace("const due=()=>", "const vocabulary=()=>Array.from(new Map(words().map(w=>[w.word.toLowerCase(),w])).values());const due=()=>")
s=s.replace("const learned=", "const learned=")
s=s.replace("learned=Object.values(state.progress).filter(p=>p.level>=2).length", "learned=new Set(words().filter(w=>state.progress[w.id]?.level>=2).map(w=>w.word.toLowerCase())).size")
s=s.replace("'작은 배움이 모여 자연스러운 영어가 돼요.'", "'10,000개 확장 문제와 60개 기본 예문으로 매일 새롭게.'")
s=s.replace("'문장 속에서 발견하고,<br>나만의 속도로 익혀 보세요.'", "'문장 속에서 발견하고,<br>나만의 속도로 익혀 보세요.'")
s=s.replace("'새로운 단어를 발견하고 나만의 표현을 모아요.'", "`${vocabulary().length.toLocaleString()}개 단어·표현 · ${base.length.toLocaleString()}개 문제와 예문`")
s=s.replace("pool=review?pool.sort((a,b)=>state.progress[a.id].due-state.progress[b.id].due):pool.sort((a,b)=>(!!state.progress[a.id])-(!!state.progress[b.id]));", "if(review){pool.sort((a,b)=>state.progress[a.id].due-state.progress[b.id].due)}else{for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}pool.sort((a,b)=>(!!state.progress[a.id])-(!!state.progress[b.id]));const used=new Set();pool=pool.filter(w=>{const k=w.word.toLowerCase();if(used.has(k))return false;used.add(k);return true})}")
s=s.replace("let wordFilter='all';", "let wordFilter='all',wordLimit=40;")
s=s.replace("const rows=words().filter(w=>", "const rows=vocabulary().filter(w=>")
s=s.replace("rows.length?rows.map(w=>", "rows.length?rows.slice(0,wordLimit).map(w=>")
s=s.replace("document.querySelector('#search').oninput=renderWords", "document.querySelector('#search').oninput=()=>{wordLimit=40;renderWords()}")
s=s.replace("document.querySelectorAll('[data-speak]').forEach", "if(rows.length>wordLimit){const more=document.createElement('button');more.className='secondary';more.textContent=`더 보기 (${Math.min(wordLimit,rows.length)} / ${rows.length})`;more.onclick=()=>{wordLimit+=40;renderWords()};document.querySelector('#wordList').append(more)}document.querySelectorAll('[data-speak]').forEach")
s=s.replace("60개의 기본 단어·표현과 자체 작성 예문으로 시작해요.", "400개 핵심 단어·표현 × 25개 문장 패턴으로 만든 10,000개 확장 문제에 기본 예문 60개를 더했어요. 확장 문제는 문장 틀과 단어를 조합한 콘텐츠이며, 10,000개의 서로 다른 단어를 뜻하지 않습니다.")
# Reveal examples for each vocabulary item.
s=s.replace("<strong>${esc(w.word)}</strong><small>${esc(w.meaning)}</small>", "<strong>${esc(w.word)}</strong><small>${esc(w.meaning)}</small><button class=\"example-btn\" data-examples=\"${esc(w.id)}\">예문 보기 ↗</button>")
s=s.replace("document.querySelectorAll('[data-delete]').forEach", "document.querySelectorAll('[data-examples]').forEach(b=>b.onclick=()=>showExamples(b.dataset.examples));document.querySelectorAll('[data-delete]').forEach")
s += '''\nfunction showExamples(id){const w=words().find(w=>w.id===id);if(!w)return;const list=words().filter(x=>x.word.toLowerCase()===w.word.toLowerCase());main.innerHTML=title('WORD IN CONTEXT',esc(w.word),`${esc(w.meaning)} · 예문 ${list.length}개`)+`<button class="secondary" data-page="words">← 단어장으로</button><div class="word-list" style="margin-top:20px">${list.map(x=>`<section class="card"><p style="font:20px/1.6 Outfit,sans-serif">${esc(x.sentence)}</p><p class="muted">${esc(x.translation)}</p><button class="listen" data-example-speak="${esc(x.id)}">◖ 문장 듣기</button></section>`).join('')}</div>`;document.querySelectorAll('[data-example-speak]').forEach(b=>b.onclick=()=>speak(words().find(x=>x.id===b.dataset.exampleSpeak).sentence));window.scrollTo(0,0)}\n'''
p.write_text(s)
p=Path('dist/style.css');p.write_text(p.read_text()+ '\n.word-row .example-btn{display:block;width:auto;height:auto;background:none;color:#7a8c62;font-size:11px;border-radius:0;padding:5px 0;margin-top:3px}.word-body small{overflow-wrap:anywhere}\n')
p=Path('dist/sw.js');s=p.read_text().replace("wordgarden-v1","wordgarden-v2").replace("['./style.css'","['./questions.js','./style.css'");p.write_text(s)
print(json.dumps({'expanded_questions':len(bank),'targets':400,'total_with_seed':10060,'noun_entries':len(N),'phrase_entries':len(V),'adjective_entries':len(A)},ensure_ascii=False))
