// Local-only wheel delivery / next-frame diagnostics. No production telemetry.
const samples=[];let armed=false,pending=[],lastWheel=-Infinity;
const nativeRAF=window.requestAnimationFrame.bind(window);
const now=()=>performance.now();
function stamp(event){return event.timeStamp>1e12?event.timeStamp-performance.timeOrigin:event.timeStamp;}
window.addEventListener('wheel',event=>{
 if(!armed)return;
 const received=now(),input=stamp(event);
 const sample={trusted:event.isTrusted,burstStart:received-lastWheel>180,x:event.clientX,y:event.clientY,deltaY:event.deltaY,handlerDelayMs:received-input,inputAt:input,receivedAt:received};
 lastWheel=received;samples.push(sample);pending.push(sample);
 nativeRAF(()=>{sample.nextAnimationFrameMs=now()-input;});
},{passive:true,capture:true});
window.addEventListener('scroll',()=>{
 if(!armed||!pending.length)return;
 const batch=pending;pending=[];const observed=now();
 for(const sample of batch)sample.scrollEventMs=observed-sample.inputAt;
 nativeRAF(()=>{const frame=now();for(const sample of batch)sample.scrollObservedAtFrameMs=frame-sample.inputAt;});
},{passive:true});
window.addEventListener('DOMContentLoaded',()=>{
 const panel=document.createElement('aside');panel.style.cssText='position:fixed;left:0;right:0;top:0;z-index:1000;background:white;color:#111;padding:8px;font:12px monospace';
 panel.innerHTML='<button id="record-input">Record wheel response (5s)</button> <span id="latency-status">Ready</span><details><summary>Input latency results</summary><pre id="latency-results" style="max-height:300px;overflow:auto"></pre></details>';
 document.body.append(panel);
 document.querySelector('#record-input').onclick=()=>{
  samples.length=0;pending=[];armed=true;lastWheel=-Infinity;document.querySelector('#latency-status').textContent='Recording';
  setTimeout(()=>{
   armed=false;
   const q=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))]:null;
   const round=x=>x===null?null:Math.round(x*100)/100;
   const summary=group=>Object.fromEntries(['handlerDelayMs','nextAnimationFrameMs','scrollEventMs','scrollObservedAtFrameMs'].map(key=>{const values=group.map(x=>x[key]).filter(Number.isFinite);return [key,{count:values.length,p50:round(q(values,.5)),p95:round(q(values,.95)),max:values.length?round(Math.max(...values)):null}];}));
   const result={url:location.pathname,renderer:document.querySelector('.margin-garden')?.dataset.renderer||'none',thread:document.querySelector('.margin-garden')?.dataset.thread||'main',viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},wheelEvents:samples.length,burstStarts:samples.filter(x=>x.burstStart).length,trusted:samples.every(x=>x.trusted),all:summary(samples),starts:summary(samples.filter(x=>x.burstStart)),samples:samples.map(({inputAt,receivedAt,...sample})=>Object.fromEntries(Object.entries(sample).map(([key,value])=>[key,typeof value==='number'?Math.round(value*100)/100:value]))),limitations:'Event timestamp to handler/scroll/rAF proxies; excludes hardware-to-browser delivery and does not measure compositor presentation or photons.'};
   document.querySelector('#latency-results').textContent=JSON.stringify(result,null,2);document.querySelector('#latency-status').textContent='Complete';
  },5000);
 };
});
