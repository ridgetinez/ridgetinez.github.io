import { escapeHTML as e, renderMarkdown, excerpt } from './markdown.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sitePath, postPath, tagPath } from './urls.js';

// Content versions let a normal refresh pick up a new design while assets
// retain their cache lifetime. Recomputed when the application starts.
const assets = Object.fromEntries(['styles.css', 'app.js', 'reader.js', 'garden.js', 'mascot.js', 'favicon.svg'].map(name => [name,
  `/assets/${name}?v=${createHash('sha256').update(readFileSync(new URL(`../public/${name}`, import.meta.url))).digest('hex').slice(0, 12)}`
]));

// Trusted, repo-owned SVG is inline so its eyes, leaf and feet can move
// independently. The favicon stays the original static pixel drawing.
export const mascotMarkup = readFileSync(new URL('../public/mascot.svg',import.meta.url),'utf8').trim();
export const mascotScript = config => `<script type="module" src="${sitePath(assets['mascot.js'],config)}"></script>`;

const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const tagClass = tag => ({running:'running', maths:'mathematics', mathematics:'mathematics', coffee:'coffee', cooking:'cooking', gardening:'gardening'}[tag] || 'other');
const tagLabel = tag => tag === 'mathematics' ? 'maths' : tag;

function attachmentHTML(attachment, config = {}) {
  const src = sitePath(`/media/${encodeURIComponent(config.static ? attachment.filename : attachment.id)}`, config);
  if (attachment.kind === 'image') return `<figure class="photo"><a href="${src}" target="_blank" rel="noopener" aria-label="Open photo"><img src="${src}" alt="${e(attachment.alt || 'Photo attached to this entry')}" loading="lazy" decoding="async"></a></figure>`;
  return `<div class="voice-note">
    <audio controls preload="metadata" src="${src}" aria-label="${e(attachment.name || 'Voice note')}"></audio>
    <div class="audio-player" hidden><button type="button" class="audio-play" aria-label="Play audio">▶</button><div class="audio-track"><span class="audio-name">${e(attachment.name || 'Voice note')}</span><input type="range" min="0" max="1000" value="0" class="audio-seek" aria-label="Seek audio"></div><span class="audio-clock">0:00 / —</span></div>
    ${attachment.transcript ? `<details class="transcript"><summary>Transcript</summary><div>${e(attachment.transcript)}</div></details>` : ''}
  </div>`;
}

export function renderPost(post, { editor = false, store, timezone = 'Australia/Sydney', permalink = false, config = {} } = {}) {
  const date = new Date(post.created_at);
  const time = new Intl.DateTimeFormat('en-AU', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:timezone }).format(date);
  const links = store ? store.backlinks(post.id).filter(source => source.id !== post.id) : [];
  return `<article class="entry${post.archived_at ? ' is-archived' : ''}" id="entry-${e(post.id)}" data-entry-id="${e(post.id)}">
    <div class="entry-meta"><a class="entry-time" href="${e(postPath(post.id, config))}"><time datetime="${e(post.created_at)}">${e(time)}</time></a>${post.tags.map(tag => `<a class="tag ${tagClass(tag)}" href="${e(tagPath(tag, config))}">${e(tagLabel(tag))}</a>`).join('')}</div>
    <div class="message">${renderMarkdown(post.body, config)}</div>
    <div class="entry-media">${post.attachments.map(attachment => attachmentHTML(attachment, config)).join('')}</div>
    ${links.length ? `<div class="backlinks"><span aria-hidden="true">↳</span>${links.map(source => `<a href="${e(postPath(source.id, config))}">${e(excerpt(source.body, 70))}</a>`).join('')}</div>` : ''}
    ${editor ? `<div class="entry-actions">${post.archived_at ? `<button data-action="restore">Restore</button>` : '<button data-action="edit">Edit</button><button data-action="reference">Link</button><button data-action="archive">Archive</button>'}</div><script type="application/json" class="post-data">${safeJSON(post)}</script>` : ''}
    ${permalink ? `<a class="back-to-stream" href="${e(sitePath('/', config))}">← All posts</a>` : ''}
  </article>`;
}

function composer() {
  return `<form id="composer" class="composer">
    <textarea id="body" name="body" aria-label="Entry text" placeholder="Write…" rows="3" maxlength="30000"></textarea>
    <div id="attachments" class="attachment-drafts"></div>
    <div class="compose-tools"><div class="attach-actions">
      <label class="attach">Photo<input type="file" id="photo-input" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple></label>
      <label class="attach">Audio<input type="file" id="audio-input" accept="audio/*" multiple></label>
      <button type="button" id="record" class="attach">Record</button>
      <button type="button" id="preview-button" class="attach" aria-expanded="false" aria-controls="preview">Preview</button>
    </div><button type="submit" id="publish" class="publish">Post</button></div>
    <div class="compose-meta"><input type="text" name="tags" aria-label="Tags, separated by commas" placeholder="Tags" maxlength="260" autocomplete="off"><details class="date-option"><summary>Date</summary><label>Post date<input type="datetime-local" name="createdAt" aria-label="Post date"></label></details><button type="button" id="cancel-edit" hidden>Cancel edit</button></div>
    <div id="preview" class="message compose-preview" hidden></div>
    <p id="compose-status" role="status" aria-live="polite"></p>
  </form>`;
}

export function renderPage({ posts, tags, store, config, editor = false, csrf = '', tag = '', archived = false, single = false, hasMore = false, olderHref = '', currentPath = '' }) {
  let day = '';
  const dayFormat = new Intl.DateTimeFormat('en-AU', { day:'numeric', month:'long', year:'numeric', timeZone:config.timezone });
  const content = posts.map(post => {
    const key = dayFormat.format(new Date(post.created_at));
    const heading = key !== day ? `${day ? '</section>' : ''}<section class="day-group"><h2 class="day-heading">${e(key)}</h2>` : '';
    day = key;
    return heading + renderPost(post, { editor, store, timezone:config.timezone, permalink:single, config });
  }).join('') + (day ? '</section>' : '');
  const title = single && posts[0] ? `${excerpt(posts[0].body, 70)} · ridge` : 'ridge';
  const canonical = config.static ? new URL(sitePath(currentPath || '/', config), new URL(config.publicOrigin).origin).href : `${config.publicOrigin}${single ? '/p/' + posts[0].id : tag ? '/?tag=' + encodeURIComponent(tag) : '/'}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark">
<title>${e(title)}</title><meta name="description" content="${e(single ? excerpt(posts[0].body, 150) : 'Posts by ridge.')}">
${editor ? '<meta name="robots" content="noindex,nofollow"><meta name="csrf-token" content="' + e(csrf) + '">' : `<link rel="canonical" href="${e(canonical)}">`}
<link rel="icon" href="${e(sitePath(assets['favicon.svg'], config))}" type="image/svg+xml"><link rel="stylesheet" href="${sitePath(assets['styles.css'], config)}"><link rel="stylesheet" href="${sitePath('/assets/katex/katex.min.css', config)}">
<link rel="alternate" type="application/rss+xml" title="ridge" href="${e(config.publicOrigin)}/feed.xml"><script type="module" src="${sitePath(assets[config.static ? 'reader.js' : 'app.js'], config)}"></script><script type="module" src="${sitePath(assets['garden.js'], config)}"></script>
</head><body>${mascotScript(config)}<div class="page">
<header class="masthead"><a href="${sitePath('/', config)}" class="signature">${mascotMarkup}ridge</a>${editor ? `<div class="owner-nav">${config.demo ? '<span class="demo-label">Demo</span>' : ''}<a href="${e(config.publicOrigin)}" target="_blank" rel="noopener">Public view ↗</a></div>` : ''}</header>
${!single ? `<nav class="filters" aria-label="Filter posts"><a class="filter filter-all" href="${sitePath('/', config)}" ${!tag && !archived ? 'aria-current="page"' : ''}>All</a>${tags.map(value => `<a class="filter ${tagClass(value)}" href="${e(tagPath(value, config))}" ${tag === value ? 'aria-current="page"' : ''}>${e(tagLabel(value))}</a>`).join('')}${editor ? `<a class="archive-filter" href="/?archived=1" ${archived ? 'aria-current="page"' : ''}>Archived</a>` : ''}</nav>` : ''}
${editor && !archived ? composer() : ''}
<main id="entries" aria-label="Posts">${content || '<p class="empty">No posts yet.</p>'}</main>
${hasMore && posts.length ? `<a class="older" href="${olderHref || `/?${tag ? 'tag=' + encodeURIComponent(tag) + '&' : ''}${archived ? 'archived=1&' : ''}before=${e(posts.at(-1).id)}`}">Older posts ↓</a>` : ''}
<footer>${config.archive ? `<a href="${sitePath('/archive/',config)}">Archive</a>` : ''}<a href="${e(config.publicOrigin)}/feed.xml">RSS</a></footer>
</div><script type="application/json" id="page-config">${safeJSON({ editor, publicOrigin:config.publicOrigin, timezone:config.timezone, demo:config.demo })}</script></body></html>`;
}

export function renderRSS(posts, origin, config = {}) {
  const host = new URL(origin).origin;
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>ridge</title><link>${e(origin)}</link><description>Posts by ridge.</description>${posts.map(post => `<item><guid isPermaLink="true">${e(host + postPath(post.id, config))}</guid><link>${e(host + postPath(post.id, config))}</link><title>${e(excerpt(post.body))}</title><pubDate>${new Date(post.created_at).toUTCString()}</pubDate><content:encoded>${e(renderMarkdown(post.body, {...config, absoluteOrigin:host}) + post.attachments.map(attachment => attachment.kind === 'image' ? `<p><img src="${host + sitePath('/media/' + (config.static ? attachment.filename : attachment.id), config)}" alt="${e(attachment.alt)}"></p>` : `<p><a href="${host + sitePath('/media/' + (config.static ? attachment.filename : attachment.id), config)}">Audio note</a></p>`).join(''))}</content:encoded>${post.tags.map(tag => `<category>${e(tag)}</category>`).join('')}</item>`).join('')}</channel></rss>`;
}
