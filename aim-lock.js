'use strict';
var AimLock=class {
 constructor(duration=1000){this.duration=duration;this.target=null;this.started=0;this.latched=null;}
 suspend(){this.target=null;this.started=0;}
 update(id,now){
  if(!id){this.suspend();this.latched=null;return {ready:false,progress:0};}
  if(this.latched===id)return {ready:false,progress:1};
  if(this.latched!==id)this.latched=null;
  if(this.target!==id){this.target=id;this.started=now;}
  const progress=Math.min(1,Math.max(0,(now-this.started)/this.duration));
  if(progress===1){this.latched=id;return {ready:true,progress};}
  return {ready:false,progress};
 }
};
