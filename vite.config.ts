import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
// Dev-only: serve /api/sam like the serverless function, reading .env.local/.env
function samDevPlugin() {
  return { name: 'sam-dev', configureServer(server: any) {
    server.middlewares.use('/api/sam', async (req: any, res: any) => {
      if (req.method !== 'POST') { res.statusCode = 405; return res.end('{}') }
      for (const f of ['.env.local', '.env']) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim() }
      const key = [process.env.META_MODEL_API_KEY, process.env.MODEL_API_KEY].find(k => k && k.length >= 30)
      res.setHeader('content-type', 'application/json')
      if (!key) { res.statusCode = 501; return res.end(JSON.stringify({ error: 'no key', fallback: true })) }
      let body = ''; req.on('data', (c: any) => body += c); req.on('end', async () => {
        try { const parsed = JSON.parse(body || '{}'); if (parsed.action === 'ping') return res.end(JSON.stringify({ configured: true }))
        // @ts-ignore - plain JS serverless module
        const { callSam } = await import('./api/sam.js' as string); res.end(JSON.stringify(await callSam(parsed, key))) }
        catch (e: any) { res.statusCode = 502; res.end(JSON.stringify({ error: String(e.message || e), fallback: true })) }
      })
    })
  } }
}
function storyDevPlugin() {
  return { name: 'story-dev', configureServer(server: any) {
    server.middlewares.use('/api/story', async (req: any, res: any) => {
      if (req.method !== 'POST') { res.statusCode = 405; return res.end('{}') }
      for (const f of ['.env.local', '.env']) if (existsSync(f)) for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim() }
      const key = [process.env.META_MODEL_API_KEY, process.env.MODEL_API_KEY].find(k => k && k.length >= 30)
      res.setHeader('content-type', 'application/json')
      if (!key) { res.statusCode = 501; return res.end(JSON.stringify({ error: 'no key', fallback: true })) }
      let body = ''; req.on('data', (c: any) => body += c); req.on('end', async () => {
        try { // @ts-ignore - plain JS serverless module
          const { callStory, callDoors } = await import('./api/story.js' as string); const parsed2 = JSON.parse(body || '{}'); res.end(JSON.stringify(parsed2.doors ? await callDoors(parsed2, key) : await callStory(parsed2, key))) }
        catch (e: any) { res.statusCode = 502; res.end(JSON.stringify({ error: String(e.message || e), fallback: true })) }
      })
    })
  } }
}
export default defineConfig({ plugins: [react(), samDevPlugin(), storyDevPlugin()] })
