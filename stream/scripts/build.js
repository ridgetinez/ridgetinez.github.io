import { buildSite } from '../src/static.js';
import { projectRoot } from '../src/config.js';
import { loadSydneyWeather, weatherTimezone } from '../src/weather.js';
import path from 'node:path';

try {
  const timezone = process.env.BLOG_TIMEZONE || weatherTimezone;
  const result = await buildSite({
    siteURL:process.env.SITE_URL,
    timezone,
    archiveDir:path.join(projectRoot,'legacy-public'),
    loadWeather:timezone === weatherTimezone ? loadSydneyWeather : undefined,
  });
  console.log(`Built ${result.posts} entries in dist/ for ${result.config.publicOrigin}/`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
