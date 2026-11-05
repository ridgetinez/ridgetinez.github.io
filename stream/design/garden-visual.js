// Compare the actual deployed renderer and the GPU renderer at identical poses.
const original=document.querySelector('#original'),candidate=document.querySelector('#candidate'),out=document.querySelector('#results');
const pause=()=>new Promise(resolve=>setTimeout(resolve,30));
async function ready(){const start=Date.now();while(true){
  const a=original.contentWindow,b=candidate.contentWindow;
  if(a.gardenStage&&b.gardenStage){a.gardenStage.advance(0);b.gardenStage.advance(0);if(b.gardenStage.ready())return;}
  if(Date.now()-start>15000)throw Error('Plant textures did not become ready');await pause();
}}
function compare(name){
  const a=original.contentWindow,b=candidate.contentWindow;
  // A zero-time step keeps the GPU buffer valid while capturing it, without
  // changing the leaf state or original 30fps timer.
  a.gardenStage.advance(0);b.gardenStage.advance(0);
  const copy=win=>{const sources=[...win.document.querySelectorAll('.garden-canopy')],dpr=Math.min(win.devicePixelRatio||1,2);const c=document.createElement('canvas');c.width=Math.round(win.innerWidth*dpr);c.height=Math.round(win.innerHeight*dpr);const ctx=c.getContext('2d',{willReadFrequently:true});for(const source of sources){const rect=source.getBoundingClientRect();ctx.drawImage(source,Math.round(rect.left*dpr),Math.round(rect.top*dpr));}return ctx.getImageData(0,0,c.width,c.height).data;};
  const x=copy(a),y=copy(b);let error=0,pixels=0,close=0;
  for(let i=0;i<x.length;i+=4)if(x[i+3]||y[i+3]){let maximum=0;for(let ch=0;ch<4;ch++){const delta=Math.abs(x[i+ch]-y[i+ch]);error+=delta;maximum=Math.max(maximum,delta);}pixels++;if(maximum<=12)close++;}
  return {pose:name,plantPixels:pixels,meanChannelError:Number((error/pixels/4).toFixed(3)),percentWithin12:Number((close/pixels*100).toFixed(2)),renderer:b.document.querySelector('.margin-garden').dataset.renderer};
}
document.querySelector('#run').onclick=async()=>{
 const button=document.querySelector('#run');button.disabled=true;out.textContent='Warming original per-coordinate textures…';
 try{
  await pause();await ready();const results=[];
  const advance=async n=>{for(let i=0;i<n;i++){original.contentWindow.gardenStage.advance(1);candidate.contentWindow.gardenStage.advance(1);if(i%2===0)await pause();}};
  results.push(compare('initial'));
  await advance(60);results.push(compare('wind after 2.4 seconds'));
  for(const frame of [original,candidate])frame.contentWindow.gardenStage.pointer(150,450);
  await advance(30);results.push(compare('pointer displacement'));
  for(const frame of [original,candidate])frame.contentWindow.gardenStage.release();
  await advance(45);results.push(compare('spring settling'));
  for(const frame of [original,candidate])frame.contentWindow.gardenStage.scroll(2400);
  await ready();await advance(40);results.push(compare('after scrolling'));
  out.textContent=JSON.stringify({clockStepMs:40,viewport:{width:1280,height:720},results},null,2);
 }catch(error){out.textContent=error.stack;}finally{button.disabled=false;}
};
