const config = JSON.parse(document.getElementById('page-config').textContent);
const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

for (const note of document.querySelectorAll('.voice-note')) {
  const audio = note.querySelector('audio'), player = note.querySelector('.audio-player');
  const button = player.querySelector('.audio-play'), seek = player.querySelector('.audio-seek'), time = player.querySelector('.audio-clock');
  player.hidden = false; audio.controls = false;
  const update = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    seek.value = duration ? audio.currentTime / duration * 1000 : 0;
    time.textContent = `${clock(audio.currentTime)} / ${duration ? clock(duration) : '—'}`;
  };
  button.addEventListener('click', async () => {
    if (!audio.paused) return audio.pause();
    document.querySelectorAll('.voice-note audio').forEach(other => { if (other !== audio) other.pause(); });
    try { await audio.play(); } catch { time.textContent = 'Cannot play'; }
  });
  audio.addEventListener('play', () => { button.textContent = 'Ⅱ'; button.setAttribute('aria-label', 'Pause audio'); });
  audio.addEventListener('pause', () => { button.textContent = '▶'; button.setAttribute('aria-label', 'Play audio'); });
  audio.addEventListener('loadedmetadata', update); audio.addEventListener('timeupdate', update);
  seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = seek.value / 1000 * audio.duration; });
  update();
}

if (config.editor) setupEditor();

function setupEditor() {
  const form = document.getElementById('composer');
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  const status = document.getElementById('compose-status');
  const body = document.getElementById('body');
  const draftContainer = document.getElementById('attachments');
  const publish = document.getElementById('publish');
  const cancel = document.getElementById('cancel-edit');
  const preview = document.getElementById('preview');
  const previewButton = document.getElementById('preview-button');
  const recordButton = document.getElementById('record');
  let editing = null, drafts = [], removed = [], recording = null, stream = null, discardRecording = false, initialDateValue = '';
  const message = (text, error = false) => { if (!status) return; status.textContent = text; status.dataset.error = String(error); status.setAttribute('role', error ? 'alert' : 'status'); };

  async function request(url, options = {}) {
    const response = await fetch(url, { ...options, headers:{ 'X-CSRF-Token':csrf, ...options.headers } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The request failed.');
    return result;
  }
  function localDate(iso) {
    const date = new Date(iso); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  }
  function clear() {
    if (recording?.state === 'recording') { discardRecording = true; recording.stop(); }
    drafts.forEach(draft => { if (draft.file) URL.revokeObjectURL(draft.url); });
    drafts = []; removed = []; editing = null; initialDateValue = ''; form.reset();
    publish.textContent = 'Post'; cancel.hidden = true; preview.hidden = true; previewButton.setAttribute('aria-expanded','false');
    renderDrafts(); message('');
  }
  function renderDrafts() {
    draftContainer.replaceChildren();
    for (const draft of drafts) {
      const card = document.createElement('div'); card.className = 'attachment-draft';
      const media = document.createElement(draft.kind === 'image' ? 'img' : 'audio'); media.src = draft.url;
      if (draft.kind === 'image') media.alt = draft.alt || 'Photo preview'; else media.controls = true;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-attachment'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove ${draft.kind}`);
      remove.addEventListener('click', () => {
        if (draft.file) URL.revokeObjectURL(draft.url); else removed.push(draft.id);
        drafts = drafts.filter(other => other !== draft); renderDrafts();
      });
      const label = document.createElement('label'); label.className = 'attachment-field';
      label.append(document.createTextNode(draft.kind === 'image' ? 'Alt text' : 'Transcript'));
      const input = document.createElement(draft.kind === 'image' ? 'input' : 'textarea');
      input.value = draft.kind === 'image' ? draft.alt || '' : draft.transcript || '';
      input.maxLength = draft.kind === 'image' ? 1000 : 30000;
      input.addEventListener('input', () => { draft[draft.kind === 'image' ? 'alt' : 'transcript'] = input.value; });
      label.append(input); card.append(media, remove, label); draftContainer.append(card);
    }
  }
  function addFiles(files, kind) {
    for (const file of files) {
      if (drafts.length >= 6) { message('Up to six attachments per entry.', true); break; }
      if (file.size > 15 * 1024 * 1024) { message(`${file.name} is larger than 15 MB.`, true); continue; }
      drafts.push({ id:crypto.randomUUID(), file, kind, url:URL.createObjectURL(file), alt:'', transcript:'' });
    }
    renderDrafts();
  }
  for (const [id, kind] of [['photo-input','image'],['audio-input','audio']]) {
    document.getElementById(id)?.addEventListener('change', event => { addFiles(event.target.files, kind); event.target.value = ''; });
  }
  previewButton?.addEventListener('click', async () => {
    if (!preview.hidden) { preview.hidden = true; previewButton.setAttribute('aria-expanded','false'); return; }
    try {
      const result = await request('/api/preview', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ body:body.value }) });
      preview.innerHTML = result.html; preview.hidden = false; previewButton.setAttribute('aria-expanded','true');
    } catch (error) { message(error.message, true); }
  });
  cancel?.addEventListener('click', clear);
  form?.addEventListener('submit', async event => {
    event.preventDefault(); publish.disabled = true; message('Saving…');
    const data = new FormData(), attachmentMeta = {};
    for (const [index, draft] of drafts.entries()) {
      const key = draft.file ? `file_${index}` : draft.id;
      attachmentMeta[key] = { alt:draft.alt, transcript:draft.transcript };
      if (draft.file) data.append(key, draft.file, draft.file.name);
    }
    const dateValue = form.elements.createdAt.value;
    const createdAt = dateValue && dateValue !== initialDateValue ? new Date(dateValue).toISOString() : editing?.created_at;
    data.append('post', JSON.stringify({ body:body.value, tags:form.elements.tags.value, createdAt, attachmentMeta, removeAttachments:removed }));
    try { await request(editing ? `/api/posts/${editing.id}` : '/api/posts', { method:'POST', body:data }); window.location.assign('/'); }
    catch (error) { message(error.message, true); publish.disabled = false; }
  });
  body?.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); if (!publish.disabled) form.requestSubmit(); } });

  document.getElementById('entries').addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]'); if (!button) return;
    const article = button.closest('.entry'); const post = JSON.parse(article.querySelector('.post-data').textContent);
    if (button.dataset.action === 'edit') {
      clear(); editing = post; body.value = post.body; form.elements.tags.value = post.tags.join(', ');
      initialDateValue = localDate(post.created_at); form.elements.createdAt.value = initialDateValue;
      drafts = post.attachments.map(attachment => ({...attachment, url:`/media/${attachment.id}`}));
      renderDrafts(); publish.textContent = 'Save'; cancel.hidden = false;
      form.scrollIntoView({ behavior:matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth', block:'start' }); body.focus({ preventScroll:true });
    } else if (button.dataset.action === 'reference') {
      if (!form) return;
      const label = (post.body.split('\n').find(line => line.trim()) || 'Earlier entry').replace(/^#+\s*/, '').replace(/[\[\]|]/g, '').slice(0,65);
      body.setRangeText(`[[${post.id}|${label}]]`, body.selectionStart, body.selectionEnd, 'end'); body.focus();
    } else {
      button.disabled = true;
      try { await request(`/api/posts/${post.id}/archive`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ archived:button.dataset.action === 'archive' }) }); window.location.reload(); }
      catch (error) { button.disabled = false; window.alert(error.message); }
    }
  });

  recordButton?.addEventListener('click', async () => {
    if (recording?.state === 'recording') { recording.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return message('Audio recording needs a supported browser on HTTPS or localhost.', true);
    if (drafts.length >= 6) return message('Up to six attachments per entry.', true);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mimeType = ['audio/webm;codecs=opus','audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      recording = new MediaRecorder(stream, mimeType ? { mimeType } : {}); const chunks = []; let recordedSize = 0; discardRecording = false;
      recording.ondataavailable = event => { chunks.push(event.data); recordedSize += event.data.size; if (recordedSize > 14 * 1024 * 1024 && recording.state === 'recording') recording.stop(); };
      recording.onstop = () => {
        stream.getTracks().forEach(track => track.stop()); recordButton.textContent = 'Record'; publish.disabled = false;
        if (!discardRecording && chunks.length) {
          const type = recording.mimeType, extension = type.includes('mp4') ? 'm4a' : 'webm';
          addFiles([new File(chunks, `voice-note.${extension}`, {type})], 'audio');
        }
      };
      recording.start(1000); recordButton.textContent = 'Stop recording'; publish.disabled = true; message('');
    } catch { stream?.getTracks().forEach(track => track.stop()); message('Microphone access was not available.', true); }
  });
}
