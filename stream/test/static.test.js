import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir, copyFile, symlink } from 'node:fs/promises';
import sharp from 'sharp';
import { exportVault } from '../src/vault.js';
import { buildSite } from '../src/static.js';
import { previewSite } from '../scripts/preview.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(),'ridge-static-'));
  const vault = path.join(root,'vault'), contentDir = path.join(root,'content'), outputDir = path.join(root,'site');
  await mkdir(path.join(vault,'Attachments'),{recursive:true});
  t.after(()=>rm(root,{recursive:true,force:true}));
  const note = async (name,body,properties = '') => writeFile(path.join(vault,name+'.md'),`---\nid: ${name}\ndate: 2026-10-24T08:00:00+11:00\npublish: true\ntags: [coffee]\n${properties}---\n${body}\n`);
  return {root,vault,contentDir,outputDir,note};
}

test('Obsidian export selects public notes, strips private properties/comments, normalises photos and preserves audio', async t => {
  const f = await fixture(t);
  const photo = await sharp({create:{width:20,height:10,channels:3,background:'#89806a'}}).jpeg().withMetadata().toBuffer();
  await writeFile(path.join(f.vault,'Attachments/photo.jpg'),photo);
  const audio = await readFile(new URL('../examples/reflection.m4a',import.meta.url));
  await writeFile(path.join(f.vault,'Attachments/voice.m4a'),audio);
  await writeFile(path.join(f.vault,'secret.md'),'---\npublish: false\n---\nPRIVATE SECRET');
  await f.note('coffee','15g / 250g. %% PRIVATE COMMENT %%\n\n![[Attachments/photo.jpg|Morning coffee]]\n\n![[Attachments/voice.m4a]]\n\n`[[not-a-link]]`\n\n```md\n![[not-a-file]]\n```\n\n$\\|x\\|$','private_property: DO NOT EXPORT\ntranscript: Unfinished thought.\n');
  const posts = await exportVault(f.vault,f.contentDir);
  assert.equal(posts.length,1);
  const json = await readFile(path.join(f.contentDir,'posts.json'),'utf8');
  for (const secret of ['PRIVATE SECRET','PRIVATE COMMENT','DO NOT EXPORT','private_property',f.vault]) assert.ok(!json.includes(secret));
  assert.match(posts[0].body,/`\[\[not-a-link\]\]`/);
  assert.match(posts[0].body,/!\[\[not-a-file\]\]/);
  const [image,voice] = posts[0].attachments;
  assert.equal(image.alt,'Morning coffee'); assert.equal(voice.transcript,'Unfinished thought.');
  assert.equal((await sharp(await readFile(path.join(f.contentDir,'media',image.filename))).metadata()).exif,undefined);
  assert.deepEqual(await readFile(path.join(f.contentDir,'media',voice.filename)),audio);
  assert.match(posts[0].created_at,/2026-10-23T21:00:00.000Z/);
  await buildSite({...f,siteURL:'https://example.github.io/ridge/'});
  const page = await readFile(path.join(f.outputDir,'index.html'),'utf8');
  assert.match(page,/<details class="transcript">/); assert.ok(!page.includes('<details class="transcript" open'));
  assert.match(page,/\/ridge\/media\/[a-f0-9]+\.m4a/);
  assert.match(page,/class="katex/);
});

test('private links, unsupported embeds, duplicate ids and malformed dates fail without replacing the last export', async t => {
  const f = await fixture(t);
  await f.note('good','public'); await exportVault(f.vault,f.contentDir);
  const original = await readFile(path.join(f.contentDir,'posts.json'),'utf8');
  await writeFile(path.join(f.vault,'secret.md'),'---\npublish: false\n---\nsecret');
  await f.note('good','[[secret]]');
  await assert.rejects(exportVault(f.vault,f.contentDir),/private/);
  assert.equal(await readFile(path.join(f.contentDir,'posts.json'),'utf8'),original);
  await f.note('good','![[secret]]'); await assert.rejects(exportVault(f.vault,f.contentDir),/not supported/);
  await f.note('good','public');
  await writeFile(path.join(f.vault,'bad.md'),'---\nid: good\ndate: 2026-10-24T08:00:00+11:00\npublish: true\n---\nSecond');
  await assert.rejects(exportVault(f.vault,f.contentDir),/same id/);
  await writeFile(path.join(f.vault,'bad.md'),'---\npublish: true\ndate: 2026-10-24\n---\nMissing timezone');
  await assert.rejects(exportVault(f.vault,f.contentDir),/timezone/);
  await rm(path.join(f.vault,'bad.md'));
  await f.note('good','not finished %% secret'); await assert.rejects(exportVault(f.vault,f.contentDir),/close the %%/);
  assert.equal(await readFile(path.join(f.contentDir,'posts.json'),'utf8'),original);
});

test('static build supports project paths, root domains, filters, pagination, backlinks and absolute RSS', async t => {
  const f = await fixture(t);
  for (let index = 0; index < 32; index++) await f.note(`n-${index}`,index === 0 ? '[[n-1|Earlier recipe]]' : 'A daily note.');
  await f.note('unicode','A note.','');
  let source = await readFile(path.join(f.vault,'unicode.md'),'utf8');
  await writeFile(path.join(f.vault,'unicode.md'),source.replace('tags: [coffee]','tags: [café]'));
  await exportVault(f.vault,f.contentDir);
  await buildSite({...f,siteURL:'https://example.github.io/ridge/'});
  const html = await readFile(path.join(f.outputDir,'index.html'),'utf8');
  assert.match(html,/href="\/ridge\/page\/2\/"/); assert.match(html,/href="\/ridge\/tag\/coffee\/"/);
  assert.ok(!html.includes('composer')); assert.ok(!html.includes('csrf-token')); assert.ok(!html.includes('data-action='));
  assert.ok(!html.includes('/api/')); assert.ok(!html.includes('/assets/app.js'));
  const permalink = await readFile(path.join(f.outputDir,'p/n-1/index.html'),'utf8');
  assert.match(permalink,/class="backlinks"/); assert.match(permalink,/href="\/ridge\/p\/n-0\/"/);
  const feed = await readFile(path.join(f.outputDir,'feed.xml'),'utf8');
  assert.match(feed,/https:\/\/example.github.io\/ridge\/p\/n-1\//);
  assert.ok(!feed.includes('href=&quot;/p/'));
  assert.ok(!(await readdir(path.join(f.outputDir,'assets'))).includes('app.js'));
  const app = await previewSite({directory:f.outputDir,port:0,basePath:'/ridge'}); t.after(()=>app.close());
  for (const route of ['', 'page/2/', 'tag/coffee/page/2/', 'tag/caf%C3%A9/', 'p/n-0/', 'assets/styles.css', 'assets/fonts/inter-latin-wght-normal.woff2']) assert.equal((await fetch(app.url+route)).status,200,route);
  assert.equal((await fetch(app.url,{method:'POST',body:'no'})).status,405);
  for (const route of ['.env','api/posts','src/server.js','content/posts.json']) assert.equal((await fetch(app.url+route)).status,404,route);
  await buildSite({...f,siteURL:'https://ridge.example/'});
  assert.match(await readFile(path.join(f.outputDir,'index.html'),'utf8'),/href="\/tag\/coffee\/"/);
  assert.match(await readFile(path.join(f.outputDir,'feed.xml'),'utf8'),/https:\/\/ridge.example\/p\/n-0\//);
});

test('all tag names get distinct colours shared by filters, entries and permalinks', async t => {
  const f = await fixture(t);
  const tags = ['yoga', 'bouldering', 'cooking', 'geometry', 'math', 'rehab', 'custom-tag'];
  await f.note('colours','A note with manually chosen tags.');
  const filename = path.join(f.vault,'colours.md');
  await writeFile(filename,(await readFile(filename,'utf8')).replace('tags: [coffee]',`tags: [${tags.join(', ')}]`));
  await exportVault(f.vault,f.contentDir);
  await buildSite(f);
  const colours = (html, type) => new Map([...html.matchAll(new RegExp(`<a class="${type}" style="--tag-hue:([^\"]+)" href="/tag/([^\"]+)/"`,'g'))].map(([,hue,tag]) => [tag,hue]));
  const home = await readFile(path.join(f.outputDir,'index.html'),'utf8');
  const filters = colours(home,'filter');
  assert.equal(filters.size,tags.length);
  assert.equal(new Set(filters.values()).size,tags.length);
  assert.deepEqual(colours(home,'tag'),filters);
  const filtered = await readFile(path.join(f.outputDir,'tag/cooking/index.html'),'utf8');
  const permalink = await readFile(path.join(f.outputDir,'p/colours/index.html'),'utf8');
  assert.deepEqual(colours(filtered,'tag'),filters);
  assert.deepEqual(colours(permalink,'tag'),filters);
});

test('withdrawing a note removes its page and unreferenced media from the next complete build', async t => {
  const f = await fixture(t);
  await copyFile(new URL('../examples/coffee.jpg',import.meta.url),path.join(f.vault,'Attachments/photo.jpg'));
  await f.note('coffee','![[Attachments/photo.jpg]]');
  await exportVault(f.vault,f.contentDir); await buildSite(f);
  assert.equal((await readdir(path.join(f.outputDir,'media'))).length,1);
  await writeFile(path.join(f.vault,'coffee.md'),'---\npublish: false\n---\nprivate now');
  await exportVault(f.vault,f.contentDir); await buildSite(f);
  assert.equal((await readdir(path.join(f.outputDir,'media'))).length,0);
  await assert.rejects(readFile(path.join(f.outputDir,'p/coffee/index.html')),/ENOENT/);
  assert.match(await readFile(path.join(f.outputDir,'index.html'),'utf8'),/No posts yet/);
});

test('output guards and symlink handling protect the vault and unrelated directories', async t => {
  const f = await fixture(t);
  await f.note('safe','public');
  await assert.rejects(exportVault(f.vault,path.join(f.vault,'output')),/outside/);
  await mkdir(f.contentDir); await writeFile(path.join(f.contentDir,'valuable.txt'),'keep');
  await assert.rejects(exportVault(f.vault,f.contentDir),/unrecognised/);
  assert.equal(await readFile(path.join(f.contentDir,'valuable.txt'),'utf8'),'keep');
  await rm(f.contentDir,{recursive:true});
  await symlink(path.join(f.root,'outside.jpg'),path.join(f.vault,'Attachments/escape.jpg'));
  await f.note('safe','![[Attachments/escape.jpg]]');
  await assert.rejects(exportVault(f.vault,f.contentDir),/missing file/);
});
