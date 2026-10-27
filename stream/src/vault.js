import path from 'node:path';
import { readdir, readFile, realpath, stat, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { markdownTokens } from './markdown.js';
import { inside, replaceDirectory, resolveDestination } from './files.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const audioTypes = new Map([['audio/mpeg','mp3'], ['audio/wav','wav'], ['audio/x-wav','wav'], ['audio/ogg','ogg'], ['audio/opus','ogg'], ['audio/flac','flac'], ['audio/mp4','m4a'], ['audio/x-m4a','m4a'], ['video/mp4','m4a'], ['audio/webm','webm'], ['video/webm','webm']]);
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/;
const audioExtensions = new Set(['.mp3','.m4a','.wav','.ogg','.flac','.webm','.opus']);

export async function vaultFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of (await readdir(directory, { withFileTypes:true })).sort((a,b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink() || ['node_modules','Templates'].includes(entry.name)) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(filename);
      else if (entry.isFile()) files.push(path.relative(root, filename).split(path.sep).join('/'));
    }
  }
  await visit(root); return files;
}

function note(source, filename) {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) return { properties:{}, body:source };
  let properties;
  try { properties = parse(match[1], { maxAliasCount:0, uniqueKeys:true }); }
  catch (error) { throw new Error(`${filename}: invalid properties (${error.message})`); }
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) throw new Error(`${filename}: properties must be a mapping.`);
  return { properties, body:source.slice(match[0].length).trim() };
}

// Work only on prose. Code examples and mathematics must not be interpreted as
// Obsidian links, embeds or comments, even when they contain the same characters.
async function transformProse(body, transform) {
  const lines = body.split('\n'), offsets = [0];
  for (const line of lines) offsets.push(offsets.at(-1) + line.length + 1);
  const ranges = markdownTokens(body).filter(token => ['fence','code_block','ridge_math_block'].includes(token.type)).map(token => [offsets[token.map[0]], Math.min(body.length, offsets[token.map[1]])]);
  let output = '', position = 0;
  async function prose(text) {
    let result = '', cursor = 0;
    // Inline code and inline maths stay literal; comments outside them vanish.
    const pattern = /(`+)[\s\S]*?\1|\$[^\s$][^\n$]*\$|%%[\s\S]*?%%/g;
    for (const match of text.matchAll(pattern)) {
      result += await transform(text.slice(cursor, match.index));
      if (!match[0].startsWith('%%')) result += match[0];
      cursor = match.index + match[0].length;
    }
    return result + await transform(text.slice(cursor));
  }
  for (const [start,end] of ranges) { output += await prose(body.slice(position,start)) + body.slice(start,end); position = end; }
  return output + await prose(body.slice(position));
}

async function replaceAsync(source, pattern, convert) {
  let output = '', cursor = 0;
  for (const match of source.matchAll(pattern)) { output += source.slice(cursor,match.index) + await convert(match); cursor = match.index + match[0].length; }
  return output + source.slice(cursor);
}

export async function exportVault(vault, output) {
  const root = await realpath(path.resolve(vault));
  output = await resolveDestination(output);
  if (output === root || inside(root,output) || inside(output,root)) throw new Error('Export outside the Obsidian vault, so generated files never become notes.');
  const files = await vaultFiles(root), entries = [];
  for (const filename of files.filter(file => file.endsWith('.md'))) {
    const parsed = note(await readFile(path.join(root,filename),'utf8'), filename);
    if (parsed.properties.publish !== true) continue;
    const p = parsed.properties;
    const id = p.id === undefined ? 'n-' + hash(filename).slice(0,20) : String(p.id);
    if (!idPattern.test(id)) throw new Error(`${filename}: id must use letters, numbers and hyphens (up to 80 characters).`);
    // No mtime fallback: synchronisation and a fresh clone must not reorder life.
    const date = String(p.date || p.created || '');
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/.test(date) || !Number.isFinite(Date.parse(date))) throw new Error(`${filename}: add a date with time and timezone, e.g. 2026-10-27T08:30:00+11:00.`);
    const values = Array.isArray(p.tags) ? p.tags : p.tags ? [p.tags] : [];
    const tags = [...new Set(values.map(tag => String(tag).replace(/^#/,'').trim().toLowerCase()))];
    if (tags.length > 8 || tags.some(tag => !/^[\p{L}\p{N}][\p{L}\p{N}-]{0,29}$/u.test(tag))) throw new Error(`${filename}: use up to eight short tags containing letters, numbers or hyphens.`);
    entries.push({ filename, properties:p, id, date:new Date(date).toISOString(), tags, body:parsed.body });
  }
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw new Error('Two published notes have the same id. Give them distinct ids.');
  const byFile = new Map(entries.map(entry => [entry.filename, entry]));
  const byID = new Map(entries.map(entry => [entry.id, entry]));
  function resolve(target, from, markdown = false) {
    try { target = decodeURIComponent(target); } catch { throw new Error(`${from}: malformed attachment or link.`); }
    if (/^[a-z]+:/i.test(target) || target.includes('\\') || target.startsWith('/')) throw new Error(`${from}: use a file inside the vault (${target}).`);
    const candidates = markdown && !target.endsWith('.md') ? [target + '.md'] : [target];
    for (const candidate of candidates) {
      const relative = path.posix.join(path.posix.dirname(from), candidate);
      if (files.includes(relative)) return relative;
      if (files.includes(candidate)) return candidate;
    }
    const matches = files.filter(file => candidates.some(candidate => file === candidate || file.endsWith('/' + candidate)));
    if (matches.length !== 1) throw new Error(`${from}: ${matches.length ? 'ambiguous' : 'missing'} file ${target}. Use a vault-relative path.`);
    return matches[0];
  }

  const posts = [];
  await replaceDirectory(output, '.ridge-content', async stage => {
    await mkdir(path.join(stage,'media'));
    for (const entry of entries) {
      const attachments = [], links = new Set();
      function link(target, label) {
        if (target.includes('#')) throw new Error(`${entry.filename}: heading/block links are not supported yet. Link to the whole note.`);
        let destination = byID.get(target);
        if (!destination) destination = byFile.get(resolve(target, entry.filename, true));
        if (!destination) throw new Error(`${entry.filename}: linked note ${target} is private. Mark it publish: true or remove the link.`);
        links.add(destination.id);
        const title = label || path.posix.basename(destination.filename,'.md');
        return `[${title.replace(/[\[\]\\]/g,'\\$&')}](/p/${destination.id})`;
      }
      async function media(target, label = '') {
        if (!path.extname(target) || path.extname(target) === '.md') throw new Error(`${entry.filename}: note embeds are not supported. Use a link to a public note instead.`);
        const filename = resolve(target, entry.filename);
        const full = await realpath(path.join(root,filename));
        if (!inside(root,full)) throw new Error('Attachment escaped the vault.');
        if ((await stat(full)).size > 15 * 1024 * 1024) throw new Error(`${entry.filename}: ${target} exceeds 15 MB.`);
        const original = await readFile(full), type = await fileTypeFromBuffer(original);
        let buffer, kind, extension;
        if (imageTypes.has(type?.mime)) {
          kind = 'image'; extension = 'webp';
          buffer = await sharp(original,{limitInputPixels:40000000}).rotate().resize({width:2200,height:2200,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();
        } else if (audioTypes.has(type?.mime) && audioExtensions.has(path.extname(filename).toLowerCase())) {
          kind = 'audio'; extension = audioTypes.get(type.mime); buffer = original;
        } else throw new Error(`${entry.filename}: ${target} is not a supported photo or audio file. Note embeds, SVG, PDF and video are not exported.`);
        const id = hash(buffer), publishedName = `${id}.${extension}`;
        await writeFile(path.join(stage,'media',publishedName),buffer);
        const transcript = entry.properties.transcripts?.[target] ?? (kind === 'audio' && !attachments.some(a => a.kind === 'audio') ? entry.properties.transcript : '') ?? '';
        attachments.push({ id, filename:publishedName, kind, name:path.basename(filename), alt:kind === 'image' ? (label && !/^\d+(?:x\d+)?$/.test(label) ? label : String(entry.properties.alt || '')) : '', transcript:kind === 'audio' ? String(transcript) : '' });
        if (attachments.length > 6) throw new Error(`${entry.filename}: use up to six attachments per entry.`);
        return '';
      }
      const body = (await transformProse(entry.body, async text => {
        if ((text.match(/%%/g) || []).length % 2) throw new Error(`${entry.filename}: close the %% comment before exporting.`);
        text = await replaceAsync(text, /(!?)\[\[([^\]\n]+)\]\]/g, async match => {
          const [target,...alias] = match[2].split('|');
          return match[1] ? media(target.trim(), alias.join('|')) : link(target.trim(),alias.join('|'));
        });
        return replaceAsync(text, /(!?)\[([^\]\n]*)\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g, async match => {
          const target = match[3].replace(/^<|>$/g,'');
          if (/^https?:\/\//i.test(target) || target.startsWith('#') || /^(mailto:|tel:)/i.test(target)) return match[0];
          if (target.startsWith('/p/')) { const id = target.slice(3).replace(/\/$/,''); if (byID.has(id)) return link(id,match[2]); }
          if (match[1]) return media(target,match[2]);
          return link(target,match[2]);
        });
      })).trim();
      // Markdown reference-style links are parsed too. Reject unresolved local
      // destinations rather than publishing broken paths or private note names.
      function validate(tokens) {
        for (const token of tokens) {
          if (token.type === 'image' || token.type === 'link_open') {
            const destination = token.attrGet(token.type === 'image' ? 'src' : 'href');
            if (destination && !/^(https?:\/\/|mailto:|tel:|#)/i.test(destination) && !/^\/p\/[a-zA-Z0-9-]+$/.test(destination)) throw new Error(`${entry.filename}: unsupported local link ${destination}. Use [[note]] or ![[file]] syntax.`);
          }
          if (token.children) validate(token.children);
        }
      }
      validate(markdownTokens(body));
      if (!body && !attachments.length) throw new Error(`${entry.filename}: this published entry is empty.`);
      if (body.length > 30000) throw new Error(`${entry.filename}: keep entries under 30,000 characters.`);
      posts.push({ id:entry.id, body, tags:entry.tags, links:[...links], created_at:entry.date, attachments });
    }
    posts.sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
    await writeFile(path.join(stage,'posts.json'),JSON.stringify({version:1,posts},null,2) + '\n');
    await writeFile(path.join(stage,'.ridge-content'),'Public export only. Regenerated from selected Obsidian notes.\n');
  });
  return posts;
}
