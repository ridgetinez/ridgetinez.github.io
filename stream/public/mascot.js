// Quiet idle gestures, with an unexpectedly deadpan knife reveal on hover.
// The drawing rests between gestures and never needs an animation loop.
const mascot = document.querySelector('.signature-mascot');
if (mascot) {
  const home = mascot.closest('.signature');
  const knife = mascot.querySelector('.otori-knife');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let timer, animations = [], sequence = 0, inView = false, hovered = false, focused = false;
  const engaged = () => hovered || focused;
  const visible = () => !document.hidden && inView;
  const canIdle = () => visible() && !motion.matches && !engaged();
  const rest = () => {
    clearTimeout(timer);
    sequence++;
    animations.forEach(animation => animation.cancel());
    animations = [];
    delete mascot.dataset.motion;
  };
  const schedule = (delay = 30000 + Math.random()*14000) => {
    clearTimeout(timer);
    if (canIdle()) timer = setTimeout(playIdle,delay);
  };
  const frames = points => points.map(([offset,transform]) => ({offset,transform}));
  const animate = (part,keyframes,duration) => {
    const element = mascot.querySelector(`.otori-${part}`);
    animations.push(element.animate(keyframes,{duration,easing:'cubic-bezier(.4,0,.2,1)'}));
  };
  const finish = callback => {
    const current = sequence;
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (current !== sequence) return;
      animations = [];
      callback();
    }).catch(() => {}); // Hover, blur and visibility changes can cancel a gesture.
  };

  function playIdle() {
    if (!canIdle()) return;
    rest();
    mascot.dataset.motion = 'idle';
    animate('body',frames([
      [0,'none'],[.15,'translateY(.4px) scale(1.025,.98)'],
      [.34,'translateY(-.2px) rotate(-3deg)'],[.6,'rotate(3deg)'],
      [.8,'translateY(.2px) rotate(-.8deg)'],[1,'none']
    ]),2400);
    animate('eyes',frames([
      [0,'scaleY(1)'],[.12,'scaleY(1)'],[.16,'scaleY(.08)'],[.21,'scaleY(1)'],
      [.65,'scaleY(1)'],[.7,'scaleY(.08)'],[.76,'scaleY(1)'],[1,'scaleY(1)']
    ]),2400);
    animate('leaf',frames([
      [0,'none'],[.2,'rotate(5deg)'],[.36,'translateY(-.35px) rotate(-7deg)'],
      [.53,'rotate(5deg)'],[.7,'rotate(-4deg)'],[.86,'rotate(2deg)'],[1,'none']
    ]),2400);
    finish(() => {delete mascot.dataset.motion;schedule();});
  }

  function updateInteraction() {
    const armed = engaged() && visible();
    if (armed === mascot.hasAttribute('data-armed')) return;
    // Starting from the current pose keeps quick enter/leave gestures smooth.
    const pose = getComputedStyle(knife);
    const start = {opacity:pose.opacity,transform:pose.transform};
    rest();
    mascot.toggleAttribute('data-armed',armed);
    if (!visible() || motion.matches) {
      if (!armed) schedule();
      return;
    }
    mascot.dataset.motion = armed ? 'knife' : 'put-away';
    if (armed) {
      animate('knife',[
        start,
        {offset:.2,opacity:start.opacity,transform:'translate(2px,3px) rotate(16deg)'},
        {offset:.24,opacity:1,transform:'translate(1px,2px) rotate(10deg)'},
        {offset:.66,opacity:1,transform:'translate(-.2px,-.4px) rotate(-4deg)'},
        {offset:1,opacity:1,transform:'none'}
      ],700);
      animate('wing-left',frames([[0,'none'],[.25,'translateX(.5px) rotate(-18deg)'],[.7,'rotate(6deg)'],[1,'none']]),700);
      animate('leaf',frames([[0,'none'],[.35,'rotate(-4deg)'],[.68,'rotate(2deg)'],[1,'none']]),700);
    } else {
      animate('knife',[start,{offset:.8,opacity:start.opacity,transform:'translate(3px,3px) rotate(20deg)'},
        {offset:1,opacity:0,transform:'translate(4px,4px) rotate(24deg)'}],260);
    }
    finish(() => {
      if (!mascot.hasAttribute('data-armed')) {delete mascot.dataset.motion;schedule();}
    });
  }

  mascot.addEventListener('pointerenter',event => {
    if (event.pointerType === 'touch') return;
    hovered = true; updateInteraction();
  });
  mascot.addEventListener('pointerleave',() => {hovered = false;updateInteraction();});
  home.addEventListener('focus',() => {focused = true;updateInteraction();});
  home.addEventListener('blur',() => {focused = false;updateInteraction();});
  const resume = () => {
    rest();
    mascot.removeAttribute('data-armed');
    if (engaged()) updateInteraction();
    else schedule(12000);
  };
  motion.addEventListener('change',resume);
  document.addEventListener('visibilitychange',resume);
  window.addEventListener('pagehide',() => {rest();mascot.removeAttribute('data-armed');});
  window.addEventListener('pageshow',resume);
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    resume();
  }).observe(mascot);
}
