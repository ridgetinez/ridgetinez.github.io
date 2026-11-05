import {mountGarden} from './garden.js';
let state,profile=false,started=false,stats={},resizeCallback;
const events=new Map(),queries=[];
const frame=self.requestAnimationFrame?.bind(self),cancel=self.cancelAnimationFrame?.bind(self);
const emit=(key,event={})=>{for(const callback of events.get(key)||[])callback(event);};
const listen=(key,callback)=>{if(!events.has(key))events.set(key,[]);events.get(key).push(callback);};
function start(canvases){
  if(!frame||!cancel){self.postMessage({type:'fallback'});return;}
  let canvasIndex=0;
  for(const canvas of canvases)canvas.style={};
  const scene={dataset:stats,setAttribute(){},append(){},remove(){},getBoundingClientRect:()=>({width:state.width,height:state.height})};
  const runtime={
    document:{get hidden(){return state.hidden;},documentElement:{hasAttribute:()=>profile,addEventListener:(key,fn)=>listen(key,fn)},body:{append(){}},createElement:kind=>kind==='canvas'?canvases[canvasIndex++]:scene,addEventListener:listen},
    window:{get scrollY(){return state.offset;},addEventListener:listen},
    navigator:self.navigator,Worker:self.Worker,performance:self.performance,
    get devicePixelRatio(){return state.dpr;},
    matchMedia(query){const key=query.includes('reduced-motion')?'motion':'room';const callbacks=[];const result={get matches(){return state[key];},addEventListener(_event,fn){callbacks.push(fn);}};queries.push({key,callbacks});return result;},
    ResizeObserver:class{constructor(callback){resizeCallback=callback;}observe(){}disconnect(){resizeCallback=null;}},
    requestAnimationFrame(callback){return frame(()=>{const start=performance.now();callback(start);if(profile)self.postMessage({type:'frame',duration:performance.now()-start,stats:{...stats}});});},
    cancelAnimationFrame:cancel,
    onFallback:()=>self.postMessage({type:'fallback'})
  };
  mountGarden(runtime);self.postMessage({type:'ready'});
}
self.onmessage=({data})=>{
  if(data.type==='init'){state=data.state;profile=data.profile;started=true;try{start(data.canvases);}catch{self.postMessage({type:'fallback'});}return;}
  if(!started)return;
  if(data.type==='view'){
    const previous=state;state=data.state;
    if(previous.width!==state.width||previous.height!==state.height||previous.dpr!==state.dpr)resizeCallback?.();
    for(const {key,callbacks} of queries)if(previous[key]!==state[key])callbacks.forEach(fn=>fn());
    if(previous.hidden!==state.hidden)emit('visibilitychange');
    emit('pageshow');return;
  }
  if(data.type==='scroll'){state.offset=data.event.offset;emit('scroll');return;}
  emit(data.type,data.event);
};
