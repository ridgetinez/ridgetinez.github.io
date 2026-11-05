import test from 'node:test';
import assert from 'node:assert/strict';
import { gardenPatch, visibleGardenBands, GARDEN_PROFILES, createGardenCache } from '../public/garden.js';

test('garden coordinates regenerate the same plants after visiting distant patches', () => {
  const first = gardenPatch('left',1);
  for (let index=500;index<600;index++) gardenPatch('right',index);
  assert.deepEqual(gardenPatch('left',1),first);
  assert.notDeepEqual(gardenPatch('right',1),first);
  assert.notDeepEqual(gardenPatch('left',1,1234),first);
  assert.ok(Number.isFinite(gardenPatch('left',1000000000).members[0].scale));
  assert.throws(()=>gardenPatch('left',-1),/Invalid/);
});

test('patches have coherent real-plant profiles and varied leaf shapes, sizes and bunching', () => {
  const profiles = new Set(), scales = new Set(), ripples = new Set(), counts = new Set();
  for (let index=0;index<300;index++) for (const side of ['left','right']) {
    const patch = gardenPatch(side,index);
    profiles.add(patch.name); counts.add(patch.members.length);
    assert.equal(patch.name,GARDEN_PROFILES[patch.profile].name);
    assert.ok(patch.members.length>=4 && patch.members.length<=7);
    assert.equal(new Set(patch.members.map(item=>item.id)).size,patch.members.length);
    for (const item of patch.members) {
      assert.equal(item.profile,patch.profile);
      assert.ok(item.scale>.4 && item.scale<1.4);
      assert.ok(item.oval>=.86 && item.oval<=1);
      assert.ok(item.ripple>=.012 && item.ripple<.047);
      assert.ok(['leaf','nasturtium'].includes(item.kind));
      scales.add(item.scale.toFixed(2)); ripples.add(item.ripple.toFixed(3));
    }
  }
  assert.equal(profiles.size,GARDEN_PROFILES.length);
  assert.ok(scales.size>50); assert.ok(ripples.size>20); assert.ok(counts.size>=3);
  assert.equal(GARDEN_PROFILES[gardenPatch('left',1).profile].mottled,true);
  assert.equal(gardenPatch('right',1).name,'empress');
});

test('visible work stays bounded as the document becomes arbitrarily long', () => {
  for (const height of [720,900,1440]) for (const offset of [0,1000,1000000,1000000000]) {
    const [first,last] = visibleGardenBands(offset,height,height*.78);
    assert.ok(first>=0); assert.ok(last>=first);
    assert.ok(last-first<=Math.ceil((height+680)/440)+1);
  }
  let creations = 0;
  const cache = createGardenCache(traits => {creations++; return {seed:traits.seed};});
  const original = cache.get('first',{seed:42});
  assert.equal(cache.get('first',{seed:42}),original);
  assert.equal(creations,1);
  for (let i=0;i<10000;i++) cache.get(`texture-${i}`,{seed:i});
  assert.equal(cache.size,48);
  assert.deepEqual(cache.get('first',{seed:42}),original);
  assert.notEqual(cache.get('first',{seed:42}),original);
  assert.equal(cache.size,48);
});


test('plant geometry and spring equations match the deployed reference',async()=>{
  const reference=await import('../public/garden-2d.js');
  for(let band=0;band<200;band++)for(const side of ['left','right'])assert.deepEqual(gardenPatch(side,band),reference.gardenPatch(side,band));
  const {readFile}=await import('node:fs/promises');
  const current=await readFile(new URL('../public/garden.js',import.meta.url),'utf8');
  const original=await readFile(new URL('../public/garden-2d.js',import.meta.url),'utf8');
  const physics=source=>source.slice(source.indexOf('  function step(dt)'),source.indexOf('  function draw()')).trim();
  assert.equal(physics(current),physics(original),'independent springs, wind, velocity coupling and damping stay unchanged');
  const paths=source=>source.slice(source.indexOf('function drawLeaf('),source.indexOf('function makeTexture(')>0?source.indexOf('function makeTexture('):source.indexOf('export function createGardenTexture(')).trim();
  assert.equal(paths(current),paths(original),'each seeded leaf and flower keeps its actual paths, gradients and veins');
});

test('GPU cells share one draw and reuse glyph rasterisation across frames',async()=>{
  const {createGardenGL}=await import('../public/garden-gl.js');
  let texts=0,draws=0,instances=0,uploads=0;
  const gl=new Proxy({
    getShaderParameter:()=>true,getProgramParameter:()=>true,
    drawArraysInstanced(_mode,_first,_vertices,count){draws++;instances=count;},
    bufferSubData(){uploads++;}
  },{get:(target,key)=>target[key]??(key.toUpperCase()===key?1:()=>({}))});
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>({scale(){},fillText(){texts++;}})})};
  try {
    const canvas={getContext:()=>gl},painter=createGardenGL(canvas);
    painter.resize(1280,720,2);assert.equal(texts,176);
    painter.begin(374);
    for(let i=0;i<10000;i++)painter.cell(i%100*8.5,Math.floor(i/100)*9.5,100,150,90,1,i%9,.47,0);
    painter.flush();assert.equal(draws,1);assert.equal(instances,10000);assert.equal(uploads,1);
    painter.resize(1280,720,2);painter.begin(374);painter.cell(0,0,100,150,90,1,0,.47,0);painter.flush();
    assert.equal(texts,176,'steady animation never rerasterises text');assert.equal(draws,2);
  } finally {if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('off-thread host forwards passive input and restores the direct renderer on worker failure',async()=>{
  const {mountGardenOffThread}=await import('../public/garden-host.js');
  const keys=['document','window','Worker','HTMLCanvasElement','ResizeObserver','matchMedia','devicePixelRatio','scrollY'];
  const saved=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const listeners=new Map(),messages=[],surfaces=[];let terminated=false,removed=false,disconnected=false,fallbacks=0,worker;
  const listen=(key,fn,options)=>listeners.set(key,{fn,options});
  const scene={dataset:{},setAttribute(){},append(){},remove(){removed=true;},getBoundingClientRect:()=>({width:1280,height:720})};
  const surface=()=>{const canvas={style:{},transferControlToOffscreen:()=>({offscreen:true})};surfaces.push(canvas);return canvas;};
  const mock={
    document:{hidden:false,documentElement:{hasAttribute:()=>false,addEventListener:listen},body:{append(){}},createElement:kind=>kind==='canvas'?surface():scene,addEventListener:listen},
    window:{addEventListener:listen},HTMLCanvasElement:{prototype:{transferControlToOffscreen(){}}},
    Worker:class{constructor(){worker=this;}postMessage(data){messages.push(data);}terminate(){terminated=true;}},
    ResizeObserver:class{observe(){}disconnect(){disconnected=true;}},
    matchMedia:()=>({matches:true,addEventListener(){}}),devicePixelRatio:2,scrollY:640
  };
  try{
    for(const [key,value] of Object.entries(mock))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
    assert.equal(mountGardenOffThread(()=>fallbacks++),true);
    assert.equal(messages[0].type,'init');assert.equal(messages[0].canvases.length,2);
    assert.equal(surfaces[0].style.width,'374px');assert.equal(surfaces[1].style.right,'0');
    assert.equal(listeners.get('scroll').options.passive,true);
    listeners.get('scroll').fn();assert.deepEqual(messages.at(-1),{type:'scroll',event:{offset:640}});
    listeners.get('pointermove').fn({clientX:80,clientY:90,pointerType:'mouse'});
    assert.deepEqual(messages.at(-1).event,{clientX:80,clientY:90,pointerType:'mouse'});
    worker.onmessage({data:{type:'ready'}});assert.equal(scene.dataset.thread,'worker');
    worker.onerror();worker.onerror();assert.equal(fallbacks,1);
    assert.ok(terminated&&removed&&disconnected);assert.equal(listeners.get('scroll').options.signal.aborted,true);
  }finally{
    for(const key of keys){const descriptor=saved.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
});
