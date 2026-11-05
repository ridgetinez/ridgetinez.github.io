import path from 'node:path';
import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {buildSite} from '../src/static.js';
import {previewSite} from './preview.js';
import {projectRoot} from '../src/config.js';
const baselineDir=path.join(projectRoot,'.local/garden-benchmark');
if(process.argv.includes('--capture-baseline')) {
  await mkdir(baselineDir,{recursive:true});
  for(const [source,dest] of [['garden.js','baseline.js'],['styles.css','baseline.css']]) {
    try {await access(path.join(baselineDir,dest));throw new Error('Baseline already exists; preserve it or explicitly move it before capturing another.');}
    catch(error){if(error.code!=='ENOENT')throw error;}
    await copyFile(path.join(projectRoot,'public',source),path.join(baselineDir,dest));
  }
}
const directory=path.join(projectRoot,'.local/garden-benchmark/site');
await buildSite({outputDir:directory,siteURL:'http://127.0.0.1:4175'});
await copyFile(path.join(projectRoot,'design/garden-benchmark.js'),path.join(directory,'benchmark.js'));
for(const name of ['baseline.js','baseline.css'])await copyFile(path.join(projectRoot,'.local/garden-benchmark',name),path.join(directory,'assets',name));
const html=await readFile(path.join(directory,'index.html'),'utf8');
const instrument=html.replace('<html','<html data-garden-metrics').replace('<head>','<head><script src="/benchmark.js"></script>');
await writeFile(path.join(directory,'baseline.html'),instrument.replace('/garden.js','/baseline.js').replace('/styles.css','/baseline.css'));
await writeFile(path.join(directory,'fixed.html'),instrument);
await writeFile(path.join(directory,'control.html'),instrument.replace(/<script type="module" src="[^"]*garden.js[^"]*"><\/script>/,''));
await copyFile(path.join(projectRoot,'design/scroll-latency.js'),path.join(directory,'scroll-latency.js'));
const latency=html.replace('<head>','<head><script src="/scroll-latency.js"></script>');
await writeFile(path.join(directory,'latency-garden.html'),latency);
await writeFile(path.join(directory,'latency-direct.html'),latency.replace('<html','<html data-garden-direct'));
await writeFile(path.join(directory,'latency-control.html'),latency.replace(/<script type="module" src="[^"]*garden.js[^"]*"><\/script>/,''));
// Deterministic visual comparisons use a paused clock, so both renderers
// receive the same wind/pointer/settling poses rather than unrelated frames.
for(const name of ['garden-visual.js','garden-visual-stage.js'])await copyFile(path.join(projectRoot,'design',name),path.join(directory,name));
for(const [kind,script] of [['original','baseline.js'],['candidate','garden.js']])await writeFile(path.join(directory,`visual-${kind}.html`),`<!doctype html><html data-garden-metrics data-garden-direct><head><meta charset="utf-8"><link rel="stylesheet" href="/assets/styles.css"><script src="/garden-visual-stage.js"></script></head><body style="height:20000px"><script type="module" src="/assets/${script}"></script></body></html>`);
await writeFile(path.join(directory,'visual.html'),'<!doctype html><meta charset="utf-8"><title>Garden visual parity</title><button id="run">Compare animation poses</button><pre id="results">Ready</pre><div style="height:760px;position:relative"><iframe id="original" src="/visual-original.html" style="position:absolute;width:1280px;height:720px;opacity:.01;pointer-events:none"></iframe><iframe id="candidate" src="/visual-candidate.html" style="position:absolute;width:1280px;height:720px;opacity:.01;pointer-events:none"></iframe></div><script type="module" src="/garden-visual.js"></script>');
const app=await previewSite({directory,port:4175});console.log('Garden benchmarks: '+app.url+'baseline.html, fixed.html, control.html');
