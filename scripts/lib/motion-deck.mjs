import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {skillRoot,copyPackagedAsset,writeRuntimeFonts,inlineHtml,escapeHtml as esc,normalizeImage} from '../generate-deck.mjs';

export const tokens=JSON.parse(await fs.readFile(path.join(skillRoot,'assets/tokens/motion.json'),'utf8'));
export const registry=JSON.parse(await fs.readFile(path.join(skillRoot,'assets/components/motion-registry.json'),'utf8'));
const txt=v=>String(v??'').trim();
const len=v=>Array.from(txt(v)).length;
const pick=(v,a,d)=>a.includes(v)?v:d;
const keys={
 root:['meta','slides'],meta:['mode','title','language','brandName','logo','fps'],
 slide:['id','type','variant','title','kicker','highlight','body','value','label','prompt','items','groups','outputs','hub','logos','separator','image','background','duration','motion','scroll','showCursor','showSend','notes'],
 item:['id','title','body','label','badge','tone','image','checked','size'],
 motion:['enter','stagger','hold','exit','travel','preset'],scroll:['enabled','start','end','reveal','direction','itemDirection','itemOrder'],
 image:['src','alt','fit','position'],notes:['title','purpose','talk','transition']
};
export function validateMotion(deck){
 const errors=[],add=s=>errors.push(s),unknown=(v,k,p)=>{if(v&&typeof v==='object'&&!Array.isArray(v))for(const x of Object.keys(v))if(!keys[k].includes(x))add(`${p}.${x}: unknown field`);};
 if(!deck||typeof deck!=='object'||Array.isArray(deck))return ['Deck must be an object.'];
 unknown(deck,'root','deck');unknown(deck.meta,'meta','meta');
 if(!deck.meta||typeof deck.meta!=='object')return ['meta is required.'];
 if(deck.meta.mode&&deck.meta.mode!=='motion')add('meta.mode must be motion.');
 if(!['en','zh',undefined].includes(deck.meta.language))add('meta.language must be en or zh.');
 if(!txt(deck.meta.title))add('meta.title is required.');
 if(deck.meta.fps!==undefined&&![24,25,30,50,60].includes(deck.meta.fps))add('meta.fps must be 24/25/30/50/60.');
 const zh=deck.meta.language==='zh',ids=new Set();
 function image(v,p){if(v===undefined)return;const im=normalizeImage(v);if(!im||typeof im.src!=='string'||!im.src.trim()){add(`${p}.src is required`);return;}unknown(im,'image',p);if(im.fit&&!['contain','cover'].includes(im.fit))add(`${p}.fit must be contain/cover`);if(im.position&&!/^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/.test(im.position))add(`${p}.position must be two percentages`);if(/^(?:https?:|data:|javascript:)/i.test(im.src))add(`${p}: use a local PNG/JPEG/WebP/SVG for offline, deterministic capture`);if(!/\.(?:svg|png|jpe?g|webp)$/i.test(im.src))add(`${p}: unsupported image format`);}
 image(typeof deck.meta.logo==='object'&&!deck.meta.logo?.src?undefined:deck.meta.logo,'meta.logo');
 if(deck.meta.logo&&typeof deck.meta.logo==='object'&&!deck.meta.logo.src){for(const k of Object.keys(deck.meta.logo))if(!['light','dark'].includes(k))add(`meta.logo.${k}: unknown field`);for(const k of ['light','dark'])image(deck.meta.logo[k],`meta.logo.${k}`);}
 if(!Array.isArray(deck.slides)||!deck.slides.length)return [...errors,'slides must be a nonempty array'];
 deck.slides.forEach((s,i)=>{
  const p=`slides[${i}]`;if(!s||typeof s!=='object'){add(`${p} must be an object`);return;}unknown(s,'slide',p);
  const rule=registry.layouts[s.type];if(!rule){add(`${p}.type is not a motion layout`);return;}
  const base=['id','type','variant','background','duration','motion','notes'];
  const extras={'motion-title':['kicker'],'motion-input':['showCursor','showSend'],'motion-image':['kicker'],'motion-metric':['kicker'],'motion-hub':['kicker']};
  const used=new Set([...base,...rule.fields,...(extras[s.type]||[])]);
  for(const key of Object.keys(s))if(!used.has(key))add(`${p}.${key} has no visible or behavioral slot in ${s.type}`);
  if(s.type==='motion-image'&&s.variant==='hero'&&s.body)add(`${p}: body is available only in split image mode`);
  if(s.type==='motion-input'&&s.variant!=='compact'&&(s.label||s.image))add(`${p}: input label/logo belongs to compact mode`);
  if(!/^[a-z0-9][a-z0-9-]*$/.test(s.id||'')||ids.has(s.id))add(`${p}.id must be unique kebab-case`);ids.add(s.id);
  if(s.variant&&!rule.variants.includes(s.variant))add(`${p}.variant must be ${rule.variants.join('/')}`);
  if(s.background&&!Object.hasOwn(tokens.backgrounds,s.background))add(`${p}.background must be content/title/elements`);
  const titleRequired=!['motion-brand','motion-input','motion-list'].includes(s.type);
  if(titleRequired&&!txt(s.title))add(`${p}.title is required`);
  if(len(s.title)>(s.type==='motion-title'?(zh?26:80):(zh?17:44)))add(`${p}.title exceeds ${zh?'Chinese':'English'} budget; shorten the takeaway`);
  if(s.highlight&&(!txt(s.title).includes(s.highlight)||s.type!=='motion-title'))add(`${p}.highlight must be an exact substring of a motion-title`);
  if(len(s.kicker)>(zh?24:56))add(`${p}.kicker too long`);
  for(const field of ['title','kicker','body','value','label','prompt','separator','highlight'])if(s[field]!==undefined&&typeof s[field]!=='string')add(`${p}.${field} must be text`);
  if(s.duration!==undefined&&(!Number.isFinite(s.duration)||s.duration<2||s.duration>180))add(`${p}.duration must be 2–180 seconds`);
  unknown(s.motion,'motion',`${p}.motion`);
  for(const k of ['enter','stagger','hold','exit','travel'])if(s.motion?.[k]!==undefined&&(!Number.isFinite(s.motion[k])||s.motion[k]<0))add(`${p}.motion.${k} must be a nonnegative number`);
  if(s.motion?.preset&&!['rise','fade','none'].includes(s.motion.preset))add(`${p}.motion.preset must be rise/fade/none`);
  if((s.motion?.travel??24)>80)add(`${p}: motion travel maximum is 80px`);
  unknown(s.scroll,'scroll',`${p}.scroll`);
  if(s.scroll&&s.type!=='motion-list')add(`${p}.scroll applies only to motion-list`);
  if(s.scroll?.direction&&s.scroll.direction!=='up')add(`${p}: whole-list scrolling direction must be up`);
  if(s.scroll?.itemDirection&&!['up','down','fade'].includes(s.scroll.itemDirection))add(`${p}.scroll.itemDirection must be up/down/fade`);
  if(s.scroll?.itemOrder&&!['top-to-bottom','bottom-to-top'].includes(s.scroll.itemOrder))add(`${p}.scroll.itemOrder is invalid`);
  if(s.scroll?.reveal&&!['sequential','all'].includes(s.scroll.reveal))add(`${p}.scroll.reveal must be sequential/all`);
  for(const k of ['start','end'])if(s.scroll?.[k]!==undefined&&(!Number.isFinite(s.scroll[k])||s.scroll[k]<0))add(`${p}.scroll.${k} must be a nonnegative number`);
  for(const k of ['showCursor','showSend'])if(s[k]!==undefined&&typeof s[k]!=='boolean')add(`${p}.${k} must be boolean`);
  for(const k of ['enabled'])if(s.scroll?.[k]!==undefined&&typeof s.scroll[k]!=='boolean')add(`${p}.scroll.${k} must be boolean`);
  const n=s.items?.length;
  if(['motion-cards','motion-comparison','motion-hub'].includes(s.type)&&!rule.counts.includes(n))add(`${p} requires ${rule.counts.join('/')} items`);
  if(s.type==='motion-hub'&&s.variant&&n!==(s.variant==='three'?3:4))add(`${p}: hub variant and satellite count disagree`);
  if(s.type==='motion-list'&&(!n||n>24))add(`${p}: list requires 1–24 items`);
  if(s.type==='motion-input'&&(!txt(s.prompt)||len(s.prompt)>(s.variant==='compact'?(zh?30:66):(zh?70:150))))add(`${p}.prompt is empty or exceeds its layout budget`);
  if(s.type==='motion-metric'&&(!txt(s.value)||len(s.value)>12))add(`${p}.value requires 1–12 characters`);
  if(s.type==='motion-image'&&!s.image)add(`${p}.image is required`);
  if(len(s.body)>(zh?65:160))add(`${p}.body too long`);
  if(s.type==='motion-brand'&&(!Array.isArray(s.logos)||![1,2].includes(s.logos.length)))add(`${p}.logos requires 1 or 2 local logo images`);
  if(s.type==='motion-brand'&&s.variant&&s.logos?.length!==(s.variant==='pair'?2:1))add(`${p}: brand variant and logo count disagree`);
  if(s.type==='motion-synthesis'&&(!Array.isArray(s.groups)||s.groups.length!==3||!Array.isArray(s.outputs)||![1,2,3].includes(s.outputs.length)))add(`${p}: synthesis requires 3 groups and 1–3 outputs`);
  if(s.type==='motion-hub'&&!s.hub)add(`${p}.hub is required`);
  function item(v,ref){
   if(!v||typeof v!=='object'||Array.isArray(v)){add(`${ref} must be an object`);return;}unknown(v,'item',ref);
   if(!txt(v.title)&&!v.image)add(`${ref} needs title or image`);
   for(const field of ['id','title','body','label','badge','tone','size'])if(v[field]!==undefined&&typeof v[field]!=='string')add(`${ref}.${field} must be text`);
   const titleMax=s.type==='motion-cards'?(zh?(n===4?6:10):(n===4?16:n===3?22:28)):s.type==='motion-hub'?(zh?10:22):(zh?22:48);
   if(len(v.title)>titleMax)add(`${ref}.title exceeds ${titleMax} characters`);
   if(len(v.body)>(zh?48:100))add(`${ref}.body exceeds budget`);
   if(len(v.label)>(zh?14:28)||len(v.badge)>(zh?8:16))add(`${ref}: label/badge exceeds budget`);
   if(v.tone&&!['standard','muted','accent',...Object.keys(tokens.tags)].includes(v.tone))add(`${ref}.tone invalid`);
   if(v.size&&!['small','medium','large'].includes(v.size))add(`${ref}.size invalid`);
   if(v.checked!==undefined&&typeof v.checked!=='boolean')add(`${ref}.checked must be boolean`);
   image(v.image,`${ref}.image`);
  }
  if(s.items&&!Array.isArray(s.items))add(`${p}.items must be an array`);else s.items?.forEach((v,j)=>item(v,`${p}.items[${j}]`));
  if(Array.isArray(s.groups))s.groups.forEach((g,j)=>{if(!Array.isArray(g)||g.length<1||g.length>4)add(`${p}.groups[${j}] requires 1–4 tags`);else g.forEach((v,k)=>{item(v,`${p}.groups[${j}][${k}]`);if(len(v.title)>(zh?8:24))add(`${p}.groups[${j}][${k}] tag too long`);});});
  if(Array.isArray(s.outputs))s.outputs.forEach((v,j)=>{item(v,`${p}.outputs[${j}]`);if(len(v.title)>(zh?10:22))add(`${p}.outputs[${j}] too long`);});
  if(s.hub)item(s.hub,`${p}.hub`);
  image(s.image,`${p}.image`);if(Array.isArray(s.logos))s.logos.forEach((v,j)=>image(v,`${p}.logos[${j}]`));
  unknown(s.notes,'notes',`${p}.notes`);
  if(s.notes?.talk!==undefined&&(!Array.isArray(s.notes.talk)||s.notes.talk.some(v=>typeof v!=='string')))add(`${p}.notes.talk must be an array of strings`);
 });
 return errors;
}

async function materialize(deck,inputDir,outDir){
 const seen=new Map();
 async function image(v){if(!v)return v;const im=normalizeImage(v);let src=im.src;
  if(/^assets\/icons\/light\/[a-z-]+\.svg$/.test(src))src=src.replace('assets/icons/light/','assets/motion/icons/');
  if(seen.has(src))return {...im,src:seen.get(src)};
  const local=path.resolve(inputDir,src);let resolved;
  if(await fs.stat(local).then(s=>s.isFile()).catch(()=>false)){
   const bytes=await fs.readFile(local),name=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16)+path.extname(local).toLowerCase();
   resolved=`assets/user/${name}`;await fs.mkdir(path.join(outDir,'assets/user'),{recursive:true});await fs.writeFile(path.join(outDir,resolved),bytes);
  }else if(src.startsWith('assets/')){await copyPackagedAsset(src,outDir);resolved=src;}else throw Error(`Missing local asset: ${src}`);
  seen.set(src,resolved);return {...im,src:resolved};
 }
 if(deck.meta.logo){if(typeof deck.meta.logo==='object'&&!deck.meta.logo.src){deck.meta.logo=await image(deck.meta.logo.light||deck.meta.logo.dark);}else deck.meta.logo=await image(deck.meta.logo);}
 for(const s of deck.slides){s.image=await image(s.image);if(s.logos)s.logos=await Promise.all(s.logos.map(image));
  for(const item of [...(s.items||[]),...(s.groups||[]).flat(),...(s.outputs||[]),...(s.hub?[s.hub]:[])])item.image=await image(item.image);
 }
 return deck;
}

const node=(id,cls,content,extra='')=>`<div class="${cls}" data-motion="${esc(id)}" ${extra}>${content}</div>`;
function img(v,cls='media',logo=false){const i=normalizeImage(v);return i?`<img class="${cls}${logo?' replaceable-logo':''}" src="${esc(i.src)}" alt="${esc(i.alt||'')}" style="object-fit:${logo?'contain':pick(i.fit,['contain','cover'],'contain')};object-position:${esc(i.position||'50% 50%')}">`:'';}
const p=(v,cls,one=false)=>txt(v)?`<p class="${cls}"${one?' data-one-line':''}>${esc(v)}</p>`:'';
const label=v=>p(v,'m-label',true);
function title(s){let t=esc(s.title);if(s.highlight)t=t.replace(esc(s.highlight),`<span class="m-highlight">${esc(s.highlight)}</span>`);return `<header class="m-heading" data-motion="heading">${p(s.kicker,'m-kicker',true)}<h1 class="${s.type==='motion-title'?'m-statement':'m-title'}"${s.type!=='motion-title'?' data-one-line':''}>${t}</h1></header>`;}
function tag(t,size='medium',i=0){return node(`tag-${i}`,`m-tag tone-${t.tone||'neutral'} size-${t.size||size}`,p(t.title,'m-tag-text',true));}
function card(t,i){return node(`card-${i}`,`m-card tone-${t.tone||'standard'}`,label(t.label)+img(t.image,'m-card-icon',true)+p(t.title,'m-item-title',true)+p(t.body,'m-body'));}
function list(s,meta){const logo=s.image||meta.logo;return `${logo?node('identity','m-list-identity',img(logo,'m-list-logo',true)):''}<div class="m-list-window" data-scroll-window><div class="m-list-track" data-scroll-track>${s.items.map((t,i)=>`<article class="m-list-row ${t.tone==='accent'?'is-accent':''}" data-list-item="${i}">${(s.variant==='checked'||t.checked)&&t.checked!==false?`<span class="m-check">${img({src:tokens.assets.check})}</span>`:''}${img(t.image,'m-list-item-image',true)}<div class="m-list-copy">${p(t.title,'m-list-title',true)}${p(t.body,'m-body')}</div>${p(t.badge,'m-badge',true)}</article>`).join('')}</div></div>`;}
function input(s){const compact=s.variant==='compact';return node('input',`m-input-wrap ${compact?'compact':'multiline'}`,`<div class="m-input">${compact?img(s.image,'m-input-logo',true)+p(s.label,'m-input-label',true):''}<p class="m-input-text"${compact?' data-one-line':''}>${esc(s.prompt)}</p>${s.showSend===false?'':`<div class="m-send">${img({src:tokens.assets.send})}</div>`}</div>`)+(s.showCursor?node('cursor','m-cursor',img({src:tokens.assets.cursor})): '');}
function synthesis(s){return `<div class="m-synthesis ${s.variant==='many-to-few'?'many-to-few':'stages'}"><div class="m-tag-panel">${s.groups.map((g,j)=>`<div class="m-tag-column">${g.map((t,i)=>tag(t,s.variant==='many-to-few'?'small':['small','medium','large'][j],`${j}-${i}`)).join('')}</div>`).join('')}</div>${node('connector','m-synthesis-arrow',img({src:tokens.assets.arrow}))}<div class="m-outputs ${s.outputs.length>1?'m-tag-panel':''}">${s.outputs.map((t,i)=>tag(t,'large',`out-${i}`)).join('')}</div></div>`;}
function hub(s){const four=s.items.length===4;return `<div class="m-hub ${four?'four':'three'}"><div class="m-connector-layer" aria-hidden="true">${Array.from({length:four?4:2},(_,i)=>node(`connector-${i}`,`m-curve curve-${i}`,img({src:tokens.assets.curve}))).join('')}${four?'':node('connector-2','m-stem',img({src:tokens.assets.stem}))}</div>${node('hub','m-hub-center',img(s.hub.image,'m-hub-logo',true)+p(s.hub.title,'m-hub-text',true))}${s.items.map((t,i)=>node(`satellite-${i}`,`m-satellite satellite-${i}`,img(t.image,'m-satellite-logo',true)+p(t.title,'m-node-title',true)+p(t.label,'m-node-label',true))).join('')}</div>`;}
function render(s,meta,i){
 const layout=registry.layouts[s.type];let body='';
 switch(s.type){
 case 'motion-title':body=title(s);break;
 case 'motion-brand':body=`<div class="m-brands">${s.logos.map((v,j)=>(j?node('separator','m-brand-separator',p(s.separator||'×','m-separator')):'')+node(`logo-${j}`,'m-brand-slot',img(v,'m-brand-logo',true))).join('')}</div>`;break;
 case 'motion-cards':case 'motion-comparison':body=title(s)+`<div class="m-cards" style="--columns:${s.items.length}">${s.items.map(card).join('')}</div>`;break;
 case 'motion-input':body=input(s);break;
 case 'motion-list':body=list(s,meta);break;
 case 'motion-synthesis':body=title(s)+synthesis(s);break;
 case 'motion-hub':body=title(s)+hub(s);break;
 case 'motion-image':body=title(s)+(s.variant==='hero'?node('image','m-hero-image',img(s.image)): `<div class="m-split">${node('copy','m-split-copy',p(s.body,'m-lead'))}${node('image','m-split-image',img(s.image))}</div>`);break;
 case 'motion-metric':body=title(s)+node('metric','m-metric',label(s.label)+p(s.value,'m-metric-value',true)+p(s.body,'m-lead'));break;
 }
 const bg=s.background||(['motion-title','motion-brand'].includes(s.type)?'title':s.type==='motion-synthesis'?'elements':'content');
 return `<section class="slide motion-slide ${s.type}" data-id="${esc(s.id)}" data-type="${s.type}" data-index="${i}" data-theme="light" aria-hidden="true" aria-label="${esc(s.title||s.notes?.title||s.id)}"><img class="background" src="${tokens.backgrounds[bg]}" alt="">${bg==='title'?'':`<img class="texture" src="assets/textures/light-overlay.webp" alt="">`}<div class="m-canvas">${body}</div></section>`;
}

function cssTokens(lang){const t=tokens;let css=':root{';for(const [k,v] of Object.entries(t.colors))css+=`--m-${k}:${v};`;
 for(const [k,v] of Object.entries(t.type[lang]))css+=`--m-${k}-font:"${v.family}";--m-${k}-size:${v.size}px;--m-${k}-weight:${v.weight};--m-${k}-lh:${v.lineHeight};--m-${k}-tracking:${v.tracking}em;`;
 css+='}';for(const [k,v] of Object.entries(t.tags))css+=`.tone-${k}{--tag-fill:${v.fill};--tag-color:${v.text}}`;return css;
}

export async function generateMotionDeck(args,raw){
 const errors=validateMotion(raw);if(errors.length)throw Error(`Motion content validation failed:\n- ${errors.join('\n- ')}`);
 const inputDir=path.dirname(args.input),outDir=path.resolve(args.out);
 if(outDir===skillRoot||outDir===path.parse(outDir).root||outDir===inputDir)throw Error('Use a dedicated output folder separate from the source JSON and Skill.');
 await fs.mkdir(outDir,{recursive:true});
 const deck=await materialize(structuredClone(raw),inputDir,outDir);deck.meta={...deck.meta,mode:'motion',language:deck.meta.language||'en',fps:deck.meta.fps||tokens.motion.fps};
 let start=0;
 const timeline=deck.slides.map(s=>{
  const m={...tokens.motion,...s.motion};
  const listExtra=s.type==='motion-list'?Math.max(0,s.items.length*(tokens.list.rowMinHeight+tokens.list.gap)-tokens.list.gap-tokens.list.windowHeight)/tokens.motion.scrollPixelsPerSecond:0;
  const duration=s.duration||Math.max(registry.layouts[s.type].duration,m.enter+m.hold+listExtra+2+m.exit);
  const scrollStart=s.scroll?.start??1.4,scrollEnd=s.scroll?.end??duration-1.4;
  if(s.type==='motion-list'&&(scrollEnd<=scrollStart||scrollEnd>duration-.3))throw Error(`${s.id}: scroll.end must exceed start and leave at least .3 seconds before slide end`);
  if(m.enter+m.exit>=duration)throw Error(`${s.id}: entrance and exit leave no visible hold`);
  const itemCount=s.items?.length||1;if(m.enter+(itemCount-1)*m.stagger+m.exit>=duration&&s.type!=='motion-list')throw Error(`${s.id}: stagger sequence exceeds slide duration`);
  const entry={id:s.id,type:s.type,start,duration,end:start+duration,motion:m,scroll:{enabled:true,reveal:'sequential',direction:'up',itemDirection:'fade',itemOrder:'top-to-bottom',...s.scroll,start:scrollStart,end:scrollEnd},notes:s.notes||{}};start+=duration;return entry;
 });
 const data={meta:deck.meta,slides:timeline,duration:start,fps:deck.meta.fps};
 const layers=[];
 const slideHtml=deck.slides.map((s,i)=>{
  let n=0;
  return render(s,deck.meta,i).replace(/<(div|p|h1|img|article|header|span)\b([^>]*)>/g,(full,tag,attrs)=>{
   const component=attrs.match(/data-motion="([^"]+)"/)?.[1];
   const row=attrs.match(/data-list-item="([^"]+)"/)?.[1];
   const kind=tag==='img'?'image':['p','h1'].includes(tag)?'text':component?'component':row!==undefined?'list-item':'layout';
   const id=`${s.id}/${component|| (row!==undefined?'row-'+row:kind+'-'+n++)}`;
   layers.push({id,slideId:s.id,kind,selector:`[data-layer="${id}"]`,...(tag==='img'?{src:attrs.match(/src="([^"]+)"/)?.[1]}:{})});
   return `<${tag}${attrs} data-layer="${id}"${kind==='text'?' data-editable="text"':kind==='image'?' data-editable="image"':''}>`;
  });
 }).join('\n');
 let html=await fs.readFile(path.join(skillRoot,'assets/templates/motion-shell.html'),'utf8');
 html=html.replaceAll('{{LANG}}',deck.meta.language).replace('{{TITLE}}',esc(deck.meta.title)).replace('{{SLIDES}}',slideHtml).replace('{{DECK_JSON}}',JSON.stringify(data).replace(/</g,'\\u003c'));
 for(const rel of new Set([...slideHtml.matchAll(/src="(assets\/[^"#?]+)"/g)].map(m=>m[1])))await copyPackagedAsset(rel,outDir);
 await writeRuntimeFonts(deck,outDir);await fs.mkdir(path.join(outDir,'assets/runtime'),{recursive:true});
 const css=await fs.readFile(path.join(skillRoot,'assets/runtime/motion.css'),'utf8');
 await fs.writeFile(path.join(outDir,'assets/runtime/deck.css'),css.replace('@import url("../fonts/fonts.css");','@import url("../fonts/fonts.css");\n'+cssTokens(deck.meta.language)));
 await fs.copyFile(path.join(skillRoot,'assets/runtime/motion.js'),path.join(outDir,'assets/runtime/deck.js'));
 await fs.writeFile(path.join(outDir,'index.html'),html);
 if(args.singleFile)await fs.writeFile(path.join(outDir,'deck.single.html'),await inlineHtml(html,outDir));
 await fs.writeFile(path.join(outDir,'deck.resolved.json'),JSON.stringify(deck,null,2)+'\n');
 await fs.writeFile(path.join(outDir,'timeline.json'),JSON.stringify(data,null,2)+'\n');
 await fs.writeFile(path.join(outDir,'animation-handoff.json'),JSON.stringify({version:1,mode:'motion',canvas:tokens.canvas,fps:data.fps,duration:data.duration,html:'index.html',content:'deck.resolved.json',timeline:'timeline.json',editMode:'?external=1&capture=1',runtimeGlobal:'AIDENT_MOTION',layers,assets:[...new Set(layers.filter(l=>l.src).map(l=>l.src))],fontManifest:'assets/fonts/manifest.json',listContract:{itemOrder:'top-to-bottom',trackDirection:'up',clipSelector:'[data-scroll-window]',trackSelector:'[data-scroll-track]',itemSelector:'[data-list-item]',overflow:'intentional inside the clipped track only'}},null,2)+'\n');
 console.log(`Generated ${deck.slides.length} Motion Slides (${start.toFixed(2)} seconds, ${data.fps} fps) at ${outDir}`);
}
