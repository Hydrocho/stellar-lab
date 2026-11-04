'use strict';
const TYPES = [['O', 30000, 50000, '청색', '#85adff', '30,000 K 이상', '제타 오리오니스'], ['B', 10000, 30000, '청백색', '#b2d2ff', '10,000–30,000 K', '리겔 · 스피카'], ['A', 7500, 10000, '백색', '#f2f5ff', '7,500–10,000 K', '시리우스 · 베가'], ['F', 6000, 7500, '황백색', '#fff2c5', '6,000–7,500 K', '프로키온'], ['G', 5200, 6000, '황색', '#ffdc7e', '5,200–6,000 K', '태양 · 알파 센타우리 A'], ['K', 3700, 5200, '주황색', '#ffa362', '3,700–5,200 K', '알데바란 · 악투루스'], ['M', 2400, 3700, '적색', '#ff7373', '2,400–3,700 K', '베텔게우스 · 프록시마 센타우리']];
const STARS = TYPES.flatMap((t, i) => [.22, .48, .77].map((f, j) => ({ id: `${t[0]}${j}`, type: i, temp: Math.round((t[1] + (t[2] - t[1]) * f) / 10) * 10, name: `관측성 ${String(i * 3 + j + 1).padStart(2, '0')}` })));
const $ = id => document.getElementById(id), KEY = 'stellar-lab-v1'; let data = { collected: [], records: [] }, storageOK = true;
try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) { data.collected = Array.isArray(d.collected) ? [...new Set(d.collected)].filter(id => STARS.some(s => s.id === id)) : []; data.records = Array.isArray(d.records) ? d.records.filter(r => r && Number.isFinite(r.score) && Number.isFinite(r.correct) && Number.isFinite(r.wrong) && Number.isFinite(Date.parse(r.date))) : [] } } catch { storageOK = false }
let mode = 'learn', selected = null, playing = false, roundStars = [], target = null, score = 0, correct = 0, wrong = 0, deadline = 0, ticker = null, toastTimer;
let hunt=null, goalSignal='', resultTicker=null;
function stopResultAnimation(){clearInterval(resultTicker);resultTicker=null;}
const unlocked = () => data.collected.length === 21;
function save() { try { localStorage.setItem(KEY, JSON.stringify({ ...data, passed: unlocked() })) } catch { storageOK = false; toast('저장 공간을 사용할 수 없어 이번 진행은 현재 화면에서만 유지됩니다.') } }
function toast(s) { $('toast').textContent = s; $('toast').style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').style.display = 'none', 3800) }
function renderCollection() { $('total').innerHTML = `${data.collected.length} <small>/ 21</small>`; $('progress').style.width = `${data.collected.length / 21 * 100}%`; $('lock').textContent = unlocked() ? '✓' : '🔒'; $('next').disabled = !unlocked(); $('cards').innerHTML = TYPES.map((t, i) => { const n = STARS.filter(s => s.type === i && data.collected.includes(s.id)).length; return `<article class="type-card" style="--color:${t[4]}"><h3>${t[0]}<span class="color-name">형 · ${t[3]}</span></h3><div class="range">${t[5]}</div><div class="example">${t[6]}</div><div class="dots">${[0, 1, 2].map(j => `<i class="${j < n ? 'filled' : ''}"></i>`).join('')}<span>${n} / 3</span></div></article>` }).join('') }
function shuffled(a) { return [...a].sort(() => Math.random() - .5) }
const celestialSky = new CelestialSky($('sky'), STARS, s => mode === 'learn' ? observe(s) : guess(s));
function renderSky(stars) { celestialSky.aim && (celestialSky.aim.duration=mode==='game'?400:1000); celestialSky.canAcquire=(s,now)=>mode==='learn'||(playing&&hunt.available(s,now)); celestialSky.setStars(stars, TYPES, mode === 'learn' ? data.collected : [], mode === 'learn' ? selected?.id : null); $('sky').querySelector('.sky-caption').textContent = mode==='game'?'0.4초 조준 · 포착한 별은 폭발 후 시야 밖으로 이동':'드래그로 둘러보기 · 십자선에 별을 1초간 맞춰 관측'; }

function spectrum(temp) { return integratedSpectrum(temp); }

function observe(s) {
    const isMobile = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width:700px)').matches;
    if (isMobile) { clearTimeout(window.__switchViewTimer); window.__switchViewTimer = setTimeout(() => setObservationView(true), 500); } else { setObservationView(true); }
    selected = s; celestialSky.pulseStar?.(s.id);
    const t = TYPES[s.type], done = data.collected.includes(s.id);
    $('sky').querySelectorAll('.star').forEach(b => { const isSel = b.dataset.starId === s.id; b.classList.toggle('selected', isSel); b.classList.toggle('collected', data.collected.includes(b.dataset.starId)); if (isSel) { b.classList.remove('acquired'); if (b.offsetWidth) void b.offsetWidth; b.classList.add('acquired'); } });
    if (done) { $('observation').innerHTML = observationCard(s) + '<div class="feedback">이미 등록한 관측 카드입니다. 다른 별도 찾아보세요.</div>'; return; }
    $('observation').innerHTML = `<div class="star-info"><div class="orb" style="--color:${t[4]}"></div><div><h3>${s.name}</h3><div class="sub">관측 색상 · ${t[3]} · 교육용 모형</div></div></div>${probePanel(s)}`;
    bindProbe(s);
}

function setLearn() { if (playing) { toast('진행 중인 도전을 마치거나 종료해 주세요.'); return } stopResultAnimation(); setObservationView(false); mode = 'learn'; selected = null; $('learnNav').classList.add('active'); $('gameNav').classList.remove('active'); $('gameBar').hidden = true; $('skyTitle').textContent = '관측 가능한 밤하늘'; $('instrumentTitle').textContent = '스펙트럼 분석기'; $('shuffle').disabled = false; $('subtitle').textContent = '밤하늘의 별을 관측하고, 스펙트럼으로 별의 비밀을 풀어보세요.'; $('observation').innerHTML = '<div class="empty"><div class="empty-orbit">✧</div><h3>어떤 별이 궁금한가요?</h3><p>별을 중앙 십자선에 1초간 맞추면<br>별빛의 스펙트럼을 분석할 수 있어요.</p></div><div class="hint">01 &nbsp; 하늘을 밀어 별을 중앙에 맞추고 1초 유지<br>02 &nbsp; 파장 탐침으로 가장 강한 빛 찾기<br>03 &nbsp; 관측 카드를 모아 21칸의 도감 완성</div>'; renderSky(STARS) }
function setGame() { if (!unlocked()) { toast('먼저 1단계에서 21개의 별을 모두 수집하세요.'); return } if (playing) return; stopResultAnimation(); setObservationView(true); mode = 'game'; selected = null; $('learnNav').classList.remove('active'); $('gameNav').classList.add('active'); $('gameBar').hidden = true; $('skyTitle').textContent = '별 찾기 도전'; $('instrumentTitle').textContent = '미션 컨트롤'; $('subtitle').textContent = '배운 내용을 떠올리며 제시된 표면 온도로 별의 색을 떠올리고, 60초 동안 해당하는 별을 찾아보세요.'; $('observation').innerHTML = '<div class="empty"><div class="empty-orbit">⌁</div><h3>이제, 별빛을 읽을 시간</h3><p>표면 온도만 보고 별의 색을 판단해 찾으세요.<br>게임 중에는 색상 참고 카드가 숨겨집니다.<br>정답 +100점 · 오답 −30점<br>3콤보 ×1.5 · 5콤보 ×2 · 마지막 10초 ×2<br>20초·40초 이후 정답 시 특별 미션 시작<br>10초 안에 성공 시 +200점</p></div><button id="start" class="primary">60초 도전 시작 →</button><div class="hint">완주 점수 기준 · S / A / B / C / D<br>S 3,200 이상 · A 2,400–3,199<br>B 1,600–2,399 · C 800–1,599 · D 800 미만<br>중도 종료는 미완주로 저장되며 등급을 부여하지 않습니다.</div>'; $('start').onclick = startGame; renderSky(STARS) }
function newRound() { renderSky(STARS); updateHunt(); }
function updateHunt() {
 const now=performance.now();hunt.tick(now);target=hunt.target;
 score=hunt.score;correct=hunt.correct;wrong=hunt.wrong;
 const m=hunt.mission;
 const targetType=m?m.type:target;
 const band=i=>i===0?'30,000 K 이상':`${TYPES[i][1].toLocaleString()} K 이상 · ${TYPES[i][2].toLocaleString()} K 미만`;
 const title=m?'온도 탐색 특별 미션':(hunt.pending.length?'온도로 별 찾기 · 성공 후 특별 미션':'온도로 별 찾기');
 const signal=title+targetType+(m?.progress||0);
 $('missionStatus').textContent=title+(m?' · '+m.progress+'/2 · 남은 '+Math.ceil((m.end-now)/1000)+'초':'');
 if(signal!==goalSignal){
  goalSignal=signal;
  $('target').innerHTML=`<div class="temperature-clue"><small>찾아야 할 별의 표면 온도</small><strong>${band(targetType)}</strong><p>이 온도의 별은 어떤 색일까요?</p></div>`;
  $('target').classList.remove('goal-signal');void $('target').offsetWidth;$('target').classList.add('goal-signal');
 }
 const left=hunt.remaining(now), count=left>0&&left<=5000?String(Math.ceil(left/1000)):'';
 $('huntCountdown').hidden=!count;
 if($('huntCountdown').textContent!==count){$('huntCountdown').textContent=count;$('huntCountdown').classList.remove('count-beat');void $('huntCountdown').offsetWidth;$('huntCountdown').classList.add('count-beat');}
 $('timer').textContent=(left/1000).toFixed(1);
 $('score').textContent=`${score}점`;
 $('combo').textContent=`${hunt.combo} COMBO${hunt.combo>=5?' ×2':hunt.combo>=3?' ×1.5':''}${hunt.remaining(now)<=10000?' · FINAL ×2':''}`;
 $('sky').classList.toggle('final-seconds',playing&&hunt.remaining(now)<=10000);
 $('gameBar').classList.toggle('final-seconds',playing&&hunt.remaining(now)<=10000);
}
function startGame() {
 if(!unlocked())return;
 stopResultAnimation();$('huntCountdown').hidden=true;$('huntReward').textContent='';
 setObservationView(false);playing=true;hunt=new HuntSession(STARS,performance.now());goalSignal='';score=correct=wrong=0;deadline=hunt.start+60000;
 if(celestialSky.aim){celestialSky.aim.suspend();celestialSky.aim.latched=null;}
 $('gameBar').hidden=false;document.querySelector('.workspace').classList.add('hunt-playing');$('shuffle').disabled=true;
 $('observation').innerHTML='<div class="hunt-instructions">0.4초 조준 · 폭발 후 다른 위치에 생성<br>3콤보 ×1.5 / 5콤보 ×2 / 마지막 10초 ×2</div><div id="gameFeedback" class="feedback" role="status">온도를 읽고 알맞은 색의 별을 찾아보세요.</div><button id="stop" class="outline">도전 종료</button>';

 $('stop').onclick=()=>finish(true);newRound();
 clearInterval(ticker);ticker=setInterval(()=>{updateHunt();if(hunt.remaining(performance.now())<=0)finish(false)},80);
}
function guess(s) {
 if(!playing)return;const now=performance.now();if(now>=deadline){finish(false);return;}
 const result=hunt.capture(s,now);if(result.blocked)return;
 if(result.correct)celestialSky.explodeAndRelocate?.(s.id,now);
 updateHunt();
 const message=result.correct?`+${result.points}${result.bonus?' · 미션 성공 +200':''} · ${hunt.combo} COMBO`:`오답 · ${TYPES[s.type][0]}형 · ${result.points}점 · 콤보 해제`;
 $('gameFeedback').textContent=`${result.correct?'정답':'오답'} · 방금 선택한 별: ${s.temp.toLocaleString()} K · ${TYPES[s.type][3]}. ${result.correct?'제시된 온도 범위에 해당해요.':'제시된 온도 범위 밖이에요.'} ${message}`;$('huntReward').textContent=message;
 $('huntReward').classList.remove('reward-pop');void $('huntReward').offsetWidth;$('huntReward').classList.add('reward-pop');
}
function grade(n) { return n >= 3200 ? 'S' : n >= 2400 ? 'A' : n >= 1600 ? 'B' : n >= 800 ? 'C' : 'D' }
function finish(aborted) {
 if(!playing)return;playing=false;stopResultAnimation();clearInterval(ticker);
 document.querySelector('.workspace').classList.remove('hunt-playing');
 $('gameBar').hidden=true;$('huntCountdown').hidden=true;$('sky').classList.remove('final-seconds');$('gameBar').classList.remove('final-seconds');setObservationView(true);
 const g=aborted?null:grade(score), events=hunt?.events||[];
 data.records.unshift({date:new Date().toISOString(),score,correct,wrong,grade:g,aborted,rulesVersion:2,bestCombo:hunt?.best||0,missions:hunt?.completed||0,events});data.records=data.records.slice(0,500);save();$('shuffle').disabled=false;
 const summary=TYPES.map((t,i)=>{const n=events.filter(e=>e.type===i).length;return n?`<span style="--color:${t[4]}">${t[0]}형 <b>${n}</b></span>`:'';}).join('');
 const missionNames=['서로 다른 K형 별 2개','M형 → O형 순서 포착','O형 또는 B형 별 2개','10,000 K 이상인 별 2개','3,700 K 미만 → 10,000 K 이상'];
 $('observation').innerHTML=`<div class="hunt-result"><div class="result-content"><div class="result-heading"><div id="resultGrade" class="result-grade" aria-label="${aborted?'미완주':'최종 등급 '+g}">${aborted?'—':'D'}</div><h3>${aborted?'미완주 · 도전을 종료했어요':'관측 임무 완료!'}</h3><div class="result-score"><b id="resultScore">0</b><span> 점</span></div></div><p class="sub result-stats">정답 ${correct} · 오답 ${wrong} · 최고 ${hunt?.best||0}콤보<br>특별 미션 ${hunt?.completed||0}회 성공</p><div class="result-types">${summary||'이번 도전에서 포착한 별이 없어요.'}</div><details class="result-history"><summary>성공한 관측 내역 ${events.length}건 보기</summary><ol>${events.map(e=>`<li><span>${e.elapsed}초 · ${TYPES[e.type][0]}형 · ${STARS.find(s=>s.id===e.id)?.name||'관측성'}</span><b>+${e.points}점</b>${e.bonus?`<small>특별 미션 성공: ${e.missionType!=null?(e.mission===5?'서로 다른 두 유형 순서 포착':TYPES[e.missionType][5]+' 온도 범위 탐색'):missionNames[e.mission]} · +${e.bonus}점</small>`:''}</li>`).join('')}</ol></details><p class="sub result-saved">${storageOK?'오늘의 기록에 저장했어요.':'기록을 저장하지 못했습니다.'}</p></div><button id="again" class="primary">다시 도전하기 →</button></div>`;
 $('again').onclick=startGame;
 const reduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const started=performance.now(), finalScore=score;
 function frame(){
  const progress=reduced?1:Math.min(1,(performance.now()-started)/1800), value=Math.floor(finalScore*(1-Math.pow(1-progress,2)));
  $('resultScore').textContent=value.toLocaleString();
  const rank=aborted?'—':grade(value);
  if($('resultGrade').textContent!==rank){$('resultGrade').textContent=rank;$('resultGrade').classList.remove('rank-step');void $('resultGrade').offsetWidth;$('resultGrade').classList.add('rank-step');}
  if(progress===1){stopResultAnimation();$('resultGrade').classList.remove('rank-step');if(!aborted)$('resultGrade').classList.add('rank-final');}
 }
 frame();if(!reduced)resultTicker=setInterval(frame,30);
}
function showRecords() { if (playing) { toast('도전을 마치면 기록을 볼 수 있어요.'); return } const today = new Date().toLocaleDateString('sv-SE'); const rows = data.records.filter(r => new Date(r.date).toLocaleDateString('sv-SE') === today); $('recordsContent').innerHTML = `<p class="sub">${today} · 이 브라우저의 기록 · 최근 500회 보관 · 이전 규칙 기록은 별도 표시</p>${rows.length ? `<table><thead><tr><th>시간</th><th>등급</th><th>점수</th><th>정답 / 오답</th></tr></thead><tbody>${rows.map(r => `<tr><td>${new Date(r.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</td><td>${r.aborted ? '미완주' : r.rulesVersion===2?grade(r.score):'기존 규칙 · '+(r.grade|| (r.score>=1200?'S':r.score>=900?'A':r.score>=600?'B':r.score>=300?'C':'D'))}</td><td>${r.score}</td><td>${r.correct} / ${r.wrong}</td></tr>`).join('')}</tbody></table>` : '<div class="empty"><p>오늘은 아직 도전 기록이 없어요.<br>별 찾기 도전을 완료하면 여기에 저장됩니다.</p></div>'}`; $('records').showModal() }
$('learnNav').onclick = setLearn; $('gameNav').onclick = setGame; $('next').onclick = setGame; $('shuffle').onclick = () => celestialSky.reset(); $('recordsBtn').onclick = showRecords; $('closeRecords').onclick = () => $('records').close(); $('reset').onclick = requestAtlasReset; renderCollection(); setLearn(); if (!storageOK) toast('브라우저 저장소를 읽지 못했습니다. 저장 설정을 확인해 주세요.');




function setObservationView(analysis) {
    document.querySelector('.workspace').classList.toggle('show-analysis', analysis);
    $('skyView').setAttribute('aria-pressed', String(!analysis));
    $('analysisView').setAttribute('aria-pressed', String(analysis));
}
$('skyView').onclick = () => setObservationView(false);
$('analysisView').onclick = () => setObservationView(true);
$('collectionToggle').onclick = () => {
    const expanded = document.querySelector('.collection').classList.toggle('expanded');
    $('collectionToggle').setAttribute('aria-expanded', String(expanded));
    $('collectionToggle').textContent = expanded ? '유형 설명 접기 ▴' : '유형 설명 펼치기 ▾';
};
