#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv){const a={};for(let i=2;i<argv.length;i++){if(argv[i]==='--run')a.run=argv[++i];else if(argv[i]==='--out')a.out=argv[++i];else if(argv[i]==='--help')a.help=true;else throw new Error(`Unknown argument: ${argv[i]}`)}return a}
const usage='Usage: node scripts/assemble-agent-run.mjs --run /path/run [--out /path/run/deck.json]\n';
const args=parseArgs(process.argv);if(args.help){process.stdout.write(usage);process.exit(0)}if(!args.run)throw new Error(usage.trim());
const runDir=path.resolve(args.run),out=path.resolve(args.out||path.join(runDir,'deck.json'));
const readJson=async rel=>JSON.parse(await fs.readFile(path.join(runDir,rel),'utf8'));
const narrative=await readJson('handoffs/narrative.json');
const assets=await readJson('handoffs/assets.json');
const notes=await readJson('handoffs/notes.json');
if(narrative._status!=='complete')throw new Error('narrative.json must set _status:"complete" before assembly.');
if(!['complete','waived'].includes(assets._status))throw new Error('assets.json must set _status:"complete" or "waived" before assembly.');
if(!['complete','waived'].includes(notes._status))throw new Error('notes.json must set _status:"complete" or "waived" before assembly.');
if(!narrative.deck||!Array.isArray(narrative.deck.slides))throw new Error('narrative.json must contain a completed deck object.');
const deck=structuredClone(narrative.deck);
deck.meta=deck.meta||{};
const byId=new Map();
for(const slide of deck.slides){if(!slide.id)throw new Error('Every narrative slide requires an id.');if(byId.has(slide.id))throw new Error(`Duplicate slide id: ${slide.id}`);byId.set(slide.id,slide)}

function patchImages(targets,mapping,context){
  if(!mapping||typeof mapping!=='object'||Array.isArray(mapping))throw new Error(`${context}: image mapping must be an object`);
  for(const [id,patch] of Object.entries(mapping)){
    const target=targets.get(id);if(!target)throw new Error(`${context}: unknown image target ${id}`);
    if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>k!=='image')||!patch.image)throw new Error(`${context}/${id}: use an image-only patch`);
    target.image=patch.image;
  }
}

if(assets._status!=='waived'){
  if(!assets.slides||typeof assets.slides!=='object')throw new Error('assets.json must contain slides object or _status:"waived".');
  if(assets.brand?.logo)deck.meta.logo=assets.brand.logo;
  if(assets.brand?.rightText){deck.meta.header={...(deck.meta.header||{}),rightText:assets.brand.rightText}}
  for(const [slideId,patch] of Object.entries(assets.slides)){
    const slide=byId.get(slideId);if(!slide)throw new Error(`assets.json references unknown slide id: ${slideId}`);
    if(patch.image)slide.image=patch.image;
    if(deck.meta.mode==='motion'){
      if(patch.logos)slide.logos=patch.logos;
      if(patch.hub?.image)slide.hub={...slide.hub,image:patch.hub.image};
      if(patch.nodes!==undefined){
        if(slide.type!=='motion-tree')throw new Error(`Node image mapping requires motion-tree: ${slideId}`);
        const nodes=[slide.root,...(slide.branches||[]).flatMap(b=>[b,...(b.children||[])])];
        patchImages(new Map(nodes.filter(Boolean).map(n=>[n.id,n])),patch.nodes,`${slideId}/nodes`);
      }
      if(patch.platforms!==undefined){
        if(!Array.isArray(slide.platforms))throw new Error(`Platform image mapping requires an existing platform grid: ${slideId}`);
        patchImages(new Map(slide.platforms.map((p,i)=>[String(i),p])),patch.platforms,`${slideId}/platforms`);
      }
      if(patch.result!==undefined){
        if(!slide.result)throw new Error(`Result image mapping requires an existing result: ${slideId}`);
        patchImages(new Map([['result',slide.result]]),{result:patch.result},slideId);
      }
      if(patch.rows!==undefined){
        if(!patch.rows||typeof patch.rows!=='object'||Array.isArray(patch.rows)||!Array.isArray(slide.rows))throw new Error(`Row image mapping requires existing workflow rows: ${slideId}`);
        for(const [rowId,rowPatch] of Object.entries(patch.rows)){
          const row=slide.rows.find(r=>r.id===rowId);
          if(!row||!rowPatch||typeof rowPatch!=='object'||Object.keys(rowPatch).some(k=>k!=='items'))throw new Error(`Invalid workflow row image target: ${slideId}/${rowId}`);
          patchImages(new Map(row.items.map((v,i)=>[String(i),v])),rowPatch.items,`${slideId}/rows/${rowId}`);
        }
      }
    }
    if(patch.header)slide.header={...(slide.header||{}),...patch.header};
    if(patch.items){
      const items=slide.items||slide.steps;if(!Array.isArray(items))throw new Error(`Asset item mapping targets slide without items/steps: ${slideId}`);
      for(const [indexText,itemPatch] of Object.entries(patch.items)){
        const index=Number(indexText);if(!Number.isInteger(index)||!items[index])throw new Error(`Invalid item index ${indexText} for slide ${slideId}`);
        Object.assign(items[index],itemPatch);
      }
    }
  }
}

if(notes._status!=='waived'){
  if(!notes.slides||typeof notes.slides!=='object')throw new Error('notes.json must contain slides object or _status:"waived".');
  for(const [slideId,note] of Object.entries(notes.slides)){const slide=byId.get(slideId);if(!slide)throw new Error(`notes.json references unknown slide id: ${slideId}`);slide.notes=note}
}

await fs.mkdir(path.dirname(out),{recursive:true});
await fs.writeFile(out,JSON.stringify(deck,null,2)+'\n');
const runFile=path.join(runDir,'run.json');
const run=JSON.parse(await fs.readFile(runFile,'utf8'));
run.status='generating';
const handoffStatuses=new Map([
  ['narrative-architect',narrative._status],
  ['asset-curator',assets._status],
  ['speaker-notes-editor',notes._status]
]);
for(const role of run.roles||[]){
  const status=handoffStatuses.get(role.id);
  if(status==='complete')role.status='complete';
  else if(status==='waived')role.status='waived';
}
await fs.writeFile(runFile,JSON.stringify(run,null,2)+'\n');
console.log(`Assembled ${deck.slides.length} slides: ${out}`);
