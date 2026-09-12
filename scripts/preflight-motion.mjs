#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';

export async function preflightMotion(htmlPath,screenshotDir){
 const require=createRequire(import.meta.url),roots=[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean);
 const {chromium}=require(require.resolve('playwright',{paths:roots}));
 const executable=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 const exists=await fs.access(executable).then(()=>true).catch(()=>false);
 const browser=await chromium.launch({headless:true,...(exists?{executablePath:executable}:{})});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[],captures=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  if(screenshotDir)await fs.mkdir(screenshotDir,{recursive:true});
  const url=new URL(pathToFileURL(path.resolve(htmlPath)));url.searchParams.set('capture','1');
  await page.goto(url.href);await page.evaluate(()=>window.AIDENT_MOTION.ready);
  const timeline=await page.evaluate(()=>window.AIDENT_DECK.slides);
  const audit=async(i,t,external)=>page.evaluate(({i,t,external})=>{
   const api=window.AIDENT_MOTION;api.externalControl(external);api.seekSlide(i,t);
   const slide=document.querySelector('.slide.is-active'),errors=[];
   const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
   const sr=rect(slide),win=slide.querySelector('[data-scroll-window]');
   const visible=el=>{let n=el;while(n&&n!==slide){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;n=n.parentElement;}const r=rect(el);if(win&&el.closest('[data-scroll-track]')){const w=rect(win);if(r.bottom<=w.y||r.y>=w.bottom)return false;}return r.width>0&&r.height>0;};
   for(const im of slide.querySelectorAll('img'))if(!im.complete||!im.naturalWidth)errors.push('Broken image: '+im.getAttribute('src'));
   for(const el of slide.querySelectorAll('[data-editable="text"],.m-card,.m-input,.m-satellite,.m-hub-center,.m-list-window,.m-brand-slot,.m-tag-panel')){
    if(!visible(el))continue;const r=rect(el),cs=getComputedStyle(el);
    if(!el.closest('[data-scroll-track]')&&(r.x<sr.x-1||r.y<sr.y-1||r.right>sr.right+1||r.bottom>sr.bottom+1))errors.push('Outside canvas: '+el.dataset.layer);
    if(el.matches('[data-one-line]')&&el.scrollWidth>el.clientWidth+2)errors.push('One-line overflow: '+el.textContent);
    if(el.matches('[data-editable="text"]')){
     const f=parseFloat(cs.fontSize),lh=parseFloat(cs.lineHeight);if(!Number.isFinite(lh)||lh<f||lh>f*1.6)errors.push('Invalid line height: '+el.dataset.layer);
     if(!document.fonts.check(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily.split(',')[0]}`))errors.push('Font not loaded: '+cs.fontFamily);
    }
   }
   for(const im of slide.querySelectorAll('.replaceable-logo')){
    const r=rect(im);if(im.naturalWidth&&Math.abs((r.width/r.height)/(im.naturalWidth/im.naturalHeight)-1)>.015)errors.push('Logo distorted: '+im.dataset.layer);
   }
   // Text boxes must not collide. Decorative containment and clipping are intentional.
   const text=[...slide.querySelectorAll('[data-editable="text"]')].filter(visible);
   for(let a=0;a<text.length;a++)for(let b=a+1;b<text.length;b++){
    const ar=rect(text[a]),br=rect(text[b]);if(Math.min(ar.right,br.right)-Math.max(ar.x,br.x)>2&&Math.min(ar.bottom,br.bottom)-Math.max(ar.y,br.y)>2)errors.push('Text overlap: '+text[a].dataset.layer+' / '+text[b].dataset.layer);
   }
   if(win){const track=slide.querySelector('[data-scroll-track]'),rows=[...track.children];if(getComputedStyle(win).overflow!=='hidden')errors.push('List window must clip');
    for(const row of rows){for(const el of row.querySelectorAll('[data-editable="text"]')){const r=rect(el),rr=rect(row);if(r.right>rr.right+1||r.x<rr.x-1||r.bottom>rr.bottom+1)errors.push('List row content overflow: '+el.dataset.layer);}}
   }
   return {errors,id:slide.dataset.id};
  },{i,t,external});
  for(let i=0;i<timeline.length;i++){
   const entry=timeline[i];
   const staticAudit=await audit(i,1,true);errors.push(...staticAudit.errors.map(e=>entry.id+': '+e));
   if(screenshotDir){const dest=path.join(screenshotDir,`${String(i+1).padStart(2,'0')}-${entry.id}.png`);await page.screenshot({path:dest});captures.push(dest);}
   const times=entry.type==='motion-list'?[.2,1.2,entry.scroll.start,(entry.scroll.start+entry.scroll.end)/2,entry.scroll.end]:[.2,1.5,entry.duration-.5];
   for(const t of times){const result=await audit(i,t,false);errors.push(...result.errors.map(e=>`${entry.id}@${t.toFixed(2)}: ${e}`));}
   if(entry.type==='motion-list'){
    const result=await page.evaluate(({i,entry})=>{const api=window.AIDENT_MOTION,slide=document.querySelectorAll('.slide')[i],track=slide.querySelector('[data-scroll-track]'),win=slide.querySelector('[data-scroll-window]');api.seekSlide(i,entry.scroll.start);const first=new DOMMatrix(getComputedStyle(track).transform).m42;api.seekSlide(i,entry.scroll.end);const last=new DOMMatrix(getComputedStyle(track).transform).m42;const row=track.lastElementChild.getBoundingClientRect(),wr=win.getBoundingClientRect();return {first,last,expected:Math.max(0,track.scrollHeight-win.clientHeight),bottom:row.bottom,windowBottom:wr.bottom};},{i,entry});
    if(entry.scroll.enabled&&(Math.abs(result.last+result.expected)>1||result.last>result.first||result.bottom>result.windowBottom+1))errors.push(entry.id+': last item is not reachable through upward scrolling');
    if(screenshotDir){await page.screenshot({path:path.join(screenshotDir,`${String(i+1).padStart(2,'0')}-list-end.png`)});}
   }
  }
  // Deterministic seeks in arbitrary order produce identical animation state.
  const deterministic=await page.evaluate(()=>{const api=window.AIDENT_MOTION;api.externalControl(false);const snapshot=()=>[...document.querySelector('.slide.is-active').querySelectorAll('[data-motion],[data-list-item],[data-scroll-track]')].map(n=>n.getAttribute('style'));api.seek(2.2);const a=snapshot();api.seek(60);api.seek(2.2);return JSON.stringify(a)===JSON.stringify(snapshot());});
  if(!deterministic)errors.push('Seeking is not deterministic');
  const editable=await page.evaluate(async()=>{
   const api=window.AIDENT_MOTION;api.externalControl(true);const issues=[];
   for(const slide of [...document.querySelectorAll('.motion-slide')].filter(s=>s.dataset.type==='motion-hub')){api.seekSlide(slide.dataset.id,0);const hub=slide.querySelector('.m-hub');
    const labels=[...hub.querySelectorAll('.m-node-title')],original=labels.map(n=>n.textContent);
    for(const word of ['A','Research context','研究与信息整理']){
     labels.forEach(n=>n.textContent=word);api.layout();
     const center=hub.querySelector('.m-hub-center').getBoundingClientRect();
     for(const [i,sat] of [...hub.querySelectorAll('.m-satellite')].entries()){
      const target=sat.getBoundingClientRect(),curve=hub.querySelector(`.curve-${i}`);
      if(!curve){const stem=hub.querySelector('.m-stem'),r=stem.getBoundingClientRect(),im=stem.querySelector('img');
       if(Math.abs(r.bottom-target.top)>1.5||Math.abs((r.left+r.right-target.left-target.right)/2)>1.5)issues.push('Stem not docked after text replacement');
       if(Math.abs(stem.offsetWidth-im.naturalWidth)>1||Math.abs(stem.offsetHeight-im.naturalHeight)>1)issues.push('Stem original dimensions changed');continue;}
      const r=curve.getBoundingClientRect(),left=(target.left+target.right)<(center.left+center.right);
      if(Math.abs((left?r.left:r.right)-(left?target.right:target.left))>1.5)issues.push('Connector not bound after text replacement');
      const im=curve.querySelector('img');if(Math.abs(curve.offsetWidth-im.naturalWidth)>1||Math.abs(curve.offsetHeight-im.naturalHeight)>1)issues.push('Connector original dimensions changed');
      const dotY=i<2?r.top+5:r.bottom-5;
      if(Math.abs(dotY-(target.top+target.bottom)/2)>1.5)issues.push('Card not centered at connector endpoint');
      if(Math.min(target.right,center.right)-Math.max(target.left,center.left)>1&&Math.min(target.bottom,center.bottom)-Math.max(target.top,center.top)>1)issues.push('Satellite overlaps hub');
     }
    }
    labels.forEach((n,i)=>n.textContent=original[i]);api.layout();
    const animated=slide.querySelector('[data-motion="hub"]');animated.style.opacity='.42';animated.style.transform='translateY(7px)';
    await new Promise(r=>setTimeout(r,60));if(animated.style.opacity!=='.42'&&animated.style.opacity!=='0.42')issues.push('Native player overwrites external opacity');
    api.externalControl(true);
   }
   const selectors=[...document.querySelectorAll('[data-layer]')].map(n=>n.dataset.layer);if(new Set(selectors).size!==selectors.length)issues.push('Duplicate editable layer IDs');
   return issues;
  });errors.push(...editable);
  for(const vp of [{width:1280,height:720},{width:1366,height:768},{width:1440,height:900},{width:1024,height:768}]){
   await page.setViewportSize(vp);await page.evaluate(()=>new Promise(requestAnimationFrame));
   const r=await page.evaluate(()=>{const r=document.getElementById('deck').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,cx:(r.left+r.right)/2,cy:(r.top+r.bottom)/2};});
   if(r.x<-1||r.y<-1||r.right>vp.width+1||r.bottom>vp.height+1||Math.abs(r.cx-vp.width/2)>1||Math.abs(r.cy-vp.height/2)>1)errors.push(`Viewport clipping at ${vp.width}×${vp.height}`);
  }
  const report={mode:'motion',slideCount:timeline.length,errors:[...new Set(errors)],screenshots:captures,deterministic};
  if(screenshotDir)await fs.writeFile(path.join(screenshotDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  for(const error of report.errors)console.error('ERROR '+error);
  console.log(`Motion preflight: ${timeline.length} slides, ${report.errors.length} errors; static, timed list scroll, deterministic seeks, and responsive viewports checked.`);
  return report;
 }finally{await browser.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),html=args[args.indexOf('--html')+1],dest=args.includes('--screenshots')?args[args.indexOf('--screenshots')+1]:undefined;
 if(!args.includes('--html'))throw Error('Usage: node scripts/preflight-motion.mjs --html output/motion/index.html [--screenshots output/motion/qa]');
 preflightMotion(html,dest).then(r=>{if(r.errors.length)process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
}
