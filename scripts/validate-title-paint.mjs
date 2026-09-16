#!/usr/bin/env node
// Compare gradient-painted glyph coverage against ordinary text, not just DOM rectangles.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const resolve=name=>require(require.resolve(name,{paths:[process.env.RUNTIME_NODE_MODULES,path.resolve('node_modules')].filter(Boolean)}));
const {chromium}=resolve('playwright'),sharp=resolve('sharp');
const input=process.argv[process.argv.indexOf('--html')+1];
if(!process.argv.includes('--html')||!input)throw Error('Usage: node scripts/validate-title-paint.mjs --html <generated-presentation/index.html>');
await fs.access(input);
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 await page.goto(pathToFileURL(path.resolve(input)).href+'?embed=1');await page.evaluate(()=>document.fonts.ready);
 const zh=await page.evaluate(()=>document.body.dataset.lang==='zh');
 const copy=zh?['字形完整，排版清晰','测试字体下沿\n保持标题完整']:['Typography: g j p q y','Make context visible\nbefore making decisions'];
 await page.addStyleTag({content:'body>*{visibility:hidden!important} #glyph-probe,#glyph-probe *{visibility:visible!important;animation:none!important;transition:none!important} #glyph-probe{position:fixed!important;inset:0!important;z-index:99999;background:white!important;color:black!important;transform:none!important;overflow:visible!important} #glyph-probe h1{position:absolute;left:100px;top:100px;width:1580px;white-space:pre-wrap;text-wrap:initial;transform:none;opacity:1}'});
 await page.evaluate(()=>{const probe=document.createElement('section');probe.id='glyph-probe';probe.className='slide';probe.innerHTML='<h1 class="slide-title"></h1>';document.body.append(probe);});
 const title=page.locator('#glyph-probe h1'),clip={x:80,y:70,width:1650,height:390};
 async function missingPixels(disableBleed=false){
  await title.evaluate((el,disable)=>{el.style.paddingBottom=disable?'0':'';el.style.marginBottom=disable?'0':'';el.style.backgroundImage='none';el.style.webkitTextFillColor='black';el.style.color='black';},disableBleed);
  const reference=await sharp(await page.screenshot({clip})).removeAlpha().raw().toBuffer();
  await title.evaluate(el=>{el.style.backgroundImage='linear-gradient(black,black)';el.style.webkitTextFillColor='transparent';});
  const gradient=await sharp(await page.screenshot({clip})).removeAlpha().raw().toBuffer();
  let missing=0;for(let i=0;i<reference.length;i+=3)if(reference[i]<128&&gradient[i]>192)missing++;
  return missing;
 }
 for(const theme of ['light','dark'])for(const cover of [false,true])for(const text of copy){
  await page.evaluate(({theme,cover,text})=>{const probe=document.querySelector('#glyph-probe');probe.dataset.theme=theme;probe.className='slide'+(cover?' cover':'');probe.querySelector('h1').textContent=text;},{theme,cover,text});
  await page.evaluate(()=>document.fonts.ready);
  assert.ok(await missingPixels()<=3,`${theme}/${cover?'cover':'inner'} gradient title clips glyph pixels: ${text}`);
 }
 if(!zh){assert.ok(await missingPixels(true)>20,'Negative fixture must detect descenders clipped without paint bleed');}
 console.log(`Title paint: 8 ${zh?'ZH':'EN'} Light/Dark, cover/inner, single/multiline cases passed${zh?'':'; missing-bleed negative fixture rejected'}.`);
}finally{await browser.close();}
