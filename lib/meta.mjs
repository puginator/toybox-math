// Shared Meta Model API core (SAM 3.1 + Muse Spark). Used by Vercel api/ and Cloudflare functions/.
import { decodeMaskToRaster } from '@meta-sam/parser'
function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(s) }
export function getKey(env = {}) { return [env.META_MODEL_API_KEY, env.MODEL_API_KEY].find(k => k && k.length >= 30) }
export async function callSam({ prompt, imageUrl, imageDataUrl }, key) {
  const t0 = Date.now()
  const r = await fetch('https://api.meta.ai/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ model: 'sam-3.1', stream: true, input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: String(prompt) }, { type: 'input_image', image_url: imageUrl || imageDataUrl }] }] }) })
  if (!r.ok) throw new Error(`Meta API ${r.status}: ${(await r.text()).slice(0, 400)}`)
  let buf = ''; const dec = new TextDecoder()
  for await (const c of r.body) buf += dec.decode(c, { stream: true })
  let text = ''
  for (const line of buf.split('\n')) if (line.startsWith('data:')) { try { const j = JSON.parse(line.slice(5)); if (j.type === 'response.output_text.done') text = j.text || text } catch {} }
  const boxes = [...text.matchAll(/box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+)(?:;w=(\d+);h=(\d+))?/g)].map(m => ({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4], frameW: +(m[5] || 1000), frameH: +(m[6] || 1000) }))
  // Masks: decode each SAM raster server-side; client applies it as the alpha channel (true cutout).
  const masks = []
  for (const m of text.matchAll(/mask;x=0;y=0(?:;c=[\d.]+)?;data=(\d+),(\d+),([~!])([\s\S]*?)\|>/g)) {
    try { const raster = decodeMaskToRaster({ encoding: m[3] === '~' ? 'lossless' : 'one_bit', payload: m[3] + m[4], width: +m[2], height: +m[1] }); masks.push({ width: +m[2], height: +m[1], rasterB64: b64(raster) }) } catch {}
  }
  return { count: boxes.length, boxes, masks, ms: Date.now() - t0 }
}
export async function callStory({ name }, key) {
  const t0 = Date.now()
  const r = await fetch('https://api.meta.ai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'muse-spark-1.3', max_tokens: 2500, messages: [{ role: 'user', content: `Write a 2-sentence story opening for a kids math game (ages 5-8). The hero is a stuffed animal named ${name}, lost in Toybox Forest. Warm, read-aloud friendly. End by inviting the child to count and slice fruit to help ${name} get home. No questions except that invitation.` }] }) })
  if (!r.ok) throw new Error(`Meta API ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const j = await r.json(); const text = j.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Spark returned empty story')
  return { story: text, ms: Date.now() - t0, model: 'muse-spark-1.3' }
}

export async function callDoors({ name, doors }, key) {
  const t0 = Date.now()
  const prev = (doors?.previous || []).join(' then ')
  const r = await fetch('https://api.meta.ai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'muse-spark-1.3', max_tokens: 2500, messages: [{ role: 'user', content: `You write a read-aloud story for ages 5-8 about a stuffed animal named ${name} crossing a bedroom at night to reach a warm lamp.${prev ? ` So far the child chose: ${prev}. Continue from that.` : ''} This is chapter ${doors?.chapter || 1} of 3. Reply in EXACTLY this format with no extra text:
SCENE: <one or two warm sentences, present tense, starting mid-action (do not repeat the hero's name, the page will add it)>
A: <a short choice, 3-6 words, starting with a verb>
B: <a different short choice, 3-6 words, starting with a verb>` }] }) })
  if (!r.ok) throw new Error(`Meta API ${r.status}`)
  const j = await r.json(); const text = j.choices?.[0]?.message?.content || ''
  const scene = text.match(/SCENE:\s*(.+)/)?.[1]?.trim(); const a = text.match(/A:\s*(.+)/)?.[1]?.trim(); const b = text.match(/B:\s*(.+)/)?.[1]?.trim()
  if (!scene || !a || !b) throw new Error('Spark doors format unexpected')
  return { doors: { scene, a, b }, ms: Date.now() - t0, model: 'muse-spark-1.3' }
}
