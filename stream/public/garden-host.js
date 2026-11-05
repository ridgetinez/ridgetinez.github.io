// The DOM thread owns only the surfaces and passive input forwarding. The same
// garden renderer/physics run on the dedicated rendering worker.
export function mountGardenOffThread(fallback) {
  if(typeof Worker==='undefined'||!HTMLCanvasElement.prototype.transferControlToOffscreen)return false;
  const scene=document.createElement('div');scene.className='margin-garden';scene.setAttribute('aria-hidden','true');
  const surfaces=[document.createElement('canvas'),document.createElement('canvas')];
  for(const canvas of surfaces){canvas.className='garden-canopy';scene.append(canvas);}
  document.body.append(scene);
  const room=matchMedia('(min-width: 760px)'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  const profile=document.documentElement.hasAttribute('data-garden-metrics');
  const abort=new AbortController();let stopped=false,worker;
  const options={signal:abort.signal,passive:true};
  function state(){const rect=scene.getBoundingClientRect();return {width:rect.width,height:rect.height,dpr:Math.min(devicePixelRatio||1,2),offset:scrollY,hidden:document.hidden,room:room.matches,motion:motion.matches};}
  function size(view){const gutter=Math.max(0,(view.width-480)/2-26);for(let i=0;i<2;i++){const canvas=surfaces[i];canvas.style.position='absolute';canvas.style.top='0';canvas.style[i===0?'left':'right']='0';canvas.style.width=`${gutter}px`;canvas.style.height=`${view.height}px`;}}
  function fail(){if(stopped)return;stopped=true;abort.abort();observer?.disconnect();worker?.terminate();scene.remove();fallback();}
  let observer;
  try {
    worker=new Worker(new URL('./garden-render-worker.js',import.meta.url),{type:'module'});
    worker.onerror=fail;
    worker.onmessage=({data})=>{
      if(stopped)return;
      if(data.type==='fallback'){fail();return;}
      if(data.type==='ready'){scene.dataset.renderer='webgl2';scene.dataset.thread='worker';}
      if(profile&&data.type==='frame'){
        for(const [key,value] of Object.entries(data.stats))if(scene.dataset[key]!==String(value))scene.dataset[key]=String(value);
        window.dispatchEvent(new CustomEvent('garden:frame',{detail:{duration:data.duration}}));
      }
    };
    const initial=state();size(initial);
    const canvases=surfaces.map(canvas=>canvas.transferControlToOffscreen());
    worker.postMessage({type:'init',canvases,state:initial,profile},canvases);
  }catch{fail();return true;}
  const send=(type,event)=>{if(!stopped)worker.postMessage({type,event});};
  window.addEventListener('scroll',()=>send('scroll',{offset:scrollY}),options);
  window.addEventListener('pointermove',event=>send('pointermove',{clientX:event.clientX,clientY:event.clientY,pointerType:event.pointerType}),options);
  document.documentElement.addEventListener('pointerleave',()=>send('pointerleave'),options);
  window.addEventListener('blur',()=>send('blur'),options);
  function view(){if(stopped)return;const current=state();size(current);worker.postMessage({type:'view',state:current});}
  observer=new ResizeObserver(view);observer.observe(scene);
  room.addEventListener('change',view,options);motion.addEventListener('change',view,options);
  document.addEventListener('visibilitychange',view,options);
  window.addEventListener('pagehide',()=>send('pagehide'),options);
  window.addEventListener('pageshow',view,options);
  return true;
}
