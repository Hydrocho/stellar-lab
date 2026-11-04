'use strict';
var CollectionRules={
 level(data,stars,type){return stars.filter(s=>s.type===type&&data.collected.includes(s.id)).length;},
 signal(star,wavelength){
  if(!Number.isFinite(wavelength)||wavelength<30||wavelength>1500)return 0;
  return Math.min(1,spectralRadiance(wavelength,star.temp)/spectralRadiance(2898000/star.temp,star.temp));
 },
 collect(data,star,wavelength){
  if(data.collected.includes(star.id))return 'duplicate';
  if(this.signal(star,wavelength)<.995)return 'off-peak';
  data.collected.push(star.id);return 'collected';
 },
 reset(data){data.passed=data.passed===true||data.collected.length===21;data.collected=[];}
};
