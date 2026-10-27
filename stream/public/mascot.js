// A small, hand-animated greeting. The drawing rests between gestures;
// no animation loop or timer runs while it is offscreen or motion is reduced.
const mascot = document.querySelector('.signature-mascot');
if (mascot) {
  const home = mascot.closest('.signature');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let timer, animations = [], sequence = 0, inView = false, greeting = false;
  const canMove = () => !motion.matches && !document.hidden && inView;
  const rest = () => {
    clearTimeout(timer);
    sequence++;
    animations.forEach(animation => animation.cancel());
    animations = []; greeting = false;
    delete mascot.dataset.motion;
  };
  const schedule = (delay = 30000 + Math.random()*14000) => {
    clearTimeout(timer);
    if (canMove()) timer = setTimeout(() => play('idle'),delay);
  };

  function play(kind) {
    if (!canMove() || (kind === 'hello' && greeting)) return;
    rest();
    const current = sequence;
    greeting = kind === 'hello';
    mascot.dataset.motion = kind;
    const duration = greeting ? 1800 : 2400;
    const animate = (part,frames) => {
      const element = mascot.querySelector(`.otori-${part}`);
      animations.push(element.animate(frames,{duration,easing:'cubic-bezier(.4,0,.2,1)'}));
    };
    const frames = points => points.map(([offset,transform]) => ({offset,transform}));
    animate('body',frames(greeting ? [
      [0,'none'],[.12,'translateY(.5px) scale(1.06,.94)'],
      [.3,'translate(-.7px,-.7px) rotate(-8deg) scale(.98,1.02)'],
      [.48,'translate(.8px,-.4px) rotate(7deg)'],
      [.65,'translate(-.5px,-.2px) rotate(-5deg)'],
      [.82,'translateY(.3px) rotate(1deg) scale(1.03,.98)'],[1,'none']
    ] : [
      [0,'none'],[.15,'translateY(.4px) scale(1.025,.98)'],
      [.34,'translateY(-.2px) rotate(-3deg)'],[.6,'rotate(3deg)'],
      [.8,'translateY(.2px) rotate(-.8deg)'],[1,'none']
    ]));
    animate('eyes',frames([
      [0,'scaleY(1)'],[.12,'scaleY(1)'],[.16,'scaleY(.08)'],[.21,'scaleY(1)'],
      [.65,'scaleY(1)'],[.7,'scaleY(.08)'],[.76,'scaleY(1)'],[1,'scaleY(1)']
    ]));
    animate('leaf',frames([
      [0,'none'],[.2,'rotate(5deg)'],[.36,`translateY(-.35px) rotate(${greeting ? -12 : -7}deg)`],
      [.53,`rotate(${greeting ? 9 : 5}deg)`],[.7,'rotate(-4deg)'],[.86,'rotate(2deg)'],[1,'none']
    ]));
    if (greeting) {
      animate('foot-left',frames([[0,'none'],[.3,'none'],[.42,'translate(.3px,-.8px) rotate(10deg)'],[.53,'none'],[.68,'translateY(-.4px)'],[.8,'none'],[1,'none']]));
      animate('foot-right',frames([[0,'none'],[.17,'none'],[.28,'translate(-.3px,-.8px) rotate(-10deg)'],[.4,'none'],[.55,'translateY(-.5px)'],[.68,'none'],[1,'none']]));
    }
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (current !== sequence) return;
      animations = []; greeting = false;
      delete mascot.dataset.motion;
      schedule();
    }).catch(() => {}); // Cancellation is expected on hover or visibility changes.
  }

  mascot.addEventListener('pointerenter',event => {
    if (event.pointerType !== 'touch') play('hello');
  });
  home.addEventListener('focus',() => play('hello'));
  const resume = () => { rest(); schedule(12000); };
  motion.addEventListener('change',resume);
  document.addEventListener('visibilitychange',resume);
  window.addEventListener('pagehide',rest);
  window.addEventListener('pageshow',resume);
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    resume();
  }).observe(mascot);
}
