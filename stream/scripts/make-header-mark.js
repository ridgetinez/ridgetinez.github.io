import { writeFile } from 'node:fs/promises';

// A small original pixel rendition of Ōtori-sama from Spirited Away.
// Twenty cells at 40px keeps the leaf, round eyes and little bill readable.
const size = 20;
const pixels = Array.from({length:size},()=>Array(size).fill(null));
const layers = new Map();
let layer = 'body';
const colour = {
  cream:'#f0dfa0', light:'#faedbb', shade:'#d5bd7f', edge:'#b9a06c',
  leaf:'#7da77a', leafLight:'#a4bf8b', leafShade:'#537b59', vein:'#c2ce9d',
  eye:'#fffef4', pupil:'#38413a', bill:'#e6a752', billShade:'#bf813f'
};
const dot = (x,y,ink) => {
  pixels[y][x]=colour[ink];
  if (!layers.has(layer)) layers.set(layer,new Map());
  layers.get(layer).set(`${x},${y}`,`<rect x="${x}" y="${y}" width="1" height="1" fill="${colour[ink]}"/>`);
};
const line = (y,left,right,ink) => {for(let x=left;x<=right;x++)dot(x,y,ink);};

// The body is one softly shaded, pear-shaped silhouette. No per-cell bevels:
// the large blocks are the texture, while the character stays soft and round.
const body = [[6,6,14],[7,5,15],[8,4,16],[9,4,16],[10,3,17],[11,3,17],[12,2,18],[13,2,18],[14,2,18],[15,3,18],[16,3,17],[17,4,16],[18,6,14]];
for(const [y,left,right] of body) {
  for(let x=left;x<=right;x++) {
    dot(x,y,x>14 || y>16 ? 'shade' : x<7 && y<15 ? 'light' : 'cream');
  }
  dot(right,y,'shade');
}
// Small feet and folded wings.
layer = 'foot-left'; line(19,5,8,'billShade');
layer = 'foot-right'; line(19,12,15,'billShade');
layer = 'wing-left';
for(const [x,y] of [[4,12],[4,13],[5,14],[6,15]])dot(x,y,'shade');
layer = 'body';
for(const [x,y] of [[16,12],[16,13],[15,14],[14,15]])dot(x,y,'shade');

// Wide white eyes with one-cell pupils, then a broad amber bill.
layer = 'eyes';
for(const left of [6,12]) {
  for(let y=7;y<=9;y++)line(y,left,left+2,'eye');
  dot(left+1,8,'pupil');
}
layer = 'bill'; line(10,8,12,'bill'); line(11,9,12,'billShade');

// His leaf hat: a broad pad, a little notch, radial veins and an upright stem.
layer = 'leaf';
line(2,7,13,'leafShade');
line(3,5,15,'leaf');
line(4,3,17,'leaf');
line(5,4,16,'leafShade');
line(5,6,9,'leaf'); line(5,12,15,'leaf');
for(const [x,y] of [[6,3],[7,3],[8,3],[4,4],[5,4],[6,4],[13,3],[14,3]])dot(x,y,'leafLight');
for(const [x,y] of [[10,3],[10,4],[11,4],[12,4],[9,4],[11,5]])dot(x,y,'vein');
dot(11,1,'leafShade'); dot(12,0,'leafShade'); dot(12,1,'leaf');

const cells = [];
for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
  if(pixels[y][x])cells.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${pixels[y][x]}"/>`);
}
await writeFile(new URL('../public/favicon.svg',import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" shape-rendering="crispEdges">\n<!-- Ōtori-sama · original pixel rendition. Character from Spirited Away / Studio Ghibli. -->\n${cells.join('\n')}\n</svg>\n`);
const group = name => `<g class="otori-${name}">${[...layers.get(name).values()].join('')}</g>`;
// A small chef's knife, held by the viewer-left wing. The curved edge widens
// below its tip; a dark handle and cream grip make it read at two pixels/cell.
// These cells are separate from the resting drawing and the static favicon.
const knife = [];
const knifeRow = (y,left,right,fill) => {
  for(let x=left;x<=right;x++)knife.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
};
knifeRow(5,1,1,'#f3f7f5'); knifeRow(6,0,1,'#e0e9e7');
knifeRow(7,-1,1,'#d1dedd');
for(let y=8;y<=12;y++) {knifeRow(y,-2,1,'#b0c5c5');knifeRow(y,-2,-2,'#f3f7f5');knifeRow(y,1,1,'#7e9c9e');}
knifeRow(13,-1,2,'#82918b');
for(let y=14;y<=17;y++)knifeRow(y,0,1,'#785644');
knifeRow(14,0,0,'#b08a63'); knifeRow(17,0,1,'#503f35');
knifeRow(14,2,4,colour.light); knifeRow(15,1,4,colour.cream); knifeRow(16,2,3,colour.shade);
await writeFile(new URL('../public/mascot.svg',import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" class="signature-mascot" viewBox="0 0 20 20" width="40" height="40" shape-rendering="crispEdges" aria-hidden="true" focusable="false">\n${group('foot-left')}${group('foot-right')}<g class="otori-body">${[...layers.get('body').values()].join('')}${group('wing-left')}${group('eyes')}${group('bill')}${group('leaf')}<g class="otori-knife" opacity="0">${knife.join('')}</g></g>\n</svg>\n`);
console.log(`Wrote Ōtori-sama (${cells.length} visible cells), with separate animation layers.`);
