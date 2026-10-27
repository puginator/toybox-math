// Vercel adapter. Core logic: ../lib/meta.mjs
import { callStory, callDoors, getKey } from '../lib/meta.mjs'
export { callStory, callDoors }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const key = getKey(process.env); if (!key) return res.status(501).json({ error: 'MODEL_API_KEY not configured', fallback: true })
  try { const body = req.body || {}; if (body.doors) return res.status(200).json(await callDoors(body, key)); return res.status(200).json(await callStory(body, key)) } catch (e) { return res.status(502).json({ error: String(e.message || e), fallback: true }) }
}
