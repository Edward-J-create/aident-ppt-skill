#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {generateMotionDeck,validateMotion,resolveSynthesis} from './lib/motion-deck.mjs';
import {auditSynthesis} from './lib/synthesis-audit.mjs';
import {preflightMotion} from './preflight-motion.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),dest=path.resolve(args.includes('--out')?args[args.indexOf('--out')+1]:path.join(root,'output/synthesis-regression'));
assert.ok(dest!==root&&dest!==path.parse(dest).root,'Use a dedicated output directory');
const browserMode=args.includes('--browser');
for(const lang of ['en','zh']){
 const zh=lang==='zh',words=zh?['原始记录','观察到的事实','比较观点','核对证据']:['Notes','Observed facts','Compare views','Check evidence'];
 const groups=(counts)=>counts.map(n=>Array.from({length:n},(_,i)=>({title:words[i%words.length],tone:'neutral'})));
 const cases=[
  ['default-peers',[2,2,2],undefined],
  ['left-peers',[2,3,2],{align:'left'}],
  ['row-groups',[2,3,2],{arrangement:'rows'}],
  ['keyword-wrap',[4,4],{arrangement:'wrap',size:'medium',align:'left'}],
  ['compact-four',[2,2,2,2],{size:'small',density:'compact'}],
  ['single-group',[2],{align:'center'}],
  ['output-emphasis',[2,2],{outputSize:'large'}],
  ['semantic-roles',[2,2],{align:'left'}]
 ];
 const deck={meta:{mode:'motion',language:lang,title:zh?'标签组合回归':'Tag composition regression'},slides:cases.map(([id,counts,composition])=>({id,type:'motion-synthesis',title:zh?'让信息形成清晰结果':'Make the result clear',...(composition?{composition}:{}),groups:groups(counts),outputs:[{title:zh?'下一步行动':'Next action',tone:'accent'}],notes:{purpose:id==='semantic-roles'?'Intentional heading/detail roles: first row medium, second row small.':'Geometry fixture; inspect alignment and hierarchy, not animation.'}}))};
 deck.slides.at(-1).groups.forEach(g=>g[1].size='small');
 assert.deepEqual(validateMotion(deck),[]);assert.equal(resolveSynthesis(deck.slides[0]).align,'center');assert.equal(resolveSynthesis(deck.slides[0]).size,'medium');
 for(const bad of [{align:'right'},{arrangement:'random'},{arrangement:'wrap',tagWidth:'fill'},{size:'auto'}]){const d=structuredClone(deck);d.slides[0].composition=bad;assert.ok(validateMotion(d).length);}
 const out=path.join(dest,lang);await generateMotionDeck({input:path.join(dest,'fixtures.json'),out},deck);
 if(browserMode){const report=await preflightMotion(path.join(out,'index.html'),path.join(out,'qa'));assert.equal(report.errors.length,0,`${lang} composition QA failed`);}
}
if(browserMode){
 const require=createRequire(import.meta.url),{chromium}=require(require.resolve('playwright',{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));
 const executable=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 const exists=await fs.access(executable).then(()=>true).catch(()=>false),browser=await chromium.launch({headless:true,...(exists?{executablePath:executable}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});await page.goto(pathToFileURL(path.join(dest,'en/index.html')).href+'?capture=1');await page.evaluate(()=>AIDENT_MOTION.ready);
  // ElementHandle argument is required by evaluate; keep all selectors scoped to the current scene.
  const inspect=async()=>page.evaluate(auditSynthesis,await page.$('.slide.is-active'));
  assert.deepEqual((await inspect()).errors,[]);
  await page.evaluate(()=>document.querySelector('.is-active .m-tag').style.width='60%');assert.ok((await inspect()).errors.some(e=>e.includes('width')),'Unequal Fill width must fail');
  await page.reload();await page.evaluate(()=>AIDENT_MOTION.ready);await page.evaluate(()=>document.querySelector('.is-active .m-tag').style.justifyContent='flex-start');assert.ok((await inspect()).errors.some(e=>e.includes('alignment')),'Mixed alignment must fail');
  await page.reload();await page.evaluate(()=>AIDENT_MOTION.ready);
  for(const copy of ['Short','Evidence validation','新的输入记录']){
   await page.evaluate(copy=>{document.querySelector('.is-active .m-tag-text').textContent=copy;AIDENT_MOTION.layout();},copy);assert.deepEqual((await inspect()).errors,[],`Live replacement failed: ${copy}`);
  }
  await page.evaluate(()=>{document.querySelector('.is-active .m-tag-text').textContent='A deliberately oversized label that cannot fit inside this scene';AIDENT_MOTION.layout();});assert.ok((await inspect()).errors.length,'Oversized replacement must fail, not be silently shrunk');
 }finally{await browser.close();}
}
console.log(`Synthesis regression: 8 compositions × EN/ZH passed${browserMode?'; unequal widths, mixed alignment and oversized text correctly rejected; live replacements passed':''}.`);
