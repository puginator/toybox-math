// Muse Spark story generation (Meta Model API). Session-start only, cached client-side.
// Model muse-spark-1.3: reasoning model, needs a generous max_tokens or content comes back empty.
export async function callStory({ name }, key) {
  const t0 = Date.now()
  const r = await fetch('https://api.meta.ai/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'muse-spark-1.3', max_tokens: 2500, messages: [{ role: 'user', content: `Write a 2-sentence story opening for a kids math game (ages 5-8). The hero is a stuffed animal named ${name}, lost in Toybox Forest. Warm, read-aloud friendly. End by inviting the child to count and slice fruit to help ${name} get home. No questions except that invitation.` }] }),
  })
  if (!r.ok) throw new Error(`Meta API ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const j = await r.json(); const text = j.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Spark returned empty story')
  return { story: text, ms: Date.now() - t0, model: 'muse-spark-1.3' }
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const key = [process.env.META_MODEL_API_KEY, process.env.MODEL_API_KEY].find(k => k && k.length >= 30)
  if (!key) return res.status(501).json({ error: 'MODEL_API_KEY not configured', fallback: true })
  try { return res.status(200).json(await callStory(req.body || {}, key)) } catch (e) { return res.status(502).json({ error: String(e.message || e), fallback: true }) }
}
