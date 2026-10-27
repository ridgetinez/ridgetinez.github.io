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
