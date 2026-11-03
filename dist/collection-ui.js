'use strict';
function observationCard(s){
 const t=TYPES[s.type];
 return `<article class="specimen-card" style="--color:${t[4]}"><div class="specimen-top"><span>STELLAR COLLECTION · ${s.id}</span><b>✓ 등록 완료</b></div><div class="star-info"><div class="orb" style="--color:${t[4]}"></div><div><h3>${s.name} · ${t[0]}형</h3><span class="sub">${t[3]} · 표면 온도 <strong>${s.temp.toLocaleString()} K</strong></span></div></div><p class="sub">유형의 온도 범위: ${t[5]}<br>대표 별: ${t[6]}</p>${spectrum(s.temp)}</article>`;
}
function showAtlas(){
 if(playing){toast('도전을 마친 뒤 도감을 열어 주세요.');return;}
 $('atlasDetail').innerHTML='';renderAtlas();$('atlas').showModal();
}
function renderAtlas(){
 $('atlasCount').textContent=`${data.collected.length} / 21장 · 카드를 눌러 다시 관측하세요`;
 $('atlasGrid').innerHTML=TYPES.map((t,i)=>`<section class="atlas-family" style="--color:${t[4]}"><h3>${t[0]}형 <small>${t[3]} · ${CollectionRules.level(data,STARS,i)}/3</small></h3><div>${STARS.filter(s=>s.type===i).map(s=>data.collected.includes(s.id)?`<button class="atlas-card" data-specimen="${s.id}"><span>✦</span><strong>${s.name}</strong><small>${s.temp.toLocaleString()} K</small></button>`:`<div class="atlas-card missing"><span>✧</span><strong>미발견</strong><small>관측 카드 빈자리</small></div>`).join('')}</div></section>`).join('');
 document.querySelectorAll('[data-specimen]').forEach(b=>b.onclick=()=>{
  const s=STARS.find(x=>x.id===b.dataset.specimen);$('atlasDetail').innerHTML=observationCard(s);$('atlasDetail').scrollIntoView({block:'nearest',behavior:'smooth'});
 });
}
function requestAtlasReset(){
 if(playing){toast('진행 중인 도전을 먼저 종료해 주세요.');return;}
 $('resetAtlasDialog').showModal();
}
function confirmAtlasReset(){
 CollectionRules.reset(data);save();renderCollection();setLearn();renderAtlas();$('atlasDetail').innerHTML='';
 $('resetAtlasDialog').close();toast('도감을 초기화했습니다. 게임 기록은 유지됩니다.');
}
document.addEventListener('DOMContentLoaded',()=>{
 $('atlasBtn').onclick=showAtlas;$('closeAtlas').onclick=()=>$('atlas').close();
 $('reset').onclick=requestAtlasReset;$('atlasReset').onclick=requestAtlasReset;
 $('cancelAtlasReset').onclick=()=>$('resetAtlasDialog').close();$('confirmAtlasReset').onclick=confirmAtlasReset;
});
