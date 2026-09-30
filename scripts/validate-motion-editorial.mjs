#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {generateMotionDeck,validateMotion} from './lib/motion-deck.mjs';
import {auditMotionEditorial} from './lib/motion-editorial.mjs';
import {preflightMotion} from './preflight-motion.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFile(p,'utf8').then(JSON.parse),browserMode=process.argv.includes('--browser');
const raw={meta:{mode:'motion',title:'Editorial checks'},slides:[{id:'hero',type:'motion-metric',variant:'hero-number',value:'1'}]};
assert.deepEqual(validateMotion(raw),[]);
for(const timing of [{policy:'fixed'},{policy:'content',targetSeconds:30},{policy:'target',targetSeconds:-1},null])assert.ok(validateMotion({...raw,meta:{...raw.meta,timing}}).length);
assert.ok(validateMotion({...raw,slides:[{...raw.slides[0],variant:'single'}]}).length);
assert.ok(validateMotion({...raw,slides:[{...raw.slides[0],framing:'balanced'}]}).length);
const editorial={meta:{language:'en',timing:{policy:'fixed',targetSeconds:30}},slides:[{id:'list',type:'motion-list',items:[{title:'Insurance claims',badge:'CLAIMS'}]}]};
const before=JSON.stringify(editorial),report=auditMotionEditorial(editorial,[{duration:42}]);
assert.ok(report.findings.some(f=>f.code==='redundant-copy'));
assert.ok(report.findings.some(f=>f.code==='fixed-duration-mismatch'));
assert.equal(JSON.stringify(editorial),before,'Editorial audit must not rewrite content');
let browser;
if(browserMode){const require=createRequire(import.meta.url),{chromium}=require(require.resolve('playwright',{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});}
try{for(const lang of ['en','zh']){
 const zh=lang==='zh',starter=await read(path.join(root,`examples/motion/starter.${lang}.json`)),ending=starter.slides.at(-1);
 assert.equal(ending.type,'motion-input');assert.equal(ending.variant,'compact');assert.equal(ending.prompt,'Follow https://aident.ai/SETUP.md');
 assert.equal(ending.theme,'light');assert.equal(ending.palette,'neutral');
 assert.notEqual(starter.slides.find(s=>s.id==='request').prompt,ending.prompt);
 const slides=[
  {id:'hero-bare',type:'motion-metric',variant:'hero-number',value:'1',palette:'lime',duration:3},
  {id:'hero-explained',type:'motion-metric',variant:'hero-number',value:'1',body:zh?'一个清晰的下一步':'One clear next step',duration:4},
  {id:'hero-word',type:'motion-metric',variant:'hero-word',value:zh?'清晰':'Clarity',theme:'dark',duration:4},
  {id:'hero-headed',type:'motion-metric',variant:'hero-number',title:zh?'保持上下文':'Keep the context',value:'1',duration:4}
 ];
 for(const [id,n,framing,logo]of [['one',1,'auto','mark'],['two',2,'balanced','lockup'],['four',4,'auto','lockup'],['long',8,'auto','mark'],['full',24,'scroll','mark'],['legacy',4,'legacy','mark']]){
  slides.push({id:`list-${id}`,type:'motion-list',variant:'plain',framing,image:{src:`assets/motion/${logo}.svg`},duration:n>4?12:5,items:Array.from({length:n},(_,i)=>({title:zh?`工作项 ${i+1}`:`Work item ${i+1}`,...(i%2?{body:zh?'保留清晰的责任分工。':'Keep ownership clear.'}:{})}))});
 }
 slides.push({...ending,id:'setup',duration:4});
 const deck={meta:{mode:'motion',language:lang,title:'Motion editorial regression',timing:{policy:'content'}},slides};
 const input=path.join(root,`examples/motion/starter.${lang}.json`),out=path.join(root,`output/playwright/motion-editorial-${lang}`);
 await generateMotionDeck({input,out,singleFile:true},deck);
 const timeline=await read(path.join(out,'timeline.json'));assert.ok(timeline.duration>30);assert.equal(timeline.duration,slides.reduce((s,v)=>s+v.duration,0));assert.equal(timeline.meta.timing.policy,'content');
 const html=await fs.readFile(path.join(out,'index.html'),'utf8');
 await generateMotionDeck({input,out},deck);assert.equal(await fs.readFile(path.join(out,'index.html'),'utf8'),html);
 // Explicit alternative ending remains editable; no renderer rewrites it back to Setup.
 const changed={meta:deck.meta,slides:[{...ending,prompt:zh?'运行我的自定义配置':'Run my custom setup'}]};
 const customOut=path.join(out,'custom');await generateMotionDeck({input,out:customOut},changed);assert.equal((await read(path.join(customOut,'deck.resolved.json'))).slides[0].prompt,changed.slides[0].prompt);
 if(!browserMode)continue;
 assert.equal((await preflightMotion(path.join(out,'index.html'),path.join(out,'qa'))).errors.length,0);
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 await page.goto(pathToFileURL(path.join(out,'index.html')).href+'?capture=1');await page.evaluate(()=>AIDENT_MOTION.ready);
 const issues=await page.evaluate(async()=>{
  const errors=[],api=AIDENT_MOTION;
  for(const id of ['hero-bare','hero-explained','hero-word']){api.seekSlide(id,0);const s=document.querySelector('.slide.is-active'),m=s.querySelector('.m-metric'),r=m.getBoundingClientRect();if(s.querySelector('.m-heading'))errors.push(id+': ghost heading');if(Math.abs(r.y+r.height/2-540)>1)errors.push(id+': uncentered group');}
  for(const id of ['one','two','four']){api.seekSlide('list-'+id,0);const n=document.querySelector('.slide.is-active [data-list-scene]'),r=n.getBoundingClientRect();if(Math.abs(r.y+r.height/2-540)>1)errors.push(id+': list not balanced');if(r.y<109||r.bottom>971)errors.push(id+': short list not fully inside safe zone');}
  api.seekSlide('list-long',0);const n=document.querySelector('.slide.is-active [data-list-scene]');if(n.dataset.framingResolved!=='scroll'||n.offsetTop!==140||n.querySelectorAll('[data-list-item]').length!==8)errors.push('Long list content/framing lost');
  const baseline=n.offsetTop;n.style.transform='translateY(-3000px)';api.seekSlide('list-long',2);api.seekSlide('list-long',0);if(!n.style.transform.includes('-3000')||n.offsetTop!==baseline)errors.push('Player overrode external list travel');n.style.transform='';
  api.seekSlide('list-two',0);const scene=document.querySelector('.slide.is-active [data-list-scene]'),im=scene.querySelector('.m-list-logo');
  for(const [w,h]of [[900,90],[100,400]]){im.src='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#008089"/></svg>`);await im.decode();api.layout();const r=scene.getBoundingClientRect();if(Math.abs(r.y+r.height/2-540)>1||Math.abs(im.offsetWidth/im.offsetHeight-w/h)>.1)errors.push('Replacement logo imbalance/ratio');if(Math.abs(scene.querySelector('.m-list-identity').offsetHeight-im.offsetHeight)>1)errors.push('Phantom identity slot');}
  return errors;
 });assert.deepEqual(issues,[]);
 // Regeneration + added scene must preserve ending copy and grow total, not normalize to30s.
 const extra={...deck,slides:[...deck.slides.slice(0,-1),{id:'extra',type:'motion-title',title:zh?'增加一个真实步骤':'One additional real step',duration:7},deck.slides.at(-1)]};
 await generateMotionDeck({input,out:path.join(out,'expanded')},extra);assert.equal((await read(path.join(out,'expanded/timeline.json'))).duration,timeline.duration+7);
 // Explicit balanced overflow must fail rather than crop or silently shrink.
 const negative={meta:deck.meta,slides:[{...slides.find(s=>s.id==='list-long'),framing:'balanced'}]};
 const no=path.join(out,'negative');await generateMotionDeck({input,out:no},negative);assert.ok((await preflightMotion(path.join(no,'index.html'))).errors.some(s=>s.includes('Balanced list exceeds')));
 await page.close();
}}finally{await browser?.close();}
console.log('Motion editorial regression passed: EN/ZH, title-free heroes, list framing/replacement, timing growth, immutable audit and Setup CTA.');
