// Meta Model API proxy: SAM 3.1 segmentation. Docs: https://dev.meta.ai/docs/media-segmentation
// POST https://api.meta.ai/v1/responses  model "sam-3.1"  Bearer $MODEL_API_KEY (or META_MODEL_API_KEY)
// Returns JSON { count, boxes: [{x1,y1,x2,y2}] } with box coords on a 0-1000 scale.
export async function callSam({ prompt, imageUrl, imageDataUrl }, key) {
  const t0 = Date.now()
  const r = await fetch('https://api.meta.ai/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ model: 'sam-3.1', stream: true, input: [{ type: 'message', role: 'user', content: [
      { type: 'input_text', text: String(prompt) }, { type: 'input_image', image_url: imageUrl || imageDataUrl }] }] }),
  })
  if (!r.ok) throw new Error(`Meta API ${r.status}: ${(await r.text()).slice(0, 400)}`)
  let buf = ''; const dec = new TextDecoder()
  for await (const c of r.body) buf += dec.decode(c, { stream: true })
  let text = ''
  for (const line of buf.split('\n')) if (line.startsWith('data:')) { try { const j = JSON.parse(line.slice(5)); if (j.type === 'response.output_text.done') text = j.text || text } catch {} }
  const boxes = [...text.matchAll(/box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+)/g)].map(m => ({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] }))
  return { count: boxes.length, boxes, ms: Date.now() - t0 }
}
export function getKey(env = process.env) { return [env.META_MODEL_API_KEY, env.MODEL_API_KEY].find(k => k && k.length >= 30) }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const key = getKey(); if (!key) return res.status(501).json({ error: 'MODEL_API_KEY not configured', fallback: true })
  if ((req.body || {}).action === 'ping') return res.status(200).json({ configured: true })
  try { return res.status(200).json(await callSam(req.body || {}, key)) }
  catch (e) { return res.status(502).json({ error: String(e.message || e), fallback: true }) }
}
