'use strict';
class HuntSession {
 constructor(stars,now,random=Math.random){this.stars=stars;this.start=now;this.random=random;this.score=0;this.correct=0;this.wrong=0;this.combo=0;this.best=0;this.completed=0;this.events=[];this.cooldowns=new Map();this.mission=null;this.slot=-1;this.bag=[];this.lastMission=null;this.pending=[];this.lastSuccess=null;this.choose(now);}
 remaining(now){return Math.max(0,60000-(now-this.start));}
 available(s,now){return now<(this.start+60000)&&(this.cooldowns.get(s.id)||0)<=now&&!this.mission?.used.includes(s.id);}
 shuffle(types){const a=[...types];for(let i=a.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 choose(now){
  if(!this.bag.length){this.bag=this.shuffle([0,1,2,3,4,5,6]);if(this.bag[0]===this.lastSuccess||this.bag[0]===this.target)[this.bag[0],this.bag[1]]=[this.bag[1],this.bag[0]];}
  if(this.bag.every(type=>type===this.lastSuccess))this.bag.push(...this.shuffle([0,1,2,3,4,5,6]));
  const index=this.bag.findIndex(type=>type!==this.lastSuccess&&this.stars.some(s=>s.type===type&&this.available(s,now)));
  this.target=this.bag.splice(index<0?Math.max(0,this.bag.findIndex(type=>type!==this.lastSuccess)):index,1)[0];
 }
 missionType(now,exclude=[]){
  const counts=Array(7).fill(0);this.events.forEach(e=>counts[e.type]++);
  const types=this.shuffle([0,1,2,3,4,5,6].filter(type=>!exclude.includes(type)));
  const eligible=types.filter(type=>this.stars.filter(s=>s.type===type&&(this.cooldowns.get(s.id)||0)<=now).length>=2);
  return (eligible.length?eligible:types).sort((a,b)=>counts[a]-counts[b]||Number(a===this.lastMission)-Number(b===this.lastMission))[0];
 }
 beginMission(now){
  if(!this.pending.length||this.remaining(now)<10000)return false;
  const kind=this.pending.shift(),first=this.missionType(now,[this.lastSuccess]),second=this.missionType(now,[first,this.lastSuccess]);
  this.mission={kind,types:[first,second],type:first,progress:0,used:[],end:now+10000};this.target=first;return true;
 }
 tick(now){
  const elapsed=now-this.start;
  for(let slot=this.slot+1;slot<2;slot++){if(elapsed<(slot===0?20000:40000))break;this.pending.push(slot===0?5:6);this.slot=slot;}
  // A timeout removes the bonus, but preserves the star currently being sought.
  if(this.mission&&now>=this.mission.end){this.target=this.mission.type;this.mission=null;return true;}
  return false;
 }
 capture(s,now){this.tick(now);if(!this.available(s,now))return {blocked:true};const m=this.mission;
  const bounds=[[30000,Infinity],[10000,30000],[7500,10000],[6000,7500],[5200,6000],[3700,5200],[2400,3700]];
  const match=m?(m.kind===5?s.type===m.type:s.temp>=bounds[m.type][0]&&s.temp<bounds[m.type][1]):s.type===this.target;
  if(!match){this.wrong++;this.combo=0;const points=-Math.min(30,this.score);this.score+=points;return {correct:false,points,bonus:0};}
  this.lastSuccess=s.type;this.correct++;this.combo++;this.best=Math.max(this.best,this.combo);this.cooldowns.set(s.id,now+5000);
  const points=100*(this.combo>=5?2:this.combo>=3?1.5:1)*(this.remaining(now)<=10000?2:1);let bonus=0;
  if(m){m.used.push(s.id);m.progress++;if(m.progress===2){bonus=200;this.completed++;this.mission=null;this.choose(now);}else{m.type=m.types[m.progress];this.target=m.type;}}else if(!this.beginMission(now))this.choose(now);
  this.events.push({id:s.id,type:s.type,elapsed:Math.round((now-this.start)/1000),points,bonus,combo:this.combo,mission:bonus?m.kind:null,missionType:bonus?m.type:null});
  this.score+=points+bonus;return {correct:true,points,bonus};
 }
}
