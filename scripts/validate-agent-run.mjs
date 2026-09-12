#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateMotion} from './lib/motion-deck.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
function parseArgs(argv){const a={phase:'initialized'};for(let i=2;i<argv.length;i++){if(argv[i]==='--run')a.run=argv[++i];else if(argv[i]==='--phase')a.phase=argv[++i];else if(argv[i]==='--help')a.help=true;else throw new Error(`Unknown argument: ${argv[i]}`)}return a}
const usage='Usage: node scripts/validate-agent-run.mjs --run /path/run --phase initialized|planning|assembled|release\n';
const args=parseArgs(process.argv);if(args.help){process.stdout.write(usage);process.exit(0)}if(!args.run)throw new Error(usage.trim());
if(!['initialized','planning','assembled','release'].includes(args.phase))throw new Error('Unknown validation phase.');
const runDir=path.resolve(args.run),errors=[],warnings=[];
const readJson=async rel=>{try{return JSON.parse(await fs.readFile(path.join(runDir,rel),'utf8'))}catch(error){errors.push(`${rel}: ${error.message}`);return null}};
const exists=async rel=>fs.stat(path.join(runDir,rel)).then(s=>s.isFile()||s.isDirectory()).catch(()=>false);
const run=await readJson('run.json');
const roles=JSON.parse(await fs.readFile(path.join(root,'agents/roles.json'),'utf8'));

if(run){
  if(run.version!==1)errors.push('run.json version must be 1.');
  if(!['en','zh'].includes(run.language))errors.push('run.json language must be en or zh.');
  if(!Array.isArray(run.formats)||!run.formats.length)errors.push('run.json formats must not be empty.');
  if(!await exists(run.briefFile||''))errors.push(`Brief file missing: ${run.briefFile}`);
}

const writes=[];
for(const role of roles.roles)for(const write of role.writes)writes.push({role:role.id,path:write.replace(/\/$/,'')});
for(let i=0;i<writes.length;i++)for(let j=i+1;j<writes.length;j++){
  const a=writes[i],b=writes[j];
  if(a.role===b.role)continue;
  if(a.path===b.path||a.path.startsWith(`${b.path}/`)||b.path.startsWith(`${a.path}/`))errors.push(`Write ownership overlaps: ${a.role}:${a.path} ↔ ${b.role}:${b.path}`);
}

for(const rel of ['handoffs/narrative.json','handoffs/assets.json','handoffs/notes.json'])if(!await exists(rel))errors.push(`Missing handoff template: ${rel}`);

let narrative,assets,notes,deck;
if(['planning','assembled','release'].includes(args.phase)){
  narrative=await readJson('handoffs/narrative.json');assets=await readJson('handoffs/assets.json');notes=await readJson('handoffs/notes.json');
  if(narrative?._status!=='complete')errors.push('Planning requires narrative._status:"complete".');
  if(!['complete','waived'].includes(assets?._status))errors.push('Planning requires assets._status:"complete" or "waived".');
  if(!['complete','waived'].includes(notes?._status))errors.push('Planning requires notes._status:"complete" or "waived".');
  if(!narrative?.deck||!Array.isArray(narrative.deck.slides)||!narrative.deck.slides.length)errors.push('Planning requires a completed narrative deck.');
  if(assets?._status!=='waived'&&(!assets?.slides||typeof assets.slides!=='object'))errors.push('Planning requires assets.slides or _status:"waived".');
  if(notes?._status!=='waived'&&(!notes?.slides||typeof notes.slides!=='object'))errors.push('Planning requires notes.slides or _status:"waived".');
}

function validateDeck(value){
  if(value?.meta?.mode==='motion'){errors.push(...validateMotion(value));return;}
  const allowed={cover:[1],points:[2,3,4,6],cards:[2,3,4,6],metrics:[2,3,4,6],workflow:[3,4],comparison:[2],'image-cards':[2,3],team:[3],'split-image-text':[1],'full-bleed':[1]};
  if(!value?.meta||!['en','zh'].includes(value.meta.language))errors.push('deck.json meta.language must be en or zh.');
  if(!Array.isArray(value?.slides)||!value.slides.length){errors.push('deck.json must contain slides.');return}
  const ids=new Set();
  for(const slide of value.slides){
    if(!slide.id||ids.has(slide.id))errors.push(`Missing or duplicate slide id: ${slide.id}`);ids.add(slide.id);
    if(!allowed[slide.type]){errors.push(`Unknown slide type: ${slide.type}`);continue}
    if(!['light','dark'].includes(slide.theme))errors.push(`Invalid theme on ${slide.id}.`);
    if(!slide.title)errors.push(`Missing title on ${slide.id}.`);
    const count=slide.items?.length||slide.steps?.length||1;if(!allowed[slide.type].includes(count))errors.push(`${slide.id}: ${slide.type} does not support ${count} items.`);
    if(slide.type!=='cover'&&slide.titleAlignment==='center')errors.push(`${slide.id}: only cover may center its title.`);
  }
}

if(['assembled','release'].includes(args.phase)){deck=await readJson('deck.json');if(deck)validateDeck(deck)}

if(args.phase==='release'&&run){
  const required=[];
  if(run.formats.some(f=>['html','web'].includes(f)))required.push(['output/web/index.html','qa/html-report.json']);
  if(run.formats.includes('single-html'))required.push(['output/web/deck.single.html','qa/html-report.json']);
  if(run.formats.includes('pdf'))required.push(['output/deck.pdf','qa/pdf-report.json']);
  if(run.formats.includes('pptx'))required.push(['output/deck.pptx','qa/pptx-report.json']);
  for(const pair of required)for(const rel of pair)if(!await exists(rel))errors.push(`Release artifact missing: ${rel}`);
  for(const rel of [...new Set(required.map(pair=>pair[1]))])if(await exists(rel)){const report=await readJson(rel);if(report&&!report.pass)errors.push(`QA report does not pass: ${rel}`)}
}

for(const warning of warnings)console.warn(`WARN ${warning}`);
for(const error of errors)console.error(`ERROR ${error}`);
console.log(`Multi-agent run validation (${args.phase}): ${errors.length} errors, ${warnings.length} warnings.`);
if(errors.length)process.exitCode=1;
