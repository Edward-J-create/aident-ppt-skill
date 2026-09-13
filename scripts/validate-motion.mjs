#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {validateMotion,registry,generateMotionDeck} from './lib/motion-deck.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFile(path.join(root,rel),'utf8').then(JSON.parse);
const en=await read('examples/motion/deck.en.json'),zh=await read('examples/motion/deck.zh.json');
assert.deepEqual(validateMotion(en),[]);assert.deepEqual(validateMotion(zh),[]);
assert.deepEqual(en.slides.map(s=>[s.id,s.type,s.variant,s.items?.length]),zh.slides.map(s=>[s.id,s.type,s.variant,s.items?.length]));
assert.deepEqual([...new Set(en.slides.map(s=>s.type))].sort(),Object.keys(registry.layouts).sort());
const bad=(mutate)=>{const d=structuredClone(en);mutate(d);assert.ok(validateMotion(d).length>0);};
bad(d=>d.slides[0].id=d.slides[1].id);
bad(d=>d.slides[0].highlight='not present');
bad(d=>d.slides[2].items.push(d.slides[2].items[0]));
bad(d=>d.slides[2].items[0].title='This title is intentionally much too long for a card');
bad(d=>d.slides[8].scroll.direction='down');
bad(d=>d.slides[8].items=[]);
bad(d=>d.slides[8].callout={body:'Wrong mode'});
bad(d=>d.slides[1].logos[0].src='https://example.com/logo.svg');
bad(d=>d.slides[1].title='Ignored text must fail');
bad(d=>d.slides[12].variant='four');
const mode=await read('references/motion/deck.schema.json');assert.ok(mode.$defs.slide.allOf.length===Object.keys(registry.layouts).length);
const routes=['references/motion/README.md','references/motion/scene-planning.md','references/motion/layouts.md','references/motion/content.md','references/motion/animation-handoff.md','references/motion/quality.md'];
for(const file of routes){const content=await fs.readFile(path.join(root,file),'utf8');for(const match of content.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)){const target=match[1];if(/^(?:https?:|#)/.test(target))continue;await fs.access(path.resolve(root,path.dirname(file),target));}}
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'aident-motion-contract-'));
const base={meta:{mode:'motion',language:'en',title:'List regression'},slides:[{id:'list',type:'motion-list',items:[{title:'First result'},{title:'Second result'}]}]};
const cases=[
 ['default',()=>{},true,'assets/motion/mark.svg'],
 ['custom',d=>d.meta.logo={src:'assets/logos/wordmark-light.svg'},true,'assets/logos/wordmark-light.svg'],
 ['none',d=>d.meta.showLogo=false,false],
 ['override',d=>{d.meta.showLogo=false;d.slides[0].showLogo=true;},true,'assets/motion/mark.svg'],
 ['slide-none',d=>d.slides[0].showLogo=false,false]
];
for(const [name,mutate,visible,src] of cases){
 const d=structuredClone(base);mutate(d);assert.deepEqual(validateMotion(d),[]);
 const out=path.join(temp,name);await generateMotionDeck({input:path.join(temp,'source.json'),out},d);
 const html=await fs.readFile(path.join(out,'index.html'),'utf8'),handoff=JSON.parse(await fs.readFile(path.join(out,'animation-handoff.json'),'utf8'));
 assert.equal(html.includes('class="m-list-logo'),visible);assert.ok(!html.includes('data-scroll-window'));
 assert.equal(handoff.listContract.internalClip,false);assert.equal(handoff.listContract.scrollDistance,null);
 if(src){assert.ok(html.includes(`src="${src}"`));await fs.access(path.join(out,src));}
 const timeline=JSON.parse(await fs.readFile(path.join(out,'timeline.json'),'utf8'));
 assert.equal(timeline.animationOwnership,'external');assert.equal(timeline.timingAdvisory,true);
 assert.deepEqual(timeline.slides[0].motion,{});assert.equal(timeline.slides[0].scroll.start,undefined);assert.equal(timeline.slides[0].scroll.end,undefined);
}
const missing=structuredClone(base);missing.meta.logo={src:'missing-custom-logo.svg'};
await assert.rejects(()=>generateMotionDeck({input:path.join(temp,'source.json'),out:path.join(temp,'missing')},missing),/Missing local asset/);
const css=await fs.readFile(path.join(root,'assets/runtime/motion.css'),'utf8');assert.ok(!css.includes('m-list-window'));assert.ok(!css.includes('mask-image'));
console.log(`Motion contracts: ${en.slides.length} EN + ${zh.slides.length} ZH, ${Object.keys(registry.layouts).length} families; default/custom/no-Logo, missing assets, camera-only lists, advisory-only timing and documentation links checked.`);
