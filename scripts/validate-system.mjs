#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];
let checks=0;
const check=(condition,message)=>{checks++;if(!condition)errors.push(message)};
const read=relative=>fs.readFile(path.join(root,relative),'utf8');

async function walk(directory){
  const files=[];
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
    const target=path.join(directory,entry.name);
    if(entry.isDirectory())files.push(...await walk(target));
    else files.push(target);
  }
  return files;
}

const [tokens,registry,css,runtimeJs,generator,pptx,preflight,schema,backgrounds,textures,previews,fontManifest,iconManifest,iconNormalizer,systemPreview,readmeVisuals,readmePublic,readmeEnglish]=await Promise.all([
  read('assets/tokens/tokens.json').then(JSON.parse),
  read('assets/components/registry.json').then(JSON.parse),
  read('assets/runtime/deck.css'),
  read('assets/runtime/deck.js'),
  read('scripts/generate-deck.mjs'),
  read('scripts/export-pptx.mjs'),
  read('scripts/preflight.mjs'),
  read('references/deck.schema.json').then(JSON.parse),
  read('assets/backgrounds/manifest.json').then(JSON.parse),
  read('assets/textures/manifest.json').then(JSON.parse),
  read('assets/previews/manifest.json').then(JSON.parse),
  read('assets/fonts/manifest.json').then(JSON.parse),
  read('assets/icons/manifest.json').then(JSON.parse),
  read('scripts/normalize-icons.mjs'),
  read('scripts/lib/render-system-preview.mjs'),
  read('scripts/build-readme-visuals.mjs'),
  read('README.md'),
  read('README.en.md'),
]);

const callout=registry.components?.callout||{};
const workflow=registry.components?.workflow||{};
const step=registry.components?.step||{};
const teamLayout=registry.layouts?.team||{};
const splitLayout=registry.layouts?.['split-image-text']||{};
const headerLogo=registry.components?.header?.logo||{};
const coverIdentity=registry.layouts?.cover?.identity||{};
const icon=registry.components?.icon||{};
const slideProperties=schema.$defs?.slide?.properties||{};
check(tokens.gradients?.calloutAccent==='linear-gradient(90deg,rgba(160,169,254,.16) 0%,rgba(46,238,238,.16) 47.9%,rgba(147,252,184,.16) 100%)','Token gradients.calloutAccent drifted from the registered 16% gradient.');
check(callout.accentPaintOpacity===0.16,'Callout accentPaintOpacity must be 0.16.');
check(callout.blurPx===20,'Callout blurPx must be 20.');
check(callout.stroke===false,'Callout stroke must remain disabled.');
check(callout.itemGap===12,'Callout adjacent-item gap must be 12px.');
check(JSON.stringify(callout.padding)==='[20,20]','Callout padding must be 20px on both axes.');
check(callout.heights?.default===70&&callout.heights?.accent===88,'Callout minimum heights must be 70px default and 88px Accent.');
check(callout.bullet?.required===true&&callout.bullet?.size===12,'Callout must retain its required 12px dot.');

check(icon.box===60&&icon.glyph===32,'Icon component must keep its 60px box and 32px design-system glyph.');
check(icon.radii?.light===10&&icon.radii?.dark===12,'Icon component must keep 10px Light / 12px Dark radii.');
check(icon.surfaces?.light==='#FFFFFF'&&icon.surfaces?.dark==='rgba(255,255,255,0.08)','Icon theme surfaces drifted.');
check(icon.overflow==='clip'&&icon.fit==='contain'&&icon.redraw===false,'Icon component must clip its packaged geometry without redrawing it.');
check(icon.dense?.box===48&&icon.dense?.radii?.light===8&&icon.dense?.radii?.dark===9.6,'Dense icon contract must keep 48px with 8px Light / 9.6px Dark radii.');
check(iconManifest.boxPx===60&&iconManifest.glyphPx===32,'Icon manifest size contract drifted.');
check(iconManifest.radiiPx?.light===10&&iconManifest.radiiPx?.dark===12&&iconManifest.overflow==='clip','Icon manifest radius/clip contract drifted.');
check(iconManifest.icons?.length===10&&iconManifest.themes?.length===2,'Icon manifest must register 10 icons across two themes.');
check(iconNormalizer.includes('component-only 60×60 SVG')&&iconNormalizer.includes('Figma canvas artifact'),'Icon normalizer must reject unclean Figma canvas exports.');
check(systemPreview.includes('gradientTop=768,gradientRowStep=64,gradientLabelOffset=59'),'Foundation preview gradient spacing contract drifted.');
check(systemPreview.includes('Foundation Color tokens overflow:')&&systemPreview.includes('Foundation Color tokens overlap:'),'Foundation preview must reject Color-token content that leaves or overlaps its panel.');
check(readmeVisuals.includes('<span>Editable content</span>')&&!readmeVisuals.includes('No Figma runtime'),'Public Hero must emphasize editable output rather than internal design-tool provenance.');
check(readmeVisuals.includes('.hero-copy{width:800px}.hero h1 em{display:inline-block;white-space:nowrap}'),'Public Hero must keep “Keep the system.” on one line inside its measured 800px title region.');
check(readmePublic.includes('A self-contained, publicly installable bilingual presentation Skill.')&&readmePublic.includes('一套可离线运行、可公开安装的中英文演示文稿 Skill。'),'Public README introduction must include both English and Chinese copy.');
check(!/figma(?:\.com)?/i.test(readmePublic)&&!/figma(?:\.com)?/i.test(readmeEnglish),'Public README files must not expose or emphasize internal Figma provenance.');

const compactCss=css.replace(/\s+/g,'').toLowerCase();
const compactRuntimeJs=runtimeJs.replace(/\s+/g,'');
for(const stop of ['rgba(160,169,254,.16)','rgba(46,238,238,.16)','rgba(147,252,184,.16)'])check(compactCss.includes(stop),`Runtime CSS is missing registered Callout stop ${stop}.`);
check(compactCss.includes('.callout{width:100%;min-height:70px;height:auto;border:0;border-radius:16px;padding:20px;'),'Runtime Callout base geometry drifted.');
check(compactCss.includes('gap:12px;')&&compactCss.includes('backdrop-filter:blur(20px);'),'Runtime Callout spacing or blur drifted.');
check(compactCss.includes('.callout.accent{min-height:88px;background:var(--callout-accent)}'),'Runtime Accent Callout must keep an 88px minimum and registered token.');
check(compactCss.includes('.slide[data-theme="dark"].callout.accent{background:var(--callout-accent)}')||compactCss.includes('.slide[data-theme="dark"] .callout.accent{background:var(--callout-accent)}'),'Dark-theme specificity must not override the Accent Callout gradient.');
check(compactCss.includes('#viewport{position:fixed;inset:0;overflow:hidden}'),'Runtime viewport must not use an oversized implicit Grid track.');
check(compactCss.includes('#deck{position:absolute;left:50%;top:50%;width:var(--slide-w);height:var(--slide-h);transform:translate(-50%,-50%)scale(var(--scale));'),'Runtime deck must translate to the viewport center before scaling.');
check(compactCss.includes('.icon-box{--icon-radius:10px;width:60px;height:60px;display:grid;place-items:center;flex:0060px;border-radius:var(--icon-radius);overflow:hidden;background:#fff}'),'Runtime Light icon box must keep its 60px clipped 10px-radius surface.');
check(compactCss.includes('.slide[data-theme="dark"].icon-box{--icon-radius:12px;background:rgba(255,255,255,.08)}')||compactCss.includes('.slide[data-theme="dark"] .icon-box{--icon-radius:12px;background:rgba(255,255,255,.08)}'),'Runtime Dark icon box must keep its 12px-radius 8% surface.');
check(compactCss.includes('.card-grid[data-count="6"].card.icon-box{--icon-radius:8px;')||compactCss.includes('.card-grid[data-count="6"] .card .icon-box{--icon-radius:8px;'),'Runtime dense Light icon box must scale to an 8px radius.');
check(compactCss.includes('.slide[data-theme="dark"].card-grid[data-count="6"].card.icon-box{--icon-radius:9.6px}')||compactCss.includes('.slide[data-theme="dark"] .card-grid[data-count="6"] .card .icon-box{--icon-radius:9.6px}'),'Runtime dense Dark icon box must scale to a 9.6px radius.');
check(preflight.includes('Icon box radius must be')&&preflight.includes('Icon SVG must have intrinsic 60×60 dimensions')&&preflight.includes('Icon box must clip overflow'),'HTML preflight must validate icon size, radius, and clipping.');
check(!compactRuntimeJs.includes("deck.style.transform='scale(var(--scale))'"),'Runtime navigation must not overwrite the deck centering translation.');
for(const size of ['1280,height:720','1366,height:768','1440,height:900','1024,height:768'])check(preflight.includes(`width:${size}`),`HTML preflight is missing responsive viewport ${size.replace(',height:','×')}.`);
check(preflight.includes('Scaled deck is clipped at'),'HTML preflight must fail when a responsive deck leaves the viewport.');
check(preflight.includes('Scaled deck is not centered at'),'HTML preflight must fail when a responsive deck is off-center.');

check(workflow.arrow?.renderedCount==='steps'&&workflow.arrow?.onePerStep===true&&workflow.arrow?.finalArrowVisible===true,'Workflow arrow contract must render one arrow above every Step, including the final Step.');
check(workflow.arrow?.separateFromStep===true,'Workflow arrows must stay outside Step components.');
check(workflow.arrowToStepGap===32&&workflow.labelToArrowGap===12,'Workflow must keep a 32px arrow-to-Step gap and a 12px label-to-arrow gap.');
check(tokens.layout?.workflow?.arrowToStepGap===32&&tokens.layout?.workflow?.labelToArrowGap===12,'Workflow spacing tokens drifted.');
check(tokens.semantic?.light?.stepNumber==='#008089'&&tokens.semantic?.dark?.stepNumber==='#1EEAEA','Step-number semantic colors drifted.');
check(step.numberColors?.light==='#008089'&&step.numberColors?.dark==='#1EEAEA','Step component number colors drifted.');
check(!compactCss.includes('.workflow-arrow:last-child{visibility:hidden}'),'HTML workflow must not hide the final Step arrow.');
check(compactCss.includes('.workflow-steps{')&&compactCss.includes('margin-top:20px}'),'HTML workflow must combine the 12px flex gap with a 20px Step-row margin.');
check(compactCss.includes('.workflow.no-arrows.workflow-steps{margin-top:0}')||compactCss.includes('.workflow.no-arrows .workflow-steps{margin-top:0}'),'Arrow-free workflow must remove the arrow-to-Step margin.');
check(compactCss.includes('.step-number{')&&compactCss.includes('color:#008089;'),'Light Step numbers must use #008089.');
check(compactCss.includes('.slide[data-theme="dark"].step-number{color:#1eeaea}')||compactCss.includes('.slide[data-theme="dark"] .step-number{color:#1eeaea}'),'Dark Step numbers must use #1EEAEA.');
check(compactCss.includes('.workflow.no-dividers.workflow-step+.workflow-step::before{display:none}')||compactCss.includes('.workflow.no-dividers .workflow-step+.workflow-step::before{display:none}'),'HTML workflow must implement showDividers:false.');
check(generator.includes("slide.showDividers===false?'no-dividers':''"),'Generator must bind showDividers:false to HTML.');
check(generator.includes('is not a registered field.'),'Generator must reject unknown fields rather than silently ignore typos.');
check(pptx.includes('for(let i=0;i<n;i++)'),'PPTX workflow must render one arrow above every Step, including the final Step.');
check(pptx.includes("stepY=arrowY+(s.showArrows===false?0:48)"),'PPTX workflow must keep the 16px arrow row plus 32px arrow-to-Step gap.');
check(pptx.includes('color:c.stepNumber'),'PPTX Step numbers must use the registered theme color.');
check(pptx.includes('fitOneLineFontSize(item.title,stepWidth,44,30)'),'PPTX workflow titles must use the one-line fitter.');
check(pptx.includes('approximateTextWidth(metric,40)*1.35'),'PPTX Callout lead width must include the rendering safety factor.');
check(pptx.includes("height=hasMetric||tone==='accent'?88:70"),'PPTX Callout height contract drifted.');

check(JSON.stringify(teamLayout.counts)==='[3]','Team must require exactly three content items.');
check(JSON.stringify(teamLayout.structure)==='["three-content-items","image"]','Team structure must keep three content items above one image.');
check(teamLayout.callout===false&&teamLayout.source===false,'Team must not accept a Callout or Source footer.');
check(teamLayout.image?.size?.[0]===1700&&teamLayout.image?.size?.[1]===340&&teamLayout.image?.position==='below-items','Team image must stay in the registered 1700×340 lower slot.');
check(tokens.layout?.image?.team?.width===1700&&tokens.layout?.image?.team?.height===340,'Team image tokens drifted from 1700×340.');
check(compactCss.includes('.team-point-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));'),'Runtime Team must render a three-column content row.');
check(compactCss.includes('.team-media{width:1700px;height:340px;'),'Runtime Team image geometry drifted from 1700×340.');
check(generator.includes("team:[3]"),'Generator must reject Team slides that do not contain exactly three items.');
check(generator.includes("team uses three content items above one image and does not support a Callout"),'Generator must reject Team Callouts.');
check(generator.includes("team does not render a Source footer"),'Generator must reject Team Source footers.');

check(splitLayout.structure==='left-text-right-image','Split layout must stay left text / right image.');
check(splitLayout.image?.side==='right'&&splitLayout.gap===80,'Split image must stay on the right with an 80px text/media gap.');
check(JSON.stringify(slideProperties?.imageSide?.enum||[])==='["right"]','Deck schema must reject left-image split layouts.');
check(generator.includes('data-layout="text-left-image-right"'),'HTML split renderer must expose the fixed left-text/right-image contract.');
check(compactCss.includes('.split{display:grid;grid-template-columns:minmax(0,1fr)760px;gap:80px;'),'Runtime split geometry must keep flexible left copy, 80px gap, and 760px right media.');
check(pptx.includes("left:1050,top:y,width:760,height:428")&&pptx.includes("left:110,top:y+38,width:860"),'PPTX split renderer must keep copy left and image right.');

const logoFormats=['png','jpg','jpeg','webp','svg'];
check(JSON.stringify(registry.rules?.userSuppliedLogoFormats)===JSON.stringify(logoFormats),'Registry must expose the supported user-supplied logo formats.');
check(headerLogo.userSupplied===true&&headerLogo.replaceable===true&&JSON.stringify(headerLogo.acceptedFormats)===JSON.stringify(logoFormats),'Header logo must remain user-supplied and replaceable for every registered format.');
check(coverIdentity.userSuppliedLogo===true&&JSON.stringify(coverIdentity.acceptedLogoFormats)===JSON.stringify(logoFormats),'Cover identity must accept the same user-supplied logo formats.');
check(generator.includes("'.jpg':'image/jpeg'")&&generator.includes("'.jpeg':'image/jpeg'")&&generator.includes("'.webp':'image/webp'"),'Single-file HTML must inline user logo image formats with correct MIME types.');
check(pptx.includes("ext==='.webp'?'image/webp'"),'PPTX image adapter must identify WebP correctly.');
check(pptx.includes("if(ext==='.svg'||ext==='.webp')"),'PPTX logo adapter must rasterize SVG and WebP logo inputs safely.');

check(backgrounds.format?.type==='webp'&&backgrounds.format?.lossless===true,'Background manifest must require Lossless WebP.');
check(backgrounds.treatments?.length===8&&backgrounds.treatments.every(entry=>entry.source.endsWith('.webp')),'All eight canonical backgrounds must be WebP.');
check(backgrounds.pptxRasterization?.committedCompiledCopies===false,'Background manifest must reject committed compiled PPTX copies.');
check(textures.format?.type==='webp'&&textures.format?.lossless===true&&textures.textures.every(entry=>entry.file.endsWith('.webp')),'All canonical textures must be Lossless WebP.');
check(previews.format?.type==='webp'&&previews.format?.lossless===true&&previews.items?.length===6&&previews.items.every(entry=>entry.path.endsWith('.webp')),'README/Hero/Showcase and bilingual Motion previews must be Lossless WebP.');
check(fontManifest.families.every(family=>Array.isArray(family.web)&&family.web.length>0),'Every bundled family must declare at least one runtime web face.');

for(const theme of ['light','dark'])for(const entry of iconManifest.icons||[]){
  const relative=`assets/icons/${theme}/${entry.name}.svg`;
  const source=await read(relative);
  check(source.startsWith('<svg width="60" height="60" viewBox="0 0 60 60"'),`${relative} must be an intrinsic 60×60 SVG.`);
  check(!source.includes('#1E1E1E')&&!source.includes('Aident PPT')&&!source.includes('width="1014"')&&!source.includes('height="156"'),`${relative} still contains an exported Figma canvas/background.`);
  check(theme==='light'?source.includes('<rect width="60" height="60" rx="10" fill="white"/>'):source.includes('<rect width="60" height="60" rx="12" fill="white" fill-opacity="0.08"/>'),`${relative} has the wrong rounded theme surface.`);
}
check(!generator.includes("fs.cp(path.join(skillRoot,'assets')"),'Generator must not copy the entire packaged assets tree into each deck.');
check(generator.includes('copyRuntimeAssets(deck,html,outDir)')&&generator.includes('requiredFontFamilies(deck)'),'Generator must materialize only referenced assets and required runtime fonts.');
check(pptx.includes("if(ext!=='.webp')")&&pptx.includes("contentType:'image/png'"),'PPTX image adapter must convert WebP to PNG buffers in memory.');
check(!pptx.includes('assets/backgrounds/compiled/'),'PPTX exporter must not depend on committed compiled background copies.');

check(schema.$defs?.slide?.additionalProperties===false,'Slide schema must reject unknown fields.');
check(schema.$defs?.item?.additionalProperties===false,'Item schema must reject unknown fields.');
for(const property of ['workflowLabel','showWorkflowLabel','showArrows','showDividers','showStepLabels'])check(property in slideProperties,`Slide schema is missing ${property}.`);

const jsonRoots=['agents','assets','examples','references'];
const jsonFiles=[path.join(root,'package.json')];
for(const directory of jsonRoots)for(const file of await walk(path.join(root,directory)))if(file.endsWith('.json'))jsonFiles.push(file);
for(const file of jsonFiles){
  try{JSON.parse(await fs.readFile(file,'utf8'));checks++;}
  catch(error){errors.push(`${path.relative(root,file)} is invalid JSON: ${error.message}`);}
}

const markdownFiles=[path.join(root,'SKILL.md'),path.join(root,'README.md'),path.join(root,'README.en.md'),path.join(root,'NOTICE.md'),path.join(root,'AGENTS.md'),...(await walk(path.join(root,'references'))).filter(file=>file.endsWith('.md'))];
for(const file of markdownFiles){
  const source=await fs.readFile(file,'utf8');
  for(const match of source.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)){
    let target=match[1].trim().replace(/^<|>$/g,'').split('#')[0].split('?')[0];
    if(!target||/^(?:https?:|mailto:|data:|#|\/)/i.test(target))continue;
    try{target=decodeURIComponent(target);}catch{}
    const resolved=path.resolve(path.dirname(file),target);
    check(await fs.access(resolved).then(()=>true).catch(()=>false),`${path.relative(root,file)} links to missing ${target}.`);
  }
}

const publishableTextExtensions=new Set(['.css','.html','.js','.json','.md','.mjs','.txt','.yml','.yaml']);
const publishableRoots=['agents','assets','examples','references','scripts'];
const publishableFiles=[
  path.join(root,'SKILL.md'),
  path.join(root,'README.md'),
  path.join(root,'README.en.md'),
  path.join(root,'NOTICE.md'),
  path.join(root,'AGENTS.md'),
  path.join(root,'package.json'),
];
for(const directory of publishableRoots){
  for(const file of await walk(path.join(root,directory))){
    if(publishableTextExtensions.has(path.extname(file).toLowerCase()))publishableFiles.push(file);
  }
}
const localMacPathMarker=['','Users',''].join('/');
const privateDesignKeyMarker=['s3tgmr5U','cp3VeGNQQrhCF0'].join('');
for(const file of publishableFiles){
  const source=await fs.readFile(file,'utf8');
  check(!source.includes(localMacPathMarker),`${path.relative(root,file)} contains a local macOS user path.`);
  check(!source.includes(privateDesignKeyMarker),`${path.relative(root,file)} contains the private Figma file key.`);
}

if(errors.length){for(const error of errors)console.error(`ERROR ${error}`);console.error(`System validation failed: ${errors.length} error(s), ${checks} checks.`);process.exit(1);}
console.log(`System validation passed: ${checks} contract and package checks.`);
