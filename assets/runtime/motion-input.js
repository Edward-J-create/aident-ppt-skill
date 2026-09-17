/* Opt-in geometry helpers. No animation, timers, click dispatch or auto-follow. */
(() => {
 const savedProps=['width','min-width','max-width','height','min-height','max-height','box-sizing','flex'];
 function axis(el){
  for(let n=el;n instanceof Element;n=n.parentElement){
   const c=getComputedStyle(n),m=new DOMMatrixReadOnly(c.transform==='none'?undefined:c.transform);
   const scale=c.scale==='none'?[1]:c.scale.split(' ').map(Number);
   if(!m.is2D||Math.abs(m.b)>1e-7||Math.abs(m.c)>1e-7||m.a<=0||m.d<=0||c.perspective!=='none'||!['none','0deg'].includes(c.rotate)||scale.some(v=>!Number.isFinite(v)||v<=0)||Number(c.zoom||1)!==1)throw Error('Input binding supports positive axis-aligned 2D transforms only');
  }
 }
 function box(el){
  if(!el?.isConnected)throw Error('Missing Input target');
  axis(el);
  for(let n=el;n instanceof Element;n=n.parentElement){const c=getComputedStyle(n);if(c.display==='none'||c.visibility!=='visible')throw Error('Input target is hidden');}
  const r=el.getBoundingClientRect();if(!r.width||!r.height)throw Error('Input target has no measurable box');return r;
 }
 const fontKey=el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.fontStyle,s.letterSpacing,s.lineHeight].join('|')};
 function bind(scene){
  if(!(scene instanceof Element))throw Error('Input binding needs a scene Element');
  const get=name=>scene.querySelector(`[data-motion="${name}"]`);
  const text=get('prompt-text'),prompt=get('prompt'),pointer=get('cursor'),send=get('send'),im=pointer?.querySelector('img');
  if(!text||!prompt)throw Error('Missing prompt targets');
  const originalSource=im?.getAttribute('src');
  let saved=null,prepared=false,finalText='',font='',busy=false;
  function restore(){if(saved){for(const [key,value,priority] of saved){if(value)prompt.style.setProperty(key,value,priority);else prompt.style.removeProperty(key);}saved=null;}prepared=false;}
  function release(){if(busy)throw Error('Input preparation is pending');restore();}
  async function prepare(value){
   if(busy)throw Error('Input preparation is pending');
   if(typeof value!=='string'||!value)throw Error('Supply the complete non-empty prompt');
   busy=true;const previous=text.textContent;
   try{
    restore();text.textContent=value;
    const style=getComputedStyle(text),face=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    await document.fonts.load(face,value);await document.fonts.ready;
    if(!document.fonts.check(face,value))throw Error('Prompt font is not ready');
    await Promise.all([...scene.querySelectorAll('img')].map(image=>image.decode()));
    box(prompt);
    // Computed CSS sizes are local layout units, unlike viewport DOMRect sizes.
    const c=getComputedStyle(prompt),extra=k=>parseFloat(c[k])||0;
    const width=parseFloat(c.width)+(c.boxSizing==='border-box'?0:extra('paddingLeft')+extra('paddingRight')+extra('borderLeftWidth')+extra('borderRightWidth'));
    const height=parseFloat(c.height)+(c.boxSizing==='border-box'?0:extra('paddingTop')+extra('paddingBottom')+extra('borderTopWidth')+extra('borderBottomWidth'));
    if(!(width>0&&height>0))throw Error('Cannot reserve Input dimensions');
    saved=savedProps.map(k=>[k,prompt.style.getPropertyValue(k),prompt.style.getPropertyPriority(k)]);
    Object.assign(prompt.style,{boxSizing:'border-box',width:`${width}px`,minWidth:`${width}px`,maxWidth:`${width}px`,height:`${height}px`,minHeight:`${height}px`,maxHeight:`${height}px`,flex:'none'});
    if(prompt.scrollWidth>prompt.clientWidth+1||prompt.scrollHeight>prompt.clientHeight+1)throw Error('Full prompt overflows its reserved box');
    if(send){const a=box(prompt),b=box(send);if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)throw Error('Prompt overlaps Send');}
    finalText=value;font=fontKey(text);prepared=true;return {width,height,text:value};
   }catch(error){restore();throw error;}finally{text.textContent=previous;busy=false;}
  }
  function measure({hotspot}={}){
   if(!prepared||busy)throw Error('Await binding.prepare(fullPrompt) after fonts/assets are ready');
   if(document.fonts.status!=='loaded'||fontKey(text)!==font)throw Error('Font changed; prepare Input again');
   if(!finalText.startsWith(text.textContent))throw Error('Prompt changed; prepare Input again');
   if(!pointer||!send||!im||send.disabled)throw Error('Missing pointer/Send or disabled Send');
   const pr=box(pointer),ir=box(im),br=box(send),parent=pointer.parentElement,ar=box(parent),sr=box(scene);
   if(!im.complete||!im.naturalWidth)throw Error('Pointer image is not ready');
   const config=window.AIDENT_INPUT_CONFIG;
   if(!hotspot){
    if(!config||im.getAttribute('src')!==originalSource)throw Error('Replacement pointer requires a normalized hotspot');
    hotspot={x:config.hotspot.x/config.viewBox.width,y:config.hotspot.y/config.viewBox.height};
   }
   if(!['x','y'].every(k=>Number.isFinite(hotspot[k])&&hotspot[k]>=0&&hotspot[k]<=1))throw Error('Hotspot coordinates must be normalized to 0..1');
   const ic=getComputedStyle(im);
   if(['paddingLeft','paddingRight','paddingTop','paddingBottom','borderLeftWidth','borderRightWidth','borderTopWidth','borderBottomWidth'].some(k=>parseFloat(ic[k])))throw Error('Pointer image padding/border is unsupported');
   let w=ir.width,h=ir.height;
   if(ic.objectFit==='contain'){
    if(ic.objectPosition!=='50% 50%')throw Error('Use centered contain for pointer artwork');
    const localW=parseFloat(ic.width),localH=parseFloat(ic.height),fit=Math.min(localW/im.naturalWidth,localH/im.naturalHeight);
    w=im.naturalWidth*fit*ir.width/localW;h=im.naturalHeight*fit*ir.height/localH;
   }else if(ic.objectFit!=='fill')throw Error('Pointer artwork requires fill or centered contain');
   const tip={x:ir.x+(ir.width-w)/2+hotspot.x*w,y:ir.y+(ir.height-h)/2+hotspot.y*h};
   const target={x:br.x+br.width/2,y:br.y+br.height/2},dx=target.x-tip.x,dy=target.y-tip.y;
   const sx=ar.width/parent.offsetWidth,sy=ar.height/parent.offsetHeight,cx=sr.width/scene.offsetWidth,cy=sr.height/scene.offsetHeight;
   const error=Math.hypot(dx/cx,dy/cy),tolerance=config?.tolerance??1;
   return {delta:{x:dx/sx,y:dy/sy},tip,target,error,tolerance,aligned:error<=tolerance,
    transformOrigin:`${(tip.x-pr.x)*pointer.offsetWidth/pr.width}px ${(tip.y-pr.y)*pointer.offsetHeight/pr.height}px`};
  }
  function assertAligned(options){
   const result=measure(options);
   for(const el of [pointer,send])for(let n=el;n instanceof Element;n=n.parentElement)if(Number(getComputedStyle(n).opacity)===0)throw Error('Click target is invisible');
   if(!result.aligned)throw Error(`Pointer misses Send by ${result.error.toFixed(2)} canvas px`);
   return result;
  }
  return {prepare,measure,assertAligned,release};
 }
 window.AIDENT_INPUT={bind};
})();
