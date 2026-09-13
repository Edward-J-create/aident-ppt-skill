/* Static editable scenes and an advisory clock. Animation belongs to the host. */
(() => {
 const data=window.AIDENT_DECK,slides=[...document.querySelectorAll('.motion-slide')];
 const params=new URLSearchParams(location.search),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const finite=(n,d=0)=>Number.isFinite(Number(n))?Number(n):d;
 let time=0,playing=false,raf=0,external=true,active=0,last=0;
 const scrubber=document.getElementById('scrubber'),clock=document.getElementById('timecode');
 const zh=data.meta.language==='zh';
 document.body.classList.toggle('capture',params.has('capture')||params.has('embed'));
 function layout(){
  const limits={ 'm-brand-logo':[760,144],'m-list-logo':[650,150],'m-hub-logo':[160,80],'m-satellite-logo':[92,46],'m-input-logo':[120,60],'m-list-item-image':[100,60],'m-card-icon':[120,60]};
  for(const im of document.querySelectorAll('.replaceable-logo')){
   const key=Object.keys(limits).find(k=>im.classList.contains(k));if(!key||!im.naturalWidth)continue;
   const style=getComputedStyle(im),[w,h]=key==='m-brand-logo'?[parseFloat(style.getPropertyValue('--brand-max-width')),parseFloat(style.getPropertyValue('--brand-max-height'))]:limits[key],scale=Math.min(w/im.naturalWidth,h/im.naturalHeight);im.style.width=`${im.naturalWidth*scale}px`;im.style.height=`${im.naturalHeight*scale}px`;
  }
  for(const scene of document.querySelectorAll('[data-synthesis]')){
   const panel=scene.querySelector('.m-synthesis-inputs'),groups=[...panel.children],outputs=scene.querySelector('.m-outputs'),arrow=scene.querySelector('.m-synthesis-arrow');
   const ps=getComputedStyle(panel),pad=parseFloat(ps.paddingLeft)+parseFloat(ps.paddingRight)+2,groupGap=parseFloat(ps.gap),tagGap=parseFloat(getComputedStyle(groups[0]).gap);
   const sizes=groups.map(g=>[...g.children].map(tag=>{
    tag.style.removeProperty('min-height');const text=tag.querySelector('.m-tag-text'),s=getComputedStyle(tag);
    return {tag,width:Math.ceil(text.scrollWidth+parseFloat(s.paddingLeft)+parseFloat(s.paddingRight)),height:Math.ceil(text.offsetHeight+parseFloat(s.paddingTop)+parseFloat(s.paddingBottom))};
   }));
   groups.forEach(g=>g.style.setProperty('--tag-count',g.children.length));panel.style.setProperty('--group-count',groups.length);
   let needed;
   if(scene.dataset.arrangement==='columns'){
    needed=Math.max(...sizes.flat().map(t=>t.width))*groups.length+groupGap*(groups.length-1);
    const rowHeights=Array.from({length:Math.max(...sizes.map(g=>g.length))},(_,i)=>Math.max(...sizes.map(g=>g[i]?.height||0)));
    sizes.forEach(g=>g.forEach((t,i)=>t.tag.style.minHeight=`${rowHeights[i]}px`));
   }else if(scene.dataset.arrangement==='rows'){
    needed=Math.max(...sizes.map(g=>Math.max(...g.map(t=>t.width))*g.length+tagGap*(g.length-1)));
    sizes.forEach(g=>{const height=Math.max(...g.map(t=>t.height));g.forEach(t=>t.tag.style.minHeight=`${height}px`);});
   }else {
    const limit=Math.min(760,Math.max(...sizes.map(g=>g.reduce((sum,t)=>sum+t.width,0)+tagGap*(g.length-1))));
    const rows=(g,width)=>{const used=[];let row=0;for(const t of g){const next=row?row+tagGap+t.width:t.width;if(row&&next>width){used.push(row);row=t.width;}else row=next;}used.push(row);return used;};
    const counts=sizes.map(g=>rows(g,limit).length),candidates=new Set([limit]);
    for(const g of sizes)for(let i=0;i<g.length;i++){let sum=0;for(let j=i;j<g.length;j++){sum+=g[j].width+(j>i?tagGap:0);if(sum<=limit)candidates.add(sum);}}
    let best=Infinity;needed=limit;
    for(const width of candidates){if(sizes.flat().some(t=>t.width>width))continue;const packed=sizes.map(g=>rows(g,width));if(packed.some((r,i)=>r.length>counts[i]))continue;
     const score=packed.flat().reduce((s,used)=>s+((width-used)/width)**2,0);if(score<best){best=score;needed=width;}
    }
   }
   const available=Math.min(parseFloat(ps.maxWidth),scene.clientWidth-outputs.offsetWidth-arrow.offsetWidth-2*parseFloat(getComputedStyle(scene).gap));
   // Measure layout, not animation. Oversized content remains a QA error: never shrink fonts, crop or reorder it.
   panel.style.setProperty('--input-width',`${Math.min(Math.ceil(needed+pad),Math.floor(available))}px`);
  }
  for(const hub of document.querySelectorAll('.m-hub')){
   const center=hub.querySelector('.m-hub-center'),satellites=[...hub.querySelectorAll('.m-satellite')];
   const c={cx:center.offsetLeft,top:center.offsetTop-center.offsetHeight/2,bottom:center.offsetTop+center.offsetHeight/2,width:center.offsetWidth};
   for(const curve of hub.querySelectorAll('[data-edge]')){
    const sat=satellites.find(n=>n.dataset.nodeId===curve.dataset.to);
    if(!sat)throw Error(`Missing workflow target: ${curve.dataset.to}`);
    // Connector geometry is immutable. Cards hug their content and dock to endpoints.
    if(curve.dataset.slot==='bottom'){
     const stem=curve,im=stem.firstElementChild,w=im.naturalWidth,h=im.naturalHeight;
     Object.assign(stem.style,{left:`${c.cx-w/2}px`,top:`${c.bottom}px`,width:`${w}px`,height:`${h}px`});
     Object.assign(sat.style,{left:`${c.cx-sat.offsetWidth/2}px`,top:`${c.bottom+h}px`,translate:'none'});continue;
    }
    const im=curve.querySelector('img'),w=im.naturalWidth,h=im.naturalHeight;
    const left=curve.dataset.slot.endsWith('left'),upper=curve.dataset.slot.startsWith('top'),anchor=c.cx+(left?-1:1)*Math.min(70,c.width*.25);
    const x=left?anchor-w:anchor,y=upper?c.top-h:c.bottom;
    Object.assign(curve.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`,scale:`${left?-1:1} ${upper?1:-1}`});
    const edge=left?x:x+w,dotY=upper?y+5:y+h-5;
    Object.assign(sat.style,{left:`${left?edge-sat.offsetWidth:edge}px`,top:`${dotY-sat.offsetHeight/2}px`,translate:'none'});
   }
  }
 }
 function fit(){document.documentElement.style.setProperty('--scale',String(Math.min(innerWidth/1920,innerHeight/1080)));}
 function setSendState(slideId,state){
  if(!['default','hover','pressed','sent','disabled'].includes(state))throw Error('Unknown send state');
  const slide=slides.find(s=>s.dataset.id===slideId),button=slide?.querySelector('[data-motion="send"]');
  if(!button)throw Error('No send button on this slide');
  button.dataset.state=state;button.disabled=state==='disabled';return state;
 }
 function select(i){active=clamp(Math.trunc(i),0,slides.length-1);slides.forEach((s,j)=>{s.classList.toggle('is-active',j===active);s.setAttribute('aria-hidden',String(j!==active));});}
 function render(){
  const i=data.slides.findIndex(s=>time<s.end);select(i<0?slides.length-1:i);
  const entry=data.slides[active],t=clamp(time-entry.start,0,entry.duration);
  // Never write content opacity, transforms, masks or animation ranges here.
  scrubber.value=String(time);clock.textContent=`${active+1}/${slides.length} · ${time.toFixed(1)} / ${data.duration.toFixed(1)}s`;
  window.dispatchEvent(new CustomEvent('aident:frame',{detail:{time,slideTime:t,index:active,id:entry.id,external}}));
 }
 function seek(seconds){time=clamp(finite(seconds),0,data.duration);render();return state();}
 function seekSlide(idOrIndex,seconds=1){const i=typeof idOrIndex==='string'?data.slides.findIndex(s=>s.id===idOrIndex):idOrIndex;if(!Number.isInteger(i)||i<0||i>=slides.length)throw Error('Unknown slide');return seek(data.slides[i].start+clamp(finite(seconds),0,data.slides[i].duration-1e-6));}
 function state(){return {time,index:active,id:data.slides[active].id,slideTime:time-data.slides[active].start,duration:data.duration,fps:data.fps,playing,external};}
 function pause(){playing=false;cancelAnimationFrame(raf);document.querySelector('[data-action="play"]').textContent=zh?'时间预览':'Preview timing';return state();}
 function tick(now){if(!playing)return;time=clamp(time+(now-last)/1000,0,data.duration);last=now;render();if(time>=data.duration)pause();else raf=requestAnimationFrame(tick);}
 function play(){if(playing)return;if(time>=data.duration)time=0;playing=true;last=performance.now();document.querySelector('[data-action="play"]').textContent=zh?'暂停':'Pause';raf=requestAnimationFrame(tick);}
 function externalControl(){pause();external=true;render();return state();}
 function staticSlide(i=active){pause();externalControl(true);seekSlide(i,1);return state();}
 function overview(){const grid=document.getElementById('motion-overview');pause();grid.hidden=!grid.hidden;if(grid.hidden)return;if(!grid.childElementCount)data.slides.forEach((s,i)=>{const b=document.createElement('button');b.className='m-overview-button';const frame=document.createElement('iframe');const url=new URL(location.href);url.search='';url.searchParams.set('slide',String(i));url.searchParams.set('external','1');url.searchParams.set('embed','1');frame.src=url.href;frame.loading='lazy';frame.tabIndex=-1;const label=document.createElement('span');label.textContent=`${i+1}. ${s.id}`;b.append(frame,label);b.onclick=()=>{grid.hidden=true;seekSlide(i,1)};grid.append(b);});}
 const ready=(async()=>{
  await document.fonts.ready;
  await Promise.all([...document.images].map(im=>im.decode().catch(()=>{throw Error(`Image failed: ${im.src}`)})));
  fit();layout();
  pause();document.querySelector('[data-action="overview"]').textContent=zh?'总览':'Grid';
  scrubber.max=String(data.duration);
  if(params.has('t'))seek(finite(params.get('t')));else seekSlide(clamp(Math.trunc(finite(params.get('slide'))),0,slides.length-1),0);
  document.documentElement.dataset.motionReady='true';
 })();
 window.AIDENT_MOTION={ready,seek,seekSlide,play,pause,getState:state,externalControl,staticSlide,layout,setSendState,duration:data.duration,fps:data.fps};
 document.querySelectorAll('.m-send').forEach(button=>button.addEventListener('click',()=>{
  if(button.disabled)return;
  window.dispatchEvent(new CustomEvent('aident:send',{detail:{slideId:button.closest('.motion-slide').dataset.id,state:button.dataset.state}}));
 }));
 window.addEventListener('resize',fit);
 scrubber.addEventListener('input',()=>{pause();seek(scrubber.value)});
 document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.action;if(a==='play')playing?pause():play();if(a==='prev'){pause();seekSlide(Math.max(0,active-1))}if(a==='next'){pause();seekSlide(Math.min(slides.length-1,active+1))}if(a==='overview')overview();}));
 addEventListener('keydown',e=>{if(e.target.matches('input,textarea,[contenteditable]'))return;if(e.code==='Space'){e.preventDefault();playing?pause():play()}if(e.key==='ArrowRight'){pause();seekSlide(Math.min(slides.length-1,active+1))}if(e.key==='ArrowLeft'){pause();seekSlide(Math.max(0,active-1))}if(e.key==='Escape')document.getElementById('motion-overview').hidden=true;});
})();
