import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {skillRoot,copyPackagedAsset,writeRuntimeFonts,inlineHtml,escapeHtml as esc,normalizeImage} from '../generate-deck.mjs';

export const tokens=JSON.parse(await fs.readFile(path.join(skillRoot,'assets/tokens/motion.json'),'utf8'));
export const registry=JSON.parse(await fs.readFile(path.join(skillRoot,'assets/components/motion-registry.json'),'utf8'));
const sendSvg=(await fs.readFile(path.join(skillRoot,tokens.assets.send),'utf8')).replace(/ id="[^"]*"/g,'').replace('stroke="white"','stroke="currentColor"').replace('<svg ','<svg class="m-send-icon" data-motion="send-icon" aria-hidden="true" ');
const txt=v=>String(v??'').trim();
const len=v=>Array.from(txt(v)).length;
const pick=(v,a,d)=>a.includes(v)?v:d;
const keys={
 root:['meta','slides'],meta:['mode','title','language','brandName','logo','showLogo','fps','theme','palette'],
 slide:['id','type','variant','title','kicker','highlight','body','value','label','prompt','items','groups','outputs','composition','hub','connections','send','logos','separator','image','background','duration','motion','scroll','showLogo','showCursor','showSend','result','notes'],
 send:['state','ariaLabel'],connection:['id','from','to','slot'],
 composition:['arrangement','size','outputSize','tagWidth','align','groupAlign','density'],
 item:['id','title','body','label','badge','tone','image','checked','size','tools'],
 motion:['enter','stagger','hold','exit','travel','preset'],scroll:['enabled','start','end','reveal','direction','itemDirection','itemOrder'],
 image:['src','alt','fit','position','variants'],notes:['title','purpose','talk','transition']
};
keys.slide.push('theme','rows','showCaret','palette');
const themeFor=(s,meta)=>s.theme||meta.theme||'light';
const paletteFor=(s,meta)=>s.palette||meta.palette||'neutral';
const backgroundFor=(s,meta)=>s.background||(paletteFor(s,meta)!=='neutral'?'brand':themeFor(s,meta)==='dark'?'solid':['motion-title','motion-brand'].includes(s.type)?'title':s.type==='motion-synthesis'?'elements':'content');
export function validateMotion(deck){
 const errors=[],add=s=>errors.push(s),unknown=(v,k,p)=>{if(v&&typeof v==='object'&&!Array.isArray(v))for(const x of Object.keys(v))if(!keys[k].includes(x))add(`${p}.${x}: unknown field`);};
 if(!deck||typeof deck!=='object'||Array.isArray(deck))return ['Deck must be an object.'];
 unknown(deck,'root','deck');unknown(deck.meta,'meta','meta');
 if(!deck.meta||typeof deck.meta!=='object')return ['meta is required.'];
 if(deck.meta.mode&&deck.meta.mode!=='motion')add('meta.mode must be motion.');
 if(!['en','zh',undefined].includes(deck.meta.language))add('meta.language must be en or zh.');
 if(!txt(deck.meta.title))add('meta.title is required.');
 if(deck.meta.fps!==undefined&&![24,25,30,50,60].includes(deck.meta.fps))add('meta.fps must be 24/25/30/50/60.');
 if(deck.meta.showLogo!==undefined&&typeof deck.meta.showLogo!=='boolean')add('meta.showLogo must be boolean.');
 if(deck.meta.theme!==undefined&&!Object.hasOwn(tokens.themes,deck.meta.theme))add('meta.theme must be light/dark.');
 if(deck.meta.palette!==undefined&&!Object.hasOwn(tokens.palettes,deck.meta.palette))add('meta.palette must be neutral/teal/cobalt/lime.');
 const zh=deck.meta.language==='zh',ids=new Set();
 function image(v,p){if(v===undefined)return;const im=normalizeImage(v);if(!im||typeof im.src!=='string'||!im.src.trim()){add(`${p}.src is required`);return;}unknown(im,'image',p);if(im.fit&&!['contain','cover'].includes(im.fit))add(`${p}.fit must be contain/cover`);if(im.position&&!/^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/.test(im.position))add(`${p}.position must be two percentages`);if(/^(?:https?:|data:|javascript:)/i.test(im.src))add(`${p}: use a local PNG/JPEG/WebP/SVG for offline, deterministic capture`);if(!/\.(?:svg|png|jpe?g|webp)$/i.test(im.src))add(`${p}: unsupported image format`);}
 image(typeof deck.meta.logo==='object'&&!deck.meta.logo?.src?undefined:deck.meta.logo,'meta.logo');
 if(deck.meta.logo&&typeof deck.meta.logo==='object'&&!deck.meta.logo.src){for(const k of Object.keys(deck.meta.logo))if(!['light','dark'].includes(k))add(`meta.logo.${k}: unknown field`);for(const k of ['light','dark'])image(deck.meta.logo[k],`meta.logo.${k}`);}
 if(!Array.isArray(deck.slides)||!deck.slides.length)return [...errors,'slides must be a nonempty array'];
 deck.slides.forEach((s,i)=>{
  const p=`slides[${i}]`;if(!s||typeof s!=='object'){add(`${p} must be an object`);return;}unknown(s,'slide',p);
  const rule=registry.layouts[s.type];if(!rule){add(`${p}.type is not a motion layout`);return;}
  const base=['id','type','variant','background','duration','motion','notes','theme','palette'];
  const extras={'motion-title':['kicker'],'motion-input':['showCursor','showSend'],'motion-image':['kicker'],'motion-metric':['kicker'],'motion-hub':['kicker'],'motion-list':['showLogo']};
  const used=new Set([...base,...rule.fields,...(extras[s.type]||[])]);
  if(s.type==='motion-input')used.add('showCaret');
  if(s.theme!==undefined&&!Object.hasOwn(tokens.themes,s.theme))add(`${p}.theme must be light/dark`);
  if(s.palette!==undefined&&!Object.hasOwn(tokens.palettes,s.palette))add(`${p}.palette must be neutral/teal/cobalt/lime`);
  if(s.background?.startsWith('brand')&&paletteFor(s,deck.meta)==='neutral')add(`${p}: brand backgrounds require teal/cobalt/lime palette`);
  const theme=themeFor(s,deck.meta);
  function themedAsset(v,ref){
   if(!v||v.placeholder)return;
   if(v.variants){
    if(typeof v.variants!=='object'||Array.isArray(v.variants)||Object.keys(v.variants).some(k=>!['light','dark'].includes(k)))add(`${ref}.variants accepts light/dark local image paths`);
    for(const [k,src] of Object.entries(v.variants||{}))image(src,`${ref}.variants.${k}`);
    if(!v.variants[theme])add(`${ref}: missing ${theme} asset variant; provide one or change the scene theme`);
   }
   const src=v.variants?.[theme]||(typeof v==='string'?v:v.src);
   if(theme==='dark'&&src==='assets/motion/lockup.svg')add(`${ref}: packaged complete lockup is light-surface artwork; use a light brand shot, an approved dark replacement, or explicitly choose the standalone mark`);
  }
  themedAsset(s.image,`${p}.image`);s.logos?.forEach?.((im,j)=>themedAsset(im,`${p}.logos[${j}]`));
  if(s.type==='motion-list'&&(s.showLogo??deck.meta.showLogo)!==false&&!s.image){
   const logo=deck.meta.logo;
   if(logo&&typeof logo==='object'&&!logo.src){if(!logo[theme])add(`${p}: meta.logo lacks ${theme} variant`);else themedAsset(logo[theme],`${p}.logo`);}else themedAsset(logo,`${p}.logo`);
  }
  for(const key of Object.keys(s))if(!used.has(key))add(`${p}.${key} has no visible or behavioral slot in ${s.type}`);
  if(s.type==='motion-image'&&s.variant==='hero'&&s.body)add(`${p}: body is available only in split image mode`);
  if(s.type==='motion-input'&&s.variant!=='compact'&&(s.label||s.image))add(`${p}: input label/logo belongs to compact mode`);
  if(!/^[a-z0-9][a-z0-9-]*$/.test(s.id||'')||ids.has(s.id))add(`${p}.id must be unique kebab-case`);ids.add(s.id);
  if(s.variant&&!rule.variants.includes(s.variant))add(`${p}.variant must be ${rule.variants.join('/')}`);
  if(s.background&&!registry.components.theme.backgrounds.includes(s.background))add(`${p}.background must be ${registry.components.theme.backgrounds.join('/')}`);
  const titleRequired=!['motion-brand','motion-input','motion-list'].includes(s.type);
  if(titleRequired&&!txt(s.title))add(`${p}.title is required`);
  if(len(s.title)>(s.type==='motion-title'?(zh?26:80):(zh?17:44)))add(`${p}.title exceeds ${zh?'Chinese':'English'} budget; shorten the takeaway`);
  if(s.highlight&&(!txt(s.title).includes(s.highlight)||s.type!=='motion-title'))add(`${p}.highlight must be an exact substring of a motion-title`);
  if(len(s.kicker)>(zh?24:56))add(`${p}.kicker too long`);
  for(const field of ['title','kicker','body','value','label','prompt','separator','highlight'])if(s[field]!==undefined&&typeof s[field]!=='string')add(`${p}.${field} must be text`);
  if(s.duration!==undefined&&(!Number.isFinite(s.duration)||s.duration<1/(deck.meta.fps||30)||s.duration>180))add(`${p}.duration must be at least one frame and at most 180 seconds`);
  if(s.send!==undefined){
   if(!s.send||typeof s.send!=='object'||Array.isArray(s.send))add(`${p}.send must be an object`);
   unknown(s.send,'send',`${p}.send`);
   if(s.send?.state!==undefined&&!Object.hasOwn(tokens.send.states,s.send.state))add(`${p}.send.state invalid`);
   if(s.send?.ariaLabel!==undefined&&(typeof s.send.ariaLabel!=='string'||!s.send.ariaLabel.trim()))add(`${p}.send.ariaLabel must be nonempty text`);
   if(s.showSend===false)add(`${p}: send options require a visible send button`);
  }
  unknown(s.motion,'motion',`${p}.motion`);
  for(const k of ['enter','stagger','hold','exit','travel'])if(s.motion?.[k]!==undefined&&(!Number.isFinite(s.motion[k])||s.motion[k]<0))add(`${p}.motion.${k} must be a nonnegative number`);
  if(s.motion?.preset&&!['rise','fade','none'].includes(s.motion.preset))add(`${p}.motion.preset must be rise/fade/none`);
  unknown(s.scroll,'scroll',`${p}.scroll`);
  if(s.scroll&&s.type!=='motion-list')add(`${p}.scroll applies only to motion-list`);
  if(s.scroll?.direction&&s.scroll.direction!=='up')add(`${p}: whole-list scrolling direction must be up`);
  if(s.scroll?.itemDirection&&!['up','down','fade'].includes(s.scroll.itemDirection))add(`${p}.scroll.itemDirection must be up/down/fade`);
  if(s.scroll?.itemOrder&&!['top-to-bottom','bottom-to-top'].includes(s.scroll.itemOrder))add(`${p}.scroll.itemOrder is invalid`);
  if(s.scroll?.reveal&&!['sequential','all'].includes(s.scroll.reveal))add(`${p}.scroll.reveal must be sequential/all`);
  for(const k of ['start','end'])if(s.scroll?.[k]!==undefined&&(!Number.isFinite(s.scroll[k])||s.scroll[k]<0))add(`${p}.scroll.${k} must be a nonnegative number`);
  for(const k of ['showLogo','showCursor','showSend','showCaret'])if(s[k]!==undefined&&typeof s[k]!=='boolean')add(`${p}.${k} must be boolean`);
  for(const k of ['enabled'])if(s.scroll?.[k]!==undefined&&typeof s.scroll[k]!=='boolean')add(`${p}.scroll.${k} must be boolean`);
  const n=s.items?.length;
  if(['motion-cards','motion-comparison','motion-hub','motion-workflow'].includes(s.type)&&s.variant!=='rows'&&!rule.counts.includes(n))add(`${p} requires ${rule.counts.join('/')} items`);
  if(s.rows!==undefined){
   if(s.type!=='motion-workflow'||s.variant!=='rows'||!Array.isArray(s.rows)||s.rows.length<1||s.rows.length>3)add(`${p}.rows requires workflow rows variant, 1–3 rows`);
   else {
    if(s.items||s.connections)add(`${p}: rows owns its nodes and adjacent edges; omit top-level items/connections`);
    const rowIds=new Set(),counts=new Set();
    for(const [j,row] of s.rows.entries()){
     if(!row||Object.keys(row).some(k=>!['id','items'].includes(k))||!/^[a-z0-9][a-z0-9-]*$/.test(row.id||'')||rowIds.has(row.id)){add(`${p}.rows[${j}]: unique row id and items required`);continue;}
     rowIds.add(row.id);counts.add(row.items?.length);
     const sub={meta:deck.meta,slides:[{id:row.id,type:'motion-workflow',theme:s.theme,title:s.title,items:row.items}]};
     for(const error of validateMotion(sub))add(`${p}.rows[${j}]: ${error}`);
     for(const v of row.items||[])if(v.body&&len(v.body)>(zh?16:40))add(`${p}.rows[${j}]: compact workflow body too long`);
    }
    if(counts.size>1)add(`${p}: aligned workflow rows require the same 2–4 columns; split different topologies`);
   }
  }else if(s.variant==='rows')add(`${p}.rows is required`);
  if(s.type==='motion-workflow'&&Array.isArray(s.items)){
   const nodeIds=s.items.map((v,i)=>v?.id??String(i));
   if(new Set(nodeIds).size!==n||nodeIds.some(v=>!/^[a-z0-9][a-z0-9-]*$/.test(v)))add(`${p}: workflow node IDs must be unique kebab-case`);
   if(s.connections!==undefined){
    if(!Array.isArray(s.connections)||s.connections.length!==n-1)add(`${p}: left-to-right workflow requires one edge per adjacent node pair`);
    else {const ids=new Set(),pairs=new Set();for(const e of s.connections){
     if(!e||typeof e!=='object'||Array.isArray(e)){add(`${p}: invalid workflow edge`);continue;}unknown(e,'connection',`${p}.connections`);
     const index=nodeIds.indexOf(e.from),pair=`${e.from}/${e.to}`;
     if(index<0||index>=n-1||e.to!==nodeIds[index+1]||pairs.has(pair)||e.slot!==undefined)add(`${p}: workflow edges must connect adjacent nodes left to right without slot`);
     if(!/^[a-z0-9][a-z0-9-]*$/.test(e.id||'')||ids.has(e.id))add(`${p}: workflow edge IDs must be unique kebab-case`);
     ids.add(e.id);pairs.add(pair);
    }}
   }
  }
  if(s.type==='motion-hub'&&s.variant&&n!==({one:1,two:2,three:3,four:4})[s.variant])add(`${p}: hub variant and satellite count disagree`);
  if(s.type==='motion-hub'&&Array.isArray(s.items)){
   const nodeIds=s.items.map((v,i)=>v?.id??String(i));
   if(new Set(nodeIds).size!==n||nodeIds.includes('hub')||nodeIds.some(v=>!/^[a-z0-9][a-z0-9-]*$/.test(v)))add(`${p}: hub node IDs must be unique kebab-case and cannot be hub`);
   if(s.connections!==undefined){
    if(!Array.isArray(s.connections)||s.connections.length!==n)add(`${p}: connections require exactly one hub edge per satellite`);
    else {const edgeIds=new Set(),targets=new Set(),slots=new Set();for(const e of s.connections){
     if(!e||typeof e!=='object'||Array.isArray(e)){add(`${p}: invalid connection`);continue;}unknown(e,'connection',`${p}.connections`);
     if(!/^[a-z0-9][a-z0-9-]*$/.test(e.id||'')||edgeIds.has(e.id))add(`${p}: connection IDs must be unique kebab-case`);
     if(e.from!=='hub'||!nodeIds.includes(e.to)||targets.has(e.to))add(`${p}: connection must bind hub to a unique existing satellite`);
     if(!tokens.hub.slots.includes(e.slot)||slots.has(e.slot))add(`${p}: connector slot invalid or occupied`);
     edgeIds.add(e.id);targets.add(e.to);slots.add(e.slot);
    }
    if(slots.has('bottom')&&(slots.has('bottom-left')||slots.has('bottom-right')))add(`${p}: bottom stem cannot share the lower row with curved branches`);
    }
   }
  }
  if(s.type==='motion-list'&&(!n||n>24))add(`${p}: list requires 1–24 items`);
  if(s.type==='motion-input'&&(!txt(s.prompt)||len(s.prompt)>(s.variant==='compact'?(zh?30:66):(zh?70:150))))add(`${p}.prompt is empty or exceeds its layout budget`);
  if(s.type==='motion-metric'&&(!txt(s.value)||len(s.value)>12))add(`${p}.value requires 1–12 characters`);
  if(s.type==='motion-image'&&!s.image)add(`${p}.image is required`);
  if(len(s.body)>(zh?65:160))add(`${p}.body too long`);
  if(s.type==='motion-brand'&&(!Array.isArray(s.logos)||![1,2].includes(s.logos.length)))add(`${p}.logos requires 1 or 2 local logo images`);
  if(s.type==='motion-brand'&&s.variant&&s.logos?.length!==(s.variant==='pair'?2:1))add(`${p}: brand variant and logo count disagree`);
  if(s.type==='motion-title'){
   if(s.variant==='brand-title'&&(!Array.isArray(s.logos)||![1,2].includes(s.logos.length)))add(`${p}: brand-title requires 1–2 logo slots`);
   if(s.variant!=='brand-title'&&(s.logos||s.separator||s.body))add(`${p}: logos/body belong to brand-title`);
  }
  if(s.type==='motion-synthesis'){
   if(!Array.isArray(s.groups)||![1,2,3,4].includes(s.groups.length)||!Array.isArray(s.outputs)||!(s.result?s.outputs.length===0:[1,2,3].includes(s.outputs.length)))add(`${p}: synthesis requires 1–4 groups and 1–3 outputs`);
   if(s.composition!==undefined&&(!s.composition||typeof s.composition!=='object'||Array.isArray(s.composition)))add(`${p}.composition must be an object`);
   unknown(s.composition,'composition',`${p}.composition`);
   const options={arrangement:['columns','rows','wrap'],size:['small','medium','large'],outputSize:['small','medium','large'],tagWidth:['fill','hug'],align:['left','center'],groupAlign:['start','center'],density:['comfortable','compact']};
   for(const [key,values] of Object.entries(options))if(s.composition?.[key]!==undefined&&!values.includes(s.composition[key]))add(`${p}.composition.${key} must be ${values.join('/')}`);
   if(s.composition?.arrangement==='wrap'&&s.composition?.tagWidth==='fill')add(`${p}: wrap composition uses hug tags; omit tagWidth or choose hug`);
  }
  if(s.result){
   const r=s.result;
   if(s.type!=='motion-synthesis'||typeof r!=='object'||Array.isArray(r))add(`${p}.result requires a synthesis result table`);
   else {
    if(Object.keys(r).some(k=>!['type','title','columns','rows','caption','image','items','columnWidths','accentColumn'].includes(k)))add(`${p}.result unknown field`);
    if(!txt(r.title)||len(r.title)>40||(r.caption!==undefined&&typeof r.caption!=='string')||len(r.caption)>120)add(`${p}.result title/caption invalid`);
    if(r.type!==undefined&&!['table','list'].includes(r.type))add(`${p}.result.type must be table/list`);
    if(r.type==='list'){
     if(!Array.isArray(r.items)||r.items.length<1||r.items.length>4||r.items.some(v=>typeof v!=='string'||!txt(v)||len(v)>(zh?20:48)))add(`${p}.result.items requires 1–4 concise text rows`);
     if(r.columns||r.rows||r.columnWidths||r.accentColumn!==undefined)add(`${p}: list result cannot contain table fields`);
    }else {
     if(r.items)add(`${p}: table result cannot contain list items`);
     if(!Array.isArray(r.columns)||![2,3,4].includes(r.columns.length)||r.columns.some(v=>typeof v!=='string'||!txt(v)||len(v)>24))add(`${p}.result requires 2–4 short column headings`);
     if(!Array.isArray(r.rows)||r.rows.length<1||r.rows.length>4||r.rows.some(row=>!Array.isArray(row)||row.length!==r.columns?.length||row.some(v=>typeof v!=='string'||len(v)>32)))add(`${p}.result requires 1–4 rows matching column count`);
     if(r.columnWidths&&(!Array.isArray(r.columnWidths)||r.columnWidths.length!==r.columns?.length||r.columnWidths.some(v=>!Number.isFinite(v)||v<=0)))add(`${p}.result.columnWidths must be positive weights matching columns`);
     if(r.accentColumn!==undefined&&(!Number.isInteger(r.accentColumn)||r.accentColumn<0||r.accentColumn>=r.columns?.length))add(`${p}.result.accentColumn must be a valid zero-based column`);
    }
    image(r.image,`${p}.result.image`);
    themedAsset(r.image,`${p}.result.image`);
   }
  }
  if(s.type==='motion-hub'&&!s.hub)add(`${p}.hub is required`);
  function item(v,ref){
   if(!v||typeof v!=='object'||Array.isArray(v)){add(`${ref} must be an object`);return;}unknown(v,'item',ref);
   if(!txt(v.title)&&!v.image)add(`${ref} needs title or image`);
   for(const field of ['id','title','body','label','badge','tone','size'])if(v[field]!==undefined&&typeof v[field]!=='string')add(`${ref}.${field} must be text`);
   const titleMax=s.type==='motion-workflow'?(zh?(n===4?6:10):(n===4?12:22)):s.type==='motion-cards'?(zh?(n===4?6:10):(n===4?16:n===3?22:28)):s.type==='motion-hub'?(zh?10:22):(zh?22:48);
   if(len(v.title)>titleMax)add(`${ref}.title exceeds ${titleMax} characters`);
   if(len(v.body)>(zh?48:100))add(`${ref}.body exceeds budget`);
   if(len(v.label)>(zh?14:28)||len(v.badge)>(zh?8:16))add(`${ref}: label/badge exceeds budget`);
   if(v.tone&&!['standard','muted','accent',...Object.keys(tokens.tags)].includes(v.tone))add(`${ref}.tone invalid`);
   if(v.size&&!['small','medium','large'].includes(v.size))add(`${ref}.size invalid`);
   if(v.checked!==undefined&&typeof v.checked!=='boolean')add(`${ref}.checked must be boolean`);
   image(v.image,`${ref}.image`);
   themedAsset(v.image,`${ref}.image`);
   if(v.tools!==undefined){
    if(s.type!=='motion-list'||!Array.isArray(v.tools)||v.tools.length<1||v.tools.length>3)add(`${ref}.tools requires 1–3 list-row product icons`);
    else v.tools.forEach((im,j)=>{image(im,`${ref}.tools[${j}]`);themedAsset(im,`${ref}.tools[${j}]`);});
   }
  }
  if(s.items&&!Array.isArray(s.items))add(`${p}.items must be an array`);else s.items?.forEach((v,j)=>item(v,`${p}.items[${j}]`));
  function tagItem(v,ref,max){item(v,ref);if(!txt(v?.title))add(`${ref}.title is required for a tag`);if(v?.tone&&!Object.hasOwn(tokens.tags,v.tone))add(`${ref}.tone must use a semantic tag color`);if(v&&typeof v==='object')for(const key of Object.keys(v))if(!['id','title','tone','size'].includes(key))add(`${ref}.${key} has no tag slot`);if(len(v?.title)>max)add(`${ref} tag too long`);}
  if(Array.isArray(s.groups))s.groups.forEach((g,j)=>{if(!Array.isArray(g)||g.length<1||g.length>4)add(`${p}.groups[${j}] requires 1–4 tags`);else g.forEach((v,k)=>tagItem(v,`${p}.groups[${j}][${k}]`,zh?8:24));});
  if(Array.isArray(s.outputs))s.outputs.forEach((v,j)=>tagItem(v,`${p}.outputs[${j}]`,zh?10:22));
  if(s.hub)item(s.hub,`${p}.hub`);
  image(s.image,`${p}.image`);if(Array.isArray(s.logos))s.logos.forEach((v,j)=>{
   if(v&&typeof v==='object'&&Object.hasOwn(v,'placeholder')){
    if(Object.keys(v).some(k=>!['placeholder','caption'].includes(k)))add(`${p}.logos[${j}]: placeholder accepts only placeholder/caption`);
    if(typeof v.placeholder!=='string'||!txt(v.placeholder)||len(v.placeholder)>24)add(`${p}.logos[${j}].placeholder requires 1–24 characters`);
    if(v.caption!==undefined&&(typeof v.caption!=='string'||len(v.caption)>48))add(`${p}.logos[${j}].caption exceeds budget`);
   }else {
    image(v,`${p}.logos[${j}]`);
    const src=typeof v==='string'?v:v?.src;
    if(['motion-brand','motion-title'].includes(s.type)&&/^assets\/logos\/(?:wordmark|mark)-(?:light|dark)\.svg$/.test(src||''))add(`${p}.logos[${j}]: legacy Aident lettering/glow is not a complete identity; use assets/motion/lockup.svg or the approved assets/motion/mark.svg`);
   }
  });
  unknown(s.notes,'notes',`${p}.notes`);
  if(s.notes?.talk!==undefined&&(!Array.isArray(s.notes.talk)||s.notes.talk.some(v=>typeof v!=='string')))add(`${p}.notes.talk must be an array of strings`);
 });
 return errors;
}

async function materialize(deck,inputDir,outDir){
 const seen=new Map();
 async function image(v,theme='light'){if(!v)return v;const im={...normalizeImage(v)};let src=im.variants?.[theme]||im.src;delete im.variants;
  if(/^assets\/icons\/(?:light|dark)\/[a-z-]+\.svg$/.test(src))src=src.replace(/^assets\/icons\/(?:light|dark)\//,'assets/motion/icons/');
  if(theme==='dark'&&/^assets\/motion\/icons\/[a-z-]+\.svg$/.test(src))src=src.replace('assets/motion/icons/','assets/motion/icons/dark/');
  if(seen.has(src))return {...im,src:seen.get(src)};
  const local=path.resolve(inputDir,src);let resolved;
  if(await fs.stat(local).then(s=>s.isFile()).catch(()=>false)){
   const bytes=await fs.readFile(local),name=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16)+path.extname(local).toLowerCase();
   resolved=`assets/user/${name}`;await fs.mkdir(path.join(outDir,'assets/user'),{recursive:true});await fs.writeFile(path.join(outDir,resolved),bytes);
  }else if(src.startsWith('assets/')){await copyPackagedAsset(src,outDir);resolved=src;}else throw Error(`Missing local asset: ${src}`);
  seen.set(src,resolved);return {...im,src:resolved};
 }
 for(const s of deck.slides){const theme=themeFor(s,deck.meta),asset=v=>image(v,theme);s.theme=theme;s.palette=paletteFor(s,deck.meta);
  if(s.type==='motion-list'&&!s.image&&(s.showLogo??deck.meta.showLogo)!==false&&deck.meta.logo){const v=deck.meta.logo;s.image=typeof v==='object'&&!v.src?v[theme]:v;}
  s.image=await asset(s.image);if(s.logos)s.logos=await Promise.all(s.logos.map(v=>v?.placeholder?v:asset(v)));
  if(s.result)s.result.image=await asset(s.result.image);
  for(const item of [...(s.items||[]),...(s.rows||[]).flatMap(r=>r.items),...(s.groups||[]).flat(),...(s.outputs||[]),...(s.hub?[s.hub]:[])]){item.image=await asset(item.image);if(item.tools)item.tools=await Promise.all(item.tools.map(asset));}
 }
 // Resolve the meta default too, but never collapse a theme map to its light entry.
 if(deck.meta.logo){const v=deck.meta.logo;
  if(typeof v==='object'&&!v.src){const resolved={};for(const theme of new Set(deck.slides.filter(s=>s.type==='motion-list').map(s=>s.theme)))if(v[theme])resolved[theme]=await image(v[theme],theme);deck.meta.logo=resolved;}
  else deck.meta.logo=await image(v,deck.meta.theme||'light');
 }
 return deck;
}

const node=(id,cls,content,extra='')=>{const positioned=['m-flow-node','m-hub-center','m-satellite'].includes(cls);return `<div class="${cls}" data-motion="${esc(id)}" ${positioned?'data-layout-owner="true"':''} ${extra}>${positioned?`<div class="m-node-visual" data-motion="${esc(id)}-visual" data-animation-target="true">${content}</div>`:content}</div>`;};
function img(v,cls='media',logo=false){const i=normalizeImage(v);return i?`<img class="${cls}${logo?' replaceable-logo':''}" src="${esc(i.src)}" alt="${esc(i.alt||'')}" style="object-fit:${logo?'contain':pick(i.fit,['contain','cover'],'contain')};object-position:${esc(i.position||'50% 50%')}">`:'';}
const p=(v,cls,one=false)=>txt(v)?`<p class="${cls}"${one?' data-one-line':''}>${esc(v)}</p>`:'';
const label=v=>p(v,'m-label',true);
function brands(s,compact=false){return `<div class="m-brands${compact?' m-title-brands':''}" data-brand-count="${s.logos.length}">${s.logos.map((v,j)=>(j?node('separator','m-brand-separator',p(s.separator||'×','m-separator')):'')+node(`logo-${j}`,'m-brand-slot',v.placeholder?node(`logo-placeholder-${j}`,'m-brand-placeholder',p(v.placeholder,'m-brand-placeholder-title',true)+p(v.caption,'m-body',true)):img(v,'m-brand-logo',true))).join('')}</div>`;}
function title(s){let t=esc(s.title);if(s.highlight)t=t.replace(esc(s.highlight),`<span class="m-highlight">${esc(s.highlight)}</span>`);return `<header class="m-heading${s.variant==='brand-title'?' m-brand-heading':''}" data-motion="heading">${s.variant==='brand-title'?brands(s,true):''}${p(s.kicker,'m-kicker',true)}<h1 class="${s.type==='motion-title'?'m-statement':'m-title'}"${s.type!=='motion-title'?' data-one-line':''}>${t}</h1>${s.variant==='brand-title'?p(s.body,'m-lead'):''}</header>`;}
function tag(t,size='medium',i=0){return node(`tag-${i}`,`m-tag tone-${t.tone||'neutral'} size-${t.size||size}`,p(t.title,'m-tag-text',true));}
function card(t,i){return node(`card-${i}`,`m-card tone-${t.tone||'standard'}`,label(t.label)+img(t.image,'m-card-icon',true)+p(t.title,'m-item-title',true)+p(t.body,'m-body'));}
function list(s,meta){const showLogo=(s.showLogo??meta.showLogo)!==false,logo=showLogo&&(s.image||meta.logo),check=s.theme==='dark'?tokens.assets.checkDark:tokens.assets.check;return `<div class="m-list-scene" data-list-scene data-logo-visible="${showLogo}" data-motion="list-scene">${logo?node('identity','m-list-identity',img(logo,'m-list-logo',true)):''}<div class="m-list-track" data-scroll-track>${s.items.map((t,i)=>`<article class="m-list-row ${t.tone==='accent'?'is-accent':''}" data-list-item="${i}">${(s.variant==='checked'||t.checked)&&t.checked!==false?`<span class="m-check">${img({src:check})}</span>`:''}${img(t.image,'m-list-item-image',true)}<div class="m-list-copy">${p(t.title,'m-list-title',true)}${p(t.body,'m-body')}</div>${t.tools?node(`tools-${i}`,'m-list-tools',t.tools.map((im,j)=>node(`tool-${i}-${j}`,'m-tool-icon',img(im,'m-tool-logo',true))).join('')):''}${p(t.badge,'m-badge',true)}</article>`).join('')}</div></div>`;}
function input(s,meta){const compact=s.variant==='compact',state=s.send?.state||'default';return node('input',`m-input-wrap ${compact?'compact':'multiline'}`,`<div class="m-input" data-motion="input-surface">${compact?(s.image?node('input-logo','m-input-logo-slot',img(s.image,'m-input-logo',true)):'')+p(s.label,'m-input-label',true).replace('<p ','<p data-motion="input-label" '):''}<p class="m-input-text" data-motion="prompt"${compact?' data-one-line':''}><span class="m-prompt-copy" data-motion="prompt-text">${esc(s.prompt)}</span>${s.showCaret?'<span class="m-caret" data-motion="caret" aria-hidden="true"></span>':''}</p>${s.showSend===false?'':`<button type="button" class="m-send" data-motion="send" data-state="${state}" aria-label="${esc(s.send?.ariaLabel||(meta.language==='zh'?'发送':'Send'))}"${state==='disabled'?' disabled':''}>${sendSvg}</button>`}</div>`)+(s.showCursor?node('cursor','m-cursor',img({src:tokens.assets.cursor})): '');}
export function resolveConnections(s){return s.connections||(s.type==='motion-workflow'?s.items.slice(0,-1).map((v,i)=>({id:String(i),from:v.id??String(i),to:s.items[i+1].id??String(i+1)})):s.items.map((v,i)=>({id:String(i),from:'hub',to:v.id??String(i),slot:tokens.hub.defaultSlots[s.items.length][i]})));}
function workflow(s,prefix=''){if(s.variant==='rows')return `<div class="m-workflow-rows" data-workflow-rows data-motion="workflow-group">${s.rows.map(r=>workflow({type:'motion-workflow',items:r.items},r.id+'-')).join('')}</div>`;const edges=resolveConnections(s);return `<div class="m-linear-flow${prefix?' m-flow-row':''}" data-workflow${!prefix?' data-motion="diagram"':''}${prefix?` data-motion="row-${esc(prefix.slice(0,-1))}"`:''}>${s.items.map((t,i)=>{
 const id=t.id??String(i),e=edges.find(e=>e.from===id);
 return node(`node-${prefix}${id}`,'m-flow-node',img(t.image,'m-satellite-logo',true)+p(t.label,'m-label',true)+p(t.title,'m-flow-title',true)+p(t.body,'m-body'),`data-node-id="${esc(prefix+id)}"`)+(e?node(`connector-${prefix}${e.id}`,'m-flow-edge',img({src:tokens.assets.arrow}),`data-edge="${esc(prefix+e.id)}" data-from="${esc(prefix+e.from)}" data-to="${esc(prefix+e.to)}"`):'');
 }).join('')}</div>`;}
export function resolveSynthesis(s){const c={...tokens.synthesis.defaults,...s.composition};if(c.arrangement==='wrap')c.tagWidth='hug';return c;}
function resultTable(r){const heading=`<div class="m-result-heading">${img(r.image,'m-result-logo',true)}${p(r.title,'m-result-title',true)}</div>`;
 if(r.type==='list')return heading+`<div class="m-result-list">${r.items.map((v,i)=>node(`result-row-${i}`,'m-result-list-row',p(v,'m-result-value',true))).join('')}</div>`+p(r.caption,'m-result-caption');
 const widths=r.columnWidths||(r.columns.length===3?[36,23,41]:r.columns.map(()=>1)),total=widths.reduce((a,b)=>a+b,0);
 return heading+`<table class="m-result-table"><colgroup>${widths.map(w=>`<col style="width:${w/total*100}%">`).join('')}</colgroup><thead><tr>${r.columns.map(c=>`<th>${p(c,'m-result-header',true)}</th>`).join('')}</tr></thead><tbody>${r.rows.map((row,i)=>`<tr data-motion="result-row-${i}">${row.map((c,j)=>`<td${j===(r.accentColumn??-1)?' class="m-result-accent"':''}>${node(`result-cell-${i}-${j}`,'m-result-cell',p(c,'m-result-value',true))}</td>`).join('')}</tr>`).join('')}</tbody></table>${p(r.caption,'m-result-caption')}`;}
function synthesis(s){const c=resolveSynthesis(s);return `<div class="m-synthesis ${s.variant==='many-to-few'?'many-to-few':'stages'}" data-synthesis data-arrangement="${c.arrangement}" data-tag-width="${c.tagWidth}" data-align="${c.align}" data-group-align="${c.groupAlign}" data-density="${c.density}">${node('inputs','m-tag-panel m-synthesis-inputs',s.groups.map((g,j)=>node(`group-${j}`,'m-tag-column',g.map((t,i)=>tag(t,c.size,`${j}-${i}`)).join(''))).join(''))}${node('connector','m-synthesis-arrow',img({src:tokens.assets.arrow}))}${node('outputs',`m-outputs ${s.result?'m-result':s.outputs.length>1?'m-tag-panel':''}`,s.result?resultTable(s.result):s.outputs.map((t,i)=>tag(t,c.outputSize,`out-${i}`)).join(''))}</div>`;}
function hub(s){const edges=resolveConnections(s),lower=edges.some(e=>e.slot.startsWith('bottom-'));return `<div data-motion="diagram" class="m-hub ${lower?'four':'three'}" data-hub data-bottom-only="${edges.every(e=>e.slot.startsWith('bottom'))}"><div class="m-connector-layer" aria-hidden="true">${edges.map(e=>node(`connector-${e.id}`,e.slot==='bottom'?'m-stem':'m-curve',img({src:e.slot==='bottom'?tokens.assets.stem:tokens.assets.curve}),`data-edge="${esc(e.id)}" data-from="hub" data-to="${esc(e.to)}" data-slot="${e.slot}"`)).join('')}</div>${node('hub','m-hub-center',img(s.hub.image,'m-hub-logo',true)+p(s.hub.title,'m-hub-text',true),'data-node-id="hub"')}${s.items.map((t,i)=>node(`satellite-${t.id??i}`,'m-satellite',img(t.image,'m-satellite-logo',true)+p(t.title,'m-node-title',true)+p(t.label,'m-node-label',true),`data-node-id="${esc(t.id??i)}"`)).join('')}</div>`;}
function render(s,meta,i){
 const layout=registry.layouts[s.type];let body='';
 switch(s.type){
 case 'motion-title':body=title(s);break;
 case 'motion-brand':body=brands(s);break;
 case 'motion-cards':case 'motion-comparison':body=title(s)+`<div class="m-cards" style="--columns:${s.items.length}">${s.items.map(card).join('')}</div>`;break;
 case 'motion-input':body=input(s,meta);break;
 case 'motion-list':body=list(s,meta);break;
 case 'motion-synthesis':body=title(s)+synthesis(s);break;
 case 'motion-hub':body=title(s)+hub(s);break;
 case 'motion-workflow':body=title(s)+workflow(s);break;
 case 'motion-image':body=title(s)+(s.variant==='hero'?node('image','m-hero-image',img(s.image)): `<div class="m-split">${node('copy','m-split-copy',p(s.body,'m-lead'))}${node('image','m-split-image',img(s.image))}</div>`);break;
 case 'motion-metric':body=title(s)+node('metric','m-metric',label(s.label)+p(s.value,'m-metric-value',true)+p(s.body,'m-lead'));break;
 }
 const palette=paletteFor(s,meta),bg=backgroundFor(s,meta);
 const theme=themeFor(s,meta);
 if(theme==='dark')for(const name of ['arrow','curve','stem'])body=body.replaceAll(`src="${tokens.assets[name]}"`,`src="assets/motion/dark/${name}.svg"`);
 const backdrop=bg==='solid'||bg.startsWith('brand')?'<div class="m-brand-background" data-motion="background" aria-hidden="true"></div>':`<img class="background" src="${tokens.themes[theme].backgrounds[bg]}" alt="">${bg==='title'?'':`<img class="texture" src="assets/textures/light-overlay.webp" alt="">`}`;
 return `<section class="slide motion-slide ${s.type}" data-id="${esc(s.id)}" data-type="${s.type}" data-index="${i}" data-theme="${theme}" data-palette="${palette}" data-background="${bg}" aria-hidden="true" aria-label="${esc(s.title||s.notes?.title||s.id)}">${backdrop}<div class="m-canvas">${body}</div></section>`;
}

function cssTokens(lang){const t=tokens;let css=':root{';for(const [k,v] of Object.entries(t.colors))css+=`--m-${k}:${v};`;
 for(const variant of ['single','pair'])css+=`--brand-${variant}-width:${t.brand[variant].maxWidth}px;--brand-${variant}-height:${t.brand[variant].maxHeight}px;`;
 css+=`--brand-gap:${t.brand.gap}px;--hub-bottom-only-center-y:${t.hub.bottomOnlyCenterY}px;`;
 for(const [k,v] of Object.entries(t.type[lang]))css+=`--m-${k}-font:"${v.family}";--m-${k}-size:${v.size}px;--m-${k}-weight:${v.weight};--m-${k}-lh:${v.lineHeight};--m-${k}-tracking:${v.tracking}em;`;
 for(const [k,v] of Object.entries(t.synthesis))if(typeof v==='number')css+=`--synthesis-${k}:${v}px;`;
 css+='}';for(const [k,v] of Object.entries(t.tags))css+=`.tone-${k}{--tag-fill:${v.fill};--tag-color:${v.text}}`;
 for(const [k,v] of Object.entries(t.send.states))css+=`.m-send[data-state="${k}"]{--send-fill:${v.fill};--send-color:${v.text}}`;
 for(const [theme,v] of Object.entries(t.themes)){const sel=`.motion-slide[data-theme="${theme}"]`;css+=`${sel}{${Object.entries(v.colors).map(([k,c])=>`--m-${k}:${c};`).join('')}}`;
  for(const [k,c] of Object.entries(v.tags))css+=`${sel} .tone-${k}{--tag-fill:${c.fill};--tag-color:${c.text}}`;
  for(const [k,c] of Object.entries(v.send))css+=`${sel} .m-send[data-state="${k}"]{--send-fill:${c.fill};--send-color:${c.text}}`;
 }
 for(const [palette,variants] of Object.entries(t.palettes))for(const [theme,colors] of Object.entries(variants))css+=`.motion-slide[data-theme="${theme}"][data-palette="${palette}"]{${Object.entries(colors).map(([k,v])=>`--m-${k}:${v};`).join('')}}`;
 css+=`:root{--brand-title-width:${t.brand.title.maxWidth}px;--brand-title-height:${t.brand.title.maxHeight}px;--brand-title-gap:${t.brand.title.gap}px;--workflow-rows-top:${t.workflowRows.top}px;--workflow-row-gap:${t.workflowRows.rowGap}px;}`;return css;
}

export async function generateMotionDeck(args,raw){
 const errors=validateMotion(raw);if(errors.length)throw Error(`Motion content validation failed:\n- ${errors.join('\n- ')}`);
 const inputDir=path.dirname(args.input),outDir=path.resolve(args.out);
 if(outDir===skillRoot||outDir===path.parse(outDir).root||outDir===inputDir)throw Error('Use a dedicated output folder separate from the source JSON and Skill.');
 await fs.mkdir(outDir,{recursive:true});
 const prepared=structuredClone(raw);
 for(const s of prepared.slides)s.background=backgroundFor(s,prepared.meta);
 for(const s of prepared.slides)if(s.type==='motion-synthesis')s.composition=resolveSynthesis(s);
 for(const s of prepared.slides)if(['motion-hub','motion-workflow'].includes(s.type)&&s.variant!=='rows')s.connections=resolveConnections(s);
 if(!prepared.meta.logo&&prepared.slides.some(s=>s.type==='motion-list'&&(s.showLogo??prepared.meta.showLogo)!==false&&!s.image))prepared.meta.logo={src:'assets/motion/mark.svg',alt:'Aident'};
 const deck=await materialize(prepared,inputDir,outDir);deck.meta={...deck.meta,mode:'motion',language:deck.meta.language||'en',fps:deck.meta.fps||tokens.motion.fps};
 let start=0;
 const timeline=deck.slides.map(s=>{
  const m={...s.motion};
  const duration=s.duration||registry.layouts[s.type].duration;
  const entry={id:s.id,type:s.type,start,duration,end:start+duration,advisory:true,motion:m,...(s.type==='motion-list'?{scroll:{...s.scroll,advisory:true,itemOrder:s.scroll?.itemOrder||'top-to-bottom',direction:'up'}}:{}),notes:s.notes||{}};start+=duration;return entry;
 });
 const data={meta:deck.meta,slides:timeline,duration:start,fps:deck.meta.fps,animationOwnership:'external',timingAdvisory:true};
 const layers=[];
 const slideHtml=deck.slides.map((s,i)=>{
  let n=0;
  return render(s,deck.meta,i).replace(/<(div|p|h1|img|article|header|span|button|svg|path|tr)\b([^>]*)>/g,(full,tag,attrs)=>{
   const selfClosing=attrs.endsWith('/');if(selfClosing)attrs=attrs.slice(0,-1);
   const component=attrs.match(/data-motion="([^"]+)"/)?.[1];
   const row=attrs.match(/data-list-item="([^"]+)"/)?.[1];
   const kind=tag==='img'?'image':['p','h1'].includes(tag)?'text':component?'component':row!==undefined?'list-item':'layout';
   const id=`${s.id}/${component|| (row!==undefined?'row-'+row:kind+'-'+n++)}`;
   layers.push({id,slideId:s.id,kind,selector:`[data-layer="${id}"]`,...(tag==='img'?{src:attrs.match(/src="([^"]+)"/)?.[1]}:{})});
   return `<${tag}${attrs} data-layer="${id}"${kind==='text'?' data-editable="text"':kind==='image'?' data-editable="image"':''}${selfClosing?' /':''}>`;
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
 await fs.writeFile(path.join(outDir,'animation-handoff.json'),JSON.stringify({version:3,themeContract:{default:deck.meta.theme||'light',scenes:deck.slides.map(s=>({id:s.id,theme:s.theme,palette:s.palette,background:s.background||(s.palette!=='neutral'?'brand':'layout-default')})),assetPolicy:'select supplied theme variant; no inversion or automatic plaque'},layoutContract:{owner:'[data-layout-owner]',animate:'[data-animation-target]',diagram:'[data-motion=diagram], [data-motion=workflow-group]',rule:'Animate visual inner layers for reveals; move a connected diagram as one group. Call layout only before animation or after content changes, never each frame.'},inputContract:{text:'[data-motion=prompt-text]',caret:'[data-motion=caret]',pointer:'[data-motion=cursor]',send:'[data-motion=send]',typing:'setPromptText(slideId, text); caret is inline and follows live text; no built-in blink'},firstFrame:'All content visible at t=0; downstream animator must author a legible poster/first frame.',mode:'motion',canvas:tokens.canvas,fps:data.fps,duration:data.duration,timingAdvisory:true,animationOwnership:'external',html:'index.html',content:'deck.resolved.json',timeline:'timeline.json',editMode:'?capture=1',runtimeGlobal:'AIDENT_MOTION',layers,assets:[...new Set(layers.filter(l=>l.src).map(l=>l.src))],fontManifest:'assets/fonts/manifest.json',listContract:{suggestedItemOrder:'top-to-bottom',suggestedTrackDirection:'up',cameraSelector:'.motion-slide',sceneSelector:'[data-list-scene]',trackSelector:'[data-scroll-track]',itemSelector:'[data-list-item]',internalClip:false,scrollDistance:null,overflow:'full content retained beyond the camera; external animator chooses travel and framing'}},null,2)+'\n');
 console.log(`Generated ${deck.slides.length} Motion Slides (${start.toFixed(2)} seconds, ${data.fps} fps) at ${outDir}`);
}
