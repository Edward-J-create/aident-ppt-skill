#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateMotion,generateMotionDeck,resolveConnections,registry} from './lib/motion-deck.mjs';
import {preflightMotion} from './preflight-motion.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dest=path.join(root,'output/playwright/motion-controls');
const read=p=>fs.readFile(path.join(root,p),'utf8').then(JSON.parse);
const decks=await Promise.all(['en','zh'].map(l=>read(`examples/motion/controls.${l}.json`)));
assert.deepEqual(decks[0].slides.map(s=>[s.id,s.type]),decks[1].slides.map(s=>[s.id,s.type]));
for(const d of decks){
 assert.deepEqual(validateMotion(d),[]);
 const pair=d.slides.find(s=>s.id==='logo-pair');assert.equal(pair.logos[0].src,'assets/motion/lockup.svg');assert.ok(pair.logos[1].placeholder);assert.equal(pair.logos[1].src,undefined);
 const checkBad=fn=>{const v=structuredClone(d);fn(v);assert.ok(validateMotion(v).length);};
 checkBad(v=>v.slides.find(s=>s.id==='hub-slots').connections[0].to='missing');
 checkBad(v=>v.slides.find(s=>s.id==='hub-slots').connections[1].slot='top-left');
 checkBad(v=>v.slides.find(s=>s.id==='flow-three').connections=[{id:'skip',from:'collect',to:'share'}]);
 checkBad(v=>v.slides.find(s=>s.id==='input-default').send.state='unknown');
 checkBad(v=>v.slides[0].duration=0);
 checkBad(v=>v.slides[0].logos[1].src='assets/motion/mark.svg');
 checkBad(v=>v.slides[0].logos[0].src='assets/logos/wordmark-light.svg');
 const short=structuredClone(d);short.slides[0].duration=1/30;assert.deepEqual(validateMotion(short),[]);
 const explicit=structuredClone(d);explicit.slides.find(s=>s.id==='flow-three').connections=[{id:'first',from:'collect',to:'review'},{id:'second',from:'review',to:'share'}];assert.deepEqual(validateMotion(explicit),[]);
 for(const n of [1,2,3,4]){const s={type:'motion-hub',items:Array.from({length:n},(_,i)=>({id:'n'+i}))};assert.equal(resolveConnections(s).length,n);}
 for(const n of [2,3,4]){const s={type:'motion-workflow',items:Array.from({length:n},(_,i)=>({id:'n'+i}))};assert.equal(resolveConnections(s).length,n-1);}
 const out=path.join(dest,d.meta.language);await generateMotionDeck({input:path.join(root,`examples/motion/controls.${d.meta.language}.json`),out,singleFile:true},d);
 const timeline=JSON.parse(await fs.readFile(path.join(out,'timeline.json'),'utf8'));
 for(const s of timeline.slides)assert.equal(s.duration,d.slides.find(v=>v.id===s.id).duration??registry.layouts[s.type].duration);
 if(process.argv.includes('--browser'))assert.equal((await preflightMotion(path.join(out,'index.html'),path.join(out,'qa'))).errors.length,0);
}
if(process.argv.includes('--browser')){
 const require=createRequire(import.meta.url),{chromium}=require(require.resolve('playwright',{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));
 const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 const browser=await chromium.launch({headless:true,executablePath});
 try{for(const lang of ['en','zh']){
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.goto(pathToFileURL(path.join(dest,lang,'index.html')).href+'?capture=1');await page.evaluate(()=>AIDENT_MOTION.ready);
  const result=await page.evaluate(async()=>{
   const issues=[],api=AIDENT_MOTION;api.seekSlide('input-default',0);
   let count=0;window.addEventListener('aident:send',e=>{if(e.detail.slideId==='input-default')count++;});
   const b=document.querySelector('[data-id="input-default"] [data-motion="send"]');
   const colors=new Set();for(const state of ['default','hover','pressed','sent','disabled']){api.setSendState('input-default',state);colors.add(getComputedStyle(b).backgroundColor);}
   if(colors.size!==5)issues.push('Send state colors not distinct');b.click();if(count)issues.push('Disabled emitted click');
   api.setSendState('input-default','pressed');b.click();if(count!==1)issues.push('Enabled click not emitted');
   b.style.transform='scale(.9)';api.seekSlide('input-default',1);if(b.dataset.state!=='pressed'||b.style.transform!=='scale(0.9)')issues.push('Seek reset send state/transform');
   const arrow=b.querySelector('svg path');if(!arrow||getComputedStyle(arrow).stroke!==getComputedStyle(b).color)issues.push('Arrow color not independently inherited');
   api.seekSlide('logo-pair',0);const scene=document.querySelector('[data-id="logo-pair"]'),left=scene.querySelector('[data-motion="logo-0"] img'),rightSlot=scene.querySelector('[data-motion="logo-1"]'),ls=left.getAttribute('style'),src=left.src;
   if(!rightSlot.querySelector('[data-editable="text"]')||rightSlot.querySelector('img'))issues.push('Missing explicit live logo placeholder');
   if(left.offsetWidth>598||left.offsetHeight>114||left.naturalWidth/left.naturalHeight<5)issues.push('Pair must contain complete lockup within pair bounds');
   const right=left.cloneNode(true);right.removeAttribute('data-layer');rightSlot.replaceChildren(right);await right.decode();api.layout();
   if(left.src!==src||left.getAttribute('style')!==ls)issues.push('Right replacement changed left logo');
   scene.querySelector('[data-motion="logo-1"]').style.opacity='.5';api.seekSlide('logo-pair',1);
   if(getComputedStyle(scene.querySelector('[data-motion="logo-0"]')).opacity!=='1')issues.push('Right animation affected left');
   for(const im of [left,right])if(Math.abs(im.offsetWidth/im.offsetHeight-im.naturalWidth/im.naturalHeight)>.02)issues.push('Replacement ratio changed');
   for(const [w,h] of [[120,120],[800,80],[80,240]]){
    right.src='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#008089"/></svg>`);
    await right.decode();api.layout();
    if(Math.abs(right.offsetWidth/right.offsetHeight-w/h)>.08||right.offsetWidth>598||right.offsetHeight>114)issues.push('Square/wide/tall replacement violated pair bounds or ratio');
    if(left.src!==src||left.getAttribute('style')!==ls)issues.push('Replacement shape altered left logo');
   }
   const rightSource=right.src,rightStyle=right.getAttribute('style');
   left.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><rect width="400" height="100" fill="#6155FF"/></svg>');
   await left.decode();api.layout();
   if(right.src!==rightSource||right.getAttribute('style')!==rightStyle)issues.push('Left replacement changed right logo');
   if(left.src===src||Math.abs(left.offsetWidth/left.offsetHeight-4)>.02)issues.push('Left identity is locked or distorted');
   // Both slots now contain custom images: no Aident asset remains in the pair.
   if([left,right].some(im=>!im.src.startsWith('data:image/svg+xml,')))issues.push('Both-logo replacement incomplete');
   const ids=[...document.querySelectorAll('[data-layer]')].map(n=>n.dataset.layer);if(new Set(ids).size!==ids.length)issues.push('Duplicate layer ids');
   return issues;
  });assert.deepEqual(result,[]);
  await page.evaluate(()=>AIDENT_MOTION.seekSlide('input-default',0));await page.locator('[data-id="input-default"] .m-send').focus();
  await page.evaluate(()=>{window.keyboardSendCount=0;window.addEventListener('aident:send',()=>window.keyboardSendCount++);});
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.keyboardSendCount),1);
  await page.goto(pathToFileURL(path.join(dest,lang,'deck.single.html')).href+'?capture=1');await page.evaluate(()=>AIDENT_MOTION.ready);assert.equal(await page.locator('.m-send svg path').count(),5);
  await page.close();
 }}finally{await browser.close();}
}
console.log('Motion controls passed: EN/ZH colors, short timing, 1–4 hub nodes, 2–4 linear nodes, explicit edge validation, independent Logo replacement, Send states/click/keyboard and single-file HTML.');
