#!/usr/bin/env node
// Mechanical extraction: preserve all original paths; remove only the outer surface.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),sharp=require(require.resolve('sharp',{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));
const manifest=JSON.parse(await fs.readFile(path.join(root,'assets/icons/manifest.json'),'utf8'));
const check=process.argv.includes('--check'),entries=[];
if(!check)await fs.mkdir(path.join(root,'assets/motion/icons'),{recursive:true});
for(const theme of ['light','dark'])for(const icon of manifest.icons){
 const source=`assets/icons/${theme}/${icon.name}.svg`,dest=`assets/motion/icons/${theme==='dark'?'dark/':''}${icon.name}.svg`;
 if(!check)await fs.mkdir(path.dirname(path.join(root,dest)),{recursive:true});
 const original=await fs.readFile(path.join(root,source),'utf8');
 const withoutSurface=original.replace(/<rect width="60" height="60" rx="(?:10|12)" fill="white"(?: fill-opacity="0.08")?\/>/,'');
 if(withoutSurface===original)throw Error('Cannot locate standard outer surface: '+source);
 const {data,info}=await sharp(Buffer.from(withoutSurface),{density:720}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>5){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 const scale=60/info.width,pad=1.2,w=(x1-x0+1)*scale,h=(y1-y0+1)*scale,side=Math.max(w,h)+pad*2;
 const view=[(x0+x1+1)*scale/2-side/2,(y0+y1+1)*scale/2-side/2,side,side].map(n=>n.toFixed(4)).join(' ');
 const svg=withoutSurface.replace('width="60" height="60" viewBox="0 0 60 60"',`width="46" height="46" viewBox="${view}"`);
 if(check){if(svg!==await fs.readFile(path.join(root,dest),'utf8'))throw Error('Motion glyph drift: '+dest);}else await fs.writeFile(path.join(root,dest),svg);
 entries.push({name:icon.name,theme,file:dest,source,box:46,viewBox:view,policy:'Original paths and source-theme colors; outer surface removed; square crop around measured alpha bounds plus 1.2 source-pixel margin.'});
}
const tokens=JSON.parse(await fs.readFile(path.join(root,'assets/tokens/motion.json'),'utf8'));
for(const name of ['arrow','curve','stem']){
 const source=tokens.assets[name],dest=`assets/motion/dark/${name}.svg`;
 const svg=(await fs.readFile(path.join(root,source),'utf8')).replaceAll('#008089',tokens.themes.dark.colors.accent);
 if(check){if(svg!==await fs.readFile(path.join(root,dest),'utf8'))throw Error('Dark connector drift: '+dest);}
 else {await fs.mkdir(path.dirname(path.join(root,dest)),{recursive:true});await fs.writeFile(path.join(root,dest),svg);}
}
{
 const source=tokens.assets.check,dest=tokens.assets.checkDark;
 const svg=(await fs.readFile(path.join(root,source),'utf8')).replaceAll('#0C8C22',tokens.themes.dark.colors.listAccent);
 if(check){if(svg!==await fs.readFile(path.join(root,dest),'utf8'))throw Error('Dark list check drift: '+dest);}
 else {await fs.mkdir(path.dirname(path.join(root,dest)),{recursive:true});await fs.writeFile(path.join(root,dest),svg);}
}
if(!check)await fs.writeFile(path.join(root,'assets/motion/icons/manifest.json'),JSON.stringify({version:1,icons:entries},null,2)+'\n');
console.log(`${check?'Verified':'Extracted'} ${entries.length} original motion glyphs; no paths redrawn.`);
