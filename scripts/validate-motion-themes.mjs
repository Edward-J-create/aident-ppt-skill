#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateMotion,generateMotionDeck,tokens} from './lib/motion-deck.mjs';
import {preflightMotion} from './preflight-motion.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFile(path.join(root,rel),'utf8').then(JSON.parse);
const decks=await Promise.all(['en','zh'].map(l=>read(`examples/motion/themes.${l}.json`)));
assert.deepEqual(decks[0].slides.map(s=>[s.id,s.type]),decks[1].slides.map(s=>[s.id,s.type]));
const bad=fn=>{const d=structuredClone(decks[0]);fn(d);assert.ok(validateMotion(d).length);};
bad(d=>d.meta.theme='blue');
bad(d=>d.meta.palette='unregistered');
bad(d=>{d.slides[0].palette='neutral';d.slides[0].background='brand';});
bad(d=>d.slides[0].theme='dark');
bad(d=>d.slides[1].image.variants={light:'assets/motion/mark.svg'});
bad(d=>d.slides[3].rows[1].items.pop());
bad(d=>d.slides[3].rows.push(d.slides[3].rows[0]));
bad(d=>d.slides[5].result.rows[0].pop());
bad(d=>d.slides[5].result.columnWidths=[0,1,2]);
bad(d=>d.slides[5].result.accentColumn=3);
bad(d=>d.slides[6].result.rows=[['Not a table']]);
for(const rows of [1,2,3])for(const count of [2,3,4]){
 const d={meta:decks[0].meta,slides:[{id:'rows',type:'motion-workflow',variant:'rows',title:'A clear sequence',rows:Array.from({length:rows},(_,i)=>({id:'r'+i,items:Array.from({length:count},(_,j)=>({id:'n'+j,title:'Step '+j}))}))}]};
 assert.deepEqual(validateMotion(d),[]);
}
// Table column counts and theme asset selection are public contracts, not one-off sample fixes.
for(const count of [2,3,4]){const d=structuredClone(decks[0]);const r=d.slides[5].result;r.columns=Array.from({length:count},(_,i)=>'C'+i);r.rows=[r.columns];delete r.columnWidths;assert.deepEqual(validateMotion(d),[]);}
const browserMode=process.argv.includes('--browser');
for(const d of decks){
 assert.deepEqual(validateMotion(d),[]);
 const lang=d.meta.language,out=path.join(root,`output/motion-themes-${lang}`);
 await generateMotionDeck({input:path.join(root,`examples/motion/themes.${lang}.json`),out,singleFile:true},d);
 const handoff=await fs.readFile(path.join(out,'animation-handoff.json'),'utf8').then(JSON.parse);
 assert.equal(handoff.version,3);assert.ok(handoff.layoutContract.animate);assert.equal(handoff.themeContract.scenes[1].theme,'dark');
 if(browserMode)assert.equal((await preflightMotion(path.join(out,'index.html'),path.join(out,'qa'))).errors.length,0);
 // Every existing family, both themes. Full Aident lettering has no approved dark variant;
 // test dark logo slots explicitly with the approved standalone graphic, never invert the lockup.
 const catalog=await read(`examples/motion/deck.${lang}.json`);
 const sweep={meta:{...catalog.meta,title:'Theme coverage'},slides:['light','dark'].flatMap(theme=>catalog.slides.map(original=>{const s=structuredClone(original);s.id=theme+'-'+s.id;s.theme=theme;if(theme==='dark'&&s.logos)s.logos=s.logos.map(v=>v.placeholder?v:{src:'assets/motion/mark.svg'});return s;}))};
 for(const palette of ['teal','cobalt','lime'])for(const theme of ['light','dark'])for(const [i,original] of catalog.slides.entries()){
  const s=structuredClone(original);Object.assign(s,{id:palette+'-'+theme+'-'+s.id,theme,palette,background:i%2?'brand':'brand-gradient'});
  if(theme==='dark'&&s.logos)s.logos=s.logos.map(v=>v.placeholder?v:{src:'assets/motion/mark.svg'});sweep.slides.push(s);
 }
 // Count-variable rows, result tables and two theme-specific image paths.
 for(const rows of [1,2,3])for(const count of [2,3,4])sweep.slides.push({id:`rows-${rows}-${count}`,type:'motion-workflow',variant:'rows',theme:count===3?'light':'dark',title:lang==='en'?'A clear sequence':'清晰的顺序',rows:Array.from({length:rows},(_,i)=>({id:'r'+i,items:Array.from({length:count},(_,j)=>({id:'n'+j,title:lang==='en'?'Step '+j:'步骤'+j}))}))});
 for(const count of [2,4]){const s=structuredClone(d.slides[5]);s.id='table-'+count;s.result.columns=Array.from({length:count},(_,i)=>'C'+i);s.result.rows=[s.result.columns];delete s.result.columnWidths;sweep.slides.push(s);}
 sweep.slides.push({id:'asset-variant',type:'motion-input',variant:'compact',theme:'dark',prompt:'Hello',image:{src:'assets/motion/mark.svg',variants:{light:'assets/motion/mark.svg',dark:'assets/motion/icons/help.svg'}}});
 const imageRows={id:'rows-images',type:'motion-workflow',variant:'rows',theme:'dark',title:lang==='en'?'Tools stay editable':'工具保持可编辑',rows:Array.from({length:3},(_,i)=>({id:'r'+i,items:Array.from({length:3},(_,j)=>({id:'n'+j,title:lang==='en'?'Step '+j:'步骤'+j,image:{src:j===1?'assets/motion/icons/help.svg':'assets/motion/mark.svg'}}))}))};
 sweep.slides.splice(sweep.slides.length-1,0,imageRows);
 const sweepOut=path.join(root,`output/playwright/motion-themes-${lang}`);
 await generateMotionDeck({input:path.join(root,'examples/motion/source.json'),out:sweepOut},sweep);
 const resolved=await fs.readFile(path.join(sweepOut,'deck.resolved.json'),'utf8').then(JSON.parse);
 assert.match(resolved.slides.at(-1).image.src,/motion\/icons\/dark\/help.svg$/);
 if(browserMode)assert.equal((await preflightMotion(path.join(sweepOut,'index.html'))).errors.length,0);
}
if(browserMode){
 const require=createRequire(import.meta.url),{chromium}=require(require.resolve('playwright',{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(const lang of ['en','zh']){
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.goto(pathToFileURL(path.join(root,`output/motion-themes-${lang}/index.html`)).href+'?capture=1');await page.evaluate(()=>AIDENT_MOTION.ready);
  const issues=await page.evaluate(()=>{
   const errors=[],api=AIDENT_MOTION;
   const rgba=s=>{const v=s.trim();if(v.startsWith('#'))return [...v.slice(1).match(/../g).map(x=>parseInt(x,16)),1];const n=v.match(/[\d.]+/g).map(Number);return [n[0],n[1],n[2],n[3]??1]};
   const composite=(front,back)=>{const f=rgba(front),b=rgba(back),a=f[3];return `rgb(${f.slice(0,3).map((v,i)=>Math.round(v*a+b[i]*(1-a))).join(',')})`};
   const lum=s=>rgba(s).slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
   const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   for(const slide of document.querySelectorAll('[data-theme="dark"]')){
    api.seekSlide(slide.dataset.id,0);
    const sc=getComputedStyle(slide),canvas=sc.getPropertyValue('--m-canvas'),surface=composite(sc.getPropertyValue('--m-surface'),canvas);
    for(const tag of slide.querySelectorAll('.m-tag')){const cs=getComputedStyle(tag),bg=composite(cs.backgroundColor,canvas);if(cs.backgroundImage==='none'&&contrast(cs.color,bg)<4.5)errors.push('Dark tag contrast: '+tag.textContent);}
    for(const el of slide.querySelectorAll('.m-body,.m-result-value,.m-flow-title,.m-input-text')){if(contrast(getComputedStyle(el).color,surface)<4.5)errors.push('Dark text contrast: '+el.textContent);}
    for(const el of slide.querySelectorAll('.m-card,.m-list-row,.m-input,.m-tag-panel,.m-node-visual,.m-result')){const cs=getComputedStyle(el),alpha=rgba(cs.backgroundColor)[3];if(slide.classList.contains('motion-comparison')&&el.matches('.m-card'))continue;if(Math.abs(alpha-.06)>.001)errors.push('Dark surface must use 6% fill: '+el.className);if(cs.opacity!=='1')errors.push('Dark component opacity must remain 1: '+el.className);}
    if(slide.classList.contains('motion-comparison')){const cards=[...slide.querySelectorAll('.m-card')];cards.forEach((card,i)=>{const cs=getComputedStyle(card);if(Math.abs(rgba(cs.backgroundColor)[3]-[.04,.20][i])>.001||Math.abs(rgba(cs.borderTopColor)[3]-[.20,.60][i])>.001)errors.push('Comparison alpha contract drift');});}
    for(const badge of slide.querySelectorAll('.m-list-row .m-badge'))if(getComputedStyle(badge).color!=='rgb(30, 234, 234)')errors.push('Dark List badge must use brand cyan');
    for(const check of slide.querySelectorAll('.m-list-row .m-check img'))if(!check.src.endsWith('/assets/motion/dark/check.svg'))errors.push('Dark List check must use packaged brand-cyan SVG');
    for(const im of slide.querySelectorAll('.replaceable-logo'))if(getComputedStyle(im).filter!=='none')errors.push('Unexpected brand filter');
   }
   for(const slide of document.querySelectorAll('[data-theme="light"][data-palette="lime"]'))for(const el of slide.querySelectorAll('.m-card,.m-list-row,.m-input,.m-tag-panel,.m-node-visual,.m-result')){const cs=getComputedStyle(el);if(Math.abs(rgba(cs.backgroundColor)[3]-.65)>.001)errors.push('Bright-lime panel must use 65% white fill: '+el.className);if(cs.color!=='rgb(16, 32, 25)')errors.push('Bright-lime panel must use dark text: '+el.className);}
   api.seekSlide('dark-input',0);api.setPromptText('dark-input','A');
   const caret=document.querySelector('[data-id="dark-input"] [data-motion="caret"]'),x=caret.getBoundingClientRect().x;
   api.setPromptText('dark-input','A longer prompt');if(caret.getBoundingClientRect().x<=x)errors.push('Caret does not follow text');
   if(!document.querySelector('[data-id="dark-input"] [data-motion="cursor"]'))errors.push('Mouse pointer missing');
   api.seekSlide('dark-hub',0);const shell=document.querySelector('[data-id="dark-hub"] .m-satellite'),visual=shell.querySelector('[data-animation-target]'),before=shell.getBoundingClientRect();
   visual.style.transform='translateY(20px)';visual.style.opacity='.4';api.seekSlide('dark-hub',1);
   const after=shell.getBoundingClientRect();if(after.x!==before.x||after.y!==before.y)errors.push('Animation changed layout shell');if(visual.style.opacity!=='.4'&&visual.style.opacity!=='0.4')errors.push('Player reset external reveal');
   for(const group of document.querySelectorAll('[data-workflow-rows]')){const rows=[...group.querySelectorAll('[data-workflow]')],positions=rows.map(r=>[...r.querySelectorAll('[data-node-id]')].map(n=>n.getBoundingClientRect()));for(const row of positions)row.forEach((r,i)=>{if(Math.abs(r.x-positions[0][i].x)>1||Math.abs(r.width-positions[0][i].width)>1||Math.abs(r.height-positions[0][i].height)>1)errors.push('Row column alignment drift');});}
   return errors;
  });assert.deepEqual(issues,[]);
  await page.goto(pathToFileURL(path.join(root,`output/motion-themes-${lang}/deck.single.html`)).href);await page.evaluate(()=>AIDENT_MOTION.ready);await page.close();
 }}finally{await browser.close();}
}
console.log('Motion themes: EN/ZH examples, all 11 families × 2 themes × 4 palettes, 1–3 workflow rows × 2–4 nodes, result columns/list, asset policy, static capture and editable layers passed.');
