#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {generateMotionDeck} from './lib/motion-deck.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'output/input-caret-regression');
const req=createRequire(import.meta.url);
const {chromium}=req(process.env.RUNTIME_NODE_MODULES?path.join(process.env.RUNTIME_NODE_MODULES,'playwright'):'playwright');
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
try{
 for(const language of ['en','zh']){
  const prompt=language==='en'?'Find the next step.':'找到下一步。';
  const slides=['compact','multiline'].flatMap(variant=>['omitted','off','on'].map(mode=>({
   id:`${variant}-${mode}`,type:'motion-input',variant,prompt,showCursor:true,
   ...(mode==='omitted'?{}:{showCaret:mode==='on'})
  })));
  const dest=path.join(out,language);
  await generateMotionDeck({input:path.join(root,'examples/motion/starter.en.json'),out:dest},{meta:{mode:'motion',language,title:'Input caret regression'},slides});
  const resolved=JSON.parse(await fs.readFile(path.join(dest,'deck.resolved.json'),'utf8'));
  const handoff=JSON.parse(await fs.readFile(path.join(dest,'animation-handoff.json'),'utf8'));
  assert.equal(handoff.inputContract.caretDefault,false);
  assert.deepEqual(handoff.inputContract.scenes,resolved.slides.map(s=>({id:s.id,showCaret:s.showCaret})));
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.goto(pathToFileURL(path.join(dest,'index.html')).href+'?capture=1');
  await page.evaluate(()=>AIDENT_MOTION.ready);
  for(const slide of resolved.slides){
   assert.equal(slide.showCaret,slide.id.endsWith('-on'));
   const result=await page.evaluate(({id,enabled,prompt})=>{
    const api=AIDENT_MOTION;api.seekSlide(id,0);
    const scene=document.querySelector(`[data-id="${id}"]`);
    const caret=scene.querySelector('[data-motion="caret"]');
    const positions=[];
    for(const text of ['',prompt.slice(0,2),prompt,'']){
     api.setPromptText(id,text);
     if(scene.querySelector('[data-motion="prompt-text"]').textContent!==text)throw Error('Prompt update failed');
     if(caret)positions.push(caret.getBoundingClientRect().x-scene.querySelector('[data-motion="prompt-text"]').getBoundingClientRect().x);
    }
    api.setPromptText(id,prompt);api.setSendState(id,'pressed');api.seekSlide(id,1);api.seekSlide(id,0);
    return {hasCaret:!!caret,pointer:!!scene.querySelector('[data-motion="cursor"]'),send:scene.querySelector('[data-motion="send"]').dataset.state,positions};
   },{id:slide.id,enabled:slide.showCaret,prompt});
   assert.equal(result.hasCaret,slide.showCaret);assert.ok(result.pointer);assert.equal(result.send,'pressed');
   if(slide.showCaret){assert.ok(result.positions[2]>result.positions[1]);assert.ok(result.positions[1]>result.positions[0]);assert.equal(result.positions[0],result.positions[3]);}
   await page.screenshot({path:path.join(dest,`${slide.id}.png`)});
  }
  await page.close();
 }
}finally{await browser.close();}
console.log('Input caret: EN/ZH × compact/multiline × omitted/off/on passed; live text, pointer and Send preserved.');
