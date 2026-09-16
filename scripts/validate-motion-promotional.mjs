#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateMotion,generateMotionDeck} from './lib/motion-deck.mjs';
import {preflightMotion} from './preflight-motion.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFile(p,'utf8').then(JSON.parse);
const decks=await Promise.all(['en','zh'].map(l=>read(path.join(root,`examples/motion/promotional.${l}.json`))));
assert.deepEqual(decks[0].slides.map(s=>[s.id,s.type,s.variant]),decks[1].slides.map(s=>[s.id,s.type,s.variant]));
const bad=fn=>{const d=structuredClone(decks[0]);fn(d);assert.ok(validateMotion(d).length,'Invalid promotional input was accepted');};
bad(d=>d.slides[0].items.pop());
bad(d=>d.slides[0].value='20M+ / 75+');
bad(d=>d.slides[0].items[0].title='Not a number field');
bad(d=>d.slides[0].items[0].value='');
bad(d=>d.slides[2].value='1234567');
bad(d=>d.slides[4].title='No implicit giant closing heading');
bad(d=>d.slides[4].body='No paragraph disguised as a button');
bad(d=>delete d.slides[4].cta);
bad(d=>d.slides[4].variant='pair');
bad(d=>d.slides[4].cta.href='javascript:alert(1)');
bad(d=>d.slides[4].cta.href='data:text/html,unsafe');
bad(d=>d.slides[4].cta.showArrow='yes');
const browserMode=process.argv.includes('--browser');
for(const d of decks){
 assert.deepEqual(validateMotion(d),[]);
 assert.ok(d.slides.filter(s=>s.type==='motion-brand').every(s=>s.theme==='light'&&s.palette==='neutral'),'End-card gallery must explicitly use Light/neutral, never Dark or lime');
 const lang=d.meta.language,input=path.join(root,`examples/motion/promotional.${lang}.json`),out=path.join(root,`output/motion-promotional-${lang}`);
 const starter=await read(path.join(root,`examples/motion/starter.${lang}.json`));
 const ending=starter.slides.at(-1);
 assert.equal(ending.theme,'light','Starter end card must override deck theme');
 assert.equal(ending.palette,'neutral','Starter end card must override deck palette');
 await generateMotionDeck({input,out,singleFile:true},d);
 const html=await fs.readFile(path.join(out,'index.html'),'utf8'),handoff=await read(path.join(out,'animation-handoff.json'));
 assert.ok(handoff.layers.some(l=>l.id==='brand-cta/cta'&&l.kind==='component'));
 assert.ok(handoff.layers.some(l=>l.id==='brand-cta/cta-text'&&l.kind==='text'));
 assert.ok(handoff.layers.some(l=>l.id==='paired-metrics/metric-value-0'&&l.kind==='text'));
 assert.equal(handoff.layers.filter(l=>l.id.startsWith('paired-metrics/metric-card-')).length,2);
 assert.match(html,/href="https:\/\/example.com\/start"/);
 const before=html;await generateMotionDeck({input,out,singleFile:true},d);
 assert.equal(await fs.readFile(path.join(out,'index.html'),'utf8'),before,'Regeneration changed approved layout');
 if(browserMode)assert.equal((await preflightMotion(path.join(out,'index.html'),path.join(out,'qa'))).errors.length,0);
 const sweep={meta:d.meta,slides:[]};
 for(const theme of ['light','dark'])for(const palette of ['neutral','teal','cobalt','lime'])for(const original of d.slides){
  const s=structuredClone(original);Object.assign(s,{id:`${theme}-${palette}-${s.id}`,theme,palette,background:palette==='neutral'?'solid':'brand'});
  if(theme==='dark'&&s.logos)s.logos=s.logos.map(v=>v.placeholder?v:{src:'assets/motion/mark.svg'});
  sweep.slides.push(s);
 }
 // Optional labels/body must not be invented; shortest and longest supported independent values.
 sweep.slides.push({id:'bare-metrics',type:'motion-metric',variant:'cards',title:lang==='en'?'Two independent values':'两个独立数值',items:[{value:'1'},{value:'999,999'}]});
 sweep.slides.push({id:'mixed-metric-fields',type:'motion-metric',variant:'cards',title:lang==='en'?'Aligned independent values':'对齐的独立数值',items:[{value:'100%',label:lang==='en'?'OPTIONAL LABEL':'可选标签'},{value:'75+',body:lang==='en'?'A longer supporting explanation stays aligned without moving the value above it.':'说明行数改变时，数字仍保持对齐。'}]});
 // Comparison has meaningful defaults even if the author omits per-item tones.
 sweep.slides.push({id:'default-comparison',type:'motion-comparison',theme:'dark',title:lang==='en'?'Before and after':'前后对比',items:[{title:lang==='en'?'Before':'之前'},{title:lang==='en'?'After':'之后'}]});
 sweep.slides.push({id:'explicit-dark-button',type:'motion-brand',variant:'cta',theme:'dark',palette:'teal',logos:[{src:'assets/motion/mark.svg'}],cta:{text:lang==='en'?'Get started':'开始体验',showArrow:false},notes:{purpose:'Renderer compatibility test for a non-closing scene; not an end-card recommendation.'}});
 const sweepOut=path.join(root,`output/playwright/motion-promotional-${lang}`);
 await generateMotionDeck({input,out:sweepOut},sweep);
 const resolved=await read(path.join(sweepOut,'deck.resolved.json'));
 assert.deepEqual(resolved.slides.find(s=>s.id==='default-comparison').items.map(v=>v.tone),['muted','accent']);
 if(browserMode)assert.equal((await preflightMotion(path.join(sweepOut,'index.html'))).errors.length,0);
}
if(browserMode){
 // Deliberately stale metadata must fail, even when the rendered CTA still looks correct.
 const negativeOut=path.join(root,'output/playwright/motion-handoff-negative');
 await generateMotionDeck({input:path.join(root,'examples/motion/promotional.en.json'),out:negativeOut},{meta:decks[0].meta,slides:[decks[0].slides[4]]});
 const negativePath=path.join(negativeOut,'animation-handoff.json'),negative=await read(negativePath);
 negative.layers.find(l=>l.id==='brand-cta/cta').selector='[data-layer="removed-cta"]';
 await fs.writeFile(negativePath,JSON.stringify(negative));
 const rejected=await preflightMotion(path.join(negativeOut,'index.html'));
 assert.ok(rejected.errors.some(e=>e.includes('Handoff selector does not resolve uniquely')),'Stale CTA index must fail preflight');
 const require=createRequire(import.meta.url),{chromium}=require(require.resolve('playwright',{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(const lang of ['en','zh']){
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  const url=pathToFileURL(path.join(root,`output/motion-promotional-${lang}/index.html`)).href;
  await page.goto(url+'?capture=1');await page.evaluate(()=>AIDENT_MOTION.ready);
  const replacementLogo='data:image/svg+xml;base64,'+(await fs.readFile(path.join(root,'assets/motion/mark.svg'))).toString('base64');
  const issues=await page.evaluate(async replacementLogo=>{
   const errors=[],rect=n=>n.getBoundingClientRect(),api=AIDENT_MOTION;
   api.seekSlide('paired-metrics',0);
   const cards=[...document.querySelectorAll('[data-id="paired-metrics"] .m-metric-card')];
   const a=rect(cards[0]),b=rect(cards[1]);
   if(a.height<329||b.height<329)errors.push('Metric cards must retain their 330px minimum height');
   if(Math.abs(a.width-b.width)>1||Math.abs(a.height-b.height)>1||Math.abs(a.y-b.y)>1||Math.abs(b.x-a.right-30)>1)errors.push('Paired metrics must share aligned Fill widths/heights and a 30px gap');
   for(const c of cards){if(getComputedStyle(c).textAlign!=='left')errors.push('Metric card text must align left');if(getComputedStyle(c.querySelector('.m-card-value')).fontSize!=='132px')errors.push('Metric value token drift');}
   api.seekSlide('pair-cta',0);const scene=document.querySelector('[data-id="pair-cta"]'),button=scene.querySelector('[data-motion="cta"]');
   if(scene.querySelector('h1,.m-lead'))errors.push('CTA must not add heading/body');
   if(getComputedStyle(button).fontSize!=='30px'||getComputedStyle(button).borderRadius!=='16px')errors.push('CTA typography/radius drift');
   if(button.tagName!=='A')errors.push('CTA link semantics lost');
   const arrowMatrix=new DOMMatrix(getComputedStyle(button.querySelector('.m-cta-icon')).transform);
   if(Math.abs(Math.atan2(arrowMatrix.b,arrowMatrix.a)*180/Math.PI-45)>.01)errors.push('CTA arrow must point upper-right, not up');
   const logos=[...scene.querySelectorAll('[data-motion^="logo-"]')],untouched=logos[1].outerHTML;
   const first=logos[0].querySelector('img');first.src=replacementLogo;await first.decode();api.layout();
   if(logos[1].outerHTML!==untouched)errors.push('Replacing one Logo changed its partner');
   const copy=button.querySelector('[data-motion="cta-text"]');copy.textContent=document.documentElement.lang==='zh'?'开始使用':'Start now';button.href='https://example.com/replaced';api.layout();
   if(rect(copy).right>rect(button).right-34||rect(copy).left<rect(button).left+34)errors.push('Replacement CTA does not hug padded text');
   button.style.backgroundColor='rgb(255, 0, 0)';api.seekSlide('pair-cta',1);if(button.style.backgroundColor!=='rgb(255, 0, 0)')errors.push('Player reset external CTA state');
   return errors;
  },replacementLogo);assert.deepEqual(issues,[]);
  await page.goto(pathToFileURL(path.join(root,`output/playwright/motion-promotional-${lang}/index.html`)).href+'?capture=1');await page.evaluate(()=>AIDENT_MOTION.ready);
  assert.equal(await page.locator('[data-id="explicit-dark-button"] [data-motion="cta"]').evaluate(n=>n.tagName),'BUTTON');
  await page.goto(url.replace('index.html','deck.single.html')+'?capture=1');await page.evaluate(()=>AIDENT_MOTION.ready);
  assert.equal(await page.locator('[data-id="brand-cta"] [data-motion="cta-text"]').count(),1);
  await page.close();
 }}finally{await browser.close();}
}
console.log('Promotional variants: bilingual paired metrics, hero number/word, single/pair CTA, palette sweep, regeneration and editable targets passed.');
