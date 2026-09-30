// Non-destructive editorial signals. These are review prompts, not semantic verdicts.
export function auditMotionEditorial(deck,timeline){
 const findings=[],add=(code,slideId,message)=>findings.push({code,slideId,message});
 const norm=v=>String(v??'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const overlap=(a,b)=>{a=norm(a);b=norm(b);return a&&b&&(a===b||a.length>=4&&(` ${b} `).includes(` ${a} `));};
 const repeated=new Map();
 for(const [i,s] of deck.slides.entries()){
  const groups=[s,...(s.items||[]),...(s.rows||[]).flatMap(r=>r.items||[])];
  for(const [j,v] of groups.entries())for(const k of ['label','badge','body','kicker']){
   if(!norm(v[k]))continue;
   if([v.title,v.value].some(t=>overlap(v[k],t)))add('redundant-copy',s.id,`${j?`item ${j}`:'scene'} ${k} repeats its title/value; omit unless it adds necessary context.`);
   if(['label','kicker'].includes(k)&&norm(v[k]).length>=8){const n=norm(v[k]);if(!repeated.has(n))repeated.set(n,new Set());repeated.get(n).add(s.id);}
  }
  if(s.result?.title&&overlap(s.result.title,s.title))add('repeated-result-title',s.id,'The result title repeats the scene heading; review whether both are needed.');
  if(['hero-number','hero-word'].includes(s.variant)&&s.title&&s.label&&s.body)add('hero-copy-density',s.id,'Hero value has title, label and body; consider value plus one necessary explanation.');
  const copy=[];
  function visible(v){if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){
   if(['notes','image','logos','tools','hub','connections','send','motion','scroll','composition'].includes(k))continue;
   if(['title','label','badge','kicker','body','value','prompt','caption'].includes(k)&&typeof x==='string')copy.push(x);
   else if(['items','groups','outputs','result','rows'].includes(k)){if(Array.isArray(x))x.forEach(y=>Array.isArray(y)?y.forEach(visible):visible(y));else visible(x);}
  }}visible(s);
  const str=copy.join(' '),zh=deck.meta.language==='zh',units=zh?(str.match(/[\p{Script=Han}]|[A-Za-z0-9]+/gu)||[]).length:(str.match(/[\p{L}\p{N}]+/gu)||[]).length;
  const duration=timeline[i]?.duration;
  if(duration&&units/duration>(zh?7:4))add('reading-density',s.id,`${units} text units in ${duration}s: review reading/action/hold time. This heuristic is not a required duration; tables and logos also need manual review.`);
 }
 for(const [copy,ids]of repeated)if(ids.size>1)add('repeated-support-copy',null,`Supporting copy appears on ${[...ids].join(', ')}: “${copy}”. Keep intentional repetition only.`);
 const timing=deck.meta.timing||{policy:'content'},total=timeline.reduce((sum,s)=>sum+s.duration,0);
 if(timing.policy==='fixed'&&Math.abs(total-timing.targetSeconds)>1/(deck.meta.fps||30))add('fixed-duration-mismatch',null,`Advisory total ${total.toFixed(2)}s differs from requested fixed ${timing.targetSeconds}s. Resolve the plan or request a changed brief; never silently compress scenes. Final video duration still needs downstream verification.`);
 if(timing.policy==='target'&&Math.abs(total-timing.targetSeconds)>1/(deck.meta.fps||30))add('target-duration-review',null,`Advisory total ${total.toFixed(2)}s versus reference ${timing.targetSeconds}s; explain the content-driven difference, not automatic normalization.`);
 return {version:1,automatedScope:'Lexical redundancy and reading-density hints only; no automatic copy deletion, semantic approval or final-video timing certification.',timing:{...timing,advisoryTotalSeconds:total},findings,manualReviewRequired:['Same-meaning repetition, including synonyms','Approved content, removals, logo and ending preserved','Reading order, visual balance and actual animation pacing']};
}
