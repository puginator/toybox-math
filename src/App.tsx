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

      {screen === 'ratio' && <Ratio name={name} img={stuffy.img} onWin={() => win('ratio')} onBack={() => setScreen('trail')} />}
      {screen === 'ninja' && <Ninja name={name} img={stuffy.img} onWin={() => win('ninja')} onBack={() => setScreen('trail')} />}

      {screen === 'celebrate' && (
        <section className="panel celebrate"><div className="bigStar">★</div><h1>Great job!</h1>
          <p>{name} cheers for you!{stuffy.hat ? ` And look — ${name} earned a hat!` : ''}</p>
          <button className="btn big" onClick={() => setScreen('trail')}>Back to the trail</button></section>
      )}
      <footer>Ages 5–8 · Counting to 20 · No timers, no losing — just trying again</footer>
    </main>
  )
}


async function sam(prompt: string, imageDataUrl: string) {
  const r = await fetch('/api/sam', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, imageDataUrl }) })
  return r.json()
}
function Companion({ name, img, msg }: { name: string; img: string | null; msg: string }) {
  return <div className="companion">{img ? <img src={img} alt={name} /> : <span className="compEmoji">🧸</span>}<div className="bubble"><strong>{name}:</strong> {msg}</div></div>
}
function CameraSnap({ onSnap }: { onSnap: (d: string) => void }) {
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false); const [err, setErr] = useState('')
  const start = async () => { try { stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); if (video.current) { video.current.srcObject = stream.current; setLive(true) } } catch { setErr('Camera is shy right now. You can upload a photo or play with the blocks instead!') } }
  const stop = () => { stream.current?.getTracks().forEach(tr => tr.stop()); setLive(false) }
  useEffect(() => () => stop(), [])
  const snap = () => { const v = video.current; if (!v) return; const s = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight)); const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s); c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height); stop(); onSnap(c.toDataURL('image/jpeg', 0.85)) }
  return <div className="camera">{live ? <><video ref={video} autoPlay playsInline muted className="camVideo" /><button className="btn big" onClick={snap}>📸 Snap! Let SAM count</button><button className="btn ghost" onClick={stop}>Stop camera</button></> : <button className="btn" onClick={start}>📷 Turn on the camera</button>}{err && <p className="note">{err}</p>}<p className="note">Camera pictures are only used for counting and are never saved.</p></div>
}

function Ratio({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const totalRounds = 3
  const [round, setRound] = useState(1); const [msg, setMsg] = useState(`Put some red things and blue things on the table, then snap a photo!`)
  const [photo, setPhoto] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const [counts, setCounts] = useState<{ red: number; blue: number } | null>(null)
  const [tapped, setTapped] = useState<Set<string>>(new Set())
  const [blocksRound] = useState(() => ({ red: 2 + Math.floor(Math.random() * 3), blue: 3 + Math.floor(Math.random() * 2) }))
  const blocks = useMemo(() => [...Array(blocksRound.red).fill('red'), ...Array(blocksRound.blue).fill('blue')].map((c, i) => ({ c, id: `${c}-${i}` })), [round])
  useEffect(() => { speak(msg) }, [round])
  const next = () => { if (round >= totalRounds) onWin(); else { setRound(r => r + 1); setPhoto(null); setCounts(null); setTapped(new Set()); setMsg(`Round ${round + 1}! Show me red and blue things again — SAM will count them.`) } }
  const onSnap = async (d: string) => {
    setPhoto(d); setBusy(true); setMsg('SAM is counting your red and blue things...')
    try {
      const [r, b] = [await sam('red object', d), await sam('blue object', d)]
      if ((r.count || 0) + (b.count || 0) === 0) { setMsg('SAM could not see red or blue things. Spread them out, give them space, and snap again!'); setBusy(false); return }
      setCounts({ red: r.count, blue: b.count }); setMsg(`SAM counted ${r.count} red and ${b.count} blue! Which color has more?`)
      speak(`SAM counted ${r.count} red and ${b.count} blue. Which color has more?`)
    } catch { setMsg('SAM is resting. Play this round with the tap blocks below!') }
    setBusy(false)
  }
  const answer = (choice: 'red' | 'blue') => {
    const truth = counts ? (counts.red > counts.blue ? 'red' : counts.blue > counts.red ? 'blue' : 'same') : (blocksRound.red > blocksRound.blue ? 'red' : 'blue')
    if (choice === truth || truth === 'same') { pop(720); setMsg('Yes! Great counting!'); speak('Yes! Great counting!'); setTimeout(next, 900) }
    else { pop(210); setMsg(`Good try! Count with your finger, one by one. ${name} is cheering for you!`); speak('Good try! Count again, one by one.') }
  }
  const useBlocks = !photo
  const shownRed = counts?.red ?? blocksRound.red, shownBlue = counts?.blue ?? blocksRound.blue
  const redTapped = blocks.filter(x => x.c === 'red' && tapped.has(x.id)).length, blueTapped = blocks.filter(x => x.c === 'blue' && tapped.has(x.id)).length
  const ready = counts ? true : tapped.size === blocks.length
  return (<section className="panel"><h1>Counting Meadow</h1><p className="roundBadge">Round {round} of {totalRounds}</p>
    <Companion name={name} img={img} msg={msg} />
    {!photo && <CameraSnap onSnap={onSnap} />}
    {photo && <div className="photoWrap"><img src={photo} alt="Your table" className="tablePhoto" />{counts && <div className="countChips"><span className="chip redChip">Red: {counts.red}</span><span className="chip blueChip">Blue: {counts.blue}</span></div>}</div>}
    {busy && <p className="cheer">SAM is looking…</p>}
    {useBlocks && <><p>Or tap every block to count it. <strong>{redTapped} red</strong> · <strong>{blueTapped} blue</strong></p>
      <div className="blocks">{blocks.map(b => <button key={b.id} className={`block ${b.c} ${tapped.has(b.id) ? 'counted' : ''}`} onClick={() => { setTapped(s => new Set(s).add(b.id)); pop(b.c === 'red' ? 500 : 380) }}>{tapped.has(b.id) ? '✓' : ''}</button>)}</div></>}
    {photo && !counts && !busy && <button className="btn" onClick={() => { setPhoto(null); setMsg('Okay, new photo! Show SAM your red and blue things.') }}>📷 Snap again</button>}
    {ready && <><p className="ask">Which color has more?</p><div className="row"><button className="btn redBtn" onClick={() => answer('red')}>Red ({shownRed})</button><button className="btn blueBtn" onClick={() => answer('blue')}>Blue ({shownBlue})</button></div></>}
    <button className="btn ghost" onClick={onBack}>← Trail</button></section>)
}

function Ninja({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const totalRounds = 5
  const [round, setRound] = useState(1)
  const [problem, setProblem] = useState(() => ({ a: 3 + Math.floor(Math.random() * 5), b: 2 + Math.floor(Math.random() * 5) }))
  const [msg, setMsg] = useState('Put toys or blocks on the table and snap a photo. SAM will turn them into number fruit!')
  const [photo, setPhoto] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const [labels, setLabels] = useState<{ n: number; x: number; y: number; w: number; h: number }[]>([])
  const [sliced, setSliced] = useState<Set<number>>(new Set()); const dragging = useRef(false)
  const answer = problem.a + problem.b
  useEffect(() => { speak(`What is ${problem.a} plus ${problem.b}? Slice the fruit with that number!`) }, [problem])
  const newProblem = () => setProblem({ a: 3 + Math.floor(Math.random() * 6), b: 2 + Math.floor(Math.random() * 6) })
  const next = () => { if (round >= totalRounds) onWin(); else { setRound(r => r + 1); setPhoto(null); setLabels([]); setSliced(new Set()); newProblem(); setMsg(`Round ${round + 1}! New table, new problem. Snap your toys!`) } }
  const spriteLabels = () => { const opts = [...new Set([answer, answer + 2, answer - 1, answer + 4])]; return opts.map((n, i) => ({ n, x: 6 + i * 24, y: 30 + (i % 2) * 28, w: 20, h: 26 })) }
  const onSnap = async (d: string) => {
    setPhoto(d); setBusy(true); setMsg('SAM is finding your toys...')
    try {
      let j = await sam('toy block', d); if (!j.count || j.count < 3) j = await sam('object', d)
      if (!j.boxes || j.boxes.length < 3) { setLabels(spriteLabels()); setMsg('SAM found fewer than 3 toys, so magic sprite fruit appeared instead! Slice the answer!') }
      else {
        const vals = [...new Set([answer, answer + 2, answer - 1, answer + 4, answer + 1])]
        setLabels(j.boxes.map((b: any, i: number) => ({ n: vals[i % vals.length], x: b.x1 / b.frameW * 100, y: b.y1 / b.frameH * 100, w: (b.x2 - b.x1) / b.frameW * 100, h: (b.y2 - b.y1) / b.frameH * 100 })))
        setMsg(`SAM found ${j.boxes.length} toys! Slice the one that says ${answer}!`)
      }
      speak(`Slice the fruit that says ${answer}!`)
    } catch { setLabels(spriteLabels()); setMsg('SAM is resting, so sprite fruit appeared! Slice the answer!') }
    setBusy(false)
  }
  const slice = (n: number, i: number) => {
    if (sliced.has(i)) return
    if (n === answer) { setSliced(new Set([i])); pop(820); setMsg('Slice! You found it!'); speak('Slice! You found it!'); setTimeout(next, 1000) }
    else { pop(200); setMsg(`That one says ${n}. Good try — find ${answer}! ${name} believes in you.`); speak(`That one says ${n}. Find ${answer}!`) }
  }
  return (<section className="panel"><h1>Fruit Slice Grove</h1><p className="roundBadge">Round {round} of {totalRounds}</p>
    <Companion name={name} img={img} msg={msg} />
    <p className="ask">{problem.a} + {problem.b} = ?</p>
    {!photo && <><CameraSnap onSnap={onSnap} /><p className="note">No toys handy?</p><button className="btn" onClick={() => { setPhoto('sprite'); setLabels(spriteLabels()) }}>🍎 Play with sprite fruit</button></>}
    {busy && <p className="cheer">SAM is looking…</p>}
    {photo && labels.length > 0 && <div className={`stage ${photo === 'sprite' ? 'spriteStage' : ''}`} onPointerUp={() => dragging.current = false} onPointerLeave={() => dragging.current = false}>
      {photo !== 'sprite' && <img src={photo} alt="Your table toys" className="stageImg" />}
      {labels.map((l, i) => <button key={i} className={`fruitTag ${sliced.has(i) ? 'sliced' : ''}`} style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${Math.max(l.w, 14)}%`, minHeight: `${Math.max(l.h, 14)}%` }}
        onPointerDown={() => { dragging.current = true; slice(l.n, i) }} onPointerEnter={() => dragging.current && slice(l.n, i)}>{sliced.has(i) ? '✂️' : '🍎'} {l.n}</button>)}
    </div>}
    {photo && !busy && labels.length > 0 && <button className="btn ghost" onClick={() => { setPhoto(null); setLabels([]); setMsg('New photo! Put toys on the table and snap.') }}>📷 New table photo</button>}
    <button className="btn ghost" onClick={onBack}>← Trail</button></section>)
}
