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
   const [w,h]=limits[key],scale=Math.min(w/im.naturalWidth,h/im.naturalHeight);im.style.width=`${im.naturalWidth*scale}px`;im.style.height=`${im.naturalHeight*scale}px`;
  }
  for(const hub of document.querySelectorAll('.m-hub')){
   const center=hub.querySelector('.m-hub-center'),satellites=[...hub.querySelectorAll('.m-satellite')];
   const c={cx:center.offsetLeft,top:center.offsetTop-center.offsetHeight/2,bottom:center.offsetTop+center.offsetHeight/2,width:center.offsetWidth};
   satellites.forEach((sat,i)=>{
    // Connector geometry is immutable. Cards hug their content and dock to endpoints.
    if(i===2&&satellites.length===3){
     const stem=hub.querySelector('.m-stem'),im=stem.firstElementChild,w=im.naturalWidth,h=im.naturalHeight;
     Object.assign(stem.style,{left:`${c.cx-w/2}px`,top:`${c.bottom}px`,width:`${w}px`,height:`${h}px`});
     Object.assign(sat.style,{left:`${c.cx-sat.offsetWidth/2}px`,top:`${c.bottom+h}px`,translate:'none'});return;
    }
    const curve=hub.querySelector(`.curve-${i}`),im=curve.querySelector('img'),w=im.naturalWidth,h=im.naturalHeight;
    const left=i===0||i===2,upper=i<2,anchor=c.cx+(left?-1:1)*Math.min(70,c.width*.25);
    const x=left?anchor-w:anchor,y=upper?c.top-h:c.bottom;
    Object.assign(curve.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
    const edge=left?x:x+w,dotY=upper?y+5:y+h-5;
    Object.assign(sat.style,{left:`${left?edge-sat.offsetWidth:edge}px`,top:`${dotY-sat.offsetHeight/2}px`,translate:'none'});
   });
  }
 }
 function fit(){document.documentElement.style.setProperty('--scale',String(Math.min(innerWidth/1920,innerHeight/1080)));}
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
 window.AIDENT_MOTION={ready,seek,seekSlide,play,pause,getState:state,externalControl,staticSlide,layout,duration:data.duration,fps:data.fps};
 window.addEventListener('resize',fit);
 scrubber.addEventListener('input',()=>{pause();seek(scrubber.value)});
 document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.action;if(a==='play')playing?pause():play();if(a==='prev'){pause();seekSlide(Math.max(0,active-1))}if(a==='next'){pause();seekSlide(Math.min(slides.length-1,active+1))}if(a==='overview')overview();}));
 addEventListener('keydown',e=>{if(e.target.matches('input,textarea,[contenteditable]'))return;if(e.code==='Space'){e.preventDefault();playing?pause():play()}if(e.key==='ArrowRight'){pause();seekSlide(Math.min(slides.length-1,active+1))}if(e.key==='ArrowLeft'){pause();seekSlide(Math.max(0,active-1))}if(e.key==='Escape')document.getElementById('motion-overview').hidden=true;});
})();
