#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateMotion,generateMotionDeck} from './lib/motion-deck.mjs';
import {normalizeMotionImage} from './lib/normalize-motion-image.mjs';
import {preflightMotion} from './preflight-motion.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=p=>fs.readFile(p,'utf8').then(JSON.parse);
const decks=await Promise.all(['en','zh'].map(l=>read(path.join(root,`examples/motion/partner-launch.${l}.json`))));
assert.deepEqual(decks[0].slides.map(s=>[s.id,s.type,s.variant]),decks[1].slides.map(s=>[s.id,s.type,s.variant]));
const bad=fn=>{const d=structuredClone(decks[0]);fn(d);assert.ok(validateMotion(d).length,'Invalid partner input accepted');};
bad(d=>d.slides[1].platforms.push(d.slides[1].platforms[0]));
bad(d=>d.slides[1].platformColumns=2);
bad(d=>d.slides[1].platformColumns=9.5);
bad(d=>d.slides[1].title='No crowded headline');
bad(d=>d.slides[1].platforms[0].image.src='https://example.com/icon.svg');
bad(d=>d.slides[1].animation={prompt:'typewriter'});
bad(d=>d.slides[1].value='Many');
bad(d=>d.slides[3].branches[0].children[1].id=d.slides[3].root.id);
bad(d=>d.slides[3].branches[0].children=[]);
bad(d=>d.slides[3].branches=[null]);
bad(d=>d.slides[3].root.id=123);
bad(d=>d.slides[4].result.density='small');
bad(d=>d.slides[0].logos[0].opticalScale=2);
bad(d=>d.slides[0].animation={unregistered:'fade'});
const out=path.join(root,'output/motion-partner'),temp=await fs.mkdtemp(path.join(os.tmpdir(),'motion-image-'));
const original=path.join(temp,'padded.svg'),normalized=path.join(temp,'normalized.svg');
const artwork='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><defs><linearGradient id="color"><stop stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/></linearGradient></defs><path d="M3 3h18v18H3z" fill="url(#color)"/></svg>';
await fs.writeFile(original,artwork);
await normalizeMotionImage(original,normalized);
const norm=await fs.readFile(normalized,'utf8');
assert.equal(await fs.readFile(original,'utf8'),artwork,'Original asset changed');
assert.equal(norm.slice(norm.indexOf('<defs>')),artwork.slice(artwork.indexOf('<defs>')),'Paths/colors changed');
await assert.rejects(normalizeMotionImage(original,original));
const require=createRequire(import.meta.url),sharp=require(require.resolve('sharp',{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));
const raster=path.join(temp,'padded.png'),rasterOut=path.join(temp,'normalized.png');
const pixels=Buffer.alloc(12*12*4);for(let y=3;y<9;y++)for(let x=3;x<9;x++){pixels[(y*12+x)*4]=123;pixels[(y*12+x)*4+3]=255;}
await sharp(pixels,{raw:{width:12,height:12,channels:4}}).png().toFile(raster);await normalizeMotionImage(raster,rasterOut,{padding:0});
const cropped=await sharp(rasterOut).raw().toBuffer({resolveWithObject:true});assert.equal(cropped.info.width,6);assert.equal(cropped.info.height,6);assert.equal(cropped.data[0],123);
for(const d of decks){
 assert.deepEqual(validateMotion(d),[]);
 const lang=d.meta.language,input=path.join(root,`examples/motion/partner-launch.${lang}.json`),dest=path.join(out,lang);
 await generateMotionDeck({input,out:dest,singleFile:true},d);
 const handoff=await read(path.join(dest,'animation-handoff.json'));assert.equal(handoff.version,4);assert.equal(handoff.animationRequests.length,4);
 assert.equal(handoff.layers.filter(l=>/^reach\/platform-[0-9]+$/.test(l.id)).length,18);
 assert.equal(handoff.layers.filter(l=>l.id.startsWith('invoke/connector-')&&!l.id.endsWith('-path')).length,5);
 const first=await fs.readFile(path.join(dest,'index.html'),'utf8');await generateMotionDeck({input,out:dest,singleFile:true},d);assert.equal(await fs.readFile(path.join(dest,'index.html'),'utf8'),first);
 if(process.argv.includes('--browser'))assert.equal((await preflightMotion(path.join(dest,'index.html'),path.join(dest,'qa'))).errors.length,0);
 const sweep={meta:d.meta,slides:[]};
 for(const count of [2,3,14,15,18])for(const theme of ['light','dark']){
  const s=structuredClone(d.slides[1]);Object.assign(s,{id:`grid-${theme}-${count}`,theme,palette:theme==='dark'?'cobalt':'lime',platforms:s.platforms.slice(0,count)});s.platforms[0].image={src:normalized};sweep.slides.push(s);
 }
 // Tiny natural dimensions must enlarge to the same role as large intrinsic art.
 const tools={id:'tiny-tools',type:'motion-list',showLogo:false,items:[{title:lang==='en'?'Independent product icons':'独立产品图标',tools:[{src:original},{src:normalized}]}]};sweep.slides.push(tools);
 for(const count of [2,3,4])for(const branchCount of [1,2])for(const theme of ['light','dark']){
  const v=structuredClone(d.slides[3]);Object.assign(v,{id:`tree-${theme}-${branchCount}-${count}`,theme});
  const branch=v.branches[0];v.branches=Array.from({length:branchCount},(_,i)=>({...branch,id:`branch-${i}`,children:branch.children.slice(0,count).map((c,j)=>({...c,id:`leaf-${i}-${j}`,...(branchCount===2&&count===4?{title:lang==='en'?'Distribution':'跨平台分发器'}:{})}))}));sweep.slides.push(v);
 }
 const sweepOut=path.join(out,`sweep-${lang}`);await generateMotionDeck({input,out:sweepOut},sweep);
 if(process.argv.includes('--browser'))assert.equal((await preflightMotion(path.join(sweepOut,'index.html'))).errors.length,0);
}
if(process.argv.includes('--browser')){
 const {chromium}=require(require.resolve('playwright',{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  for(const lang of ['en','zh']){
   await page.goto(pathToFileURL(path.join(out,`sweep-${lang}/index.html`)).href+'?capture=1');await page.evaluate(()=>AIDENT_MOTION.ready);
   const sizes=await page.locator('[data-id="tiny-tools"] .m-tool-logo').evaluateAll(images=>images.map(i=>[i.offsetWidth,i.offsetHeight]));assert.deepEqual(sizes,[[44,44],[44,44]]);
   await page.goto(pathToFileURL(path.join(out,lang,'deck.single.html')).href+'?capture=1');await page.evaluate(()=>AIDENT_MOTION.ready);assert.equal(await page.locator('[data-motion="platform-grid"]').count(),1);
   assert.equal(await page.locator('[data-id="results"] .m-result-value').first().evaluate(n=>getComputedStyle(n).fontSize),'32px');
   const bound=await page.evaluate(()=>{
    AIDENT_MOTION.seekSlide('invoke',0);const tree=document.querySelector('[data-id="invoke"] [data-tree]'),leaf=tree.querySelector('[data-depth="2"]'),before=leaf.offsetWidth;
    leaf.querySelector('.m-tree-title').textContent=document.documentElement.lang==='zh'?'研究工具':'Research';AIDENT_MOTION.layout();
    const rect=leaf.getBoundingClientRect(),origin=tree.getBoundingClientRect(),edge=tree.querySelector(`[data-to="${leaf.dataset.nodeId}"] path`),end=edge.getPointAtLength(edge.getTotalLength());
    return {changed:leaf.offsetWidth!==before,dx:Math.abs(origin.x+end.x-(rect.left+rect.right)/2),dy:Math.abs(origin.y+end.y-rect.top)};
   });assert.ok(bound.changed);assert.ok(bound.dx<2&&bound.dy<2,'Tree edge detached after live text replacement');

  }
 }finally{await browser.close();}
 // Deliberately restore the old overflowing horizontal node markup: preflight must reject.
 const input=path.join(root,'examples/motion/partner-launch.en.json'),negative=path.join(out,'negative');
 await generateMotionDeck({input,out:negative},{meta:decks[0].meta,slides:[{id:'overflow-node',type:'motion-hub',title:'Content must fit',hub:{title:'Hub'},items:[{title:'Loadout',label:'APPROVED PLAN'},{title:'Social destinations',label:'SCHEDULED POSTS'}]}]});
 const file=path.join(negative,'index.html');let html=await fs.readFile(file,'utf8');html=html.replace('</head>','<style>.m-node-copy{flex-direction:row;flex:none;max-width:none}.m-node-copy .m-node-label{font-size:36px}</style></head>');await fs.writeFile(file,html);
 const report=await preflightMotion(file);assert.ok(report.errors.some(e=>e.includes('Text outside padded component')),'Escaped node text passed preflight');
}
console.log('Partner launch contracts passed: bilingual grids, three-tier branching workflows, whitespace preparation, optical sizing, prominent results, animation requests, regeneration, single-file export and node-overflow rejection.');
