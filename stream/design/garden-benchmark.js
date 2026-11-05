// Local-only performance study. No telemetry or production instrumentation.
const nativeRAF = window.requestAnimationFrame.bind(window);
let sample = null;
window.requestAnimationFrame = callback => nativeRAF(now => {
  const start = performance.now(); callback(now);
  if (sample && callback.name !== 'tick') sample.renderer.push(performance.now()-start);
});
window.addEventListener('garden:frame',event=>{if(sample)sample.workerRenderer.push(event.detail.duration);});
const clear = CanvasRenderingContext2D.prototype.clearRect;
CanvasRenderingContext2D.prototype.clearRect = function(x,y,w,h) {
  if (sample) { sample.clears++; sample.clearPixels += w*h; }
  return clear.call(this,x,y,w,h);
};
const read = CanvasRenderingContext2D.prototype.getImageData;
CanvasRenderingContext2D.prototype.getImageData = function(...args) {
  if (sample) sample.readbacks++;
  return read.apply(this,args);
};
const longTasks=[];
try { new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true}); } catch {}
const quantile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))]:0;
const round=n=>Math.round(n*100)/100;
function workload(mode,repeat,duration=1800) {
  return new Promise(resolve=> {
    const started=performance.now(); let previous=0;
    sample={gaps:[],renderer:[],workerRenderer:[],clears:0,clearPixels:0,readbacks:0};
    const active=sample;
    function tick(now) {
      if(previous)active.gaps.push(now-previous);previous=now;
      const elapsed=now-started, progress=Math.min(1,elapsed/duration);
      const base=12000+repeat*24000;
      const y=mode==='fresh-forward'?base+progress*11000:mode==='reversal'?base+5500+Math.sin(progress*Math.PI*4)*4500: [base,base+12000,base+500,base+18000,base+9000][Math.min(4,Math.floor(progress*5))];
      if(!mode.startsWith('native-'))window.scrollTo(0,y);
      const x=repeat%2?innerWidth-100:100;
      if(!mode.startsWith('native-'))window.dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:innerHeight*.5+Math.sin(progress*20)*120,pointerType:'mouse'}));
      if(elapsed<duration)nativeRAF(tick);
      else {
        sample=null;
        const gaps=active.gaps, budget=1000/60;
        const tasks=longTasks.filter(e=>e.start>=started&&e.start<now);
        resolve({mode,repeat:repeat+1,side:mode.startsWith('native-')?'manual':repeat%2?'right':'left',frames:gaps.length,elapsedMs:round(elapsed),
          frameP50:round(quantile(gaps,.5)),frameP95:round(quantile(gaps,.95)),frameP99:round(quantile(gaps,.99)),maxFrame:round(Math.max(...gaps)),
          framesOver25ms:gaps.filter(x=>x>25).length,estimatedMissed60HzFrames:gaps.reduce((n,x)=>n+Math.max(0,Math.round(x/budget)-1),0),
          rendererP95:round(quantile(active.renderer,.95)),rendererMax:round(Math.max(0,...active.renderer)),
          workerRendererP95:round(quantile(active.workerRenderer,.95)),workerRendererMax:round(Math.max(0,...active.workerRenderer)),workerFrames:active.workerRenderer.length,thread:document.querySelector('.margin-garden')?.dataset.thread||'main',
          longTasks:tasks.length,longTaskMs:round(tasks.reduce((n,e)=>n+e.duration,0)),
          canvasClears:active.clears,clearMegapixels:round(active.clearPixels/1e6),readbacks:active.readbacks,
          renderer:document.querySelector('.margin-garden')?.dataset.renderer||'canvas2d',cells:Number(document.querySelector('.margin-garden')?.dataset.cells||0),visiblePlants:Number(document.querySelector('.margin-garden')?.dataset.plants||0),readyPlants:Number(document.querySelector('.margin-garden')?.dataset.ready||0)});
      }
    }
    nativeRAF(tick);
  });
}
window.addEventListener('DOMContentLoaded',()=>{
  const toolbar=document.createElement('aside');toolbar.style.cssText='position:fixed;z-index:1000;top:0;left:0;right:0;padding:8px;background:#fff;color:#111;font:12px monospace';
  toolbar.innerHTML='<button id="run">Run scroll benchmark</button> <button id="native">Record native wheel (6s)</button> <a id="save" download="garden-performance.json">Save JSON</a> <span id="status">Ready</span><details><summary>Results</summary><pre id="results" style="max-height:220px;overflow:auto"></pre></details>';
  document.body.append(toolbar);
  const tail=document.createElement('div');tail.style.height='110000px';tail.setAttribute('aria-hidden','true');document.body.append(tail);
  document.querySelector('#native').onclick=async()=>{document.querySelector('#status').textContent='Recording native wheel';const result=await workload('native-wheel',0,6000);document.querySelector('#results').textContent=JSON.stringify(result,null,2);document.querySelector('#save').href='data:application/json,'+encodeURIComponent(document.querySelector('#results').textContent);document.querySelector('#status').textContent='Native wheel complete';};
  document.querySelector('#run').onclick=async()=>{
    const button=document.querySelector('#run'), status=document.querySelector('#status');button.disabled=true;
    const output={variant:location.pathname,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},userAgent:navigator.userAgent,method:'rAF-driven scrollTo; 3 repeats per scenario, 1800ms each; pointer over alternating margins. Frame intervals include test overhead. Missed frames estimated against 60Hz, not compositor telemetry.',runs:[]};
    for(let repeat=0;repeat<3;repeat++)for(const mode of ['fresh-forward','reversal','large-jumps']) {
      status.textContent=`Running ${mode} ${repeat+1}/3`;
      output.runs.push(await workload(mode,repeat));
      document.querySelector('#results').textContent=JSON.stringify(output,null,2);
    }
    output.gates={p95Within25ms:output.runs.every(r=>r.frameP95<=25),rendererP95Within8ms:output.runs.every(r=>(r.thread==='worker'?r.workerRendererP95:r.rendererP95)<=8),noMainThreadReadbacks:output.runs.every(r=>r.readbacks===0),noCanvasClears:output.runs.every(r=>r.canvasClears===0),animatedGPU:output.runs.every(r=>r.renderer==='webgl2'&&r.cells>0&&(r.thread!=='worker'||r.workerFrames>0)),completeFoliage:output.runs.every(r=>r.readyPlants===r.visiblePlants&&r.visiblePlants>0)};document.querySelector('#results').textContent=JSON.stringify(output,null,2);
    document.querySelector('#save').href='data:application/json,'+encodeURIComponent(JSON.stringify(output,null,2));window.scrollTo(0,0);status.textContent='Complete';button.disabled=false;
  };
});
