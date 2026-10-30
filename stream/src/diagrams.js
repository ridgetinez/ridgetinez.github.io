import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from './config.js';

const run = promisify(execFile);
const svgNS = 'http://www.w3.org/2000/svg';
const xlinkNS = 'http://www.w3.org/1999/xlink';
const darkStyle = '@media(prefers-color-scheme:dark){svg{color:#deded9}svg [stroke="#5e785d"]{stroke:#a8b69d}svg [fill="#5e785d"]{fill:#a8b69d}}';
const elements = new Set(['svg','g','defs','path','use','circle','ellipse','rect','line','polyline','polygon','clipPath','title','desc']);
const attributes = new Set(['id','viewBox','width','height','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','d','points','transform','fill','stroke','stroke-width','stroke-miterlimit','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-dashoffset','fill-rule','clip-rule','clip-path','opacity','fill-opacity','stroke-opacity','href','xlink:href','version','color','data-ridge-diagram','role','aria-label']);

// A strict generated-vector format, not an arbitrary SVG upload sanitizer.
// No script, CSS from the source, external resources, foreign namespaces or HTML.
export function sanitizeDiagramSVG(source, { prefix = '', alt = '', standalone = true } = {}) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > 512 * 1024 || /<!DOCTYPE|<!ENTITY|<\?(?!xml\s)/i.test(source)) throw new Error('Invalid diagram SVG.');
  if (prefix && !/^[a-zA-Z][\w-]*$/.test(prefix)) throw new Error('Invalid diagram namespace.');
  const document = new DOMParser({ onError: (level, message) => { throw new Error(`Invalid diagram XML: ${message}`); } }).parseFromString(source, 'image/svg+xml');
  const root = document.documentElement;
  if (root?.localName !== 'svg' || root.namespaceURI !== svgNS) throw new Error('Diagram must have an SVG root.');
  const ids = new Set(), references = [];
  function visit(node) {
    if (node.nodeType === 3) { if (node.parentNode.localName !== 'title' && node.parentNode.localName !== 'desc' && node.data.trim()) throw new Error('Unexpected diagram text.'); return; }
    if (node.nodeType !== 1) { node.parentNode.removeChild(node); return; }
    if (node.localName === 'style' && node.textContent === darkStyle) { node.parentNode.removeChild(node); return; }
    if (node.namespaceURI !== svgNS || !elements.has(node.localName) || (node !== root && node.localName === 'svg')) throw new Error(`Unsupported diagram element: ${node.nodeName}`);
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name, value = attribute.value;
      if (name === 'xmlns' || name === 'xmlns:xlink') {
        if (value !== (name === 'xmlns' ? svgNS : xlinkNS)) throw new Error('Invalid SVG namespace.');
        continue;
      }
      if (!attributes.has(name) || (attribute.namespaceURI && attribute.namespaceURI !== xlinkNS)) throw new Error(`Unsupported diagram attribute: ${name}`);
      if (name === 'id') {
        if (!/^[a-zA-Z_][\w.-]*$/.test(value) || ids.has(value)) throw new Error('Invalid or duplicate diagram ID.');
        ids.add(value); node.setAttribute(name, prefix + value);
      } else if (name === 'href' || name === 'xlink:href') {
        if (node.localName !== 'use' || !/^#[a-zA-Z_][\w.-]*$/.test(value)) throw new Error('Only internal glyph references are supported.');
        references.push(value.slice(1)); node.setAttribute(name, '#' + prefix + value.slice(1));
      } else if (name === 'clip-path') {
        const match = /^url\(#([a-zA-Z_][\w.-]*)\)$/.exec(value);
        if (!match) throw new Error('Invalid diagram clipping reference.');
        references.push(match[1]); node.setAttribute(name, `url(#${prefix}${match[1]})`);
      } else if (['fill','stroke','color'].includes(name)) {
        if (!/^(?:none|currentColor|#[0-9a-f]{3}(?:[0-9a-f]{3})?)$/i.test(value)) throw new Error('Unsupported diagram paint.');
        if (/^#(?:000(?:000)?|242927)$/i.test(value)) node.setAttribute(name, 'currentColor');
      } else if (/url\s*\(|[<>]/i.test(value)) throw new Error('Invalid diagram attribute value.');
    }
    for (const child of Array.from(node.childNodes)) visit(child);
  }
  visit(root);
  if (references.some(id => !ids.has(id))) throw new Error('Missing diagram glyph reference.');
  const box = (root.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
  if (box.length !== 4 || box.some(n => !Number.isFinite(n)) || box[2] <= 0 || box[3] <= 0 || box[2] > 10000 || box[3] > 10000) throw new Error('Invalid diagram viewBox.');
  root.setAttribute('fill', 'currentColor');
  root.setAttribute('data-ridge-diagram', 'tikz-v1');
  root.setAttribute('role', 'img');
  root.removeAttribute('color');
  if (alt) root.setAttribute('aria-label', alt);
  if (standalone) {
    root.setAttribute('color', '#242927');
    const style = document.createElementNS(svgNS, 'style'); style.textContent = darkStyle; root.insertBefore(style, root.firstChild);
  }
  return new XMLSerializer().serializeToString(root);
}

const commands = new Set('begin end draw fill filldraw path node coordinate pic small footnotesize scriptsize normalsize frac tfrac dfrac sqrt cdot times triangle cong perp angle overline vec text mathrm mathbf mathit mathsf mathbb left right big Big quad qquad le ge leq geq ldots pm mid infty pi theta alpha beta gamma delta Rightarrow'.split(' '));
const environments = new Set(['tikzpicture','scope','aligned','cases','matrix','pmatrix','bmatrix']);
export function validateTikz(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > 24000 || source.includes('^^') || source.includes('\0')) throw new Error('TikZ source is too large or contains TeX character escapes.');
  const prose = source.replace(/(?<!\\)%[^\n]*/g, '');
  for (const match of prose.matchAll(/\\([a-zA-Z]+|[^a-zA-Z])/g)) {
    if (!commands.has(match[1]) && !['\u0020',',',';','!','{','}','%','_','\\'].includes(match[1])) throw new Error(`TikZ command \\${match[1]} is outside the supported drawing subset.`);
  }
  for (const match of prose.matchAll(/\\(?:begin|end)\s*\{([^}]+)\}/g)) if (!environments.has(match[1])) throw new Error('Unsupported TikZ environment.');
  if ((prose.match(/\\begin\{tikzpicture\}/g) || []).length !== 1 || (prose.match(/\\end\{tikzpicture\}/g) || []).length !== 1 || !/^\s*\\begin\{tikzpicture\}[\s\S]*\\end\{tikzpicture\}\s*$/.test(prose)) throw new Error('Use one tikzpicture only, without a document preamble.');
  return source;
}

// Compile only at local preparation time. The public build consumes SVG and
// never requires TeX, runs a compiler, or trusts author-supplied HTML.
export async function compileTikz(source) {
  validateTikz(source);
  const parent = path.join(projectRoot, '.local/tikz-work');
  await mkdir(parent, {recursive:true});
  const directory = await mkdtemp(path.join(parent, 'figure-'));
  const tex = String.raw`\def\pgfsysdriver{pgfsys-dvisvgm.def}
\documentclass[tikz,border=7pt]{standalone}
\usepackage{amsmath,amssymb}
\usetikzlibrary{calc,angles,quotes,arrows.meta}
\definecolor{ridgeink}{HTML}{242927}
\definecolor{ridgeaccent}{HTML}{5E785D}
\definecolor{ridgemuted}{HTML}{808880}
\begin{document}
\color{ridgeink}
` + source + '\n\\end{document}\n';
  const env = {PATH:process.env.PATH, openin_any:'p', openout_any:'p', TEXMFOUTPUT:directory, SOURCE_DATE_EPOCH:'1600000000', FORCE_SOURCE_DATE:'1'};
  try {
    await writeFile(path.join(directory,'figure.tex'),tex);
    await run('latex',['-no-shell-escape','-interaction=nonstopmode','-halt-on-error','figure.tex'],{cwd:directory,env,timeout:15000,maxBuffer:1024*1024});
    await run('dvisvgm',['--no-fonts','--exact','--bbox=min','--output=figure.svg','figure.dvi'],{cwd:directory,env,timeout:15000,maxBuffer:1024*1024});
    return sanitizeDiagramSVG(await readFile(path.join(directory,'figure.svg'),'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Regenerating diagrams needs local TeX Live/MacTeX (latex and dvisvgm). GitHub Pages needs only the prepared SVG.');
    const log = String(error.stdout || error.stderr || error.message).slice(-1800);
    throw new Error(`TikZ compilation failed: ${log}`);
  } finally { await rm(directory,{recursive:true,force:true}); }
}
