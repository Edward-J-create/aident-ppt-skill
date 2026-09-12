#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateMotion,registry} from './lib/motion-deck.mjs';
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
const routes=['references/motion/README.md','references/motion/layouts.md','references/motion/content.md','references/motion/animation-handoff.md','references/motion/quality.md'];
for(const file of routes){const content=await fs.readFile(path.join(root,file),'utf8');for(const match of content.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)){const target=match[1];if(/^(?:https?:|#)/.test(target))continue;await fs.access(path.resolve(root,path.dirname(file),target));}}
console.log(`Motion contracts: ${en.slides.length} EN + ${zh.slides.length} ZH examples, ${Object.keys(registry.layouts).length} layout families; malformed content rejected and documentation links checked.`);
