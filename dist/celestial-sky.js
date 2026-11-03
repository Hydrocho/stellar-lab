'use strict';
class CelestialSky {
  constructor(element, catalog, onSelect) {
    this.el=element;this.onSelect=onSelect;this.yaw=0;this.pitch=.18;this.items=[];this.drag=null;
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
    element.tabIndex=0;element.setAttribute('aria-label','천구 탐색. 드래그 또는 방향키로 시선을 움직이고 별을 선택하세요.');
    element.addEventListener('pointerdown',e=>{
      if(!e.isPrimary||e.button!==0||this.drag)return;
      this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch,moved:false,star:e.target.closest('.star')?.dataset.starId};
      element.setPointerCapture(e.pointerId);
    });
    element.addEventListener('pointermove',e=>{
      const d=this.drag;if(!d||d.id!==e.pointerId)return;
      const dx=e.clientX-d.x,dy=e.clientY-d.y;
      if(Math.hypot(dx,dy)>7)d.moved=true;
      if(!d.moved)return;
      element.classList.add('dragging');
      const scale=1.8/Math.max(250,element.clientWidth);
      this.yaw=d.yaw-dx*scale;this.pitch=Math.max(-1.4,Math.min(1.4,d.pitch+dy*scale));this.draw();
    });
    const end=(e,cancel)=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;this.drag=null;element.classList.remove('dragging');if(element.hasPointerCapture(e.pointerId))element.releasePointerCapture(e.pointerId);if(!cancel&&!d.moved&&d.star){const item=this.items.find(s=>s.star.id===d.star);if(item)this.onSelect(item.star);}};
    element.addEventListener('pointerup',e=>end(e,false));
    element.addEventListener('pointercancel',e=>end(e,true));
    element.addEventListener('lostpointercapture',e=>end(e,true));
    element.addEventListener('keydown',e=>{const moves={ArrowLeft:[-.22,0],ArrowRight:[.22,0],ArrowUp:[0,.18],ArrowDown:[0,-.18]};if(moves[e.key]){e.preventDefault();this.move(...moves[e.key]);}});
    this.resize=new ResizeObserver(()=>this.draw());this.resize.observe(element);
  }
  move(horizontal,vertical){this.yaw+=horizontal;this.pitch=Math.max(-1.4,Math.min(1.4,this.pitch+vertical));this.draw();}
  reset(){this.yaw=0;this.pitch=.18;this.draw();}
  project(p,w,h){const delta=p.lon-this.yaw,c=Math.cos(p.lat),sp=Math.sin(this.pitch),cp=Math.cos(this.pitch);const z=Math.sin(p.lat)*sp+c*Math.cos(delta)*cp;if(z<=.08)return null;const f=Math.min(w,h*1.65)/2/Math.tan(Math.PI*55/180);return {x:w/2+f*c*Math.sin(delta)/z,y:h/2-f*(Math.sin(p.lat)*cp-c*Math.cos(delta)*sp)/z};}
  setStars(stars,types,collected,selected){
    this.items.forEach(i=>i.button.remove());
    this.items=stars.map(star=>{const b=document.createElement('button'),t=types[star.type];b.className='star';b.dataset.starId=star.id;b.classList.toggle('collected',collected.includes(star.id));b.classList.toggle('selected',selected===star.id);b.style.setProperty('--color',t[4]);b.style.setProperty('--size',`${8+(star.type%3)*1.3}px`);b.innerHTML='<i></i>';b.setAttribute('aria-label',`${star.name}, ${t[3]} 별`);b.onclick=e=>{if(e.detail===0)this.onSelect(star)};this.el.append(b);return {star,button:b};});this.draw();
  }
  draw(){
    const w=this.el.clientWidth,h=this.el.clientHeight;if(!w||!h)return;
    const ratio=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(w*ratio);this.canvas.height=Math.round(h*ratio);
    const ctx=this.canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.clearRect(0,0,w,h);
    for(const p of this.dust){const v=this.project(p,w,h);if(!v||v.x<0||v.x>w||v.y<0||v.y>h)continue;ctx.fillStyle=`rgba(170,194,228,${p.alpha})`;ctx.beginPath();ctx.arc(v.x,v.y,p.size,0,Math.PI*2);ctx.fill();}
    let count=0;for(const item of this.items){const p=this.project(this.positions.get(item.star.id),w,h);const shown=p&&p.x>23&&p.x<w-23&&p.y>48&&p.y<h-40;item.button.hidden=!shown;if(shown){count++;item.button.style.left=p.x+'px';item.button.style.top=p.y+'px';}}
    const degrees=((this.yaw*180/Math.PI)%360+360)%360;const direction=['북','동','남','서'][Math.round(degrees/90)%4];
    this.readout.textContent=`${direction} ${Math.round(degrees)%360}° · 고도 ${Math.round(this.pitch*180/Math.PI)}° · 시야 안 ${count}개`;
  }
}
