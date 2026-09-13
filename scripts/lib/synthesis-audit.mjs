// Executable in the browser via page.evaluate; no Node dependencies.
export function auditSynthesis(slide){
 const scene=slide.querySelector('[data-synthesis]');if(!scene)return {errors:[],warnings:[]};
 const errors=[],warnings=[],panel=scene.querySelector('.m-synthesis-inputs'),groups=[...panel.children],outputs=scene.querySelector('.m-outputs'),arrow=scene.querySelector('.m-synthesis-arrow');
 const rect=el=>el.getBoundingClientRect(),r=rect(scene),p=rect(panel),scale=r.width/scene.offsetWidth,tol=1.5*scale;
 const css=el=>getComputedStyle(el),pad=parseFloat(css(panel).paddingLeft)*scale;
 const close=(a,b)=>Math.abs(a-b)<=tol;
 for(const el of [panel,outputs,arrow]){const b=rect(el);if(b.left<r.left-tol||b.right>r.right+tol||b.top<r.top-tol||b.bottom>r.bottom+tol)errors.push('Synthesis exceeds content zone; choose another arrangement/shorter copy, never shrink text');}
 const out=rect(outputs),ar=rect(arrow),gap=parseFloat(css(scene).gap)*scale;
 if(!close(ar.left-p.right,gap)||!close(out.left-ar.right,gap))errors.push('Synthesis connector spacing drift');
 if(!close((p.top+p.bottom)/2,(out.top+out.bottom)/2)||!close((ar.top+ar.bottom)/2,(p.top+p.bottom)/2))errors.push('Input, connector and output must share a vertical center');
 const im=arrow.querySelector('img');if(!close(arrow.offsetWidth,im.naturalWidth)||!close(arrow.offsetHeight,im.naturalHeight))errors.push('Synthesis arrow must retain intrinsic dimensions');
 const tags=[...panel.querySelectorAll('.m-tag')],outputTags=[...outputs.querySelectorAll('.m-tag')];
 for(const tag of [...tags,...outputTags]){
  const b=rect(tag),t=rect(tag.querySelector('.m-tag-text')),s=css(tag),px=parseFloat(s.paddingLeft)*scale,py=parseFloat(s.paddingTop)*scale;
  if(t.left<b.left+px-tol||t.right>b.right-px+tol||t.top<b.top+py-tol||t.bottom>b.bottom-py+tol)errors.push('Tag text exceeds its padded container: '+tag.textContent);
  if(scene.dataset.align==='left'&&!close(t.left,b.left+px))errors.push('Tag left alignment drift: '+tag.textContent);
  if(scene.dataset.align==='center'&&!close((t.left+t.right)/2,(b.left+b.right)/2))errors.push('Tag center alignment drift: '+tag.textContent);
  if(tags.includes(tag)&&(b.left<p.left+pad-tol||b.right>p.right-pad+tol||b.top<p.top+pad-tol||b.bottom>p.bottom-pad+tol))errors.push('Tag escapes input panel padding: '+tag.textContent);
 }
 if(scene.dataset.arrangement==='columns'){
  const first=rect(groups[0]);for(const g of groups){const b=rect(g);if(!close(b.width,first.width))errors.push('Synthesis columns must have equal widths');
   if(scene.dataset.groupAlign==='start'&&!close(b.top,first.top))errors.push('Synthesis group top alignment drift');
   if(scene.dataset.groupAlign==='center'&&!close((b.top+b.bottom)/2,(first.top+first.bottom)/2))errors.push('Synthesis group center alignment drift');
  }
  const counts=groups.map(g=>g.children.length),unused=1-counts.reduce((a,b)=>a+b,0)/(groups.length*Math.max(...counts));
  if(unused>.2)warnings.push('Uneven columns leave >20% empty cells: review rows/wrap if the groups are not ordered vertical stages.');
 }
 for(const g of groups){const cells=[...g.children],gr=rect(g);
  if(scene.dataset.tagWidth==='fill'){
   const width=scene.dataset.arrangement==='columns'?gr.width:rect(cells[0]).width;
   for(const cell of cells)if(!close(rect(cell).width,width))errors.push('Fill tags have inconsistent cell widths');
  }
  if(scene.dataset.arrangement==='rows'){
   if(!close(gr.left,p.left+pad+scale)||!close(gr.right,p.right-pad-scale))errors.push('Row groups must share panel edges');
   for(const cell of cells)if(!close((rect(cell).top+rect(cell).bottom)/2,(gr.top+gr.bottom)/2))errors.push('Tags in a row must share a vertical center');
  }
 }
 const sizeCount=new Set(tags.map(t=>css(t.querySelector('.m-tag-text')).fontSize)).size;
 if(sizeCount===1&&scene.dataset.arrangement==='columns'&&scene.dataset.tagWidth==='fill'){
  const height=rect(tags[0]).height;for(const tag of tags)if(!close(rect(tag).height,height))errors.push('Peer fill labels must share a height, not only a font size');
 }
 if(sizeCount===2)warnings.push('Input tags mix two size levels: confirm an intentional heading/detail or emphasis role; peer labels should share one size.');
 if(sizeCount>2)warnings.push('Input tags use three size levels: confirm distinct semantic roles; available tokens are not a checklist.');
 if(new Set(tags.map(t=>css(t).color)).size>3)warnings.push('Input tags use more than three text colors: explain categories or simplify emphasis.');
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
