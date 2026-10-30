import path from 'node:path';
import { readFile, writeFile, mkdir, copyFile, cp, realpath, stat } from 'node:fs/promises';
import { projectRoot } from './config.js';
import { inside, replaceDirectory, resolveDestination } from './files.js';
import { siteConfiguration, sitePath } from './urls.js';
import { renderPage, renderRSS, mascotMarkup, mascotScript } from './render.js';
import { escapeHTML as e } from './markdown.js';
import { archiveFiles } from './archive.js';
import { sanitizeDiagramSVG } from './diagrams.js';

export async function buildSite({ contentDir = path.join(projectRoot,'content'), outputDir = path.join(projectRoot,'dist'), siteURL, timezone, archiveDir } = {}) {
  contentDir = await realpath(contentDir);
  outputDir = await resolveDestination(outputDir);
  if (contentDir === outputDir || inside(contentDir,outputDir) || inside(outputDir,contentDir)) throw new Error('Build output must be separate from content.');
  const config = siteConfiguration(siteURL,timezone);
  const archivedFiles = await archiveFiles(archiveDir);
  config.archive = archivedFiles.includes(path.join('archive','index.html'));
  const data = JSON.parse(await readFile(path.join(contentDir,'posts.json'),'utf8'));
  if (data.version !== 1 || !Array.isArray(data.posts)) throw new Error('Unsupported content snapshot.');
  const posts = data.posts;
  const ids = new Set();
  const filenames = new Set();
  const diagramFiles = new Map();
  config.diagramAssets = new Map();
  for (const post of posts) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/.test(post.id) || ids.has(post.id)) throw new Error('Invalid or duplicate post ID.');
    ids.add(post.id);
    if (typeof post.body !== 'string' || !Array.isArray(post.tags) || post.tags.some(tag => typeof tag !== 'string' || !/^[\p{L}\p{N}][\p{L}\p{N}-]{0,29}$/u.test(tag)) || !Array.isArray(post.links) || !Array.isArray(post.attachments) || !Number.isFinite(Date.parse(post.created_at))) throw new Error(`Invalid content for ${post.id}.`);
    for (const attachment of post.attachments) {
      if (!['image','audio'].includes(attachment.kind) || !/^[a-f0-9]{64}\.(webp|mp3|wav|ogg|flac|m4a|webm)$/.test(attachment.filename)) throw new Error(`Invalid media for ${post.id}.`);
      const filename = await realpath(path.join(contentDir,'media',attachment.filename));
      if (!inside(contentDir,filename) || !(await stat(filename)).isFile()) throw new Error('Media must be files in the public snapshot.');
      filenames.add(attachment.filename);
    }
    if (post.diagrams !== undefined && (!Array.isArray(post.diagrams) || post.diagrams.length > 8)) throw new Error(`Invalid diagrams for ${post.id}.`);
    for (const diagram of post.diagrams || []) {
      if (!/^[a-f0-9]{64}\.svg$/.test(diagram.filename) || typeof diagram.alt !== 'string') throw new Error(`Invalid diagram for ${post.id}.`);
      const filename = await realpath(path.join(contentDir,'diagrams',diagram.filename));
      if (!inside(contentDir,filename) || !(await stat(filename)).isFile()) throw new Error('Diagrams must be files in the public snapshot.');
      const svg = sanitizeDiagramSVG(await readFile(filename,'utf8'));
      diagramFiles.set(diagram.filename,svg);
      config.diagramAssets.set('/diagrams/' + diagram.filename,svg);
    }
  }
  for (const post of posts) if (post.links.some(id => !ids.has(id))) throw new Error(`Broken reference in ${post.id}. Re-export the vault.`);
  posts.sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  const tags = [...new Set(posts.flatMap(post => post.tags))].sort();
  const store = { backlinks:id => posts.filter(post => post.links.includes(id)) };

  await replaceDirectory(outputDir,'.ridge-static', async stage => {
    const write = async (relative,value) => { const filename = path.join(stage,relative); await mkdir(path.dirname(filename),{recursive:true}); await writeFile(filename,value); };
    // Current routes win if a future stream tag overlaps an older tag page.
    for (const file of archivedFiles) {
      await mkdir(path.dirname(path.join(stage,file)),{recursive:true});
      await copyFile(path.join(archiveDir,file),path.join(stage,file));
    }
    const list = async (selected,tag = '') => {
      const count = Math.max(1,Math.ceil(selected.length / 30));
      const root = tag ? `tag/${encodeURIComponent(tag)}/` : '';
      for (let page = 1; page <= count; page++) {
        const currentPath = '/' + root + (page === 1 ? '' : `page/${page}/`);
        const filePath = (tag ? `tag/${tag}/` : '') + (page === 1 ? '' : `page/${page}/`) + 'index.html';
        await write(filePath,renderPage({ posts:selected.slice((page-1)*30,page*30), tags, store, config, tag, currentPath, hasMore:page<count, olderHref:sitePath('/' + root + `page/${page+1}/`,config) }));
      }
    };
    await list(posts);
    for (const tag of tags) await list(posts.filter(post => post.tags.includes(tag)),tag);
    for (const post of posts) await write(`p/${post.id}/index.html`,renderPage({posts:[post],tags,store,config,single:true,currentPath:`/p/${post.id}/`}));
    await write('feed.xml',renderRSS(posts.slice(0,100),config.publicOrigin,config));
    await write('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${config.publicOrigin}/sitemap.xml\n`);
    await write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${e(config.publicOrigin)}/</loc></url>${posts.map(post => `<url><loc>${e(config.publicOrigin)}/p/${e(post.id)}/</loc></url>`).join('')}</urlset>`);
    await write('404.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found · ridge</title><meta name="robots" content="noindex"><link rel="stylesheet" href="${sitePath('/assets/styles.css',config)}"></head><body>${mascotScript(config)}<div class="page"><header class="masthead"><a class="signature" href="${sitePath('/',config)}">${mascotMarkup}ridge</a></header><main><p>This page isn’t here.</p><a href="${sitePath('/',config)}">← All posts</a></main></div></body></html>`);
    await mkdir(path.join(stage,'assets/fonts'),{recursive:true});
    for (const name of ['styles.css','reader.js','garden.js','mascot.js','favicon.svg']) await copyFile(path.join(projectRoot,'public',name),path.join(stage,'assets',name));
    await copyFile(path.join(projectRoot,'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),path.join(stage,'assets/fonts/inter-latin-wght-normal.woff2'));
    await copyFile(path.join(projectRoot,'node_modules/@fontsource-variable/inter/LICENSE'),path.join(stage,'assets/fonts/Inter-LICENSE.txt'));
    await mkdir(path.join(stage,'assets/katex'));
    await copyFile(path.join(projectRoot,'node_modules/katex/dist/katex.min.css'),path.join(stage,'assets/katex/katex.min.css'));
    await cp(path.join(projectRoot,'node_modules/katex/dist/fonts'),path.join(stage,'assets/katex/fonts'),{recursive:true});
    await copyFile(path.join(projectRoot,'node_modules/katex/LICENSE'),path.join(stage,'assets/katex/LICENSE.txt'));
    await mkdir(path.join(stage,'media'));
    for (const name of filenames) await copyFile(path.join(contentDir,'media',name),path.join(stage,'media',name));
    if (diagramFiles.size) {
      await mkdir(path.join(stage,'diagrams'));
      for (const [name,svg] of diagramFiles) await writeFile(path.join(stage,'diagrams',name),svg);
    }
    await write('.nojekyll','');
    await write('.ridge-static','Generated public site. Safe to replace with the next build.\n');
  });
  return { posts:posts.length, config, outputDir };
}
