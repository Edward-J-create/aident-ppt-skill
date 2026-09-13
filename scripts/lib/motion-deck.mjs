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
 root:['meta','slides'],meta:['mode','title','language','brandName','logo','showLogo','fps'],
 slide:['id','type','variant','title','kicker','highlight','body','value','label','prompt','items','groups','outputs','composition','hub','connections','send','logos','separator','image','background','duration','motion','scroll','showLogo','showCursor','showSend','notes'],
 send:['state','ariaLabel'],connection:['id','from','to','slot'],
 composition:['arrangement','size','outputSize','tagWidth','align','groupAlign','density'],
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
 if(deck.meta.showLogo!==undefined&&typeof deck.meta.showLogo!=='boolean')add('meta.showLogo must be boolean.');
 const zh=deck.meta.language==='zh',ids=new Set();
 function image(v,p){if(v===undefined)return;const im=normalizeImage(v);if(!im||typeof im.src!=='string'||!im.src.trim()){add(`${p}.src is required`);return;}unknown(im,'image',p);if(im.fit&&!['contain','cover'].includes(im.fit))add(`${p}.fit must be contain/cover`);if(im.position&&!/^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/.test(im.position))add(`${p}.position must be two percentages`);if(/^(?:https?:|data:|javascript:)/i.test(im.src))add(`${p}: use a local PNG/JPEG/WebP/SVG for offline, deterministic capture`);if(!/\.(?:svg|png|jpe?g|webp)$/i.test(im.src))add(`${p}: unsupported image format`);}
 image(typeof deck.meta.logo==='object'&&!deck.meta.logo?.src?undefined:deck.meta.logo,'meta.logo');
 if(deck.meta.logo&&typeof deck.meta.logo==='object'&&!deck.meta.logo.src){for(const k of Object.keys(deck.meta.logo))if(!['light','dark'].includes(k))add(`meta.logo.${k}: unknown field`);for(const k of ['light','dark'])image(deck.meta.logo[k],`meta.logo.${k}`);}
 if(!Array.isArray(deck.slides)||!deck.slides.length)return [...errors,'slides must be a nonempty array'];
 deck.slides.forEach((s,i)=>{
  const p=`slides[${i}]`;if(!s||typeof s!=='object'){add(`${p} must be an object`);return;}unknown(s,'slide',p);
  const rule=registry.layouts[s.type];if(!rule){add(`${p}.type is not a motion layout`);return;}
  const base=['id','type','variant','background','duration','motion','notes'];
  const extras={'motion-title':['kicker'],'motion-input':['showCursor','showSend'],'motion-image':['kicker'],'motion-metric':['kicker'],'motion-hub':['kicker'],'motion-list':['showLogo']};
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
  for(const k of ['showLogo','showCursor','showSend'])if(s[k]!==undefined&&typeof s[k]!=='boolean')add(`${p}.${k} must be boolean`);
  for(const k of ['enabled'])if(s.scroll?.[k]!==undefined&&typeof s.scroll[k]!=='boolean')add(`${p}.scroll.${k} must be boolean`);
  const n=s.items?.length;
  if(['motion-cards','motion-comparison','motion-hub','motion-workflow'].includes(s.type)&&!rule.counts.includes(n))add(`${p} requires ${rule.counts.join('/')} items`);
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
  if(s.type==='motion-synthesis'){
   if(!Array.isArray(s.groups)||![1,2,3,4].includes(s.groups.length)||!Array.isArray(s.outputs)||![1,2,3].includes(s.outputs.length))add(`${p}: synthesis requires 1–4 groups and 1–3 outputs`);
   if(s.composition!==undefined&&(!s.composition||typeof s.composition!=='object'||Array.isArray(s.composition)))add(`${p}.composition must be an object`);
   unknown(s.composition,'composition',`${p}.composition`);
   const options={arrangement:['columns','rows','wrap'],size:['small','medium','large'],outputSize:['small','medium','large'],tagWidth:['fill','hug'],align:['left','center'],groupAlign:['start','center'],density:['comfortable','compact']};
   for(const [key,values] of Object.entries(options))if(s.composition?.[key]!==undefined&&!values.includes(s.composition[key]))add(`${p}.composition.${key} must be ${values.join('/')}`);
   if(s.composition?.arrangement==='wrap'&&s.composition?.tagWidth==='fill')add(`${p}: wrap composition uses hug tags; omit tagWidth or choose hug`);
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
    if(s.type==='motion-brand'&&/^assets\/logos\/(?:wordmark|mark)-(?:light|dark)\.svg$/.test(src||''))add(`${p}.logos[${j}]: legacy Aident lettering/glow is not a complete identity; use assets/motion/lockup.svg or the approved assets/motion/mark.svg`);
   }
  });
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
 for(const s of deck.slides){s.image=await image(s.image);if(s.logos)s.logos=await Promise.all(s.logos.map(v=>v?.placeholder?v:image(v)));
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
function list(s,meta){const showLogo=(s.showLogo??meta.showLogo)!==false,logo=showLogo&&(s.image||meta.logo);return `<div class="m-list-scene" data-list-scene data-logo-visible="${showLogo}" data-motion="list-scene">${logo?node('identity','m-list-identity',img(logo,'m-list-logo',true)):''}<div class="m-list-track" data-scroll-track>${s.items.map((t,i)=>`<article class="m-list-row ${t.tone==='accent'?'is-accent':''}" data-list-item="${i}">${(s.variant==='checked'||t.checked)&&t.checked!==false?`<span class="m-check">${img({src:tokens.assets.check})}</span>`:''}${img(t.image,'m-list-item-image',true)}<div class="m-list-copy">${p(t.title,'m-list-title',true)}${p(t.body,'m-body')}</div>${p(t.badge,'m-badge',true)}</article>`).join('')}</div></div>`;}
function input(s,meta){const compact=s.variant==='compact',state=s.send?.state||'default';return node('input',`m-input-wrap ${compact?'compact':'multiline'}`,`<div class="m-input" data-motion="input-surface">${compact?(s.image?node('input-logo','m-input-logo-slot',img(s.image,'m-input-logo',true)):'')+p(s.label,'m-input-label',true).replace('<p ','<p data-motion="input-label" '):''}<p class="m-input-text" data-motion="prompt"${compact?' data-one-line':''}>${esc(s.prompt)}</p>${s.showSend===false?'':`<button type="button" class="m-send" data-motion="send" data-state="${state}" aria-label="${esc(s.send?.ariaLabel||(meta.language==='zh'?'发送':'Send'))}"${state==='disabled'?' disabled':''}>${sendSvg}</button>`}</div>`)+(s.showCursor?node('cursor','m-cursor',img({src:tokens.assets.cursor})): '');}
export function resolveConnections(s){return s.connections||(s.type==='motion-workflow'?s.items.slice(0,-1).map((v,i)=>({id:String(i),from:v.id??String(i),to:s.items[i+1].id??String(i+1)})):s.items.map((v,i)=>({id:String(i),from:'hub',to:v.id??String(i),slot:tokens.hub.defaultSlots[s.items.length][i]})));}
function workflow(s){const edges=resolveConnections(s);return `<div class="m-linear-flow" data-workflow>${s.items.map((t,i)=>{
 const id=t.id??String(i),e=edges.find(e=>e.from===id);
 return node(`node-${id}`,'m-flow-node',img(t.image,'m-satellite-logo',true)+p(t.label,'m-label',true)+p(t.title,'m-flow-title',true)+p(t.body,'m-body'),`data-node-id="${esc(id)}"`)+(e?node(`connector-${e.id}`,'m-flow-edge',img({src:tokens.assets.arrow}),`data-edge="${esc(e.id)}" data-from="${esc(e.from)}" data-to="${esc(e.to)}"`):'');
 }).join('')}</div>`;}
export function resolveSynthesis(s){const c={...tokens.synthesis.defaults,...s.composition};if(c.arrangement==='wrap')c.tagWidth='hug';return c;}
function synthesis(s){const c=resolveSynthesis(s);return `<div class="m-synthesis ${s.variant==='many-to-few'?'many-to-few':'stages'}" data-synthesis data-arrangement="${c.arrangement}" data-tag-width="${c.tagWidth}" data-align="${c.align}" data-group-align="${c.groupAlign}" data-density="${c.density}">${node('inputs','m-tag-panel m-synthesis-inputs',s.groups.map((g,j)=>node(`group-${j}`,'m-tag-column',g.map((t,i)=>tag(t,c.size,`${j}-${i}`)).join(''))).join(''))}${node('connector','m-synthesis-arrow',img({src:tokens.assets.arrow}))}${node('outputs',`m-outputs ${s.outputs.length>1?'m-tag-panel':''}`,s.outputs.map((t,i)=>tag(t,c.outputSize,`out-${i}`)).join(''))}</div>`;}
function hub(s){const edges=resolveConnections(s),lower=edges.some(e=>e.slot.startsWith('bottom-'));return `<div class="m-hub ${lower?'four':'three'}" data-hub><div class="m-connector-layer" aria-hidden="true">${edges.map(e=>node(`connector-${e.id}`,e.slot==='bottom'?'m-stem':'m-curve',img({src:e.slot==='bottom'?tokens.assets.stem:tokens.assets.curve}),`data-edge="${esc(e.id)}" data-from="hub" data-to="${esc(e.to)}" data-slot="${e.slot}"`)).join('')}</div>${node('hub','m-hub-center',img(s.hub.image,'m-hub-logo',true)+p(s.hub.title,'m-hub-text',true),'data-node-id="hub"')}${s.items.map((t,i)=>node(`satellite-${t.id??i}`,'m-satellite',img(t.image,'m-satellite-logo',true)+p(t.title,'m-node-title',true)+p(t.label,'m-node-label',true),`data-node-id="${esc(t.id??i)}"`)).join('')}</div>`;}
function render(s,meta,i){
 const layout=registry.layouts[s.type];let body='';
 switch(s.type){
 case 'motion-title':body=title(s);break;
 case 'motion-brand':body=`<div class="m-brands" data-brand-count="${s.logos.length}">${s.logos.map((v,j)=>(j?node('separator','m-brand-separator',p(s.separator||'×','m-separator')):'')+node(`logo-${j}`,'m-brand-slot',v.placeholder?node(`logo-placeholder-${j}`,'m-brand-placeholder',p(v.placeholder,'m-brand-placeholder-title',true)+p(v.caption,'m-body',true)):img(v,'m-brand-logo',true))).join('')}</div>`;break;
 case 'motion-cards':case 'motion-comparison':body=title(s)+`<div class="m-cards" style="--columns:${s.items.length}">${s.items.map(card).join('')}</div>`;break;
 case 'motion-input':body=input(s,meta);break;
 case 'motion-list':body=list(s,meta);break;
 case 'motion-synthesis':body=title(s)+synthesis(s);break;
 case 'motion-hub':body=title(s)+hub(s);break;
 case 'motion-workflow':body=title(s)+workflow(s);break;
 case 'motion-image':body=title(s)+(s.variant==='hero'?node('image','m-hero-image',img(s.image)): `<div class="m-split">${node('copy','m-split-copy',p(s.body,'m-lead'))}${node('image','m-split-image',img(s.image))}</div>`);break;
 case 'motion-metric':body=title(s)+node('metric','m-metric',label(s.label)+p(s.value,'m-metric-value',true)+p(s.body,'m-lead'));break;
 }
 const bg=s.background||(['motion-title','motion-brand'].includes(s.type)?'title':s.type==='motion-synthesis'?'elements':'content');
 return `<section class="slide motion-slide ${s.type}" data-id="${esc(s.id)}" data-type="${s.type}" data-index="${i}" data-theme="light" aria-hidden="true" aria-label="${esc(s.title||s.notes?.title||s.id)}"><img class="background" src="${tokens.backgrounds[bg]}" alt="">${bg==='title'?'':`<img class="texture" src="assets/textures/light-overlay.webp" alt="">`}<div class="m-canvas">${body}</div></section>`;
}

function cssTokens(lang){const t=tokens;let css=':root{';for(const [k,v] of Object.entries(t.colors))css+=`--m-${k}:${v};`;
 for(const variant of ['single','pair'])css+=`--brand-${variant}-width:${t.brand[variant].maxWidth}px;--brand-${variant}-height:${t.brand[variant].maxHeight}px;`;
 css+=`--brand-gap:${t.brand.gap}px;`;
 for(const [k,v] of Object.entries(t.type[lang]))css+=`--m-${k}-font:"${v.family}";--m-${k}-size:${v.size}px;--m-${k}-weight:${v.weight};--m-${k}-lh:${v.lineHeight};--m-${k}-tracking:${v.tracking}em;`;
 for(const [k,v] of Object.entries(t.synthesis))if(typeof v==='number')css+=`--synthesis-${k}:${v}px;`;
 css+='}';for(const [k,v] of Object.entries(t.tags))css+=`.tone-${k}{--tag-fill:${v.fill};--tag-color:${v.text}}`;
 for(const [k,v] of Object.entries(t.send.states))css+=`.m-send[data-state="${k}"]{--send-fill:${v.fill};--send-color:${v.text}}`;return css;
}

export async function generateMotionDeck(args,raw){
 const errors=validateMotion(raw);if(errors.length)throw Error(`Motion content validation failed:\n- ${errors.join('\n- ')}`);
 const inputDir=path.dirname(args.input),outDir=path.resolve(args.out);
 if(outDir===skillRoot||outDir===path.parse(outDir).root||outDir===inputDir)throw Error('Use a dedicated output folder separate from the source JSON and Skill.');
 await fs.mkdir(outDir,{recursive:true});
 const prepared=structuredClone(raw);
 for(const s of prepared.slides)if(s.type==='motion-synthesis')s.composition=resolveSynthesis(s);
 for(const s of prepared.slides)if(['motion-hub','motion-workflow'].includes(s.type))s.connections=resolveConnections(s);
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
  return render(s,deck.meta,i).replace(/<(div|p|h1|img|article|header|span|button|svg|path)\b([^>]*)>/g,(full,tag,attrs)=>{
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
 await fs.writeFile(path.join(outDir,'animation-handoff.json'),JSON.stringify({version:2,mode:'motion',canvas:tokens.canvas,fps:data.fps,duration:data.duration,timingAdvisory:true,animationOwnership:'external',html:'index.html',content:'deck.resolved.json',timeline:'timeline.json',editMode:'?capture=1',runtimeGlobal:'AIDENT_MOTION',layers,assets:[...new Set(layers.filter(l=>l.src).map(l=>l.src))],fontManifest:'assets/fonts/manifest.json',listContract:{suggestedItemOrder:'top-to-bottom',suggestedTrackDirection:'up',cameraSelector:'.motion-slide',sceneSelector:'[data-list-scene]',trackSelector:'[data-scroll-track]',itemSelector:'[data-list-item]',internalClip:false,scrollDistance:null,overflow:'full content retained beyond the camera; external animator chooses travel and framing'}},null,2)+'\n');
 console.log(`Generated ${deck.slides.length} Motion Slides (${start.toFixed(2)} seconds, ${data.fps} fps) at ${outDir}`);
}
