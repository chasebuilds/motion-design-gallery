// Loads the gallery in a real browser, checks every demo runs without errors,
// and measures frame pacing while the heaviest piece (canvas particles) runs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  const file = path.join(root, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'text/plain' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto(base);
await page.waitForSelector('.card');
const cards = await page.locator('.card').count();
if (cards !== 11) errors.push(`expected 11 cards, got ${cards}`);

// Scroll through so every lazy demo frame loads, and watch for errors in each.
for (let y = 0; y < 4000; y += 500) { await page.mouse.wheel(0, 500); await page.waitForTimeout(150); }
await page.waitForTimeout(800);
const frames = page.frames().filter((f) => f !== page.mainFrame());
if (frames.length !== 11) errors.push(`expected 11 demo frames, got ${frames.length}`);

// Frame pacing on the particle piece, standalone.
const demo = await browser.newPage({ viewport: { width: 700, height: 300 } });
demo.on('pageerror', (e) => errors.push(`particle pageerror: ${e.message}`));
await demo.goto(`${base}/pieces/particle-header.html`);
await demo.waitForTimeout(500);
const fps = await demo.evaluate(() => new Promise((resolve) => {
  const times = [];
  function tick(t) {
    times.push(t);
    if (times.length < 181) requestAnimationFrame(tick);
    else {
      const gaps = times.slice(1).map((v, i) => v - times[i]).sort((a, b) => a - b);
      resolve({ avg: 1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length), worstMs: gaps[gaps.length - 1] });
    }
  }
  requestAnimationFrame(tick);
}));
console.log(`particle-header: ${fps.avg.toFixed(1)} fps average, worst frame ${fps.worstMs.toFixed(1)} ms`);
if (fps.avg < 30) errors.push(`particle-header averaged ${fps.avg.toFixed(1)} fps`);

// Reduced motion: the particle piece must not schedule frames.
const calm = await browser.newPage({ reducedMotion: 'reduce' });
await calm.goto(`${base}/pieces/hero-text-reveal.html`);
const opacity = await calm.evaluate(() => getComputedStyle(document.querySelector('.sub')).opacity);
if (opacity !== '1') errors.push(`reduced motion: subtitle opacity ${opacity}`);

if (process.env.SHOTS) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(root, 'docs', 'gallery.png') });
  await page.locator('#hero-text-reveal').scrollIntoViewIfNeeded();
}

await browser.close();
server.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`ok: ${cards} cards, ${frames.length} demo frames, no errors`);
