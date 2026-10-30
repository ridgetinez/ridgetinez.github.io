import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { sanitizeDiagramSVG, validateTikz, compileTikz } from '../src/diagrams.js';
import { renderMarkdown } from '../src/markdown.js';
import { buildSite } from '../src/static.js';
import { exportVault } from '../src/vault.js';

const simple = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 50"><defs><path id="glyph" d="M0 0L1 1"/></defs><circle cx="20" cy="20" r="10" stroke="#000" fill="none"/><use href="#glyph"/></svg>';
const source = String.raw`\begin{tikzpicture}[x=1cm,y=1cm]\draw (0,0) rectangle (12,5);\draw (2,2) circle (2);\node at (2,2) {$P$};\end{tikzpicture}`;

test('restricted TikZ rejects file IO, commands, preambles, TeX escapes and unbounded macro construction', () => {
  assert.equal(validateTikz(source),source);
  for (const command of [String.raw`\input{/etc/passwd}`,String.raw`\openin1=secret`,String.raw`\write18{whoami}`,String.raw`\def\x{\x}\x`,String.raw`\csname input\endcsname`,String.raw`^^5cinput{secret}`,String.raw`\special{dvisvgm:raw <script/>}`]) {
    assert.throws(()=>validateTikz(source.replace('\n','') + command));
  }
  assert.throws(()=>validateTikz(String.raw`\begin{document}\end{document}`));
  assert.throws(()=>validateTikz(source.repeat(1000)));
  assert.ok(!renderMarkdown('<svg onload="alert(1)"></svg>').includes('<svg'));
});

test('SVG boundary retains vector paths but rejects executable markup and external references', () => {
  const svg = sanitizeDiagramSVG(simple,{prefix:'post-one-',alt:'P < Q',standalone:false});
  assert.match(svg,/id="post-one-glyph"/);
  assert.match(svg,/href="#post-one-glyph"/);
  assert.match(svg,/stroke="currentColor"/);
  assert.match(svg,/aria-label="P &lt; Q"/);
  assert.ok(!svg.includes('<style'));
  const standalone = sanitizeDiagramSVG(simple);
  assert.match(standalone,/prefers-color-scheme:dark/);
  assert.ok(!sanitizeDiagramSVG(standalone,{standalone:false}).includes('<style'));
  for (const body of ['<script>alert(1)</script>','<foreignObject/>','<image href="https://example.com/a.svg"/>','<style>svg{display:none}</style>','<use href="https://example.com/x"/>','<path onload="alert(1)"/>','<path style="fill:url(https://example.com/x)"/>','<use href="#missing"/>','<g id="x"/><g id="x"/>']) {
    assert.throws(()=>sanitizeDiagramSVG(simple.replace('</svg>',body+'</svg>')));
  }
  assert.throws(()=>sanitizeDiagramSVG('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///secret">]>'+simple));
});

async function fixture(t) {
  const root=await mkdtemp(path.join(os.tmpdir(),'ridge-diagram-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const contentDir=path.join(root,'content'),outputDir=path.join(root,'site'),vault=path.join(root,'vault');
  await mkdir(path.join(contentDir,'diagrams'),{recursive:true});
  await mkdir(vault);
  return {root,contentDir,outputDir,vault};
}

test('static builds inline diagrams at the authored position without TeX and keep RSS standalone fallbacks', async t => {
  const f=await fixture(t),filename='a'.repeat(64)+'.svg';
  await writeFile(path.join(f.contentDir,'diagrams',filename),simple);
  const post=id=>({id,body:`Before.\n\n![Construction](/diagrams/${filename})\n\nAfter.`,tags:['geometry'],links:[],created_at:'2026-10-30T12:30:00Z',attachments:[],diagrams:[{filename,alt:'Construction'}]});
  await writeFile(path.join(f.contentDir,'posts.json'),JSON.stringify({version:1,posts:[post('one'),post('two')]}));
  await buildSite({...f,siteURL:'https://example.github.io/ridge/'});
  const page=await readFile(path.join(f.outputDir,'index.html'),'utf8');
  assert.ok(page.indexOf('Before.')<page.indexOf('geometry-diagram'));
  assert.ok(page.indexOf('geometry-diagram')<page.indexOf('After.'));
  assert.match(page,/id="d-one-0-glyph"/); assert.match(page,/id="d-two-0-glyph"/);
  assert.ok(!page.includes('<style>@media'));
  const rss=await readFile(path.join(f.outputDir,'feed.xml'),'utf8');
  assert.match(rss,/https:\/\/example.github.io\/ridge\/diagrams\//);
  assert.ok(rss.includes('&lt;img'));
  await writeFile(path.join(f.contentDir,'diagrams',filename),simple.replace('</svg>','<script/></svg>'));
  await assert.rejects(buildSite({...f,siteURL:'https://example.github.io/ridge/'}),/Unsupported diagram element/);
  assert.equal(await readFile(path.join(f.outputDir,'index.html'),'utf8'),page);
});

const hasTeX=spawnSync('latex',['--version'],{stdio:'ignore'}).status===0 && spawnSync('dvisvgm',['--version'],{stdio:'ignore'}).status===0;
test('local TikZ export ignores a tampered preview, preserves authored placement, and outlines labels', {skip:!hasTeX}, async t => {
  const f=await fixture(t);
  const svg=await compileTikz(source);
  assert.match(svg,/data-ridge-diagram="tikz-v1"/);
  assert.ok(!svg.includes('<text'));
  assert.ok(!svg.includes('<image'));
  const box=/viewBox="([^"]+)"/.exec(svg)[1].split(' ').map(Number);
  assert.ok(box[2]>300 && box[3]>100,'Geometry is present, not just the label.');
  await writeFile(path.join(f.vault,'figure.tikz'),source);
  await writeFile(path.join(f.vault,'figure.svg'),'<svg onload="bad()"/>');
  await writeFile(path.join(f.vault,'note.md'),'---\nid: geometry\ndate: 2026-10-30T23:30:00+11:00\npublish: true\n---\nBefore.\n\n![[figure.svg|A circle]]\n\nAfter.');
  const posts=await exportVault(f.vault,path.join(f.root,'export'));
  assert.equal(posts[0].attachments.length,0);
  assert.equal(posts[0].diagrams.length,1);
  assert.match(posts[0].body,/Before\.[\s\S]*!\[A circle\]\(\/diagrams\/[a-f0-9]{64}\.svg\)[\s\S]*After\./);
  assert.ok(!(await readFile(path.join(f.root,'export/diagrams',posts[0].diagrams[0].filename),'utf8')).includes('onload'));
  await rm(path.join(f.vault,'figure.tikz'));
  await assert.rejects(exportVault(f.vault,path.join(f.root,'export')),/adjacent .tikz/);
});
