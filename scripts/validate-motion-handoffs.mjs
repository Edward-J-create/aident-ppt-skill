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
const run=path.join(root,'output/motion-handoffs'),handoffs=path.join(run,'handoffs');
await fs.mkdir(handoffs,{recursive:true});
const image={alt:'Replacement',opticalScale:0.9};
// Use a known packaged asset rather than relying on any external artwork.
const catalog=await read(path.join(root,'examples/motion/deck.en.json'));
const replacement=catalog.slides.flatMap(s=>s.items||[]).find(v=>v.image)?.image;
assert.ok(replacement,'Catalogue needs a replaceable image fixture');
Object.assign(image,typeof replacement==='string'?{src:replacement}:replacement);
image.opticalScale=0.9;
for(const lang of ['en','zh']){
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
 await write('run.json',{status:'planning',roles:[]});
 await write('handoffs/assets.json',patch);
 const assemble=()=>spawnSync(process.execPath,[path.join(root,'scripts/assemble-agent-run.mjs'),'--run',run],{encoding:'utf8'});
 let response=assemble();assert.equal(response.status,0,response.stderr);
 const assembled=await read(path.join(run,'deck.json'));
 const expected=structuredClone(deck);
 const t=expected.slides.find(s=>s.id===tree.id);t.root.image=image;t.branches[0].image=image;t.branches[0].children[0].image=image;
 expected.slides.find(s=>s.id===grid.id).platforms[0].image=image;
 expected.slides.find(s=>s.id===result.id).result.image=image;
 expected.slides.find(s=>s.id===rows.id).rows[0].items[0].image=image;
 assert.deepEqual(assembled,expected,'Asset assembly changed content or topology');
 assert.deepEqual(validateMotion(assembled),[]);
 const input=path.join(root,`examples/motion/partner-launch.${lang}.json`),out=path.join(run,lang);
 await generateMotionDeck({input,out},assembled);
 if(process.argv.includes('--browser'))assert.equal((await preflightMotion(path.join(out,'index.html'))).errors.length,0);
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
console.log('Motion asset handoffs passed: bilingual tree IDs, platform indices, result and row images; copy/topology preserved; unknown targets and narrative edits rejected before output.');
