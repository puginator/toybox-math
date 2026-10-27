// Regression loop for "stuffy cutout not visible": live SAM -> mask decode -> alpha coverage.
// Run: node scripts/cutout-test.mjs   (uses .env.local key, prints no secret)
import { readFileSync, existsSync } from 'fs'
for (const f of ['.env.local', '.env']) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim() }
process.env.META_MODEL_API_KEY = [process.env.META_MODEL_API_KEY, process.env.MODEL_API_KEY].find(k => k && k.length >= 30)
const { callSam, getKey } = await import('../lib/meta.mjs')
const r = await callSam({ prompt: 'cat', imageUrl: 'https://cdn.britannica.com/39/7139-050-A88818BB/Himalayan-chocolate-point.jpg' }, getKey(process.env))
console.log('count', r.count, 'boxes', JSON.stringify(r.boxes))
if (!r.masks?.length) { console.error('FAIL: no mask returned - cutout would be a rectangular crop'); process.exit(1) }
const m = r.masks[0]; const bytes = Buffer.from(m.rasterB64, 'base64')
const ones = bytes.reduce((a, b) => a + b, 0)
console.log('mask', m.width + 'x' + m.height, 'coverage', (ones / bytes.length * 100).toFixed(1) + '%')
if (ones === 0 || ones === bytes.length) { console.error('FAIL: mask is empty/full - no cutout possible'); process.exit(1) }
console.log('PASS: transparent cutout possible')
