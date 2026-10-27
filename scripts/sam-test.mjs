// Step 2 spike: node scripts/sam-test.mjs [prompt] [imageUrl]
// Reads MODEL_API_KEY from .env (never prints it). Reports latency + raw stream head.
import { readFileSync, existsSync } from 'fs'
for (const f of ['.env.local', '.env']) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim() }
const key = [process.env.META_MODEL_API_KEY, process.env.MODEL_API_KEY].find(k => k && k.length >= 30)
if (!key) { console.error('NO KEY: add MODEL_API_KEY=... to .env (from dev.meta.ai)'); process.exit(2) }
console.log('key present, length', key.length)
const prompt = process.argv[2] || 'teddy bear'
const imageUrl = process.argv[3] || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=640'
const t0 = Date.now()
const r = await fetch('https://api.meta.ai/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify({ model: 'sam-3.1', stream: true, input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: prompt }, { type: 'input_image', image_url: imageUrl }] }] }) })
console.log('status', r.status, 'latency_ms', Date.now() - t0)
const text = await r.text()
console.log('total_ms', Date.now() - t0, 'bytes', text.length)
console.log(text.slice(0, 1200))
