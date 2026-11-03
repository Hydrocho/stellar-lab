'use strict';
function probePanel(s){
 return `<section class="probe-experiment"><div class="spectrum-label"><span>상대 복사 세기</span><span>파장 →</span></div><div class="probe-plot">${integratedSpectrum(s.temp,true)}<div id="peakTemperatureOverlay" class="peak-temperature-overlay" role="status" aria-live="polite" aria-atomic="true" hidden><span>표면 온도 측정 완료</span><strong id="peakTemperatureValue"></strong></div></div><div class="probe-readings"><span>탐침 파장 <b id="probeWavelength">750 nm</b></span><span>표면 온도 <b id="probeTemperature">측정 중</b></span></div><div class="probe-region"><span id="probeColor" aria-hidden="true"></span><span id="probeRegion"></span></div><div class="probe-controls"><label for="probeSlider" class="visually-hidden">파장 탐침: 곡선의 가장 높은 지점을 찾으세요</label><button id="probeMinus" type="button" aria-label="탐침 파장 1 나노미터 줄이기">−1 nm</button><input id="probeSlider" type="range" min="30" max="1500" step="1" value="750" aria-describedby="probeHint"><button id="probePlus" type="button" aria-label="탐침 파장 1 나노미터 늘리기">+1 nm</button></div><p id="probeHint" class="probe-hint" role="status">곡선의 꼭대기를 찾아보세요. 온도는 자동으로 측정됩니다.</p><button id="registerProbe" class="primary" disabled>카드 등록</button></section>`;
}
function bindProbe(s){
 const slider=$('probeSlider'),graph=$('probeGraph'),button=$('registerProbe');
 let moved=false,dragId=null;
 const update=(interacted=false)=>{
  moved=moved||interacted;
  const w=Number(slider.value),signal=CollectionRules.signal(s,w),x=25+(w-30)/1470*260;
  $('probeLine').setAttribute('d',`M${x} 16V146`);
  $('probeDot').setAttribute('cx',x);$('probeDot').setAttribute('cy',119-100*signal);
  $('probeWavelength').textContent=`${w} nm`;
  $('probeRegion').textContent=wavelengthRegion(w);
  $('probeColor').style.background=wavelengthColor(w)||'transparent';
  $('probeColor').hidden=w<380||w>780;
  slider.setAttribute('aria-valuetext',`${w} 나노미터, 상대 세기 ${(signal*100).toFixed(1)}`);
  const ready=moved&&signal>=.995;
  $('probeTemperature').textContent=ready?`${s.temp.toLocaleString()} K`:'측정 중';
  const overlay=$('peakTemperatureOverlay'),value=$('peakTemperatureValue');
  overlay.style.color=TYPES[s.type][4];
  if(ready){const measured=`${s.temp.toLocaleString()} K`;if(value.textContent!==measured)value.textContent=measured;}
  overlay.hidden=!ready;
  button.disabled=!ready;button.textContent=ready?'✓ 관측 완료 · 카드 등록':'카드 등록';
  $('probeHint').textContent=ready?'최대점 발견! 아래 버튼으로 등록하세요.':'탐침을 곡선의 꼭대기에 맞추면 등록할 수 있어요.';
  graph.classList.toggle('peak-found',ready);
 };
 const setValue=w=>{slider.value=String(Math.max(30,Math.min(1500,Math.round(w))));update(true);};
 const fromPointer=e=>{
  const matrix=graph.getScreenCTM();if(!matrix)return;
  const point=graph.createSVGPoint();point.x=e.clientX;point.y=e.clientY;
  setValue(30+(point.matrixTransform(matrix.inverse()).x-25)/260*1470);
 };
 slider.oninput=()=>update(true);
 $('probeMinus').onclick=()=>setValue(Number(slider.value)-1);$('probePlus').onclick=()=>setValue(Number(slider.value)+1);
 graph.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0||dragId!==null)return;dragId=e.pointerId;graph.setPointerCapture(dragId);fromPointer(e);});
 graph.addEventListener('pointermove',e=>{if(e.pointerId===dragId)fromPointer(e);});
 const end=e=>{if(e.pointerId!==dragId)return;dragId=null;if(graph.hasPointerCapture(e.pointerId))graph.releasePointerCapture(e.pointerId);};
 graph.addEventListener('pointerup',end);graph.addEventListener('pointercancel',end);graph.addEventListener('lostpointercapture',end);
 button.onclick=()=>{
  if(!moved||selected?.id!==s.id||mode!=='learn')return;
  if(CollectionRules.collect(data,s,Number(slider.value))!=='collected')return;
  save();renderCollection();observe(s);
  $('observation').classList.remove('card-earned');void $('observation').offsetWidth;$('observation').classList.add('card-earned');
  toast(unlocked()?'21장의 도감 완성! 2단계가 열렸어요.':`관측 완료 · ${TYPES[s.type][0]}형 카드 획득 · ${data.collected.length}/21`);
 };
 update();
}
