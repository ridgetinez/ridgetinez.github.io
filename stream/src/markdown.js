import MarkdownIt from 'markdown-it';
import katex from 'katex';
import hljs from 'highlight.js/lib/common';
import { sitePath } from './urls.js';
import { sanitizeDiagramSVG } from './diagrams.js';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const md = new MarkdownIt({
  html: false, linkify: true, breaks: true,
  highlight(code, language) {
    const content = language && hljs.getLanguage(language) ? hljs.highlight(code, { language, ignoreIllegals: true }).value : escapeHTML(code);
    return `<pre><code class="hljs">${content}</code></pre>`;
  }
});

// Raw HTML is disabled. Math is emitted only by KaTeX with trust disabled.
md.inline.ruler.before('escape', 'ridge_math', (state, silent) => {
  const start = state.pos;
  if (state.src[start] !== '$' || state.src[start + 1] === '$' || /\s/.test(state.src[start + 1] || '')) return false;
  let end = start + 1;
  while ((end = state.src.indexOf('$', end)) !== -1 && state.src[end - 1] === '\\') end++;
  if (end < 0 || state.src.slice(start + 1, end).includes('\n') || /\s/.test(state.src[end - 1])) return false;
  if (!silent) { const token = state.push('ridge_math', 'math', 0); token.content = state.src.slice(start + 1, end); }
  state.pos = end + 1;
  return true;
});
md.block.ruler.before('fence', 'ridge_math_block', (state, startLine, endLine, silent) => {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const line = state.src.slice(start, state.eMarks[startLine]).trim();
  if (!line.startsWith('$$')) return false;
  let content = line.slice(2), next = startLine + 1;
  if (content.endsWith('$$')) content = content.slice(0, -2);
  else {
    let closed = false;
    for (; next < endLine; next++) {
      const value = state.src.slice(state.bMarks[next] + state.tShift[next], state.eMarks[next]);
      if (value.trim().endsWith('$$')) { content += '\n' + value.trimEnd().slice(0, -2); next++; closed = true; break; }
      content += '\n' + value;
    }
    if (!closed) return false;
  }
  if (silent) return true;
  const token = state.push('ridge_math_block', 'math', 0); token.block = true; token.content = content.trim(); token.map = [startLine, next];
  state.line = next;
  return true;
});
const math = (tokens, index, displayMode) => {
  try { return katex.renderToString(tokens[index].content, { displayMode, throwOnError: false, trust: false, strict: 'ignore', maxExpand: 1000, maxSize: 20 }); }
  catch { return `<code>${escapeHTML(tokens[index].content)}</code>`; }
};
md.renderer.rules.ridge_math = (tokens, index) => math(tokens, index, false);
md.renderer.rules.ridge_math_block = (tokens, index) => `<div class="math-block">${math(tokens, index, true)}</div>`;

const defaultLink = md.renderer.rules.link_open || ((tokens, index, options, env, renderer) => renderer.renderToken(tokens, index, options));
md.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  tokens[index].attrSet('rel', 'noreferrer noopener');
  let href = tokens[index].attrGet('href');
  if (href?.startsWith('/') && !href.startsWith('//')) {
    href = sitePath(href, env);
    if (env.absoluteOrigin) href = env.absoluteOrigin + href;
    tokens[index].attrSet('href', href);
  }
  return defaultLink(tokens, index, options, env, renderer);
};
const defaultImage = md.renderer.rules.image;
md.renderer.rules.image = (tokens, index, options, env, renderer) => {
  const src = tokens[index].attrGet('src');
  const diagram = env.diagramAssets?.get(src);
  if (diagram && env.inlineDiagrams !== false) {
    const prefix = `${env.diagramPrefix || 'diagram'}-${env.diagramIndex++}-`;
    const svg = sanitizeDiagramSVG(diagram, {prefix, alt:tokens[index].content || 'Geometry diagram', standalone:false});
    return `<span class="geometry-diagram">${svg}</span>`;
  }
  if (src?.startsWith('/') && !src.startsWith('//')) tokens[index].attrSet('src', (env.absoluteOrigin || '') + sitePath(src, env));
  return defaultImage(tokens, index, options, env, renderer);
};

export const markdownTokens = body => md.parse(body, {});

export function renderMarkdown(body, options = {}) {
  // The IDs and label grammar cannot introduce HTML or Markdown destinations.
  const source = String(body).replace(/\[\[([a-zA-Z0-9-]{1,80})\|([^\]\n]+)\]\]/g, (_, id, label) => `[${label.replace(/[\[\]\\]/g, '\\$&')}](/p/${id})`);
  return md.render(source, {...options,diagramIndex:0});
}

export function excerpt(body, length = 90) {
  return String(body).replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1').replace(/!?\[([^\]]*)\]\([^)]+\)/g, '$1').replace(/[#*`$\[\]]/g, '').split('\n').find(line => line.trim())?.trim().slice(0, length) || 'Photo or audio note';
}
