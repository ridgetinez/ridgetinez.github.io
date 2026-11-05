// Local-only deterministic clock. Never included in production builds.
let time=0,id=0,queue=new Map();
window.requestAnimationFrame=callback=>{queue.set(++id,callback);return id;};
window.cancelAnimationFrame=id=>queue.delete(id);
performance.now=()=>time;
window.gardenStage={
  advance(count=1){for(let i=0;i<Math.max(count,1);i++){if(count)time+=40;const callbacks=[...queue.values()];queue.clear();callbacks.forEach(fn=>fn(time));}},
  pointer(x,y){window.dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:y,pointerType:'mouse'}));},
  release(){document.documentElement.dispatchEvent(new PointerEvent('pointerleave'));},
  scroll(y){window.scrollTo(0,y);},
  ready(){const scene=document.querySelector('.margin-garden');return Number(scene?.dataset.plants)>0&&scene.dataset.plants===scene.dataset.ready;}
};
