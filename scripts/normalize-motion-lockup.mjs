#!/usr/bin/env node
// Keep the approved lockup subtree byte-for-byte; discard export-only canvas layers.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const file=fileURLToPath(new URL('../assets/motion/lockup.svg',import.meta.url));
const source=await fs.readFile(file,'utf8');
function element(start,tag){
 const re=new RegExp(`<${tag}\\b[^>]*>|</${tag}>`,'g');re.lastIndex=start;let depth=0;
 for(let m;(m=re.exec(source));){depth+=m[0].startsWith('</')?-1:m[0].endsWith('/>')?0:1;if(!depth)return source.slice(start,re.lastIndex);}
 throw Error(`Unclosed ${tag}`);
}
const start=source.indexOf('<g id="Logo/Lockup">');
if(start<0)throw Error('Expected approved Logo/Lockup group');
const body=element(start,'g'),definitions=new Map();
function collect(xml){
 for(const m of xml.matchAll(/url\(#([^)]+)\)|(?:xlink:)?href="#([^"]+)"/g)){
  const id=m[1]||m[2];if(definitions.has(id))continue;
  const re=new RegExp(`<([\\w:.-]+)\\b[^>]*\\bid="${id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]*>`),hit=re.exec(source);
  if(!hit)throw Error(`Missing definition ${id}`);
  const def=element(hit.index,hit[1]);definitions.set(id,def);collect(def);
 }
}
collect(body);
const svg=source.match(/<svg\b[^>]*>/)[0]+'\n'+body+'\n<defs>\n'+[...definitions.values()].join('\n')+'\n</defs>\n</svg>\n';
if(/<text\b|(?:xlink:)?href="https?:|id="Motion slides"|fill="#1E1E1E"/.test(svg))throw Error('Unexpected live lettering, external resource or canvas layer');
if(!svg.includes('id="Logo/Mark"')||!svg.includes('id="Aident"')||!svg.includes('id="Loadout"'))throw Error('Incomplete identity');
if(process.argv.includes('--check')){if(svg!==source)throw Error('Lockup requires normalization');}
else await fs.writeFile(file,svg);
console.log(`Approved lockup ${process.argv.includes('--check')?'verified':'normalized'}; artwork preserved, SHA256 ${crypto.createHash('sha256').update(svg).digest('hex')}`);
