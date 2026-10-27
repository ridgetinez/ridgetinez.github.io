import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createApplication } from '../src/server.js';
import { openStore } from '../src/store.js';
import { renderMarkdown } from '../src/markdown.js';
import { request as httpRequest } from 'node:http';

// Fetch rewrites Host. Use the HTTP client for proxy/host-boundary tests.
function rawFetch(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, {method,headers}, res => {
      const chunks = []; res.on('data',chunk=>chunks.push(chunk));
      res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));
    });
    req.on('error',reject); req.end(body);
  });
}

async function fixture(t, options = {}) {
  const dataDir = await mkdtemp(path.join(os.tmpdir(),'ridge-test-'));
  const app = createApplication({ dataDir, publicPort:0, editorPort:0, publicHost:'127.0.0.1', ...options });
  const urls = await app.start();
  t.after(async () => { await app.close(); await rm(dataDir,{recursive:true,force:true}); });
  const editorHeaders = options.editorAccess === 'tailscale' ? { Host:new URL(options.editorOrigin).host, 'Tailscale-User-Login':options.tailscaleOwner } : {};
  const editorURL = `http://127.0.0.1:${app.editorServer.address().port}`;
  const html = await (await rawFetch(editorURL,{headers:editorHeaders})).text();
  const token = html.match(/name="csrf-token" content="([^"]+)"/)?.[1];
  const origin = options.editorOrigin || editorURL;
  const writeHeaders = { ...editorHeaders, Origin:origin, 'X-CSRF-Token':token };
  const post = (url, value, extra = {}) => rawFetch(url, {method:'POST',headers:{...writeHeaders,'Content-Type':'application/json',...extra},body:JSON.stringify(value)});
  return { app, dataDir, ...urls, editorURL, editorHeaders, token, writeHeaders, post };
}

test('public listener has no write path, even with forged owner and CSRF headers', async t => {
  const f = await fixture(t);
  const html = await (await fetch(f.publicURL)).text();
  assert.ok(!html.includes('id="composer"')); assert.ok(!html.includes('csrf-token')); assert.ok(!html.includes('data-action="edit"'));
  for (const method of ['POST','PUT','PATCH','DELETE']) {
    const response = await fetch(`${f.publicURL}/api/posts`, {method,headers:{...f.writeHeaders,'Tailscale-User-Login':'ridge@example.com','Content-Type':'application/json'},body:'{"body":"not allowed"}'});
    assert.equal(response.status,405,method);
  }
  assert.equal(f.app.store.list().length,0);
  assert.equal((await fetch(`${f.publicURL}/.env`)).status,404);
  assert.equal((await fetch(`${f.publicURL}/assets/../src/server.js`)).status,404);
});

test('editor rejects missing tokens, foreign origins, and DNS rebinding hosts', async t => {
  const f = await fixture(t);
  assert.ok(f.token);
  assert.equal((await f.post(`${f.editorURL}/api/posts`,{body:'x'},{'X-CSRF-Token':''})).status,403);
  assert.equal((await f.post(`${f.editorURL}/api/posts`,{body:'x'},{Origin:'https://elsewhere.example'})).status,403);
  assert.equal((await rawFetch(f.editorURL,{headers:{Host:'elsewhere.example'}})).status,403);
  assert.equal(f.app.editorServer.address().address,'127.0.0.1');
});

test('Tailscale mode requires the configured owner, not just tailnet membership', async t => {
  const f = await fixture(t,{editorAccess:'tailscale',tailscaleOwner:'ridge@example.com',editorOrigin:'https://ridge.example-tailnet.ts.net'});
  assert.ok(f.token);
  assert.equal((await rawFetch(f.editorURL,{headers:{Host:'ridge.example-tailnet.ts.net'}})).status,403);
  assert.equal((await rawFetch(f.editorURL,{headers:{...f.editorHeaders,'Tailscale-User-Login':'someone-else@example.com'}})).status,403);
  assert.equal((await f.post(`${f.editorURL}/api/posts`,{body:'Owner post'})).status,201);
  assert.equal((await f.post(`${f.publicURL}/api/posts`,{body:'Still not allowed'})).status,405);
  assert.equal(f.app.store.list().length,1);
});

test('publishing, editing, tags, permalinks, backlinks, RSS and archive/restore persist', async t => {
  const f = await fixture(t);
  const first = await f.post(`${f.editorURL}/api/posts`,{body:'## dumplings v3\n\n$$x^2+y^2=z^2$$\n\n```js\nconst x = 3;\n```',tags:['cooking'],createdAt:'2026-10-23T07:40:00Z'});
  assert.equal(first.status,201); const recipe = (await first.json()).post;
  const second = await f.post(`${f.editorURL}/api/posts`,{body:`[[${recipe.id}|dumplings v3]] — less water for v4.`,tags:'cooking',createdAt:'2026-10-24T01:00:00Z'});
  assert.equal(second.status,201); const note = (await second.json()).post;
  const html = await (await fetch(`${f.publicURL}/p/${recipe.id}`)).text();
  assert.match(html,/<h2 class="day-heading">23 October 2026/); assert.match(html,/class="katex/); assert.match(html,/hljs-keyword/); assert.ok(html.includes(`/p/${note.id}`));
  assert.equal((await (await fetch(`${f.publicURL}/api/posts?tag=cooking`)).json()).length,2);
  const feed = await (await fetch(`${f.publicURL}/feed.xml`)).text(); assert.match(feed,/<rss /); assert.ok(feed.includes(recipe.id));
  assert.equal((await f.post(`${f.editorURL}/api/posts/${recipe.id}`,{body:'Changed recipe',tags:['cooking']})).status,200);
  assert.equal(f.app.store.get(recipe.id).created_at,recipe.created_at);
  assert.equal((await f.post(`${f.editorURL}/api/posts/${recipe.id}/archive`,{archived:true})).status,200);
  assert.equal((await fetch(`${f.publicURL}/p/${recipe.id}`)).status,404);
  assert.equal((await fetch(`${f.editorURL}/?archived=1`)).status,200);
  assert.equal((await f.post(`${f.editorURL}/api/posts/${recipe.id}/archive`,{archived:false})).status,200);
  await f.app.close();
  const reopened = openStore(f.dataDir); assert.equal(reopened.get(recipe.id).body,'Changed recipe'); reopened.close();
});

test('photos and audio are real persisted uploads; active file types are rejected', async t => {
  const f = await fixture(t);
  const image = await sharp({create:{width:20,height:10,channels:3,background:'#89806a'}}).jpeg().withMetadata().toBuffer();
  const audio = await readFile(new URL('../examples/reflection.m4a',import.meta.url));
  const data = new FormData();
  data.append('photo',new Blob([image],{type:'image/jpeg'}),'../../photo.jpg');
  data.append('audio',new Blob([audio],{type:'audio/mp4'}),'voice.m4a');
  data.append('post',JSON.stringify({body:'A photo and a voice note',tags:['coffee'],attachmentMeta:{photo:{alt:'Coffee'},audio:{transcript:'My unfinished thought.'}}}));
  const response = await fetch(`${f.editorURL}/api/posts`,{method:'POST',headers:f.writeHeaders,body:data});
  assert.equal(response.status,201); const post = (await response.json()).post;
  assert.equal(post.attachments.length,2);
  const photo = post.attachments.find(a=>a.kind==='image'), voice = post.attachments.find(a=>a.kind==='audio');
  const publicPhoto = await fetch(`${f.publicURL}/media/${photo.id}`); assert.equal(publicPhoto.headers.get('content-type'),'image/webp');
  const metadata = await sharp(Buffer.from(await publicPhoto.arrayBuffer())).metadata(); assert.equal(metadata.exif,undefined);
  assert.deepEqual(Buffer.from(await (await fetch(`${f.publicURL}/media/${voice.id}`)).arrayBuffer()),audio);
  const range = await fetch(`${f.publicURL}/media/${voice.id}`,{headers:{Range:'bytes=0-9'}});
  assert.equal(range.status,206); assert.deepEqual(Buffer.from(await range.arrayBuffer()),audio.subarray(0,10));
  const html = await (await fetch(`${f.publicURL}/p/${post.id}`)).text(); assert.match(html,/<details class="transcript">/); assert.ok(!html.includes('<details class="transcript" open'));
  const bad = new FormData(); bad.append('photo',new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],{type:'image/svg+xml'}),'bad.svg'); bad.append('post',JSON.stringify({body:'Bad upload'}));
  assert.equal((await fetch(`${f.editorURL}/api/posts`,{method:'POST',headers:f.writeHeaders,body:bad})).status,415);
  assert.equal((await readdir(path.join(f.dataDir,'media'))).length,2);
  await f.post(`${f.editorURL}/api/posts/${post.id}/archive`,{archived:true});
  assert.equal((await fetch(`${f.publicURL}/media/${photo.id}`)).status,404);
});

test('Markdown does not turn raw HTML, javascript links or math commands into executable content', () => {
  const html = renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n<img src=x onerror=alert(1)>\n\n$\\href{javascript:alert(1)}{x}$');
  assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img src=x')); assert.ok(!html.includes('href="javascript:'));
  assert.ok(renderMarkdown('A short $x^2$ thought.').includes('class="katex"'));
});
