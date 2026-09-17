#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {generateMotionDeck} from './lib/motion-deck.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'output/playwright/input-binding');
const req=createRequire(import.meta.url),{chromium}=req(process.env.RUNTIME_NODE_MODULES?path.join(process.env.RUNTIME_NODE_MODULES,'playwright'):'playwright');
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
// Local server deliberately delays real font files; no network fonts or CDN dependencies.
let delayedFonts=0;
const server=http.createServer(async(req,res)=>{
 try{const file=path.resolve(out,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(out+path.sep))throw Error('Invalid path');
  if(/\.(woff2?|ttf|otf)$/.test(file)){delayedFonts++;await new Promise(r=>setTimeout(r,350));}
  const bytes=await fs.readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(bytes);
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let samples=0;
try{
 for(const language of ['en','zh']){
  const full=language==='en'?'Enrich this company with selected data.':'根据已选信息完善这家公司的资料。';
  const slides=['compact','multiline'].map(variant=>({id:variant,type:'motion-input',variant,prompt:full,showCursor:true}));
  const dest=path.join(out,language);
  await generateMotionDeck({input:path.join(root,'examples/motion/starter.en.json'),out:dest,singleFile:true},{meta:{mode:'motion',language,title:'Input binding QA'},slides});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.goto(`http://127.0.0.1:${server.address().port}/${language}/index.html?capture=1`,{waitUntil:'domcontentloaded'});
  // prepare is deliberately called before AIDENT_MOTION.ready has settled.
  const early=await page.evaluate(async()=>{const s=document.querySelector('[data-id="compact"]');s.classList.add('is-active');const api=AIDENT_MOTION,b=api.inputBinding('compact'),full=s.querySelector('[data-motion="prompt-text"]').textContent;const loading=document.fonts.status;await b.prepare(full);const result={loading,after:document.fonts.status,width:s.querySelector('[data-motion="prompt"]').getBoundingClientRect().width};b.release();return result;});
  assert.equal(early.loading,'loading','Must exercise preparation during actual delayed font loading');assert.equal(early.after,'loaded');assert.ok(early.width>0);
  await page.evaluate(()=>AIDENT_MOTION.ready);
  for(const viewport of [{width:1920,height:1080},{width:1280,height:720}]){
   await page.setViewportSize(viewport);await page.evaluate(()=>dispatchEvent(new Event('resize')));
   for(const variant of ['compact','multiline']){
    const results=await page.evaluate(async({id,full})=>{
     const api=AIDENT_MOTION;api.seekSlide(id,0);
     const scene=document.querySelector(`[data-id="${id}"]`),p=scene.querySelector('[data-motion="cursor"]'),button=scene.querySelector('[data-motion="send"]'),im=p.querySelector('img'),text=scene.querySelector('[data-motion="prompt-text"]'),prompt=scene.querySelector('[data-motion="prompt"]');
     const bind=api.inputBinding(id),fail=fn=>{try{fn();return false;}catch{return true;}};
     const unprepared=fail(()=>bind.measure());await bind.prepare(full);
     const center=()=>{const r=button.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]};const original=center(),rows=[];
     const origin=bind.measure().transformOrigin;p.style.transformOrigin=origin;
     let tx=0,ty=0;
     for(const prefix of ['',full.slice(0,3),full,full.slice(0,3),'',full]){
      api.setPromptText(id,prefix);
      for(const scale of [1,.82,.69,.82]){
       p.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;
       const delta=bind.measure().delta;tx+=delta.x;ty+=delta.y;p.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;
       button.style.transform=`scale(${scale===.69?.83:1})`;
       const state=bind.assertAligned();rows.push({error:state.error,drift:Math.hypot(...center().map((v,i)=>v-original[i])),overflow:prompt.scrollWidth>prompt.clientWidth+1});
      }
     }
     p.style.transform=`translate(${tx+6}px,${ty}px)`;const miss=fail(()=>bind.assertAligned());
     api.setSendState(id,'disabled');const disabled=fail(()=>bind.measure());api.setSendState(id,'default');
     p.style.display='none';const hidden=fail(()=>bind.measure());p.style.removeProperty('display');
     p.style.transform='rotate(10deg)';const rotated=fail(()=>bind.measure());p.style.transform='none';
     text.style.fontSize='31px';const staleFont=fail(()=>bind.measure());text.style.removeProperty('font-size');
     api.setPromptText(id,'different');const staleText=fail(()=>bind.measure());api.setPromptText(id,full);
     const source=im.getAttribute('src');im.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="80"><rect width="40" height="80" fill="red"/></svg>');await im.decode();
     const replacement=fail(()=>bind.measure());im.style.objectFit='contain';
     const options={hotspot:{x:.25,y:.125}},goal=bind.measure(options);p.style.transformOrigin=goal.transformOrigin;
     const d=bind.measure(options).delta;p.style.transform=`translate(${d.x}px,${d.y}px)`;const custom=bind.assertAligned(options).error;
     im.src=source;await im.decode();im.style.removeProperty('object-fit');p.style.removeProperty('transform');p.style.removeProperty('transform-origin');button.style.removeProperty('transform');bind.release();
     return {rows,unprepared,miss,disabled,hidden,rotated,staleFont,staleText,replacement,custom,released:prompt.style.width};
    },{id:variant,full});
    for(const key of ['unprepared','miss','disabled','hidden','rotated','staleFont','staleText','replacement'])assert.ok(results[key],key);
    assert.equal(results.released,'');assert.ok(results.custom<=1);
    for(const row of results.rows){assert.ok(row.error<=1);assert.ok(row.drift<=1);assert.equal(row.overflow,false);samples++;}
    await page.evaluate(async id=>{
     const scene=document.querySelector(`[data-id="${id}"]`),p=scene.querySelector('[data-motion="cursor"]'),b=AIDENT_MOTION.inputBinding(id);
     await b.prepare(scene.querySelector('[data-motion="prompt-text"]').textContent);
     p.style.transformOrigin=b.measure().transformOrigin;
     const d=b.measure().delta;p.style.transform=`translate(${d.x}px,${d.y}px)`;b.assertAligned();b.release();
    },variant);
    await page.screenshot({path:path.join(dest,`${variant}-${viewport.width}.png`)});
    await page.evaluate(id=>{const p=document.querySelector(`[data-id="${id}"] [data-motion="cursor"]`);p.style.removeProperty('transform');p.style.removeProperty('transform-origin');},variant);
   }
  }
  await page.goto(pathToFileURL(path.join(dest,'deck.single.html')).href+'?capture=1');await page.evaluate(()=>AIDENT_MOTION.ready);
  assert.equal(await page.evaluate(()=>typeof AIDENT_INPUT.bind),'function');await page.close();
 }
 assert.ok(delayedFonts>0);
 console.log(`Input binding passed: ${samples} alignment/typing/press samples; delayed fonts, EN/ZH, 2 layouts, 2 viewports, reverse prefixes, custom hotspot, invalid states, single-file runtime.`);
}finally{server.close();await browser.close();}
