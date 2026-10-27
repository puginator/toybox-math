// Vercel adapter. Core logic: ../lib/meta.mjs - Docs: https://dev.meta.ai/docs/media-segmentation
import { callSam, getKey } from '../lib/meta.mjs'
export { callSam, getKey }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const key = getKey(process.env); if (!key) return res.status(501).json({ error: 'MODEL_API_KEY not configured', fallback: true })
  if ((req.body || {}).action === 'ping') return res.status(200).json({ configured: true })
  try { return res.status(200).json(await callSam(req.body || {}, key)) } catch (e) { return res.status(502).json({ error: String(e.message || e), fallback: true }) }
}
