import {createGardenTexture} from './garden.js';
self.onmessage=({data:{key,item,size}})=>{
 const started=performance.now();const artwork=createGardenTexture(item,size);
 self.postMessage({key,artwork,elapsedMs:performance.now()-started},artwork.levels.map(level=>level.data.buffer));
};
