'use strict';
class CelestialSky {
  constructor(element, catalog, onSelect) {
    this.el=element;this.onSelect=onSelect;this.resetOrientation();this.items=[];this.exploding=new Map();this.drag=null;this.aim=new AimLock(1000);
    let seed=6719;
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    this.positions=new Map();
    // Fixed irregular positions on a sphere, with angular spacing for touch targets.
    for(const star of catalog){let p;
      do {p={lon:random()*Math.PI*2,lat:Math.asin((random()-.5)*1.55)};}
      while([...this.positions.values()].some(q=>Math.sin(p.lat)*Math.sin(q.lat)+Math.cos(p.lat)*Math.cos(q.lat)*Math.cos(p.lon-q.lon)>.96));
      this.positions.set(star.id,p);
    }
    this.dust=Array.from({length:1300},()=>({lon:random()*Math.PI*2,lat:Math.asin(random()*2-1),size:.4+random()*1.1,alpha:.18+random()*.6}));
    this.canvas=document.createElement('canvas');this.canvas.className='celestial-background';this.canvas.setAttribute('aria-hidden','true');element.prepend(this.canvas);
    this.readout=document.createElement('div');this.readout.className='sky-bearing';element.append(this.readout);
    this.reticle=element.querySelector('.sky-reticle');
    this.reticle.innerHTML='<span class="aim-ring"></span><span class="aim-cross"></span><span class="aim-label">중앙에 별을 맞추세요</span>';
    this.caption=element.querySelector('.sky-caption');
    this.tick=now=>{this.updateAim(now);this.frame=requestAnimationFrame(this.tick);};
    this.frame=requestAnimationFrame(this.tick);
    document.addEventListener('visibilitychange',()=>this.aim.suspend());
    window.addEventListener('blur',()=>this.aim.suspend());
    element.tabIndex=0;element.setAttribute('aria-label','천구 탐색. 드래그 또는 방향키로 별을 중앙 십자선에 맞추고 1초간 유지하세요.');
    element.addEventListener('pointerdown',e=>{
      if(!e.isPrimary||e.button!==0||this.drag)return;
      this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};
      element.setPointerCapture(e.pointerId);
    });
    element.addEventListener('pointermove',e=>{
      const d=this.drag;if(!d||d.id!==e.pointerId)return;
      const dx=e.clientX-d.x,dy=e.clientY-d.y;
      if(Math.hypot(dx,dy)>7)d.moved=true;
      if(!d.moved)return;
      element.classList.add('dragging');
      const scale=1.8/Math.max(250,element.clientWidth);
      this.move(-(e.clientX-d.lastX)*scale,(e.clientY-d.lastY)*scale);
      d.lastX=e.clientX;d.lastY=e.clientY;
    });
    const end=(e,cancel)=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;this.drag=null;element.classList.remove('dragging');if(element.hasPointerCapture(e.pointerId))element.releasePointerCapture(e.pointerId);};
    element.addEventListener('pointerup',e=>end(e,false));
    element.addEventListener('pointercancel',e=>end(e,true));
    element.addEventListener('lostpointercapture',e=>end(e,true));
    element.addEventListener('keydown',e=>{const moves={ArrowLeft:[-.045,0],ArrowRight:[.045,0],ArrowUp:[0,.045],ArrowDown:[0,-.045]};if(moves[e.key]){e.preventDefault();this.move(...moves[e.key]);}});
    this.resize=new ResizeObserver(()=>this.draw());this.resize.observe(element);
  }
  updateAim(now){
    for(const [id,until] of this.exploding){if(now>=until){this.relocateOutsideView(id);this.exploding.delete(id);}}
    const w=this.el.clientWidth,h=this.el.clientHeight;
    if(document.hidden||!w||!h||this.el.getClientRects().length===0||document.querySelector('dialog[open]')||this.drag){
      this.aim.suspend();this.reticle.classList.remove('aiming');this.reticle.style.setProperty('--aim-progress','0deg');return;
    }
    let candidate=null,nearest=24;
    for(const item of this.items){
      const allowed=!this.exploding.has(item.star.id)&&(!this.canAcquire||this.canAcquire(item.star,now));
      item.button.classList.toggle('cooling',!allowed);
      if(!allowed)continue;
      const p=this.project(this.positions.get(item.star.id),w,h);
      if(!p)continue;const distance=Math.hypot(p.x-w/2,p.y-h/2);
      if(distance<nearest){nearest=distance;candidate=item.star;}
    }
    const result=this.aim.update(candidate?.id||null,now);
    this.reticle.style.setProperty('--aim-progress',`${result.progress*360}deg`);
    this.reticle.classList.toggle('aiming',!!candidate&&result.progress<1);
    this.reticle.classList.toggle('locked',!!candidate&&result.progress===1);
    this.reticle.querySelector('.aim-label').textContent=candidate?(result.progress===1?'관측 완료 · 이동해 다음 별 찾기':`관측 중 ${Math.round(result.progress*100)}%`):'중앙에 별을 맞추세요';
    if(result.ready){this.pulseStar(candidate.id);this.onSelect(candidate);}
  }
  resetOrientation(){
    this.right=[1,0,0];this.up=[0,Math.cos(.18),-Math.sin(.18)];this.forward=[0,Math.sin(.18),Math.cos(.18)];
  }
  move(horizontal,vertical){
    // Rotate around the CURRENT camera up/right axes, including after pole crossings.
    const ch=Math.cos(horizontal),sh=Math.sin(horizontal),cv=Math.cos(vertical),sv=Math.sin(vertical);
    const right=this.right.map((v,i)=>ch*v-sh*this.forward[i]);
    const forward=this.forward.map((v,i)=>sh*this.right[i]+ch*v);
    const next=forward.map((v,i)=>sv*this.up[i]+cv*v);
    const normalize=v=>{const length=Math.hypot(...v);return v.map(x=>x/length);};
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    this.forward=normalize(next);
    this.right=normalize(right);
    this.up=normalize(cross(this.forward,this.right));
    this.right=normalize(cross(this.up,this.forward));
    this.draw();
  }
  pulseStar(id){
    const item=this.items.find(i=>i.star.id===id);if(!item)return;
    const b=item.button;b.classList.remove('acquired');
    if(b.offsetWidth)void b.offsetWidth;
    b.classList.add('acquired');
  }
  explodeAndRelocate(id,now){
    const item=this.items.find(i=>i.star.id===id);if(!item||this.exploding.has(id))return;
    this.exploding.set(id,now+750);
    item.button.classList.remove('acquired');item.button.classList.add('supernova');
    this.aim.suspend();
  }
  relocateOutsideView(id){
    const toVector=p=>[Math.cos(p.lat)*Math.sin(p.lon),Math.sin(p.lat),Math.cos(p.lat)*Math.cos(p.lon)];
    const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
    let best=null,bestSpacing=-Infinity;
    // Choose against the camera at respawn time, including any intervening drag.
    for(let attempt=0;attempt<300;attempt++){
      const p={lon:Math.random()*Math.PI*2,lat:Math.asin(Math.random()*2-1)},v=toVector(p);
      if(dot(v,this.forward)>-.2)continue;
      const spacing=Math.min(...[...this.positions].filter(([key])=>key!==id).map(([,q])=>1-dot(v,toVector(q))));
      if(spacing>bestSpacing){best=p;bestSpacing=spacing;}if(spacing>.04)break;
    }
    if(!best){const v=this.forward.map(n=>-n);best={lon:Math.atan2(v[0],v[2]),lat:Math.asin(v[1])};}
    this.positions.set(id,best);
    const item=this.items.find(i=>i.star.id===id);if(item){item.button.classList.remove('supernova','acquired');item.button.hidden=true;}
    this.draw();
  }
  reset(){this.resetOrientation();this.aim.suspend();this.draw();}
  project(p,w,h){
    const c=Math.cos(p.lat),v=[c*Math.sin(p.lon),Math.sin(p.lat),c*Math.cos(p.lon)];
    const dot=a=>a[0]*v[0]+a[1]*v[1]+a[2]*v[2],z=dot(this.forward);
    if(z<=.08)return null;
    const f=Math.min(w,h*1.65)/2/Math.tan(Math.PI*55/180);
    return {x:w/2+f*dot(this.right)/z,y:h/2-f*dot(this.up)/z};
  }
  setStars(stars,types,collected,selected){
    // Keep existing nodes so a correct answer's acquisition effect survives newRound().
    const existing=new Map(this.items.map(item=>[item.star.id,item]));
    this.items=stars.map(star=>{
      const previous=existing.get(star.id),b=previous?previous.button:document.createElement('span'),t=types[star.type];
      existing.delete(star.id);
      if(!previous){
        b.className='star';b.dataset.starId=star.id;
        b.innerHTML='<i></i><span class="star-ring" aria-hidden="true"></span><span class="star-flare" aria-hidden="true"></span>';
        b.setAttribute('aria-hidden','true');this.el.append(b);
      }
      b.classList.toggle('collected',collected.includes(star.id));
      b.classList.toggle('selected',selected===star.id);
      b.style.setProperty('--color',t[4]);b.style.setProperty('--size',`${8+(star.type%3)*1.3}px`);
      return {star,button:b};
    });
    existing.forEach(item=>item.button.remove());
    this.draw();
  }

  draw(){
    const w=this.el.clientWidth,h=this.el.clientHeight;if(!w||!h)return;
    const ratio=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(w*ratio);this.canvas.height=Math.round(h*ratio);
    const ctx=this.canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.clearRect(0,0,w,h);
    for(const p of this.dust){const v=this.project(p,w,h);if(!v||v.x<0||v.x>w||v.y<0||v.y>h)continue;ctx.fillStyle=`rgba(170,194,228,${p.alpha})`;ctx.beginPath();ctx.arc(v.x,v.y,p.size,0,Math.PI*2);ctx.fill();}
    let count=0;for(const item of this.items){const p=this.project(this.positions.get(item.star.id),w,h);const shown=p&&p.x>23&&p.x<w-23&&p.y>48&&p.y<h-40;item.button.hidden=!shown;if(shown){count++;item.button.style.left=p.x+'px';item.button.style.top=p.y+'px';}}
    this.readout.textContent=`우주 시점 · 360° 자유 회전 · ${count}개`;
  }
}
