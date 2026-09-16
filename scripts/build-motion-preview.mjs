#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const sharp=require(require.resolve('sharp',{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));
const themes=process.argv.includes('--themes');
const promotional=process.argv.includes('--promotional');
const manifestPath=path.join(root,'assets/previews/manifest.json');
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
for(const lang of ['en','zh']){
 const qa=path.join(root,`output/motion-${promotional?'promotional-':themes?'themes-':''}${lang}/qa`),report=JSON.parse(await fs.readFile(path.join(qa,'report.json'),'utf8'));
 if(report.errors.length)throw Error(`Cannot publish failed ${lang} preview`);
 const files=report.screenshots,columns=3,w=640,h=360,gap=24,rows=Math.ceil(files.length/columns);
 const composites=await Promise.all(files.map(async(file,i)=>({input:await sharp(file).resize(w,h).toBuffer(),left:gap+(i%columns)*(w+gap),top:gap+Math.floor(i/columns)*(h+gap)})));
 const output=path.join(root,`assets/previews/motion-${promotional?'promotional':themes?'themes':'slides'}.${lang}.webp`);
 await sharp({create:{width:columns*(w+gap)+gap,height:rows*(h+gap)+gap,channels:4,background:'#141719'}}).composite(composites).webp({lossless:true}).toFile(output);
 const family=promotional?'promotional':themes?'themes':'slides';
 const entry={id:`motion-${family}-${lang}`,path:path.relative(root,output).split(path.sep).join('/'),width:columns*(w+gap)+gap,height:rows*(h+gap)+gap,purpose:`${lang==='en'?'English':'Chinese'} Motion ${family}: ${files.length} browser-verified scenes${promotional?'; end cards use Light/neutral only':''}`,runtimeRequired:false,derivedFrom:`examples/motion/${promotional?'promotional':themes?'themes':'deck'}.${lang}.json browser preflight screenshots`};
 const index=manifest.items.findIndex(item=>item.path===entry.path);
 if(index<0)manifest.items.push(entry);else manifest.items[index]=entry;
 console.log(`${lang}: ${files.length} matching layout previews -> ${output}`);
}
manifest.version=4;
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
