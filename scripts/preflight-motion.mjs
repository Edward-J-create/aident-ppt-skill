#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {auditSynthesis} from './lib/synthesis-audit.mjs';

export async function preflightMotion(htmlPath,screenshotDir){
 const require=createRequire(import.meta.url),roots=[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean);
 const {chromium}=require(require.resolve('playwright',{paths:roots}));
 const executable=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 const exists=await fs.access(executable).then(()=>true).catch(()=>false);
 const browser=await chromium.launch({headless:true,...(exists?{executablePath:executable}:{})});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[],warnings=[],captures=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  if(screenshotDir)await fs.mkdir(screenshotDir,{recursive:true});
  const url=new URL(pathToFileURL(path.resolve(htmlPath)));url.searchParams.set('capture','1');
  await page.goto(url.href);await page.evaluate(()=>window.AIDENT_MOTION.ready);
  const timeline=await page.evaluate(()=>window.AIDENT_DECK.slides);
  const audit=async(i,t,external)=>page.evaluate(({i,t,external})=>{
   const api=window.AIDENT_MOTION;api.externalControl(external);api.seekSlide(i,t);
   const slide=document.querySelector('.slide.is-active'),errors=[];
   const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
   const sr=rect(slide),scene=slide.querySelector('[data-list-scene]');
   if(!['light','dark'].includes(slide.dataset.theme))errors.push('Unknown Motion theme');
   if(slide.dataset.theme==='dark'){
    const rgba=s=>{const v=s.trim();if(v.startsWith('#'))return [...v.slice(1).match(/../g).map(x=>parseInt(x,16)),1];const n=v.match(/[\d.]+/g).map(Number);return [n[0],n[1],n[2],n[3]??1]};
    const composite=(front,back)=>{const f=rgba(front),b=rgba(back),a=f[3];return `rgb(${f.slice(0,3).map((v,i)=>Math.round(v*a+b[i]*(1-a))).join(',')})`};
    const lum=s=>{const rgb=rgba(s).slice(0,3);return rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);};
    const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const canvas=getComputedStyle(slide).getPropertyValue('--m-canvas');
    // Composite the actual ancestor fills, including comparison targets and nested rows.
    // Image/gradient backdrops still require the documented screenshot review.
    const backgroundAt=el=>{const chain=[];for(let n=el;n&&n!==slide;n=n.parentElement)chain.unshift(n);return chain.reduce((bg,n)=>composite(getComputedStyle(n).backgroundColor,bg),canvas)};
    for(const tag of slide.querySelectorAll('.m-tag')){const cs=getComputedStyle(tag);if(cs.backgroundImage==='none'&&contrast(cs.color,backgroundAt(tag))<4.5)errors.push('Dark tag contrast below 4.5: '+tag.textContent);}
    for(const el of slide.querySelectorAll('.m-body,.m-result-value,.m-flow-title,.m-input-text'))if(contrast(getComputedStyle(el).color,backgroundAt(el))<4.5)errors.push('Dark text contrast below 4.5 on its panel: '+el.textContent);
   }
   for(const group of slide.querySelectorAll('[data-workflow-rows]')){
    if(group.offsetHeight>610)errors.push('Workflow rows exceed 610px content zone');
    const rows=[...group.querySelectorAll('[data-workflow]')],first=[...rows[0].querySelectorAll('[data-node-id]')].map(rect);
    for(const row of rows)for(const [i,n] of [...row.querySelectorAll('[data-node-id]')].entries()){const r=rect(n);if(!first[i]||Math.abs(r.x-first[i].x)>1||Math.abs(r.width-first[i].width)>1||Math.abs(r.height-first[i].height)>1)errors.push('Workflow row columns must align and share sizes');}
   }
   const visible=el=>{let n=el;while(n&&n!==slide){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false;n=n.parentElement;}const r=rect(el);return r.width>0&&r.height>0;};
   for(const el of slide.querySelectorAll('[data-motion],[data-list-item]'))if(!visible(el)||+getComputedStyle(el).opacity!==1)errors.push('Static content hidden/faded: '+el.dataset.layer);
   for(const im of slide.querySelectorAll('img'))if(!im.complete||!im.naturalWidth)errors.push('Broken image: '+im.getAttribute('src'));
   for(const el of slide.querySelectorAll('[data-editable="text"],.m-card,.m-input,.m-satellite,.m-hub-center,.m-brand-slot,.m-tag-panel,.m-flow-node,.m-flow-edge')){
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
    if(im.classList.contains('m-brand-logo')){
     const cs=getComputedStyle(im),w=parseFloat(cs.getPropertyValue('--brand-max-width')),h=parseFloat(cs.getPropertyValue('--brand-max-height'));
     if(!Number.isFinite(w)||!Number.isFinite(h)||im.offsetWidth>w+1||im.offsetHeight>h+1)errors.push('Brand image exceeds variant bounds: '+im.dataset.layer);
    }
   }
   for(const flow of slide.querySelectorAll('[data-workflow]')){
    const nodes=[...flow.querySelectorAll('[data-node-id]')],edges=[...flow.querySelectorAll('[data-edge]')];
    const scale=sr.width/1920,tol=2*scale;
    if(edges.length!==nodes.length-1)errors.push('Workflow requires nodeCount-1 edges');
    for(const [i,n] of nodes.entries()){
     const r=rect(n),first=rect(nodes[0]);if(Math.abs(r.width-first.width)>tol||Math.abs(r.height-first.height)>tol)errors.push('Workflow peer card sizes differ');
     for(const t of n.querySelectorAll('[data-editable="text"]')){const tr=rect(t);if(tr.x<r.x+24*scale-1||tr.right>r.right-24*scale+1||tr.bottom>r.bottom-24*scale+1)errors.push('Workflow text exceeds padded card');}
     if(i<nodes.length-1){const e=edges.find(e=>e.dataset.from===n.dataset.nodeId&&e.dataset.to===nodes[i+1].dataset.nodeId);if(!e){errors.push('Workflow edge target mismatch');continue;}
      const er=rect(e),nr=rect(nodes[i+1]);if(Math.abs(er.x-r.right-24*scale)>tol||Math.abs(nr.x-er.right-24*scale)>tol)errors.push('Workflow arrow spacing broken');
      if(Math.abs(e.offsetWidth-167)>1||Math.abs(e.offsetHeight-22.0919)>1)errors.push('Workflow arrow distorted');
      if(Math.abs((er.y+er.bottom-r.y-r.bottom)/2)>tol)errors.push('Workflow arrow not vertically aligned');
     }
    }
   }
   // Text boxes must not collide. Decorative containment and clipping are intentional.
   const text=[...slide.querySelectorAll('[data-editable="text"]')].filter(visible);
   for(let a=0;a<text.length;a++)for(let b=a+1;b<text.length;b++){
    const ar=rect(text[a]),br=rect(text[b]);if(Math.min(ar.right,br.right)-Math.max(ar.x,br.x)>2&&Math.min(ar.bottom,br.bottom)-Math.max(ar.y,br.y)>2)errors.push('Text overlap: '+text[a].dataset.layer+' / '+text[b].dataset.layer);
   }
   if(scene){const track=slide.querySelector('[data-scroll-track]'),rows=[...track.children];
    for(let el=track;el&&el!==slide;el=el.parentElement){const cs=getComputedStyle(el);if(cs.overflowX!=='visible'||cs.overflowY!=='visible'||cs.maskImage!=='none'||cs.clipPath!=='none')errors.push('Internal list clipping/mask: '+el.className);}
    if(!['hidden','clip'].includes(getComputedStyle(slide).overflow))errors.push('Camera must clip only at slide boundary');
    if(scene.dataset.logoVisible!=='false'&&!scene.querySelector('.m-list-logo'))errors.push('List default/custom logo missing');
    for(const row of rows){for(const el of row.querySelectorAll('[data-editable="text"]')){const r=rect(el),rr=rect(row);if(r.right>rr.right+1||r.x<rr.x-1||r.bottom>rr.bottom+1)errors.push('List row content overflow: '+el.dataset.layer);}}
   }
   return {errors,id:slide.dataset.id};
  },{i,t,external});
  for(let i=0;i<timeline.length;i++){
   const entry=timeline[i];
   const staticAudit=await audit(i,1,true);errors.push(...staticAudit.errors.map(e=>entry.id+': '+e));
   if(entry.type==='motion-synthesis'){
    const result=await page.evaluate(auditSynthesis,await page.$('.slide.is-active'));errors.push(...result.errors.map(e=>entry.id+': '+e));warnings.push(...result.warnings.map(e=>entry.id+': '+e));
   }
   if(screenshotDir){const dest=path.join(screenshotDir,`${String(i+1).padStart(2,'0')}-${entry.id}.png`);await page.screenshot({path:dest});captures.push(dest);}
   const times=[0,.2,1.5,entry.duration-.5];
   for(const t of times){const result=await audit(i,t,false);errors.push(...result.errors.map(e=>`${entry.id}@${t.toFixed(2)}: ${e}`));}
   if(entry.type==='motion-list'){
    // QA-only transforms prove reachability; no distance or animation range is shipped.
    const issues=await page.evaluate(({i})=>{const slide=document.querySelectorAll('.slide')[i],scene=slide.querySelector('[data-list-scene]'),track=scene.querySelector('[data-scroll-track]'),row=track.lastElementChild,style=scene.getAttribute('style'),issues=[];
     const r=row.getBoundingClientRect();scene.style.transform=`translateY(${540-(r.top+r.bottom)/2}px)`;
     const last=row.getBoundingClientRect(),hit=document.elementFromPoint((last.left+last.right)/2,(last.top+last.bottom)/2);
     if(!row.contains(hit))issues.push('Last row blocked by internal clip');
     scene.style.transform=`translateY(${-scene.offsetTop-scene.offsetHeight-1}px)`;
     if(scene.getBoundingClientRect().bottom>slide.getBoundingClientRect().top)issues.push('Whole list scene cannot leave camera');
     if(style===null)scene.removeAttribute('style');else scene.setAttribute('style',style);return issues;
    },{i});errors.push(...issues.map(e=>entry.id+': '+e));
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
     if(hub.querySelectorAll('[data-edge]').length!==hub.querySelectorAll('.m-satellite').length)issues.push('Workflow edge/node count mismatch');
     for(const sat of hub.querySelectorAll('.m-satellite')){
      const target=sat.getBoundingClientRect(),curve=[...hub.querySelectorAll('[data-edge]')].find(e=>e.dataset.to===sat.dataset.nodeId);
      if(!curve){issues.push('Missing workflow edge');continue;}
      if(curve.dataset.slot==='bottom'){const stem=curve,r=stem.getBoundingClientRect(),im=stem.querySelector('img');
       if(Math.abs(r.bottom-target.top)>1.5||Math.abs((r.left+r.right-target.left-target.right)/2)>1.5)issues.push('Stem not docked after text replacement');
       if(Math.abs(stem.offsetWidth-im.naturalWidth)>1||Math.abs(stem.offsetHeight-im.naturalHeight)>1)issues.push('Stem original dimensions changed');continue;}
      const r=curve.getBoundingClientRect(),left=(target.left+target.right)<(center.left+center.right);
      if(Math.abs((left?r.left:r.right)-(left?target.right:target.left))>1.5)issues.push('Connector not bound after text replacement');
      const im=curve.querySelector('img');if(Math.abs(curve.offsetWidth-im.naturalWidth)>1||Math.abs(curve.offsetHeight-im.naturalHeight)>1)issues.push('Connector original dimensions changed');
      const dotY=curve.dataset.slot.startsWith('top')?r.top+5:r.bottom-5;
      if(Math.abs(dotY-(target.top+target.bottom)/2)>1.5)issues.push('Card not centered at connector endpoint');
      if(Math.min(target.right,center.right)-Math.max(target.left,center.left)>1&&Math.min(target.bottom,center.bottom)-Math.max(target.top,center.top)>1)issues.push('Satellite overlaps hub');
     }
    }
    labels.forEach((n,i)=>n.textContent=original[i]);api.layout();
   }
   for(const [i,slide] of [...document.querySelectorAll('.motion-slide')].entries()){
    const animated=slide.querySelector('[data-motion]'),style=animated.getAttribute('style');api.seekSlide(i,0);animated.style.opacity='.42';animated.style.transform='translateY(7px)';
    api.seekSlide(i,1);api.externalControl(true);await new Promise(r=>setTimeout(r,60));
    if(+animated.style.opacity!==.42||animated.style.transform!=='translateY(7px)')issues.push('Native player overwrites external animation: '+slide.dataset.id);
    if(style===null)animated.removeAttribute('style');else animated.setAttribute('style',style);
   }
   const selectors=[...document.querySelectorAll('[data-layer]')].map(n=>n.dataset.layer);if(new Set(selectors).size!==selectors.length)issues.push('Duplicate editable layer IDs');
   return issues;
  });errors.push(...editable);
  for(const vp of [{width:1280,height:720},{width:1366,height:768},{width:1440,height:900},{width:1024,height:768}]){
   await page.setViewportSize(vp);await page.evaluate(()=>new Promise(requestAnimationFrame));
   const r=await page.evaluate(()=>{const r=document.getElementById('deck').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,cx:(r.left+r.right)/2,cy:(r.top+r.bottom)/2};});
   if(r.x<-1||r.y<-1||r.right>vp.width+1||r.bottom>vp.height+1||Math.abs(r.cx-vp.width/2)>1||Math.abs(r.cy-vp.height/2)>1)errors.push(`Viewport clipping at ${vp.width}×${vp.height}`);
  }
  const report={mode:'motion',slideCount:timeline.length,errors:[...new Set(errors)],warnings:[...new Set(warnings)],visualReview:'required; geometry pass is not a design-quality sign-off',screenshots:captures,deterministic};
  if(screenshotDir)await fs.writeFile(path.join(screenshotDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  for(const error of report.errors)console.error('ERROR '+error);
  for(const warning of report.warnings)console.warn('REVIEW '+warning);
  console.log(`Motion preflight: ${timeline.length} slides, ${report.errors.length} errors, ${report.warnings.length} visual-review advisories; static visibility, synthesis alignment, camera-only lists, external ownership, deterministic seeks, and responsive viewports checked. Geometry pass is not aesthetic approval.`);
  return report;
 }finally{await browser.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),html=args[args.indexOf('--html')+1],dest=args.includes('--screenshots')?args[args.indexOf('--screenshots')+1]:undefined;
 if(!args.includes('--html'))throw Error('Usage: node scripts/preflight-motion.mjs --html output/motion/index.html [--screenshots output/motion/qa]');
 preflightMotion(html,dest).then(r=>{if(r.errors.length)process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
}
