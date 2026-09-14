#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
const sharp=require(require.resolve('sharp',{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));
const themes=process.argv.includes('--themes');
for(const lang of ['en','zh']){
 const qa=path.join(root,`output/motion-${themes?'themes-':''}${lang}/qa`),report=JSON.parse(await fs.readFile(path.join(qa,'report.json'),'utf8'));
 if(report.errors.length)throw Error(`Cannot publish failed ${lang} preview`);
 const files=report.screenshots,columns=3,w=640,h=360,gap=24,rows=Math.ceil(files.length/columns);
 const composites=await Promise.all(files.map(async(file,i)=>({input:await sharp(file).resize(w,h).toBuffer(),left:gap+(i%columns)*(w+gap),top:gap+Math.floor(i/columns)*(h+gap)})));
 const output=path.join(root,`assets/previews/motion-${themes?'themes':'slides'}.${lang}.webp`);
 await sharp({create:{width:columns*(w+gap)+gap,height:rows*(h+gap)+gap,channels:4,background:'#141719'}}).composite(composites).webp({lossless:true}).toFile(output);
 console.log(`${lang}: ${files.length} matching layout previews -> ${output}`);
}
