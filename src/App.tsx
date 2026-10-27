import { useEffect, useMemo, useRef, useState } from 'react'

type Screen = 'home' | 'trail' | 'ratio' | 'ninja' | 'celebrate'
type Stuffy = { name: string; img: string | null; hat: boolean }
const FALLBACK_STORY = (n: string) => `${n} is lost in the Toybox Forest! Follow the trail, play the counting games, and help ${n} find the way home. Every game you finish earns a star.`

function speak(text: string) {
  try { const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch {}
}
function pop(freq = 520) {
  try { const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = freq; g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18); o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.2) } catch {}
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [stuffy, setStuffy] = useState<Stuffy>(() => { try { return JSON.parse(localStorage.getItem('toybox-stuffy') || 'null') || { name: 'Biscuit', img: null, hat: false } } catch { return { name: 'Biscuit', img: null, hat: false } } })
  const [stars, setStars] = useState(() => Number(localStorage.getItem('toybox-stars') || 0))
  const [samStatus, setSamStatus] = useState('Demo mode: SAM proxy not configured yet — fallbacks keep every game playable.')
  const name = stuffy.name || 'Biscuit'

  useEffect(() => { localStorage.setItem('toybox-stuffy', JSON.stringify(stuffy)) }, [stuffy])
  useEffect(() => { localStorage.setItem('toybox-stars', String(stars)) }, [stars])
  useEffect(() => { fetch('/api/sam', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'ping' }) }).then(r => { if (r.ok) setSamStatus('SAM 3.1 connected through the Meta Model API proxy.'); else setSamStatus('Demo mode: SAM proxy not configured yet — fallbacks keep every game playable.') }).catch(() => {}) }, [])

  const [story, setStory] = useState(() => localStorage.getItem('toybox-story') || '')
  useEffect(() => { if (screen !== 'trail' || story) return; fetch('/api/story', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }).then(r => r.json()).then(j => { if (j.story) { setStory(j.story); localStorage.setItem('toybox-story', j.story); speak(j.story) } }).catch(() => {}) }, [screen])
  const win = (game: string) => { setStars(s => s + 1); pop(760); speak(`You did it! ${name} is so proud of you!`); setScreen('celebrate'); if (game === 'ninja' && !stuffy.hat) setStuffy(s => ({ ...s, hat: true })) }

  const onUpload = async (f: File) => {
    setSamStatus('Looking at your stuffy...')
    // Downscale first: phone photos are multi-MB and slow/oversized for the API.
    const bmp = await createImageBitmap(f).catch(() => null)
    if (!bmp) { setSamStatus('That photo would not open - try another one.'); return }
    const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height))
    const c0 = document.createElement('canvas'); c0.width = Math.round(bmp.width * scale); c0.height = Math.round(bmp.height * scale)
    c0.getContext('2d')!.drawImage(bmp, 0, 0, c0.width, c0.height)
    const dataUrl = c0.toDataURL('image/jpeg', 0.85)
    setStuffy(s => ({ ...s, img: dataUrl })); speak('What a wonderful stuffy! SAM is cutting out your friend.')
    setSamStatus('SAM 3.1 is cutting out your stuffy...')
    try {
      const r = await fetch('/api/sam', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'stuffed animal toy', imageDataUrl: dataUrl }) })
      const j = await r.json()
      const img = new Image()
      img.onload = () => {
        // Pair the largest box with its mask (records arrive box-then-mask, in order).
        let bi = 0, best = -1; (j.boxes || []).forEach((b: any, i: number) => { const a = (b.x2 - b.x1) * (b.y2 - b.y1); if (a > best) { best = a; bi = i } })
        const b = j.boxes?.[bi]; const mask = j.masks?.[bi]
        if (!b) { setSamStatus('SAM could not spot a stuffy in that photo. Try a clearer photo with your stuffy in the middle!'); return }
        const sx = img.width / (b.frameW || img.width), sy = img.height / (b.frameH || img.height)
        const out = document.createElement('canvas'); out.width = Math.max(1, Math.round((b.x2 - b.x1) * sx)); out.height = Math.max(1, Math.round((b.y2 - b.y1) * sy))
        const ctx = out.getContext('2d')!; ctx.drawImage(img, b.x1 * sx, b.y1 * sy, out.width, out.height, 0, 0, out.width, out.height)
        if (mask?.rasterB64) {
          // True cutout: SAM mask becomes the alpha channel, background goes transparent.
          const raw = Uint8Array.from(atob(mask.rasterB64), ch => ch.charCodeAt(0))
          const mc = document.createElement('canvas'); mc.width = mask.width; mc.height = mask.height
          const mctx = mc.getContext('2d')!; const id = mctx.createImageData(mask.width, mask.height)
          for (let i = 0; i < raw.length; i++) { id.data[i * 4 + 3] = raw[i] ? 255 : 0 }
          mctx.putImageData(id, 0, 0)
          ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mc, 0, 0, out.width, out.height); ctx.globalCompositeOperation = 'source-over'
          setSamStatus(`SAM 3.1 cut out your stuffy in ${j.ms}ms!`); speak('SAM cut out your stuffy! Look, no background!')
        } else setSamStatus('SAM found your stuffy but sent no outline - showing a cropped photo.')
        setStuffy(s => ({ ...s, img: out.toDataURL('image/png') }))
      }; img.src = dataUrl
    } catch { setSamStatus('SAM is resting - showing your whole photo. The games still work!') }
  }

  return (
    <main className="app">
      <header><div className="logo">Toybox Math</div><div className="stars" aria-label="stars">★ {stars}</div></header>
      <p className="privacy">Camera frames are never saved. Only your stuffy photo stays, on this device.</p>

      {screen === 'home' && (
        <section className="panel">
          <h1>Meet your math buddy</h1>
          <div className="stuffyStage">
            {stuffy.img ? <img className="stuffyImg" src={stuffy.img} alt={name} /> : <div className="stuffyBlob" aria-label="stuffy placeholder">🧸</div>}
            {stuffy.hat && <div className="hat">🎩</div>}
          </div>
          <label className="btn fileBtn">Upload a stuffy photo<input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} /></label>
          <label className="nameRow">Name <input value={stuffy.name} onChange={e => setStuffy(s => ({ ...s, name: e.target.value }))} maxLength={16} /></label>
          <button className="btn big" onClick={() => { speak(FALLBACK_STORY(name)); setScreen('trail') }}>Start the adventure ▶</button>
          <button className="btn ghost" onClick={() => speak(`Hello! I am ${name}. Let's play math games together!`)}>🔊 Hear {name} talk</button>
          <p className="note">{samStatus}</p>
        </section>
      )}

      {screen === 'trail' && (
        <section className="panel">
          <h1>The Toybox Trail</h1><p className="story">{story || FALLBACK_STORY(name)}</p>{story && <p className="note">Story by Muse Spark</p>}
          <div className="trail">
            <button className="stop" onClick={() => setScreen('ratio')}><span>1</span> Counting Meadow<small>Ratio counting</small></button>
            <div className="path" /><button className="stop" onClick={() => setScreen('ninja')}><span>2</span> Fruit Slice Grove<small>Fruit Ninja math</small></button>
            <div className="path" /><div className="stop locked"><span>★</span> Home Tree<small>{stuffy.hat ? 'Hat earned!' : 'Finish games to earn a hat'}</small></div>
          </div>
          <button className="btn ghost" onClick={() => setScreen('home')}>← Back to {name}</button>
        </section>
      )}

      {screen === 'ratio' && <Ratio name={name} onWin={() => win('ratio')} onBack={() => setScreen('trail')} />}
      {screen === 'ninja' && <Ninja name={name} onWin={() => win('ninja')} onBack={() => setScreen('trail')} />}

      {screen === 'celebrate' && (
        <section className="panel celebrate"><div className="bigStar">★</div><h1>Great job!</h1>
          <p>{name} cheers for you!{stuffy.hat ? ` And look — ${name} earned a hat!` : ''}</p>
          <button className="btn big" onClick={() => setScreen('trail')}>Back to the trail</button></section>
      )}
      <footer>Ages 5–8 · Counting to 20 · No timers, no losing — just trying again</footer>
    </main>
  )
}

function Ratio({ name, onWin, onBack }: { name: string; onWin: () => void; onBack: () => void }) {
  const [red] = useState(() => 2 + Math.floor(Math.random() * 3))
  const [blue] = useState(() => 2 + Math.floor(Math.random() * 3) === red ? red + 1 : 2 + Math.floor(Math.random() * 2))
  const [tapped, setTapped] = useState<Set<string>>(new Set())
  const blocks = useMemo(() => [...Array(red).fill('red'), ...Array(blue).fill('blue')].map((c, i) => ({ c, id: `${c}-${i}` })), [red, blue])
  const redCount = blocks.filter(b => b.c === 'red' && tapped.has(b.id)).length
  const blueCount = blocks.filter(b => b.c === 'blue' && tapped.has(b.id)).length
  const allTapped = tapped.size === blocks.length
  const [samCount, setSamCount] = useState<string>('')
  const samPhoto = async (f: File) => {
    setSamCount('SAM is counting...')
    const dataUrl = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f) })
    try { const r = await fetch('/api/sam', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'block', imageDataUrl: dataUrl }) }); const j = await r.json(); setSamCount(j.count != null ? `SAM counted ${j.count} blocks in your photo (${j.ms}ms). Tap-to-count always works too!` : 'SAM is resting - tap-to-count still works!') } catch { setSamCount('SAM is resting - tap-to-count still works!') }
  }
  useEffect(() => { speak(`Tap every block to count them. Then tell me which color has more.`) }, [])
  const answer = (choice: string) => {
    const correct = red > blue ? 'red' : 'blue'
    if (choice === correct) { pop(700); onWin() } else { pop(220); speak(`Good try! Count again with ${name}. You can do it!`) }
  }
  return (<section className="panel"><h1>Counting Meadow</h1>
    <p>Tap each block to count it. <strong>{redCount} red</strong> · <strong>{blueCount} blue</strong></p>
    <div className="blocks">{blocks.map(b => <button key={b.id} className={`block ${b.c} ${tapped.has(b.id) ? 'counted' : ''}`} onClick={() => { setTapped(s => new Set(s).add(b.id)); pop(b.c === 'red' ? 500 : 380) }} aria-label={`${b.c} block`}>{tapped.has(b.id) ? '✓' : ''}</button>)}</div>
    {allTapped ? <><p className="ask">Which color has more?</p><div className="row"><button className="btn redBtn" onClick={() => answer('red')}>Red ({red})</button><button className="btn blueBtn" onClick={() => answer('blue')}>Blue ({blue})</button></div></> : <p className="note">Keep tapping — count them all!</p>}
    <label className="btn fileBtn">📷 SAM: count blocks in a photo<input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && samPhoto(e.target.files[0])} /></label>
    {samCount && <p className="cheer">{samCount}</p>}
    <button className="btn ghost" onClick={onBack}>← Trail</button></section>)
}

function Ninja({ name, onWin, onBack }: { name: string; onWin: () => void; onBack: () => void }) {
  const [mode, setMode] = useState<'add' | 'set'>('add')
  const [a] = useState(() => 3 + Math.floor(Math.random() * 5)); const [b] = useState(() => 2 + Math.floor(Math.random() * 5))
  const [sliced, setSliced] = useState<Set<number>>(new Set()); const [msg, setMsg] = useState('')
  const dragging = useRef(false)
  const answer = a + b
  const options = useMemo(() => [...new Set([answer, answer + 2, answer - 1, answer + 4])].sort(() => 0.5 - Math.random()), [answer])
  const setTargets = [3, 6, 4, 9, 5, 12]; const setAnswer = useMemo(() => new Set(setTargets.filter(n => n % 3 === 0)), [])
  useEffect(() => { speak(mode === 'add' ? `Slice the answer! What is ${a} plus ${b}? Drag across the right number.` : `Slice all the multiples of 3! Drag across them.`) }, [mode])
  const slice = (n: number) => {
    if (sliced.has(n)) return
    if (mode === 'add') { if (n === answer) { setSliced(new Set([n])); pop(800); setTimeout(onWin, 500) } else { pop(200); setMsg(`Good try! ${name} believes in you — try another one.`); speak(`Good try! Try another one.`) } }
    else { if (setAnswer.has(n)) { const s = new Set(sliced).add(n); setSliced(s); pop(650); if (s.size === setAnswer.size) setTimeout(onWin, 500) } else { pop(200); setMsg(`${n} is not a multiple of 3. Keep looking!`); speak(`${n} is not a multiple of 3. Keep looking!`) } }
  }
  const targets = mode === 'add' ? options : setTargets
  return (<section className="panel"><h1>Fruit Slice Grove</h1>
    <div className="row"><button className={`btn ${mode === 'add' ? '' : 'ghost'}`} onClick={() => { setMode('add'); setSliced(new Set()) }}>Slice the answer</button><button className={`btn ${mode === 'set' ? '' : 'ghost'}`} onClick={() => { setMode('set'); setSliced(new Set()) }}>Slice multiples of 3</button></div>
    <p className="ask">{mode === 'add' ? `${a} + ${b} = ?` : 'Slice every multiple of 3!'}</p>
    <p className="note">Drag your finger or mouse across a fruit to slice it. Using a camera hand? That arrives with SAM anchoring — pointer slicing always works.</p>
    <div className="grove" onPointerUp={() => dragging.current = false} onPointerLeave={() => dragging.current = false}>
      {targets.map(n => <button key={n} className={`fruit ${sliced.has(n) ? 'sliced' : ''}`}
        onPointerDown={() => { dragging.current = true; slice(n) }} onPointerEnter={() => dragging.current && slice(n)}>{sliced.has(n) ? '✂️ ' : '🍎 '}{n}</button>)}
    </div>{msg && <p className="cheer">{msg}</p>}
    <button className="btn ghost" onClick={onBack}>← Trail</button></section>)
}
