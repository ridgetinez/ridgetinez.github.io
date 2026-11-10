import { escapeHTML as e } from './markdown.js';
import { renderDayFlower } from './day-flower.js';

const cloud = '<path class="sky-cloud" d="M4 9H3V7h2V5h3V3h5v2h3v2h2v4H4z"/>';
const sky = {
  sun: '<path class="sky-sun" d="M8 4h4v2h2v4h-2v2H8v-2H6V6h2zM9 0h2v2H9zm0 14h2v2H9zM2 7h2v2H2zm14 0h2v2h-2zM4 2h2v2H4zm10 0h2v2h-2zM4 12h2v2H4zm10 0h2v2h-2z"/>',
  mixed: '<path class="sky-sun" d="M6 0h2v2H6zM2 3h2v2H2zm4 0h4v2h2v4H5V5h1z"/>' + cloud,
  cloud,
  fog: cloud + '<path class="sky-water" d="M2 12h12v1H2zm4 3h12v1H6z"/>',
  rain: cloud + '<path class="sky-water" d="M5 12h2v2H5zm4 2h2v2H9zm4-2h2v2h-2z"/>',
  snow: cloud + '<path class="sky-cloud" d="M4 13h2v2H4zm6 1h2v2h-2zm5-2h2v2h-2z"/>',
  storm: cloud + '<path class="sky-sun" d="M10 9h4l-2 3h2l-5 4 1-4H8z"/>',
};

const conditions = {
  sunny:['sun', 'Sunny'], mixed:['mixed', 'Partly cloudy'], cloudy:['cloud', 'Cloudy'],
  fog:['fog', 'Fog'], drizzle:['rain', 'Drizzle'], rain:['rain', 'Rain'],
  showers:['rain', 'Showers'], snow:['snow', 'Snow'], storm:['storm', 'Thunderstorms'],
};

const windMark = `<svg class="day-sky" width="15" height="12" viewBox="0 0 15 12" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
  <path class="sky-cloud" d="M0 4h9V2h1v3H0zm3 3h10V5h1v3H3zm-2 3h7v1H1z"/>
</svg>`;

function renderWeather(weather) {
  if (!weather) return '';
  const { low, high, gust, morning, afternoon } = weather;
  const temperatures = Number.isFinite(low) && Number.isFinite(high)
    ? `<span class="day-stat" title="Temperature range across station readings">${low === high ? Math.round(low) : `${Math.round(low)}–${Math.round(high)}`}°C</span>` : '';
  const am = conditions[morning], pm = conditions[afternoon];
  let condition = '';
  if (am || pm) {
    const changes = am && pm && morning !== afternoon;
    const [icon, label] = am || pm;
    const graphic = changes && icon === 'cloud' && pm[0] === 'sun' ? 'mixed' : icon;
    const description = changes ? `${label} → ${pm[1].toLowerCase()}` : label + (am && pm ? '' : am ? ' AM' : ' PM');
    condition = `<span class="day-stat" title="Observed daytime conditions, 6 am to 7 pm"><svg class="day-sky" width="20" height="16" viewBox="0 0 20 16" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${sky[graphic]}</svg>${description}</span>`;
  }
  const wind = gust >= 60 ? `<span class="day-stat day-gust" title="Peak observed wind gust">${windMark}<span class="day-visually-hidden">Gusts </span>${Math.round(gust)} km/h</span>` : '';
  if (!temperatures && !condition && !wind) return '';
  return `<span class="day-weather"><a class="day-place" href="https://mesonet.agron.iastate.edu/sites/site.php?network=AU__ASOS&amp;station=YSSY" title="Sydney Airport observations via Iowa Environmental Mesonet">Sydney Airport</a>${condition}${temperatures}${wind}</span>`;
}

export function renderDayHeading(day, date, weather, mood) {
  const details = renderWeather(weather) +
    (mood ? `<span class="day-mood"><span class="day-visually-hidden">Mood: </span>${e(mood)}</span>` : '');
  return `<header class="day-header"><h2 class="day-heading">${renderDayFlower(day)}<time datetime="${e(day)}">${e(date)}</time></h2>${details ? `<div class="day-context">${details}</div>` : ''}</header>`;
}
