#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

function parseArgs(argv){const args={};for(let i=2;i<argv.length;i++){if(argv[i]==='--html')args.html=argv[++i];else if(argv[i]==='--screenshots')args.screenshots=argv[++i];else if(argv[i]==='--static-only')args.staticOnly=true;else if(argv[i]==='--allow-font-fallback')args.allowFontFallback=true;else if(argv[i]==='--help')args.help=true;else throw new Error(`Unknown argument: ${argv[i]}`)}return args}
const usage='Usage: node scripts/preflight.mjs --html output/deck/index.html [--screenshots output/qa] [--allow-font-fallback] [--static-only]\n';

async function importPackage(name){
  const require=createRequire(import.meta.url);
  const roots=[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean);
  const resolved=require.resolve(name,{paths:roots});
  return import(pathToFileURL(resolved).href);
}
async function browserExecutable(){for(const candidate of [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium'].filter(Boolean)){if(await fs.access(candidate).then(()=>true).catch(()=>false))return candidate}return undefined}

async function localFontChecks(args,htmlPath){
  const fontRoot=path.join(path.dirname(htmlPath),'assets/fonts');
  const manifest=await fs.readFile(path.join(fontRoot,'manifest.json'),'utf8').then(JSON.parse).catch(()=>null);
  if(!manifest?.families?.length)return {errors:['Generated font manifest is missing or empty.'],warnings:[],families:[]};
  const required=manifest.families.flatMap(family=>(family.web||[]).map(face=>({family:family.family,file:face.file})));
  const missing=[];
  for(const font of required)if(!await fs.access(path.join(fontRoot,font.file)).then(()=>true).catch(()=>false))missing.push(font.family);
  const families=[...new Set(manifest.families.map(family=>family.family))];
  if(!missing.length)return {errors:[],warnings:[],families};
  const message=`Required bundled font files not found: ${missing.join(', ')}`;
  return args.allowFontFallback?{errors:[],warnings:[message],families}:{errors:[message],warnings:[],families};
}

function staticChecks(html){
  const errors=[],warnings=[];
  const slideTags=[...html.matchAll(/<section class="slide\s+([^\"]+)"[^>]*data-id="([^"]+)"[^>]*>/g)];
  if(!slideTags.length)errors.push('No slides found.');
  const ids=slideTags.map(m=>m[2]);
  if(new Set(ids).size!==ids.length)errors.push('Duplicate slide ids found.');
  if(/class="slide\s+callout\b/.test(html))errors.push('Standalone callout slide is forbidden.');
  if(/<h1[^>]*>\s*(?:\[|TODO|TBD|Lorem)/i.test(html))errors.push('Unresolved title placeholder found.');
  if(!html.includes('class="background"')||!html.includes('class="texture"'))errors.push('Every slide must use background and texture layers.');
  if(/[🀀-🫿☀-➿]/u.test(html))errors.push('Emoji detected; use packaged design-system icons.');
  if(/(?:font-size|line-height)\s*:\s*150px/i.test(html))errors.push('Invalid fixed 150px line-height found; use 150%.');
  if(/height\s*:\s*1px/i.test(html))warnings.push('1px height found; inspect whether it is an intentional divider.');
  if(/class="team-caption"/.test(html))errors.push('Unregistered team caption detected; Team uses three content items above one image.');
  return {slideCount:slideTags.length,errors,warnings};
}

async function browserChecks(htmlPath,args,slideCount,expectedFonts){
  const playwrightModule=await importPackage('playwright');
  const {chromium}=playwrightModule.default||playwrightModule;
  const browser=await chromium.launch({headless:true,executablePath:await browserExecutable()});
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  const results=[];
  if(args.screenshots)await fs.mkdir(path.resolve(args.screenshots),{recursive:true});
  for(let i=0;i<slideCount;i++){
    const url=new URL(pathToFileURL(htmlPath));url.searchParams.set('embed','1');url.searchParams.set('slide',String(i));
    await page.goto(url.href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(120);
    const audit=await page.evaluate(async({allowFontFallback,expectedFonts})=>{
      const slide=document.querySelector('.slide.is-active');
      const errors=[],warnings=[];
      if(!slide)return {errors:['No active slide.'],warnings:[]};
      const sr=slide.getBoundingClientRect();
      if(Math.abs(sr.width-1920)>1||Math.abs(sr.height-1080)>1)errors.push(`Rendered slide size must be 1920×1080, received ${Math.round(sr.width)}×${Math.round(sr.height)}.`);
      const visible=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&r.width>0&&r.height>0};
      for(const el of slide.querySelectorAll('img'))if(!el.complete||el.naturalWidth===0)errors.push(`Broken image: ${el.getAttribute('src')}`);
      for(const box of slide.querySelectorAll('.icon-box')){
        if(!visible(box))continue;
        const image=box.querySelector('img'),boxRect=box.getBoundingClientRect(),style=getComputedStyle(box);
        const dense=Boolean(box.closest('.card-grid[data-count="6"]'));
        const dark=slide.dataset.theme==='dark';
        const expectedSize=dense?48:60;
        const expectedRadius=dense?(dark?9.6:8):(dark?12:10);
        const expectedSurface=dark?'rgba(255, 255, 255, 0.08)':'rgb(255, 255, 255)';
        if(Math.abs(boxRect.width-expectedSize)>.5||Math.abs(boxRect.height-expectedSize)>.5)errors.push(`Icon box must be ${expectedSize}×${expectedSize}px; received ${boxRect.width.toFixed(1)}×${boxRect.height.toFixed(1)}px.`);
        if(Math.abs(parseFloat(style.borderTopLeftRadius)-expectedRadius)>.1)errors.push(`Icon box radius must be ${expectedRadius}px on ${dark?'Dark':'Light'}; received ${style.borderTopLeftRadius}.`);
        if(!['hidden','clip'].includes(style.overflow))errors.push(`Icon box must clip overflow; received ${style.overflow}.`);
        if(style.backgroundColor!==expectedSurface)errors.push(`Icon box surface must be ${expectedSurface}; received ${style.backgroundColor}.`);
        if(!image){errors.push('Icon box is missing its packaged SVG image.');continue}
        if(image.naturalWidth!==60||image.naturalHeight!==60)errors.push(`Icon SVG must have intrinsic 60×60 dimensions; received ${image.naturalWidth}×${image.naturalHeight}.`);
        const imageRect=image.getBoundingClientRect();
        if(Math.abs(imageRect.width-expectedSize)>.5||Math.abs(imageRect.height-expectedSize)>.5)errors.push(`Icon image must fill its ${expectedSize}px box without offset.`);
        if(Math.abs((imageRect.left+imageRect.right-boxRect.left-boxRect.right)/2)>.5||Math.abs((imageRect.top+imageRect.bottom-boxRect.top-boxRect.bottom)/2)>.5)errors.push('Icon image is not centered inside its box.');
      }
      for(const el of slide.querySelectorAll('.brand-logo,.cover-identity-logo')){if(!visible(el)||!el.naturalWidth||!el.naturalHeight)continue;const r=el.getBoundingClientRect(),natural=el.naturalWidth/el.naturalHeight,rendered=r.width/r.height;if(Math.abs(rendered/natural-1)>.015)errors.push(`Logo aspect ratio changed: ${natural.toFixed(3)} → ${rendered.toFixed(3)}.`);if(r.left<sr.left-1||r.right>sr.right+1)errors.push('Logo exceeds slide bounds; use a logo with tighter visible bounds.')}
      if(slide.dataset.type==='cover'&&slide.querySelector('.brand-header'))errors.push('Cover must not render the page header.');
      if(slide.dataset.type==='cover'&&slide.dataset.coverLayout==='text-only'&&slide.querySelector('.content-zone'))errors.push('Text-only cover must not reserve an empty content zone.');
      if(slide.dataset.type!=='cover'&&getComputedStyle(slide.querySelector('.slide-heading')).textAlign==='center')errors.push('Inner slide heading must be left aligned.');
      if(slide.dataset.type==='cover'&&slide.dataset.background==='elements-inner')errors.push('Cover uses elements-inner background.');
      if(slide.dataset.type!=='cover'&&slide.dataset.background==='elements-cover')errors.push('Inner slide uses elements-cover background.');
      for(const el of slide.querySelectorAll('.callout.accent')){
        const style=getComputedStyle(el),background=style.backgroundImage.replace(/\s+/g,'').toLowerCase();
        const expectedStops=['rgba(160,169,254,0.16)','rgba(46,238,238,0.16)','rgba(147,252,184,0.16)'];
        if(!expectedStops.every(stop=>background.includes(stop)))errors.push('Accent Callout must use the registered gradient with 16% fill opacity on every stop.');
        if(Number(style.opacity)<.999)errors.push('Accent Callout container must remain fully opaque; apply 16% only to its background gradient stops.');
        if(el.getBoundingClientRect().height<87.5)errors.push('Accent Callout must keep its 88px minimum hug height.');
        const blur=style.backdropFilter||style.webkitBackdropFilter||'';
        if(!/blur\(20px\)/.test(blur))errors.push('Accent Callout must retain the registered 20px background blur.');
        if(parseFloat(style.borderTopWidth)>0&&style.borderTopStyle!=='none')errors.push('Accent Callout must not have a stroke.');
      }
      for(const workflow of slide.querySelectorAll('.workflow')){
        const steps=[...workflow.querySelectorAll('.workflow-step')];
        const arrows=[...workflow.querySelectorAll('.workflow-arrow')].filter(visible);
        const expected=workflow.classList.contains('no-arrows')?0:steps.length;
        if(arrows.length!==expected)errors.push(`Workflow must render one visible arrow above each Step (${expected} total); received ${arrows.length}.`);
        if(workflow.querySelector('.workflow-step .workflow-arrow'))errors.push('Workflow arrows must not be children of Step components.');
        if(!workflow.classList.contains('no-arrows')){
          const arrowRow=workflow.querySelector('.workflow-arrows'),stepRow=workflow.querySelector('.workflow-steps');
          if(arrowRow&&stepRow){const gap=stepRow.getBoundingClientRect().top-arrowRow.getBoundingClientRect().bottom;if(gap<31.5)errors.push(`Workflow arrow row must end 32px above the Step row; received ${gap.toFixed(1)}px.`)}
        }
        const expectedNumberColor=slide.dataset.theme==='dark'?'rgb(30, 234, 234)':'rgb(0, 128, 137)';
        for(const number of workflow.querySelectorAll('.step-number'))if(getComputedStyle(number).color!==expectedNumberColor)errors.push(`Step number must use ${expectedNumberColor}; received ${getComputedStyle(number).color}.`);
        if(workflow.classList.contains('no-dividers'))for(const step of steps.slice(1)){
          const pseudo=getComputedStyle(step,'::before');
          if(pseudo.display!=='none'&&pseudo.content!=='none')errors.push('Workflow showDividers:false must remove Step dividers in HTML.');
        }
      }
      if(slide.dataset.type==='team'){
        const items=[...slide.querySelectorAll('.team-point')].filter(visible),media=slide.querySelector('.team-media');
        if(items.length!==3)errors.push(`Team must render exactly three content items; received ${items.length}.`);
        if(slide.querySelector('.callout'))errors.push('Team must not render a Callout.');
        if(slide.querySelector('.source-footer:not(:empty)'))errors.push('Team must not render a Source footer.');
        if(media&&items.length){const lastBottom=Math.max(...items.map(item=>item.getBoundingClientRect().bottom)),mediaTop=media.getBoundingClientRect().top;if(mediaTop<=lastBottom)errors.push('Team image must sit below all three content items.');}
      }
      for(const el of slide.querySelectorAll('[data-one-line]')){
        if(el.scrollWidth>el.clientWidth+1)errors.push(`One-line text overflow: "${el.textContent.trim()}" (${el.scrollWidth-el.clientWidth}px)`);
        const lh=parseFloat(getComputedStyle(el).lineHeight)||0;if(lh&&el.getBoundingClientRect().height>lh*1.15)errors.push(`One-line text wrapped: "${el.textContent.trim()}"`);
      }
      const bounded=[...slide.querySelectorAll('.brand-header,.slide-heading,.content-zone,.source-footer')].filter(visible);
      for(const el of bounded){const r=el.getBoundingClientRect();if(r.left<sr.left-1||r.top<sr.top-1||r.right>sr.right+1||r.bottom>sr.bottom+1)errors.push(`${el.className} leaves slide bounds.`)}
      const ordered=[...slide.querySelectorAll('.brand-header,.slide-heading,.content-main,.callout,.source-footer')].filter(visible);
      for(let a=0;a<ordered.length;a++)for(let b=a+1;b<ordered.length;b++){
        const x=ordered[a],y=ordered[b];if(x.contains(y)||y.contains(x))continue;
        const xr=x.getBoundingClientRect(),yr=y.getBoundingClientRect();
        const ox=Math.min(xr.right,yr.right)-Math.max(xr.left,yr.left),oy=Math.min(xr.bottom,yr.bottom)-Math.max(xr.top,yr.top);
        if(ox>1&&oy>1)errors.push(`Overlap: ${x.className} ↔ ${y.className} (${Math.round(ox)}×${Math.round(oy)}px)`);
      }
      if(slide.scrollWidth>1920+1||slide.scrollHeight>1080+1)errors.push(`Slide overflow: ${slide.scrollWidth}×${slide.scrollHeight}.`);
      const missing=[];
      for(const font of expectedFonts){await document.fonts.load(`20px "${font}"`);if(!document.fonts.check(`20px "${font}"`))missing.push(font)}
      if(missing.length){const message=`Unresolved fonts: ${missing.join(', ')}`;(allowFontFallback?warnings:errors).push(message)}
      const debugRect=el=>{if(!el)return null;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom,fontSize:s.fontSize,lineHeight:s.lineHeight,display:s.display,position:s.position,transform:s.transform}};
      return {id:slide.dataset.id,type:slide.dataset.type,errors,warnings,geometry:{slide:debugRect(slide),shell:debugRect(slide.querySelector('.slide-shell')),heading:debugRect(slide.querySelector('.slide-heading')),title:debugRect(slide.querySelector('.slide-title')),identity:debugRect(slide.querySelector('.cover-identity-logo,.cover-identity-kicker')),content:debugRect(slide.querySelector('.content-zone'))}};
    },{allowFontFallback:Boolean(args.allowFontFallback),expectedFonts});
    if(args.screenshots)await page.screenshot({path:path.join(path.resolve(args.screenshots),`slide-${String(i+1).padStart(2,'0')}.png`),fullPage:false});
    results.push(audit);
  }
  for(const viewport of [{width:1280,height:720},{width:1366,height:768},{width:1440,height:900},{width:1024,height:768}]){
    await page.setViewportSize(viewport);
    const url=new URL(pathToFileURL(htmlPath));url.searchParams.set('embed','1');url.searchParams.set('slide','0');
    await page.goto(url.href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(240);
    const audit=await page.evaluate(({width,height})=>{
      const deck=document.getElementById('deck'),slide=document.querySelector('.slide.is-active'),errors=[],warnings=[];
      if(!deck||!slide)return {id:`responsive-${width}x${height}`,type:'runtime',errors:['Responsive preview is missing the deck or active slide.'],warnings:[]};
      const dr=deck.getBoundingClientRect(),sr=slide.getBoundingClientRect(),expectedScale=Math.min(width/1920,height/1080),tolerance=1.5;
      const expectedWidth=1920*expectedScale,expectedHeight=1080*expectedScale;
      if(dr.left<-tolerance||dr.top<-tolerance||dr.right>width+tolerance||dr.bottom>height+tolerance)errors.push(`Scaled deck is clipped at ${width}×${height}: ${dr.left.toFixed(1)},${dr.top.toFixed(1)} → ${dr.right.toFixed(1)},${dr.bottom.toFixed(1)}.`);
      if(Math.abs(dr.width-expectedWidth)>tolerance||Math.abs(dr.height-expectedHeight)>tolerance)errors.push(`Scaled deck size is incorrect at ${width}×${height}: ${dr.width.toFixed(1)}×${dr.height.toFixed(1)}, expected ${expectedWidth.toFixed(1)}×${expectedHeight.toFixed(1)}.`);
      if(Math.abs((dr.left+dr.right)/2-width/2)>tolerance||Math.abs((dr.top+dr.bottom)/2-height/2)>tolerance)errors.push(`Scaled deck is not centered at ${width}×${height}.`);
      if(Math.abs(sr.left-dr.left)>tolerance||Math.abs(sr.top-dr.top)>tolerance||Math.abs(sr.right-dr.right)>tolerance||Math.abs(sr.bottom-dr.bottom)>tolerance)errors.push(`Active slide does not match the scaled deck bounds at ${width}×${height}.`);
      return {id:`responsive-${width}x${height}`,type:'runtime',errors,warnings,geometry:{viewport:{width,height},deck:{left:dr.left,top:dr.top,right:dr.right,bottom:dr.bottom,width:dr.width,height:dr.height},slide:{left:sr.left,top:sr.top,right:sr.right,bottom:sr.bottom,width:sr.width,height:sr.height}}};
    },viewport);
    results.push(audit);
  }
  await browser.close();return results;
}

async function main(){
  const args=parseArgs(process.argv);if(args.help){process.stdout.write(usage);return}if(!args.html)throw new Error(usage.trim());
  const htmlPath=path.resolve(args.html),html=await fs.readFile(htmlPath,'utf8');
  if(html.includes('data-mode="motion"')){
    if(args.staticOnly)throw new Error('Motion Slides require browser preflight to validate the scrolling window.');
    const {preflightMotion}=await import('./preflight-motion.mjs');
    const report=await preflightMotion(htmlPath,args.screenshots);if(report.errors.length)process.exitCode=1;return;
  }
  const stat=staticChecks(html);const localFonts=await localFontChecks(args,htmlPath);let browser=[];
  if(!args.staticOnly)browser=await browserChecks(htmlPath,args,stat.slideCount,localFonts.families);
  const errors=[...stat.errors,...localFonts.errors,...browser.flatMap(s=>s.errors.map(e=>`${s.id}: ${e}`))];
  const warnings=[...stat.warnings,...localFonts.warnings,...browser.flatMap(s=>s.warnings.map(e=>`${s.id}: ${e}`))];
  if(process.env.AIDENT_DEBUG_LAYOUT==='1')console.log(JSON.stringify(browser,null,2));
  warnings.forEach(w=>console.warn(`WARN ${w}`));errors.forEach(e=>console.error(`ERROR ${e}`));
  console.log(`Preflight: ${stat.slideCount} slides, ${errors.length} errors, ${warnings.length} warnings.`);
  if(errors.length)process.exitCode=1;
}

main().catch(error=>{console.error(error.stack||error);process.exitCode=1});
