#!/usr/bin/env node
// Report source-package bytes, separately from ignored local QA output.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ignored=new Set(['.git','output','node_modules','.tmp','.DS_Store','__pycache__']);
const files=[];
async function walk(relative=''){
 for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
  if(ignored.has(entry.name)||entry.name.endsWith('.pyc'))continue;
  const name=path.join(relative,entry.name);
  if(entry.isDirectory())await walk(name);
  else if(entry.isFile())files.push({path:name,bytes:(await fs.stat(path.join(root,name))).size});
 }
}
await walk();
const bytes=files.reduce((sum,file)=>sum+file.bytes,0),groups={};
for(const file of files){const parts=file.path.split(path.sep),group=parts[0]==='assets'?parts.slice(0,2).join('/'):parts[0];groups[group]=(groups[group]||0)+file.bytes;}
console.log(JSON.stringify({scope:'Uncompressed source package; excludes Git history, dependencies and local QA output',files:files.length,bytes,MB:+(bytes/1e6).toFixed(2),groups:Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([path,bytes])=>({path,MB:+(bytes/1e6).toFixed(2)}))},null,2));
const index=process.argv.indexOf('--max-mb');
if(index!==-1){const max=Number(process.argv[index+1]);if(!Number.isFinite(max)||max<=0)throw Error('--max-mb requires a positive decimal MB limit');if(bytes>max*1e6){console.error(`Package exceeds requested ${max} MB budget`);process.exitCode=1;}}
