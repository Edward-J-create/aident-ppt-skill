import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';

// Explicit asset preparation only. Never recolor or redraw a third-party mark.
export async function normalizeMotionImage(input,output,{padding=0.02}={}){
 if(!Number.isFinite(padding)||padding<0||padding>0.1)throw Error('padding must be 0–0.1');
 if(path.resolve(input)===path.resolve(output))throw Error('Use a separate normalized output; preserve the original asset');
 const require=createRequire(import.meta.url),sharp=require(require.resolve('sharp',{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));
 const svg=path.extname(input).toLowerCase()==='.svg',bytes=await fs.readFile(input);
 if(svg&&path.extname(output).toLowerCase()!=='.svg')throw Error('SVG normalization must preserve SVG output');
 if(!svg&&path.extname(output).toLowerCase()!=='.png')throw Error('Raster normalization uses lossless PNG output');
 const source=svg?bytes.toString('utf8'):null,tag=source?.match(/<svg\b[^>]*>/)?.[0],view=tag?.match(/viewBox=["']([^"']+)["']/)?.[1].trim().split(/[\s,]+/).map(Number);
 if(svg&&(!view||view.length!==4||view.some(v=>!Number.isFinite(v))||view[2]<=0||view[3]<=0))throw Error('SVG requires a valid viewBox');
 const {data,info}=await sharp(bytes).resize({width:1024,height:1024,fit:'inside'}).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=info.width,y0=info.height,x1=-1,y1=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<0)throw Error('Image has no visible pixels');
 await fs.mkdir(path.dirname(path.resolve(output)),{recursive:true});
 if(svg){
  const x=view[0]+x0/info.width*view[2],y=view[1]+y0/info.height*view[3],w=(x1-x0+1)/info.width*view[2],h=(y1-y0+1)/info.height*view[3],pad=Math.max(w,h)*padding;
  const box=[x-pad,y-pad,w+2*pad,h+2*pad].map(n=>Number(n.toFixed(6)));
  let next=tag.replace(/viewBox=["'][^"']+["']/,`viewBox="${box.join(' ')}"`).replace(/\s(?:width|height)=["'][^"']+["']/g,'');
  next=next.replace('<svg',`<svg width="64" height="${Number((64*box[3]/box[2]).toFixed(6))}"`);
  await fs.writeFile(output,source.replace(tag,next));
  return {input,output,viewBox:box,policy:'Only root viewport attributes changed; original paths, gradients and colors retained.'};
 }
 // Sharp trim/extract uses original pixels; detect bounds at original resolution to avoid resampling.
 const {data:raw,info:meta}=await sharp(bytes).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 x0=meta.width;y0=meta.height;x1=-1;y1=-1;
 for(let y=0;y<meta.height;y++)for(let x=0;x<meta.width;x++)if(raw[(y*meta.width+x)*4+3]>0){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 const pad=Math.ceil(Math.max(x1-x0+1,y1-y0+1)*padding);
 await sharp(bytes).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).extend({top:pad,bottom:pad,left:pad,right:pad,background:{r:0,g:0,b:0,alpha:0}}).png().toFile(output);
 return {input,output,policy:'Transparent margins removed; original raster pixels and colors retained in lossless PNG.'};
}
