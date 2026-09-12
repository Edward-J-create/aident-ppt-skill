#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const skillRoot=path.resolve(here,'..');
const allowedTypes=new Set(['cover','points','cards','metrics','workflow','comparison','image-cards','team','split-image-text','full-bleed']);
const allowedThemes=new Set(['light','dark']);
const allowedBackgrounds=new Set(['base','elements-cover','elements-inner','atmosphere','paper','ink','elements','motion','aurora']);
const allowedCoverIdentities=new Set(['kicker','logo','none']);
const allowedIcons=new Set(['integration','history','skill','run-circle','download','copy','key','action','capabilities','help']);
const allowedCounts={points:[2,3,4,6],cards:[2,3,4,6],metrics:[2,3,4,6],workflow:[3,4],comparison:[2],'image-cards':[2,3],cover:[1],team:[3],'split-image-text':[1],'full-bleed':[1]};
const emoji=/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const allowedKeys={
  root:new Set(['meta','slides']),
  meta:new Set(['title','language','brandName','url','logo','header','mode']),
  header:new Set(['show','showLogo','showRightText','rightText']),
  image:new Set(['src','alt','position','fit']),
  item:new Set(['number','label','title','body','value','icon','showIcon','showLabel','image','tone','points']),
  callout:new Set(['tone','metric','label','body']),
  notes:new Set(['title','purpose','talk','transition']),
  slide:new Set(['id','type','theme','background','coverIdentity','coverLayout','titleAlignment','kicker','title','subtitle','items','steps','callout','source','header','image','imageSide','contentTitle','body','workflowLabel','showWorkflowLabel','showArrows','showDividers','showStepLabels','notes']),
};

function parseArgs(argv){
  const args={singleFile:false};
  for(let i=2;i<argv.length;i++){
    const value=argv[i];
    if(value==='--input')args.input=argv[++i];
    else if(value==='--out')args.out=argv[++i];
    else if(value==='--single-file')args.singleFile=true;
    else if(value==='--mode')args.mode=argv[++i];
    else if(value==='--help')args.help=true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

const usage=`Usage: node scripts/generate-deck.mjs --input examples/deck.example.en.json --out output/deck [--mode presentation|motion] [--single-file]\n`;
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=value=>String(value??'').trim();
const length=value=>Array.from(text(value)).length;
const normalizeImage=value=>typeof value==='string'?{src:value,alt:''}:value&&typeof value==='object'?{...value}:null;
const coverLayout=slide=>slide.type==='cover'?(slide.coverLayout||(normalizeImage(slide.image)?.src?'media-bottom':'text-only')):'';
const coverIdentity=slide=>slide.type==='cover'?(slide.coverIdentity||(text(slide.kicker)?'kicker':'none')):'';
const countOf=slide=>slide.items?.length||slide.steps?.length||1;

function fail(errors,message){errors.push(message)}
function rejectUnknown(object,allowed,ref,errors){if(!object||typeof object!=='object'||Array.isArray(object))return;for(const key of Object.keys(object))if(!allowed.has(key))fail(errors,`${ref}.${key} is not a registered field.`)}
function validate(deck){
  const errors=[];
  if(!deck||typeof deck!=='object')return ['Input must be a JSON object.'];
  rejectUnknown(deck,allowedKeys.root,'deck',errors);
  rejectUnknown(deck.meta,allowedKeys.meta,'meta',errors);
  rejectUnknown(deck.meta?.header,allowedKeys.header,'meta.header',errors);
  if(deck.meta?.logo&&typeof deck.meta.logo==='object')rejectUnknown(deck.meta.logo,new Set(['light','dark']),'meta.logo',errors);
  if(!['en','zh'].includes(deck.meta?.language))fail(errors,'meta.language must be "en" or "zh".');
  if(!Array.isArray(deck.slides)||deck.slides.length===0)fail(errors,'slides must contain at least one slide.');
  const ids=new Set();
  (deck.slides||[]).forEach((slide,i)=>{
    const ref=`slides[${i}]`;
    rejectUnknown(slide,allowedKeys.slide,ref,errors);
    rejectUnknown(slide.header,allowedKeys.header,`${ref}.header`,errors);
    rejectUnknown(slide.callout,allowedKeys.callout,`${ref}.callout`,errors);
    rejectUnknown(slide.notes,allowedKeys.notes,`${ref}.notes`,errors);
    if(slide.image&&typeof slide.image==='object')rejectUnknown(slide.image,allowedKeys.image,`${ref}.image`,errors);
    if(!allowedTypes.has(slide.type))fail(errors,`${ref}.type is not registered: ${slide.type}`);
    if(slide.type==='callout')fail(errors,`${ref}: callout cannot be a standalone slide.`);
    if(!allowedThemes.has(slide.theme))fail(errors,`${ref}.theme must be light or dark.`);
    if(!slide.id||!/^[a-z0-9][a-z0-9-]*$/.test(slide.id))fail(errors,`${ref}.id must be stable kebab-case.`);
    if(ids.has(slide.id))fail(errors,`${ref}.id is duplicated: ${slide.id}`);ids.add(slide.id);
    if(!text(slide.title))fail(errors,`${ref}.title is required.`);
    if(slide.type!=='cover'&&slide.titleAlignment==='center')fail(errors,`${ref}: only cover titles may be centered.`);
    if(slide.type==='cover'){
      const mode=coverLayout(slide);
      const identity=coverIdentity(slide);
      if(!['text-only','media-bottom','full-bleed'].includes(mode))fail(errors,`${ref}.coverLayout must be text-only, media-bottom, or full-bleed.`);
      if(!allowedCoverIdentities.has(identity))fail(errors,`${ref}.coverIdentity must be kicker, logo, or none.`);
      if(mode!=='text-only'&&!normalizeImage(slide.image)?.src)fail(errors,`${ref}: ${mode} cover requires image.src.`);
      if(slide.coverLayout==='text-only'&&normalizeImage(slide.image)?.src)fail(errors,`${ref}: text-only cover must omit image; use media-bottom or full-bleed.`);
      if(slide.callout)fail(errors,`${ref}: cover does not support callout; move it to an inner slide.`);
      if(slide.source)fail(errors,`${ref}: cover does not support a source footer; place provenance in notes or an inner slide.`);
      if(slide.header)fail(errors,`${ref}: cover does not support the page header; use coverIdentity for an optional logo or kicker.`);
    }
    if(slide.type==='team'&&slide.callout)fail(errors,`${ref}: team uses three content items above one image and does not support a Callout.`);
    if(slide.type==='team'&&slide.source)fail(errors,`${ref}: team does not render a Source footer; keep image provenance in notes.`);
    if(slide.type==='split-image-text'&&slide.imageSide&&slide.imageSide!=='right')fail(errors,`${ref}: split-image-text is fixed to left text / right image; imageSide must be right or omitted.`);
    if(slide.background&&!allowedBackgrounds.has(slide.background))fail(errors,`${ref}.background is not registered: ${slide.background}`);
    if(slide.type==='cover'&&slide.background==='elements-inner')fail(errors,`${ref}: cover cannot use elements-inner; use elements-cover.`);
    if(slide.type!=='cover'&&slide.background==='elements-cover')fail(errors,`${ref}: inner slide cannot use elements-cover; use elements-inner.`);
    const n=countOf(slide),allowed=allowedCounts[slide.type]||[1];
    if(!allowed.includes(n))fail(errors,`${ref}: ${slide.type} supports ${allowed.join('/')} items, received ${n}.`);
    const lang=deck.meta.language;
    const compactCover=slide.type==='cover'&&coverLayout(slide)==='media-bottom';
    const denseSixCards=slide.type==='cards'&&slide.items?.length===6;
    const titleLimit=slide.type==='team'||denseSixCards?(lang==='zh'?12:30):(lang==='zh'?(slide.type==='cover'?(compactCover?20:26):26):(slide.type==='cover'?(compactCover?64:92):64));
    if(length(slide.title)>titleLimit)fail(errors,`${ref}.title exceeds the ${titleLimit}-character layout budget.`);
    if(slide.type==='split-image-text'&&slide.callout){const splitLimit=lang==='zh'?14:30;if(length(slide.title)>splitLimit)fail(errors,`${ref}.title exceeds the ${splitLimit}-character one-line budget for split-image-text with callout.`);}
    const items=slide.items||slide.steps||[];
    const oneLineLimit=lang==='zh'?(n>=4?10:14):(n>=4?24:n===3?30:42);
    items.forEach((item,j)=>{
      const itemRef=`${ref}.${slide.steps?'steps':'items'}[${j}]`;
      rejectUnknown(item,allowedKeys.item,itemRef,errors);
      if(item.image&&typeof item.image==='object')rejectUnknown(item.image,allowedKeys.image,`${itemRef}.image`,errors);
      if(['points','cards','metrics','workflow','comparison','image-cards'].includes(slide.type)&&!text(item.title))fail(errors,`${itemRef}.title is required.`);
      if(slide.type==='metrics'&&!text(item.value))fail(errors,`${itemRef}.value is required.`);
      if(text(item.title)&&length(item.title)>oneLineLimit)fail(errors,`${itemRef}.title exceeds one-line budget (${oneLineLimit} characters). Shorten it or use fewer columns.`);
      if(item.icon&&!allowedIcons.has(item.icon))fail(errors,`${itemRef}.icon must use the packaged design-system icon registry.`);
      for(const field of ['title','label','body'])if(emoji.test(text(item[field])))fail(errors,`${itemRef}.${field} contains emoji; use a packaged icon instead.`);
    });
    if(slide.callout&&!text(slide.callout.body))fail(errors,`${ref}.callout.body is required.`);
    if(slide.callout&&length(slide.callout.body)>(lang==='zh'?70:180))fail(errors,`${ref}.callout.body is too long.`);
    if(slide.callout&&text(slide.callout.metric)&&text(slide.callout.label))fail(errors,`${ref}.callout must use metric or label, not both.`);
    if(slide.callout&&!['default','accent'].includes(slide.callout.tone||'default'))fail(errors,`${ref}.callout.tone must be default or accent.`);
  });
  return errors;
}

async function copyInputAsset(src,inputDir,outDir,key){
  if(!src)return null;
  if(/^(https?:|data:)/i.test(src))return src;
  if(src.startsWith('assets/'))return src;
  const absolute=path.resolve(inputDir,src);
  const stat=await fs.stat(absolute).catch(()=>null);
  if(!stat?.isFile())throw new Error(`Missing asset: ${src}`);
  const ext=path.extname(absolute).toLowerCase()||'.bin';
  const safe=key.replace(/[^a-z0-9-]/gi,'-').toLowerCase()+ext;
  const dest=path.join(outDir,'assets','user',safe);
  await fs.mkdir(path.dirname(dest),{recursive:true});
  await fs.copyFile(absolute,dest);
  return `assets/user/${safe}`;
}

async function materializeAssets(deck,inputDir,outDir){
  const clone=structuredClone(deck);
  if(clone.meta?.logo){
    if(typeof clone.meta.logo==='string')clone.meta.logo=await copyInputAsset(clone.meta.logo,inputDir,outDir,'brand-logo');
    else for(const mode of ['light','dark'])if(clone.meta.logo[mode])clone.meta.logo[mode]=await copyInputAsset(clone.meta.logo[mode],inputDir,outDir,`brand-logo-${mode}`);
  }
  for(const slide of clone.slides){
    if(slide.image){const img=normalizeImage(slide.image);img.src=await copyInputAsset(img.src,inputDir,outDir,`${slide.id}-image`);slide.image=img;}
    for(const [j,item] of (slide.items||slide.steps||[]).entries())if(item.image){const img=normalizeImage(item.image);img.src=await copyInputAsset(img.src,inputDir,outDir,`${slide.id}-item-${j+1}`);item.image=img;}
  }
  return clone;
}

const runtimeFontFamilies={
  en:new Set(['Outfit','Noto Sans']),
  zh:new Set(['Outfit','Noto Sans','Smiley Sans','Noto Sans SC'])
};

function requiredFontFamilies(deck){
  const required=new Set(runtimeFontFamilies[deck.meta.language]);
  if(deck.meta.language==='en'&&deck.slides.some(slide=>slide.type==='workflow'))required.add('Instrument Serif');
  if(deck.meta.language==='zh'&&deck.slides.some(slide=>slide.callout))required.add('Noto Serif SC');
  return required;
}

async function copyPackagedAsset(relative,outDir){
  const normalized=path.posix.normalize(relative.replaceAll('\\','/'));
  if(!normalized.startsWith('assets/')||normalized.includes('../'))throw new Error(`Unsafe packaged asset path: ${relative}`);
  if(normalized.startsWith('assets/user/'))return;
  const source=path.join(skillRoot,...normalized.split('/'));
  const stat=await fs.stat(source).catch(()=>null);
  if(!stat?.isFile())throw new Error(`Missing packaged asset: ${normalized}`);
  const destination=path.join(outDir,...normalized.split('/'));
  await fs.mkdir(path.dirname(destination),{recursive:true});
  await fs.copyFile(source,destination);
}

async function writeRuntimeFonts(deck,outDir){
  const manifest=JSON.parse(await fs.readFile(path.join(skillRoot,'assets/fonts/manifest.json'),'utf8'));
  const required=requiredFontFamilies(deck);
  const families=manifest.families.filter(family=>required.has(family.family));
  if(families.length!==required.size)throw new Error(`Font manifest is missing a runtime family: ${[...required].filter(name=>!families.some(family=>family.family===name)).join(', ')}`);
  const css=[];
  for(const family of families){
    if(!Array.isArray(family.web)||family.web.length===0)throw new Error(`Font ${family.family} has no web face in assets/fonts/manifest.json.`);
    for(const face of family.web){
      await copyPackagedAsset(`assets/fonts/${face.file}`,outDir);
      css.push(`@font-face{font-family:${JSON.stringify(family.family)};src:url("./${face.file}") format("${face.format}");font-style:${face.style};font-weight:${face.weight};font-display:swap}`);
    }
    await copyPackagedAsset(`assets/fonts/${family.licenseFile}`,outDir);
  }
  css.push(':root{--font-en-display:"Outfit",Arial,sans-serif;--font-en-body:"Noto Sans",Arial,sans-serif;--font-en-number:"Instrument Serif",Georgia,serif;--font-zh-display:"Smiley Sans","Noto Sans SC",sans-serif;--font-zh-body:"Noto Sans SC",sans-serif;--font-zh-callout:"Noto Serif SC","Songti SC","SimSun",serif}');
  const fontDir=path.join(outDir,'assets/fonts');
  await fs.mkdir(fontDir,{recursive:true});
  await fs.writeFile(path.join(fontDir,'fonts.css'),css.join('\n')+'\n');
  await fs.writeFile(path.join(fontDir,'manifest.json'),JSON.stringify({...manifest,families},null,2)+'\n');
}

async function copyRuntimeAssets(deck,html,outDir){
  const refs=[...html.matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g)].map(match=>match[1]);
  for(const relative of new Set(refs))await copyPackagedAsset(relative,outDir);
  await writeRuntimeFonts(deck,outDir);
}

function backgroundTreatment(slide){
  const isCover=slide.type==='cover';
  const requested=slide.background||(isCover?'elements-cover':'elements-inner');
  if(requested==='elements')return isCover?'elements-cover':'elements-inner';
  if(requested==='paper'||requested==='ink')return 'base';
  if(requested==='motion'||requested==='aurora')return 'atmosphere';
  return requested;
}
function backgroundPath(slide){
  const treatment=backgroundTreatment(slide);
  const file=treatment==='base'?(slide.theme==='light'?'light-paper.webp':'dark-ink.webp'):treatment==='atmosphere'?(slide.theme==='light'?'light-motion.webp':'dark-aurora.webp'):`${slide.theme}-${treatment}.webp`;
  return `assets/backgrounds/${file}`;
}
function imageHtml(value,className){
  const image=normalizeImage(value);
  if(!image?.src)return `<div class="${className} media-placeholder" data-placeholder="image">Replace image</div>`;
  const styles=[];
  if(image.position)styles.push(`object-position:${escapeHtml(image.position)}`);
  if(image.fit)styles.push(`object-fit:${escapeHtml(image.fit)}`);
  const position=styles.length?` style="${styles.join(';')}"`:'';
  return `<img class="${className}" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt||'')}"${position}>`;
}
function iconHtml(item,theme){
  if(item.showIcon===false||!item.icon)return '';
  return `<span class="icon-box"><img src="assets/icons/${theme}/${escapeHtml(item.icon)}.svg" alt=""></span>`;
}
function labelHtml(item){return item.showLabel===false||!text(item.label)?'':`<div class="item-label">${escapeHtml(item.label)}</div>`}
function calloutHtml(callout){
  if(!callout)return '';
  const metric=text(callout.metric||callout.label);
  const lead=metric?`<div class="callout-metric">${escapeHtml(metric)}</div>`:'';
  return `<aside class="callout ${callout.tone==='accent'?'accent':''} ${metric?'has-metric':'no-metric'}" data-component="callout" data-anim style="--i:7"><span class="callout-bullet" aria-hidden="true"></span>${lead}<div class="callout-body">${escapeHtml(callout.body)}</div></aside>`;
}
function pointsHtml(slide){
  const items=slide.items.map((item,i)=>`<article class="point ${item.showLabel===false||!item.label?'no-label':''} ${item.showIcon===false||!item.icon?'no-icon':''}" data-component="point" data-anim style="--i:${i+1}">${iconHtml(item,slide.theme)}${labelHtml(item)}<h3 class="item-title" data-one-line>${escapeHtml(item.title)}</h3><p class="item-body">${escapeHtml(item.body)}</p></article>`).join('');
  return `<div class="grid point-grid" data-count="${slide.items.length}">${items}</div>`;
}
function cardsHtml(slide){
  const items=slide.items.map((item,i)=>{const media=normalizeImage(item.image);const hasImage=Boolean(media);return `<article class="card ${hasImage?'has-image':''} ${item.showLabel===false||!item.label?'no-label':''} ${item.showIcon===false||!item.icon?'no-icon':''}" data-component="card" data-anim style="--i:${i+1}">${hasImage?imageHtml(media,'card-media'):''}<div class="card-content">${iconHtml(item,slide.theme)}${labelHtml(item)}<h3 class="item-title" data-one-line>${escapeHtml(item.title)}</h3><p class="item-body">${escapeHtml(item.body)}</p></div></article>`}).join('');
  return `<div class="grid card-grid" data-count="${slide.items.length}">${items}</div>`;
}
function metricsHtml(slide){
  const items=slide.items.map((item,i)=>`<article class="metric ${item.showLabel===false||!item.label?'no-label':''}" data-component="metric" data-anim style="--i:${i+1}">${labelHtml(item)}<div class="metric-value" data-one-line>${escapeHtml(item.value)}</div><h3 class="item-title" data-one-line>${escapeHtml(item.title||'')}</h3><p class="item-body">${escapeHtml(item.body)}</p></article>`).join('');
  return `<div class="grid metric-grid" data-count="${slide.items.length}">${items}</div>`;
}
function workflowHtml(slide){
  const steps=slide.steps.map((item,i)=>`<article class="workflow-step" data-component="step" data-anim style="--i:${i+1}"><div class="step-number">${escapeHtml(item.number||String(i+1).padStart(2,'0'))}</div>${labelHtml(item)}<h3 class="item-title" data-one-line>${escapeHtml(item.title)}</h3><p class="item-body">${escapeHtml(item.body)}</p></article>`).join('');
  const arrows=slide.steps.map(()=>'<span class="workflow-arrow" data-component="step-arrow" aria-hidden="true"></span>').join('');
  const label=slide.showWorkflowLabel===false||!text(slide.workflowLabel)?'':`<div class="workflow-label">${escapeHtml(slide.workflowLabel)}</div>`;
  return `<div class="workflow ${slide.showArrows===false?'no-arrows':''} ${slide.showStepLabels===false?'no-labels':''} ${slide.showDividers===false?'no-dividers':''}" data-count="${slide.steps.length}">${label}<div class="workflow-arrows" data-component="arrow-row" data-anim style="--i:1">${arrows}</div><div class="workflow-steps">${steps}</div></div>`;
}
function comparisonHtml(slide){
  return `<div class="grid comparison-grid">${slide.items.map((item,i)=>`<article class="comparison-card ${item.tone==='accent'?'accent':''}" data-component="comparison" data-anim style="--i:${i+1}">${labelHtml(item)}<h3 class="item-title" data-one-line>${escapeHtml(item.title)}</h3>${item.body?`<p class="item-body">${escapeHtml(item.body)}</p>`:''}<ul class="comparison-list">${(item.points||[]).map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul></article>`).join('')}</div>`;
}
function imageCardsHtml(slide){
  return `<div class="grid image-card-grid" style="--cards:${slide.items.length}">${slide.items.map((item,i)=>`<article class="image-card" data-component="image-card" data-anim style="--i:${i+1}">${imageHtml(item.image,'image-card-media')}<h3 class="item-title" data-one-line>${escapeHtml(item.title)}</h3><p class="item-body">${escapeHtml(item.body)}</p></article>`).join('')}</div>`;
}
function teamHtml(slide){
  const items=slide.items.map((item,i)=>`<article class="team-point" data-component="team-point" data-anim style="--i:${i+1}">${labelHtml(item)}<h3 class="item-title" data-one-line>${escapeHtml(item.title)}</h3><p class="item-body">${escapeHtml(item.body)}</p></article>`).join('');
  return `<div class="team-layout"><div class="team-point-grid">${items}</div><div class="team-media-wrap" data-anim style="--i:4">${imageHtml(slide.image,'team-media')}</div></div>`;
}
function splitHtml(slide){return `<div class="split" data-layout="text-left-image-right" data-anim style="--i:1"><div class="split-copy"><h3 class="item-title">${escapeHtml(slide.contentTitle||slide.title)}</h3><p class="item-body">${escapeHtml(slide.body||slide.subtitle||'')}</p></div>${imageHtml(slide.image,'split-media')}</div>`}
function renderMain(slide){
  if(slide.type==='points')return pointsHtml(slide);
  if(slide.type==='cards')return cardsHtml(slide);
  if(slide.type==='metrics')return metricsHtml(slide);
  if(slide.type==='workflow')return workflowHtml(slide);
  if(slide.type==='comparison')return comparisonHtml(slide);
  if(slide.type==='image-cards')return imageCardsHtml(slide);
  if(slide.type==='team')return teamHtml(slide);
  if(slide.type==='split-image-text')return splitHtml(slide);
  return '';
}
function renderHeader(deck,slide){
  if(slide.type==='cover')return '';
  const config={showLogo:true,showRightText:true,...deck.meta.header,...slide.header};
  if(config.show===false)return '';
  let logo='';
  if(config.showLogo!==false){
    const custom=typeof deck.meta.logo==='string'?deck.meta.logo:deck.meta.logo?.[slide.theme];
    const src=custom||`assets/logos/wordmark-${slide.theme}.svg`;
    logo=`<img class="brand-logo" src="${escapeHtml(src)}" alt="${escapeHtml(deck.meta.brandName||'Brand')}">`;
  }
  const right=config.showRightText===false?'':`<div class="brand-right">${escapeHtml(config.rightText||deck.meta.url||'example.com')}</div>`;
  return `<header class="brand-header">${logo}${right}</header>`;
}
function coverIdentityHtml(deck,slide){
  const identity=coverIdentity(slide);
  if(identity==='none')return '';
  if(identity==='kicker')return slide.kicker?`<div class="kicker cover-identity-kicker">${escapeHtml(slide.kicker)}</div>`:'';
  const custom=typeof deck.meta.logo==='string'?deck.meta.logo:deck.meta.logo?.[slide.theme];
  const src=custom||`assets/logos/wordmark-${slide.theme}.svg`;
  return `<img class="cover-identity-logo" src="${escapeHtml(src)}" alt="${escapeHtml(deck.meta.brandName||'Brand')}">`;
}
function renderHeading(deck,slide){
  const center=slide.type==='cover';
  const identity=center?coverIdentityHtml(deck,slide):(slide.kicker?`<div class="kicker">${escapeHtml(slide.kicker)}</div>`:'');
  const constrainedTitle=(slide.type==='cards'&&slide.items?.length===6)||slide.type==='team'||(slide.type==='split-image-text'&&slide.callout);
  const oneLine=constrainedTitle?' data-one-line':'';
  return `<header class="slide-heading ${center?'center':''}" data-component="slide-header" data-anim style="--i:0">${identity}<h1 class="slide-title"${oneLine}>${escapeHtml(slide.title)}</h1>${slide.subtitle?`<p class="slide-subtitle">${escapeHtml(slide.subtitle)}</p>`:''}</header>`;
}
function renderSlide(deck,slide,index){
  const full=slide.type==='full-bleed';
  const coverMode=coverLayout(slide);
  const coverFull=coverMode==='full-bleed';
  const image=normalizeImage(slide.image);
  const background=(full||coverFull)&&image?.src?image.src:backgroundPath(slide);
  const main=coverMode==='media-bottom'?`<div class="cover-media-wrap" data-cover-media data-anim style="--i:1">${imageHtml(slide.image,'cover-media')}</div>`:(full||coverFull?'':renderMain(slide));
  const source=slide.source?`<footer class="source-footer">${escapeHtml(slide.source)}</footer>`:'';
  const treatment=backgroundTreatment(slide);
  const classes=['slide',slide.type,full?'full-bleed':'',coverMode==='media-bottom'?'cover-with-image':'',coverFull?'cover-full-bleed':'',slide.callout?'has-callout':'',`background-${treatment}`,slide.type==='cover'?`cover-identity-mode-${coverIdentity(slide)}`:''].filter(Boolean).join(' ');
  const suppressMain=full||coverFull||coverMode==='text-only';
  const backgroundAlt=coverFull?escapeHtml(image?.alt||''):'';
  return `<section class="${classes}" data-id="${escapeHtml(slide.id)}" data-type="${slide.type}" data-theme="${slide.theme}" data-background="${escapeHtml(treatment)}"${slide.type==='cover'?` data-cover-layout="${escapeHtml(coverMode)}"`:''} data-index="${index}" aria-hidden="true"><img class="background" src="${escapeHtml(background)}" alt="${backgroundAlt}"><img class="texture" src="assets/textures/${slide.theme}-overlay.webp" alt=""><div class="wash"></div><div class="slide-shell">${renderHeader(deck,slide)}${renderHeading(deck,slide)}${suppressMain?'':`<div class="content-zone"><div class="content-main">${main}</div>${calloutHtml(slide.callout)}</div>`}${full&&slide.callout?`<div class="content-zone">${calloutHtml(slide.callout)}</div>`:''}${source}</div></section>`;
}

async function inlineHtml(html,outDir){
  const cache=new Map();
  const toData=async rel=>{
    if(cache.has(rel))return cache.get(rel);
    const file=path.join(outDir,rel);const bytes=await fs.readFile(file);const ext=path.extname(file).toLowerCase();
    const mime={'.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.otf':'font/otf','.woff2':'font/woff2'}[ext]||'application/octet-stream';
    const data=`data:${mime};base64,${bytes.toString('base64')}`;cache.set(rel,data);return data;
  };
  const css=await fs.readFile(path.join(outDir,'assets/runtime/deck.css'),'utf8');
  let inlinedCss=css.replace('@import url("../fonts/fonts.css");',await fs.readFile(path.join(outDir,'assets/fonts/fonts.css'),'utf8'));
  const cssUrls=[...inlinedCss.matchAll(/url\(["']?(\.\/[^"')]+)["']?\)/g)];
  for(const match of cssUrls){const rel=path.posix.normalize(`assets/fonts/${match[1].replace(/^\.\//,'')}`);inlinedCss=inlinedCss.replace(match[0],`url("${await toData(rel)}")`)}
  html=html.replace('<link rel="stylesheet" href="assets/runtime/deck.css">',`<style>${inlinedCss}</style>`);
  const js=await fs.readFile(path.join(outDir,'assets/runtime/deck.js'),'utf8');
  html=html.replace('<script src="assets/runtime/deck.js"></script>',`<script>${js}</script>`);
  const assetRefs=[...html.matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g)].map(m=>m[1]);
  for(const rel of [...new Set(assetRefs)])html=html.replaceAll(`"${rel}"`,`"${await toData(rel)}"`);
  return html;
}

async function main(){
  const args=parseArgs(process.argv);
  if(args.help){process.stdout.write(usage);return}
  if(!args.input||!args.out)throw new Error(usage.trim());
  const input=path.resolve(args.input),outDir=path.resolve(args.out),inputDir=path.dirname(input);
  const deckRaw=JSON.parse(await fs.readFile(input,'utf8'));
  const mode=args.mode||deckRaw.meta?.mode||'presentation';
  if(!['presentation','motion'].includes(mode))throw new Error('Mode must be presentation or motion.');
  if(args.mode&&deckRaw.meta?.mode&&args.mode!==deckRaw.meta.mode)throw new Error('CLI mode conflicts with meta.mode.');
  if(mode==='motion'){
    const {generateMotionDeck}=await import('./lib/motion-deck.mjs');
    await generateMotionDeck({...args,input,out:outDir},deckRaw);
    return;
  }
  const errors=validate(deckRaw);if(errors.length)throw new Error(`Content validation failed:\n- ${errors.join('\n- ')}`);
  await fs.mkdir(outDir,{recursive:true});
  if(outDir===skillRoot||outDir===path.parse(outDir).root)throw new Error('Output directory must be a dedicated deck folder.');
  await fs.rm(path.join(outDir,'assets'),{recursive:true,force:true});
  const deck=await materializeAssets(deckRaw,inputDir,outDir);
  const shell=await fs.readFile(path.join(skillRoot,'assets/templates/deck-shell.html'),'utf8');
  const slideHtml=deck.slides.map((slide,i)=>renderSlide(deck,slide,i)).join('\n');
  const runtimeData={meta:deck.meta,slides:deck.slides.map(s=>({id:s.id,type:s.type,theme:s.theme,title:s.title,notes:s.notes||{}}))};
  let html=shell.replaceAll('{{LANG}}',escapeHtml(deck.meta.language)).replace('{{TITLE}}',escapeHtml(deck.meta.title||deck.slides[0].title)).replace('{{SLIDES}}',slideHtml).replace('{{DECK_JSON}}',JSON.stringify(runtimeData).replace(/</g,'\\u003c'));
  await copyRuntimeAssets(deck,html,outDir);
  if(args.singleFile)html=await inlineHtml(html,outDir);
  await fs.writeFile(path.join(outDir,args.singleFile?'deck.single.html':'index.html'),html);
  await fs.writeFile(path.join(outDir,'deck.resolved.json'),JSON.stringify(deck,null,2));
  process.stdout.write(`Generated ${deck.slides.length} slides at ${outDir}\n`);
}

export {copyPackagedAsset,writeRuntimeFonts,inlineHtml,escapeHtml,normalizeImage,skillRoot};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message||error);process.exitCode=1});
