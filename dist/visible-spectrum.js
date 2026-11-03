 'use strict';
function spectralRadiance(wavelength,temperature){return 1/(wavelength**5*Math.expm1(14387770/(wavelength*temperature)));}
function wavelengthColor(w,brightness=1){
 const anchors=[[380,.55,0,1],[440,.12,0,1],[490,0,.75,1],[510,0,1,.2],[550,.65,1,0],[580,1,1,0],[610,1,.35,0],[650,1,0,0],[780,1,0,0]];
 if(w<380||w>780)return null;
 const upper=anchors.findIndex(a=>a[0]>=w),a=anchors[Math.max(0,upper-1)],b=anchors[upper],f=a===b?0:(w-a[0])/(b[0]-a[0]);
 const encode=x=>Math.round(255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055));
 return `rgb(${[1,2,3].map(c=>encode((a[c]+f*(b[c]-a[c]))*Math.max(0,Math.min(1,brightness)))).join(',')})`;
}
function wavelengthRegion(w){
 if(w<380)return '자외선 · 눈에 보이지 않는 빛';
 if(w>780)return '적외선 · 눈에 보이지 않는 빛';
 const color=w<450?'보라색':w<495?'청색':w<570?'녹색':w<590?'황색':w<620?'주황색':'적색';
 return `가시광선 · ${color}`;
}
let spectrumGraphicId=0;
function integratedSpectrum(temp,interactive=false){
 const peak=2898000/temp,maximum=spectralRadiance(peak,temp),x=w=>25+(w-30)/1470*260;
 const signal=w=>Math.min(1,spectralRadiance(w,temp)/maximum);
 let path='';for(let i=0;i<=520;i++){const w=30+i/520*1470;path+=`${i?'L':'M'}${x(w).toFixed(3)},${(119-100*signal(w)).toFixed(3)} `;}
 const stops=Array.from({length:81},(_,i)=>{const w=380+i*5;return `<stop offset="${i/80}" stop-color="${wavelengthColor(w,signal(w))}"/>`;}).join('');
 const gradient=`visible-band-${++spectrumGraphicId}`;
 const marker=interactive?'<path id="probeLine" d="M152 16V146" stroke="#ffe3a5" stroke-width="1.5" stroke-dasharray="4 3"/><circle id="probeDot" cx="152" cy="80" r="5" fill="#ffe3a5" stroke="#071324" stroke-width="2"/>':`<path d="M${x(peak)} 16V146" stroke="#ffe3a5" stroke-dasharray="4 3"/>`;
 return `<svg ${interactive?'id="probeGraph"':''} class="integrated-spectrum" viewBox="0 0 310 180" role="img" aria-label="연속 스펙트럼과 같은 파장 축에 놓인 가시광선 띠. 자외선 380nm 미만, 가시광선 380~780nm, 적외선 780nm 초과."><defs><linearGradient id="${gradient}">${stops}</linearGradient></defs><rect x="${x(380)}" y="16" width="${x(780)-x(380)}" height="105" fill="#84e2c3" opacity=".08"/><path d="M25 16V121H285 M25 70H285" stroke="#29374b" fill="none"/><path d="${path}" fill="none" stroke="#84e2c3" stroke-width="2.5"/><rect x="25" y="130" width="260" height="16" rx="2" fill="#172237"/><rect x="${x(380)}" y="130" width="${x(780)-x(380)}" height="16" fill="url(#${gradient})"/>${marker}<g fill="#9aacc3" font-size="8" text-anchor="middle"><text x="52" y="141">자외선</text><text x="218" y="141">적외선</text><text x="${x(380)}" y="158">380</text><text x="${x(780)}" y="158">780</text><text x="122" y="172">가시광선</text><text x="25" y="158">30</text><text x="270" y="158">1,500 nm</text></g></svg>`;
}
