import { dayKey } from './calendar.js';

export const weatherTimezone = 'Australia/Sydney';

const station = 'YSSY';
const columns = ['tmpc','gust','wxcodes','skyc1','skyc2','skyc3','skyc4'];
const cover = { CLR:0, SKC:0, NSC:0, NCD:0, FEW:0, SCT:1, BKN:2, OVC:2, VV:2 };

function skyDuring(samples) {
  const phenomena = samples.flatMap(sample => sample.codes)
    .filter(code => !/^(VC|RE)/.test(code));
  for (const [pattern, condition] of [
    [/TS/, 'storm'], [/SN/, 'snow'], [/SHRA/, 'showers'], [/RA/, 'rain'], [/DZ/, 'drizzle'], [/FG/, 'fog'],
  ]) {
    if (phenomena.some(code => pattern.test(code))) return condition;
  }
  const counts = [0, 0, 0];
  for (const sample of samples) {
    if (sample.cover >= 0) counts[sample.cover]++;
  }
  const most = Math.max(...counts);
  return most ? ['sunny','mixed','cloudy'][counts.lastIndexOf(most)] : undefined;
}

function summarize(samples) {
  const temperatures = samples.map(sample => sample.temperature).filter(Number.isFinite);
  const gusts = samples.map(sample => sample.gust).filter(Number.isFinite);
  return {
    morning: skyDuring(samples.filter(sample => sample.hour >= 6 && sample.hour < 12)),
    afternoon: skyDuring(samples.filter(sample => sample.hour >= 12 && sample.hour < 19)),
    low: temperatures.length ? Math.min(...temperatures) : undefined,
    high: temperatures.length ? Math.max(...temperatures) : undefined,
    gust: gusts.length ? Math.max(...gusts) * 1.852 : undefined,
  };
}

export async function loadSydneyWeather(days, { now = new Date(), request = fetch } = {}) {
  const today = dayKey(now, weatherTimezone);
  const requested = days.filter(day => day <= today).sort();
  if (!requested.length) return new Map();
  const end = new Date(Date.parse(requested.at(-1) + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
  const [year1, month1, day1] = requested[0].split('-');
  const [year2, month2, day2] = end.split('-');
  const url = new URL('https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py');
  url.search = new URLSearchParams({
    station, year1, month1, day1, year2, month2, day2, tz:weatherTimezone,
    format:'onlycomma', latlon:'no', elev:'no', missing:'empty', trace:'empty',
  });
  for (const field of columns) url.searchParams.append('data', field);
  for (const type of ['3','4']) url.searchParams.append('report_type', type);

  try {
    const response = await request(url, { signal:AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const [header, ...rows] = (await response.text()).trim().split(/\r?\n/);
    if (header !== ['station','valid',...columns].join(',')) throw new Error('Unexpected METAR columns');
    const byDay = new Map(requested.map(day => [day, []]));
    for (const row of rows) {
      const [id, valid, temperature, gust, codes, ...layers] = row.split(',');
      if (id !== station || !valid || codes === undefined) continue;
      const samples = byDay.get(valid.slice(0, 10));
      if (!samples) continue;
      samples.push({
        hour:Number(valid.slice(11, 13)),
        temperature:temperature === '' ? undefined : Number(temperature),
        gust:gust === '' ? undefined : Number(gust),
        codes:codes.match(/[+-]?[A-Z]+/g) || [],
        cover:Math.max(...layers.map(layer => cover[layer] ?? -1)),
      });
    }
    return new Map([...byDay].filter(([, samples]) => samples.length)
      .map(([day, samples]) => [day, summarize(samples)]));
  } catch (error) {
    console.warn(`Sydney Airport observations unavailable: ${error.message}`);
    return new Map();
  }
}
