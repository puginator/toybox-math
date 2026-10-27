// Cloudflare Pages Function: POST /api/story
import { callStory, callDoors, getKey } from '../../lib/meta.mjs'
export async function onRequestPost({ request, env }) {
  const key = getKey(env); if (!key) return Response.json({ error: 'MODEL_API_KEY not configured', fallback: true }, { status: 501 })
  const body = await request.json().catch(() => ({}))
  try { if (body.doors) return Response.json(await callDoors(body, key)); return Response.json(await callStory(body, key)) } catch (e) { return Response.json({ error: String(e.message || e), fallback: true }, { status: 502 }) }
}
