// Only the demo's study loads this. The actual stream always ends with its
// authored posts; the decorative garden cannot extend a reader's document.
const tail = document.getElementById('garden-study-tail');
const sentinel = document.getElementById('garden-study-end');
let length = 3200;
const observer = new IntersectionObserver(entries => {
  if (!entries.some(entry => entry.isIntersecting)) return;
  length += 2400;
  tail.style.height = `${length}px`;
}, {rootMargin:'1600px'});
observer.observe(sentinel);
