#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateMotion,generateMotionDeck} from './lib/motion-deck.mjs';
import {preflightMotion} from './preflight-motion.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFile(p,'utf8').then(JSON.parse);
const base=path.join(root,'output/motion-handoffs');
await fs.mkdir(base,{recursive:true});
const fresh=await fs.mkdtemp(path.join(base,'run-'));
const brief=path.join(fresh,'brief.md');await fs.writeFile(brief,'Generic Motion asset handoff integration QA.');
const invoke=(script,args)=>spawnSync(process.execPath,[path.join(root,'scripts',script),...args],{encoding:'utf8'});
const image={alt:'Replacement',opticalScale:0.9};
// Use a known packaged asset rather than relying on any external artwork.
const catalog=await read(path.join(root,'examples/motion/deck.en.json'));
const replacement=catalog.slides.flatMap(s=>s.items||[]).find(v=>v.image)?.image;
assert.ok(replacement,'Catalogue needs a replaceable image fixture');
Object.assign(image,typeof replacement==='string'?{src:replacement}:replacement);
image.opticalScale=0.9;
for(const lang of ['en','zh']){
 const run=path.join(fresh,lang);
 let response=invoke('init-multi-agent-run.mjs',['--brief',brief,'--out',run,'--language',lang,'--formats','html,single-html']);
 assert.equal(response.status,0,response.stderr);
 const phase=p=>invoke('validate-agent-run.mjs',['--run',run,'--phase',p]);
 const assemble=()=>invoke('assemble-agent-run.mjs',['--run',run]);
 assert.equal(phase('initialized').status,0);
 assert.notEqual(phase('planning').status,0,'Pending handoffs passed planning');
 assert.notEqual(assemble().status,0,'Pending handoffs passed assembly');
 const deck=await read(path.join(root,`examples/motion/partner-launch.${lang}.json`));
 const full=await read(path.join(root,`examples/motion/themes.${lang}.json`));
 const rows=structuredClone(full.slides.find(s=>s.type==='motion-workflow'&&s.variant==='rows'));
 assert.ok(rows);rows.id='row-assets';deck.slides.push(rows);
 const tree=deck.slides.find(s=>s.type==='motion-tree'),grid=deck.slides.find(s=>s.platforms),result=deck.slides.find(s=>s.result);
 const patch={_status:'complete',slides:{
  [tree.id]:{nodes:{[tree.root.id]:{image},[tree.branches[0].id]:{image},[tree.branches[0].children[0].id]:{image}}},
  [grid.id]:{platforms:{'0':{image}}},
  [result.id]:{result:{image}},
  [rows.id]:{rows:{[rows.rows[0].id]:{items:{'0':{image}}}}}
 }};
 const write=async(name,value)=>fs.writeFile(path.join(run,name),JSON.stringify(value));
 await write('handoffs/narrative.json',{_status:'complete',deck});
 await write('handoffs/notes.json',{_status:'waived'});
 await write('handoffs/assets.json',patch);
 assert.equal(phase('planning').status,0);
 response=assemble();assert.equal(response.status,0,response.stderr);
 assert.equal(phase('assembled').status,0);
 assert.notEqual(phase('release').status,0,'Missing generated artifacts passed release');
 const assembled=await read(path.join(run,'deck.json'));
 const expected=structuredClone(deck);
 const t=expected.slides.find(s=>s.id===tree.id);t.root.image=image;t.branches[0].image=image;t.branches[0].children[0].image=image;
 expected.slides.find(s=>s.id===grid.id).platforms[0].image=image;
 expected.slides.find(s=>s.id===result.id).result.image=image;
 expected.slides.find(s=>s.id===rows.id).rows[0].items[0].image=image;
 assert.deepEqual(assembled,expected,'Asset assembly changed content or topology');
 assert.deepEqual(validateMotion(assembled),[]);
 const input=path.join(root,`examples/motion/partner-launch.${lang}.json`),out=path.join(run,'output/web');
 await generateMotionDeck({input,out,singleFile:true},assembled);
 assert.notEqual(phase('release').status,0,'Missing QA signoff passed release');
 if(process.argv.includes('--browser')){
  const report=await preflightMotion(path.join(out,'index.html'));
  assert.equal(report.errors.length,0);
  await write('qa/html-report.json',{pass:true,scope:'Generated generic integration fixtures; browser geometry checked, not a production narrative approval',artifacts:['output/web/index.html','output/web/deck.single.html'],report});
  response=phase('release');assert.equal(response.status,0,response.stderr);
 }
 const published=await fs.readFile(path.join(run,'deck.json'),'utf8');
 for(const mutate of [
  p=>{p.slides[tree.id].nodes={missing:{image}};},
  p=>{p.slides[tree.id].nodes[tree.root.id].title='Overwrite narrative';},
  p=>{p.slides[grid.id].platforms={'99':{image}};},
  p=>{p.slides[grid.id].platforms={'00':{image}};},
  p=>{p.slides[deck.slides[0].id]={nodes:{missing:{image}}};},
  p=>{p.slides[rows.id].rows={missing:{items:{'0':{image}}}};}
 ]){
  const invalid=structuredClone(patch);mutate(invalid);await write('handoffs/assets.json',invalid);
  response=assemble();assert.notEqual(response.status,0,'Malformed image mapping was accepted');
  assert.equal(await fs.readFile(path.join(run,'deck.json'),'utf8'),published,'Failed assembly replaced the completed deck');
 }
 await write('handoffs/assets.json',patch);
}
console.log('Motion asset handoffs passed: fresh initialized/planning/assembled/release lifecycle, bilingual tree IDs, platform indices, result and row images; copy/topology preserved; pending handoffs, unknown targets and narrative edits rejected before output.');
