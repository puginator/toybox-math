import { useEffect, useMemo, useRef, useState } from 'react'
import { IconBalance, IconBuild, IconCount, IconHunt, IconJar, IconLamp, IconPattern, IconShow, IconSlice, IconSpot, IconCatch, IconSort, IconFingers, IconMischief, IconDoor } from './icons'

type Screen = 'home' | 'trail' | 'ratio' | 'ninja' | 'showme' | 'build' | 'balance' | 'estimate' | 'pattern' | 'hunt' | 'spotlight' | 'catch' | 'sortsize' | 'fingers' | 'mischief' | 'doors' | 'home_tree' | 'celebrate'
type Stuffy = { name: string; img: string | null; hat: boolean; cape?: boolean; glasses?: boolean }
const STOP_ICONS: Record<string, () => JSX.Element> = { ratio: IconCount, ninja: IconSlice, showme: IconShow, build: IconBuild, balance: IconBalance, estimate: IconJar, pattern: IconPattern, hunt: IconHunt, spotlight: IconSpot, catch: IconCatch, sortsize: IconSort, fingers: IconFingers, mischief: IconMischief, doors: IconDoor, home_tree: IconLamp }
const STOPS = [
  { id: 'ratio', label: 'Dresser Drawer', sub: 'Counting blocks', prize: '' },
  { id: 'ninja', label: 'Nightstand Slice', sub: 'Fruit Ninja math', prize: 'hat' },
  { id: 'showme', label: 'Bookshelf Heights', sub: 'Show the number', prize: '' },
  { id: 'build', label: 'Build-a-Number Bed', sub: 'Make 10', prize: 'glasses' },
  { id: 'balance', label: 'Lamp Balance', sub: 'Which side has more?', prize: '' },
  { id: 'estimate', label: 'Toy Jar Corner', sub: 'Guess, then SAM counts', prize: '' },
  { id: 'pattern', label: 'Rug Pattern Path', sub: 'Copy the pattern', prize: '' },
  { id: 'hunt', label: 'SAM Scavenger Hunt', sub: 'SAM finds hidden things', prize: '' },
  { id: 'spotlight', label: 'SAM Spotlight', sub: 'SAM follows your toy', prize: '' },
  { id: 'catch', label: 'Catch Grove', sub: 'Catch the falling answer', prize: '' },
  { id: 'sortsize', label: 'Big & Small Shelf', sub: 'Sort SAM finds by size', prize: '' },
  { id: 'fingers', label: 'Finger Meadow', sub: 'Answer with your fingers', prize: '' },
  { id: 'mischief', label: 'Find the Mischief', sub: 'SAM gives the clues', prize: '' },
  { id: 'doors', label: 'Story Doors', sub: 'Pick where the story goes', prize: '' },
  { id: 'home_tree', label: 'The Warm Lamp', sub: 'Home, at last', prize: 'cape' },
] as const
const FALLBACK_STORY = (n: string) => `${n} is lost in the bedroom after lights-out! Cross the nightstand, climb the bookshelf, and follow the warm lamp home. Every stop you finish earns a star.`

function speak(text: string) {
  try { const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch {}
}
let AC: AudioContext | null = null; const audio = () => { if (!AC) AC = new AudioContext(); if (AC.state === 'suspended') AC.resume(); return AC }
function jingle() { try { const ctx = audio();[523,659,784,1047].forEach((f,i)=>{ const o=ctx.createOscillator(); const g=ctx.createGain(); o.frequency.value=f; g.gain.setValueAtTime(0.12, ctx.currentTime+i*0.13); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+i*0.13+0.3); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime+i*0.13); o.stop(ctx.currentTime+i*0.13+0.32) }) } catch {} }
function pop(freq = 520) {
  try { const ctx = audio(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = freq; g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18); o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.2) } catch {}
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [stuffy, setStuffy] = useState<Stuffy>(() => { try { return JSON.parse(localStorage.getItem('toybox-stuffy') || 'null') || { name: 'Biscuit', img: null, hat: false } } catch { return { name: 'Biscuit', img: null, hat: false } } })
  const [stars, setStars] = useState(() => Number(localStorage.getItem('toybox-stars') || 0))
  const [samStatus, setSamStatus] = useState('Demo mode: SAM proxy not configured yet — fallbacks keep every game playable.')
  const [candidates, setCandidates] = useState<{ img: string; area: number }[]>([])
  const [friend, setFriend] = useState<{ name: string; img: string | null }>(() => { try { return JSON.parse(localStorage.getItem('toybox-friend') || 'null') || { name: 'Peanut', img: null } } catch { return { name: 'Peanut', img: null } } })
  useEffect(() => { try { localStorage.setItem('toybox-friend', JSON.stringify(friend)) } catch {} }, [friend])
  const onFriendUpload = async (f: File) => {
    const bmp = await createImageBitmap(f).catch(() => null); if (!bmp) return
    const s = Math.min(1, 1024 / Math.max(bmp.width, bmp.height)); const c0 = document.createElement('canvas'); c0.width = Math.round(bmp.width * s); c0.height = Math.round(bmp.height * s); c0.getContext('2d')!.drawImage(bmp, 0, 0, c0.width, c0.height)
    const dataUrl = c0.toDataURL('image/jpeg', 0.85); setFriend(fr => ({ ...fr, img: dataUrl })); speak(`A new friend for ${name}! SAM is cutting them out.`)
    const j = await tryCutout(dataUrl, ['stuffed animal', 'plush toy', 'stuffed toy', 'teddy bear'])
    if (j?.boxes?.length) { const img = new Image(); img.onload = () => { let bi = 0, best = -1; j.boxes.forEach((b: any, i: number) => { const a = (b.x2 - b.x1) * (b.y2 - b.y1); if (a > best) { best = a; bi = i } }); setFriend(fr => ({ ...fr, img: applyMask(img, j.boxes[bi], j.masks?.[bi]) })); speak(`${friend.name} is here! Now ${name} has a friend on the adventure!`) }; img.src = dataUrl }
  }
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const name = stuffy.name || 'Biscuit'

  useEffect(() => { try { localStorage.setItem('toybox-stuffy', JSON.stringify(stuffy)) } catch {} }, [stuffy])
  useEffect(() => { localStorage.setItem('toybox-stars', String(stars)) }, [stars])
  useEffect(() => { fetch('/api/sam', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'ping' }) }).then(r => { if (r.ok) setSamStatus('SAM 3.1 connected through the Meta Model API proxy.'); else setSamStatus('Demo mode: SAM proxy not configured yet — fallbacks keep every game playable.') }).catch(() => {}) }, [])

  const [story, setStory] = useState(() => localStorage.getItem('toybox-story') || '')
  const storyName = useRef(name)
  useEffect(() => { if (storyName.current !== name) { storyName.current = name; if (story) { setStory(''); localStorage.removeItem('toybox-story'); return } } if (screen !== 'trail' || story) return; fetch('/api/story', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }).then(r => r.json()).then(j => { if (j.story) { setStory(j.story); localStorage.setItem('toybox-story', j.story); speak(j.story) } }).catch(() => {}) }, [screen])
  const [done, setDone] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('toybox-done') || '[]') } catch { return [] } })
  useEffect(() => { localStorage.setItem('toybox-done', JSON.stringify(done)) }, [done])
  const win = (game: string) => { jingle(); setStars(s => s + 1); if (!done.includes(game)) setDone(d => [...d, game]); pop(760); speak(`You did it! ${name} is so proud of you!`); if (game === 'ninja') setStuffy(s => ({ ...s, hat: true })); if (game === 'build') setStuffy(s => ({ ...s, glasses: true })); if (game === 'home_tree') setStuffy(s => ({ ...s, cape: true })); setScreen('celebrate') }

  const applyMask = (img: HTMLImageElement, b: any, mask: any) => {
    const sx = img.width / (b.frameW || img.width), sy = img.height / (b.frameH || img.height)
    const out = document.createElement('canvas'); out.width = Math.max(1, Math.round((b.x2 - b.x1) * sx)); out.height = Math.max(1, Math.round((b.y2 - b.y1) * sy))
    const ctx = out.getContext('2d')!; ctx.drawImage(img, b.x1 * sx, b.y1 * sy, out.width, out.height, 0, 0, out.width, out.height)
    if (mask?.rasterB64) {
      const raw = Uint8Array.from(atob(mask.rasterB64), ch => ch.charCodeAt(0))
      const mc = document.createElement('canvas'); mc.width = mask.width; mc.height = mask.height
      const mctx = mc.getContext('2d')!; const id = mctx.createImageData(mask.width, mask.height)
      for (let i = 0; i < raw.length; i++) id.data[i * 4 + 3] = raw[i] ? 255 : 0
      mctx.putImageData(id, 0, 0); ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mc, 0, 0, out.width, out.height); ctx.globalCompositeOperation = 'source-over'
    }
    return out.toDataURL('image/png')
  }
  const tryCutout = async (dataUrl: string, prompts: string[]) => {
    for (const prompt of prompts) {
      try {
        const r = await fetch('/api/sam', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, imageDataUrl: dataUrl }) })
        const j = await r.json()
        if (j.boxes?.length) return j
      } catch {}
    }
    return null
  }
  const onUpload = async (f: File) => {
    setCandidates([]); setSamStatus('Looking at your stuffy...')
    const bmp = await createImageBitmap(f).catch(() => null)
    if (!bmp) { setSamStatus('That photo would not open - try another one.'); return }
    const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height))
    const c0 = document.createElement('canvas'); c0.width = Math.round(bmp.width * scale); c0.height = Math.round(bmp.height * scale)
    c0.getContext('2d')!.drawImage(bmp, 0, 0, c0.width, c0.height)
    const dataUrl = c0.toDataURL('image/jpeg', 0.85)
    setStuffy(s => ({ ...s, img: dataUrl })); setPendingPhoto(dataUrl)
    speak('What a wonderful stuffy! SAM is cutting out your friend.'); setSamStatus('SAM 3.1 is cutting out your stuffy...')
    const j = await tryCutout(dataUrl, ['stuffed animal', 'plush toy', 'stuffed toy', 'teddy bear'])
    if (!j) { setSamStatus('SAM could not spot a stuffy in that photo. Tap your stuffy in the photo below, or try a clearer photo with your stuffy in the middle!'); return }
    const img = new Image()
    img.onload = () => {
      const cands = (j.boxes || []).map((b: any, i: number) => ({ img: applyMask(img, b, j.masks?.[i]), area: (b.x2 - b.x1) * (b.y2 - b.y1) })).sort((a: any, b: any) => b.area - a.area)
      if (!cands.length) { setSamStatus('SAM could not spot a stuffy in that photo. Tap your stuffy below!'); return }
      if (cands.length === 1) { setStuffy(s => ({ ...s, img: cands[0].img })); setSamStatus(`SAM 3.1 cut out your stuffy in ${j.ms}ms!`); speak('SAM cut out your stuffy! Look, no background!') }
      else { setCandidates(cands.slice(0, 4)); setSamStatus(`SAM found ${cands.length} things! Tap the one that is your stuffy.`) ; speak('Which one is your stuffy? Tap it!') }
    }; img.src = dataUrl
  }
  const tapStuffy = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!pendingPhoto) return
    const rect = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - rect.left) / rect.width, py = (e.clientY - rect.top) / rect.height
    setSamStatus('SAM is looking where you tapped...')
    const img = new Image(); img.onload = async () => {
      const cw = Math.round(img.width * 0.6), ch = Math.round(img.height * 0.6)
      const cx = Math.min(Math.max(Math.round(px * img.width - cw / 2), 0), img.width - cw), cy = Math.min(Math.max(Math.round(py * img.height - ch / 2), 0), img.height - ch)
      const c = document.createElement('canvas'); c.width = cw; c.height = ch; c.getContext('2d')!.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch)
      const j = await tryCutout(c.toDataURL('image/jpeg', 0.85), ['stuffed animal', 'plush toy', 'toy'])
      if (!j?.boxes?.length) { setSamStatus('SAM still could not find it there. Try a closer, clearer photo of just your stuffy.'); return }
      const img2 = new Image(); img2.onload = () => {
        let bi = 0, best = -1; j.boxes.forEach((b: any, i: number) => { const a = (b.x2 - b.x1) * (b.y2 - b.y1); if (a > best) { best = a; bi = i } })
        setStuffy(s => ({ ...s, img: applyMask(img2, j.boxes[bi], j.masks?.[bi]) })); setCandidates([]); setSamStatus(`SAM cut out your stuffy in ${j.ms}ms — thanks for pointing!`); speak('SAM found your stuffy!')
      }; img2.src = c.toDataURL('image/jpeg', 0.85)
    }; img.src = pendingPhoto
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
            {stuffy.hat && <div className="hat">🎩</div>}{stuffy.glasses && <div className="glasses">🕶️</div>}{stuffy.cape && <div className="cape">🦸</div>}
            {friend.img && <img className="stageFriend" src={friend.img} alt={friend.name} />}
          </div>
          <label className="btn fileBtn">Upload a stuffy photo<input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} /></label>
          <label className="nameRow">Name <input value={stuffy.name} onChange={e => setStuffy(s => ({ ...s, name: e.target.value }))} maxLength={16} /></label>
          <button className="btn big" onClick={() => { speak(FALLBACK_STORY(name)); setScreen('trail') }}>Start the adventure ▶</button>
          <button className="btn ghost" onClick={() => speak(`Hello! I am ${name}. Let's play math games together!`)}>🔊 Hear {name} talk</button>
          <PortraitPuzzle name={name} img={stuffy.img} done={done} />
          <div className="friendBox">{friend.img ? <><img className="friendImg" src={friend.img} alt={friend.name} /><label className="nameRow">Friend <input value={friend.name} onChange={e => setFriend(fr => ({ ...fr, name: e.target.value }))} maxLength={16} /></label><p className="note">{friend.name} tags along on every adventure!</p></> : <><p className="note">Every hero needs a friend. Rescue a second stuffy for {name}!</p><label className="btn fileBtn">🧸 Rescue a friend<input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && onFriendUpload(e.target.files[0])} /></label></>}</div>
          {(stuffy.hat || stuffy.glasses || stuffy.cape) && <p className="note">{name}'s treasures: {stuffy.hat ? '🎩 party hat ' : ''}{stuffy.glasses ? '🕶️ star glasses ' : ''}{stuffy.cape ? '🦸 hero cape' : ''} — earned on the trail!</p>}
          <p className="note">{samStatus}</p>
          {candidates.length > 0 && <div className="candRow">{candidates.map((c, i) => <button key={i} className="candBtn" onClick={() => { setStuffy(s => ({ ...s, img: c.img })); setCandidates([]); setSamStatus('What a great stuffy!'); speak('What a great stuffy!') }}><img src={c.img} alt={`Choice ${i + 1}`} /></button>)}</div>}
          {pendingPhoto && candidates.length === 0 && samStatus.includes('could not') && <><p className="note">Tap your stuffy in your photo:</p><img src={pendingPhoto} alt="Your uploaded photo - tap your stuffy" className="tapPhoto" onClick={tapStuffy} /></>}
        </section>
      )}

      {screen === 'trail' && (
        <section className="panel">
          <h1>The Nightstand Adventure</h1><p className="story">{story || FALLBACK_STORY(name)}</p>{story && <p className="note">Story by Muse Spark</p>}
          <div className="rescueBar"><div className="rescueFill" style={{ width: `${Math.round(done.length / STOPS.length * 100)}%` }} /></div>
          <p className="note">Rescue journey: {done.length} of {STOPS.length} stops — every stop brings {name} closer to home and recovers a piece of {name}'s portrait puzzle!</p>
          <div className="mapScene">
            <svg className="mapSceneArt" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <rect x="58" y="3" width="34" height="26" rx="2" fill="#1d2750" stroke="#d7ad58" strokeWidth="0.8" /><circle cx="84" cy="10" r="3.4" fill="#ffe9a8" /><path d="M62 22l4-8 4 10 5-12 5 14 4-9 6 9" fill="#3c5a3c" />
              <rect x="3" y="34" width="30" height="22" fill="#8a5a33" stroke="#5d3d22" strokeWidth="0.8" /><rect x="6" y="38" width="24" height="6" fill="#6d4525" /><rect x="6" y="47" width="24" height="6" fill="#6d4525" /><circle cx="27" cy="41" r="1" fill="#ffca7a" /><circle cx="27" cy="50" r="1" fill="#ffca7a" />
              <rect x="66" y="36" width="30" height="26" fill="#7a4e2c" stroke="#5d3d22" strokeWidth="0.8" /><path d="M69 42h24M69 50h24M69 58h24" stroke="#5d3d22" strokeWidth="1.4" /><rect x="70" y="37.5" width="3" height="4" fill="#e53935" /><rect x="75" y="37.5" width="3" height="4" fill="#1e88e5" /><rect x="80" y="45.5" width="3" height="4" fill="#43a047" /><rect x="86" y="53.5" width="3" height="4" fill="#fb8c00" />
              <rect x="4" y="72" width="42" height="14" rx="3" fill="#4a5da9" stroke="#2c3a75" strokeWidth="0.8" /><rect x="4" y="68" width="13" height="9" rx="3" fill="#fff8e1" /><rect x="8" y="76" width="34" height="3" fill="#e53935" opacity="0.55" />
              <path d="M84 74h8l3 10H81z" fill="#fb8c00" stroke="#6d4c2f" strokeWidth="0.7" /><circle cx="88" cy="88" r="5" fill="#ffe9a8" opacity="0.35" />
            </svg>
            <svg className="mapPath" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M12 6 C 70 14, 88 22, 82 34 C 76 46, 20 44, 14 56 C 9 67, 78 68, 84 78 C 89 87, 45 92, 30 96" fill="none" stroke="#d7ad58" strokeWidth="1.8" strokeDasharray="4 3" strokeLinecap="round" /></svg>
            {STOPS.map((s, i) => { const unlocked = i === 0 || done.includes(STOPS[i - 1].id); const isDone = done.includes(s.id); const isNext = unlocked && !isDone; const Icon = STOP_ICONS[s.id]; const pos = [{ l: 4, t: 0 }, { l: 68, t: 6 }, { l: 64, t: 15 }, { l: 8, t: 20 }, { l: 5, t: 29 }, { l: 60, t: 34 }, { l: 64, t: 44 }, { l: 16, t: 48 }, { l: 58, t: 58 }, { l: 12, t: 62 }, { l: 60, t: 70 }, { l: 14, t: 74 }, { l: 58, t: 83 }, { l: 14, t: 86 }, { l: 30, t: 93 }][i]
              return <button key={s.id} disabled={!unlocked} className={`mapStop ${isDone ? 'doneStop' : ''} ${isNext ? 'nextStop' : ''}`} style={{ left: `${pos.l}%`, top: `${pos.t}%` }} onClick={() => setScreen(s.id as Screen)}>
                <span className="mapIcon"><Icon /></span><span className="mapLabel"><strong>{isDone ? '★ ' : !unlocked ? '🔒 ' : ''}{s.label}</strong><small>{s.sub}{s.prize ? ` · prize ${s.prize === 'hat' ? '🎩' : s.prize === 'glasses' ? '🕶️' : '🦸'}` : ''}</small></span>
                {isNext && stuffy.img && <img className="mapBuddy" src={stuffy.img} alt={name} />}</button> })}
            <div className="moon">🌙</div><div className="windowStars">✦ ✦ ✦</div>
          </div>
          <button className="btn ghost" onClick={() => setScreen('home')}>← Back to {name}</button>
        </section>
      )}

      {screen === 'ratio' && <Ratio name={name} img={stuffy.img} onWin={() => win('ratio')} onBack={() => setScreen('trail')} />}
      {screen === 'ninja' && <Ninja name={name} img={stuffy.img} onWin={() => win('ninja')} onBack={() => setScreen('trail')} />}
      {screen === 'showme' && <ShowMe name={name} img={stuffy.img} onWin={() => win('showme')} onBack={() => setScreen('trail')} />}
      {screen === 'build' && <BuildNumber name={name} img={stuffy.img} onWin={() => win('build')} onBack={() => setScreen('trail')} />}
      {screen === 'balance' && <Balance name={name} img={stuffy.img} onWin={() => win('balance')} onBack={() => setScreen('trail')} />}
      {screen === 'estimate' && <Estimate name={name} img={stuffy.img} onWin={() => win('estimate')} onBack={() => setScreen('trail')} />}
      {screen === 'pattern' && <PatternCopy name={name} img={stuffy.img} onWin={() => win('pattern')} onBack={() => setScreen('trail')} />}
      {screen === 'hunt' && <Hunt name={name} img={stuffy.img} onWin={() => win('hunt')} onBack={() => setScreen('trail')} />}
      {screen === 'spotlight' && <Spotlight name={name} img={stuffy.img} onWin={() => win('spotlight')} onBack={() => setScreen('trail')} />}
      {screen === 'catch' && <CatchGame name={name} img={stuffy.img} onWin={() => win('catch')} onBack={() => setScreen('trail')} />}
      {screen === 'sortsize' && <SortSize name={name} img={stuffy.img} onWin={() => win('sortsize')} onBack={() => setScreen('trail')} />}
      {screen === 'fingers' && <Fingers name={name} img={stuffy.img} onWin={() => win('fingers')} onBack={() => setScreen('trail')} />}
      {screen === 'mischief' && <Mischief name={name} img={stuffy.img} onWin={() => win('mischief')} onBack={() => setScreen('trail')} />}
      {screen === 'doors' && <StoryDoors name={name} img={stuffy.img} onWin={() => win('doors')} onBack={() => setScreen('trail')} />}
      {screen === 'home_tree' && <HomeTree name={friend.img ? `${name} and ${friend.name}` : name} img={stuffy.img} doneCount={done.length} total={STOPS.length} onWin={() => win('home_tree')} onBack={() => setScreen('trail')} />}

      {screen === 'celebrate' && (
        <section className="panel celebrate"><Confetti /><div className="bigStar">★</div><h1>Great job!</h1>
          <p>{name} cheers for you! {stuffy.cape ? `${name} earned the hero cape — the rescue is complete!` : 'Keep crossing the bedroom!'}</p>
          <button className="btn big" onClick={() => setScreen('trail')}>Back to the map</button></section>
      )}
      <footer>Ages 5–8 · Counting to 20 · No timers, no losing — just trying again</footer>
    </main>
  )
}


function PortraitPuzzle({ name, img, done }: { name: string; img: string | null; done: string[] }) {
  // The stuffy stays whole - it's their portrait that got scattered into 6 puzzle pieces,
  // one recovered at each of the first 6 trail stops. Rebuild it to bring the picture home.
  const pieceStops = ['ratio', 'ninja', 'showme', 'build', 'balance', 'estimate']
  const found = pieceStops.filter(id => done.includes(id)).length
  return (<div className="puzzleBox"><p className="puzzleTitle">🧩 {name}'s Portrait Puzzle — {found} of 6 pieces found</p>
    <div className="puzzleGrid">{pieceStops.map((id, i) => { const got = done.includes(id); const col = i % 3, rowIdx = Math.floor(i / 3)
      return <div key={id} className={`puzzlePiece ${got ? 'got' : ''}`} style={got && img ? { backgroundImage: `url(${img})`, backgroundSize: '300% 200%', backgroundPosition: `${col * 50}% ${rowIdx * 100}%` } : undefined}>{!got && <span>?</span>}{got && !img && <span>🧸</span>}</div> })}
    </div><p className="note">{found === 6 ? `${name}'s portrait is whole again!` : `Finish map stops to recover the missing pieces!`}</p></div>)
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
  const start = async () => { try { stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); setLive(true); setTimeout(() => { if (video.current && stream.current) { video.current.srcObject = stream.current; video.current.play().catch(() => {}) } }, 60) } catch { setErr('Camera is shy right now. You can upload a photo or play with the blocks instead!') } }
  const stop = () => { stream.current?.getTracks().forEach(tr => tr.stop()); setLive(false) }
  useEffect(() => () => stop(), [])
  const snap = () => { const v = video.current; if (!v) return; const s = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight)); const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s); c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height); stop(); onSnap(c.toDataURL('image/jpeg', 0.85)) }
  const upload = async (f: File) => { const bmp = await createImageBitmap(f).catch(() => null); if (!bmp) return; const s = Math.min(1, 1024 / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height); onSnap(c.toDataURL('image/jpeg', 0.85)) }
  return <div className="camera">{live ? <><video ref={video} autoPlay playsInline muted className="camVideo" /><button className="btn big" onClick={snap}>📸 Snap! Let SAM count</button><button className="btn ghost" onClick={stop}>Stop camera</button></> : <><button className="btn" onClick={start}>📷 Turn on the camera</button> <label className="btn ghost fileBtn">🖼️ Upload a photo<input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} /></label></>}{err && <p className="note">{err}</p>}<p className="note">Camera pictures are only used for counting and are never saved.</p></div>
}

function Ratio({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const totalRounds = 3
  const [round, setRound] = useState(1); const [msg, setMsg] = useState(`Put some red things and blue things on the table, then snap a photo!`)
  const [photo, setPhoto] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const [counts, setCounts] = useState<{ red: number; blue: number } | null>(null)
  const [vision, setVision] = useState<{ b: any; color: string }[]>([])
  const [tapped, setTapped] = useState<Set<string>>(new Set())
  const [blocksRound, setBlocksRound] = useState(() => { const red = 2 + Math.floor(Math.random() * 4); let blue = 1 + Math.floor(Math.random() * 5); if (blue === red) blue += 1; return { red, blue } })
  const blocks = useMemo(() => [...Array(blocksRound.red).fill('red'), ...Array(blocksRound.blue).fill('blue')].map((c, i) => ({ c, id: `${c}-${i}` })), [blocksRound])
  useEffect(() => { speak(msg) }, [round])
  const next = () => { if (round >= totalRounds) onWin(); else { setRound(r => r + 1); setPhoto(null); setCounts(null); setVision([]); setTapped(new Set()); const red = 2 + Math.floor(Math.random() * 4); let blue = 1 + Math.floor(Math.random() * 5); if (blue === red) blue += 1; setBlocksRound({ red, blue }); setMsg(`Round ${round + 1}! Show me red and blue things again — SAM will count them.`) } }
  const onSnap = async (d: string) => {
    setPhoto(d); setBusy(true); setMsg('SAM is counting your red and blue things...')
    try {
      const [r, b] = await Promise.all([sam('red object', d), sam('blue object', d)])
      if ((r.count || 0) + (b.count || 0) === 0) { setMsg('SAM could not see red or blue things. Spread them out, give them space, and snap again!'); setBusy(false); return }
      setCounts({ red: r.count, blue: b.count }); setVision([...(r.boxes || []).map((x: any) => ({ b: x, color: '#e53935' })), ...(b.boxes || []).map((x: any) => ({ b: x, color: '#1e88e5' }))]); setMsg(r.count === b.count && r.count > 0 ? `SAM counted ${r.count} red and ${b.count} blue — they are the same! Tap "They're the same!"` : `SAM counted ${r.count} red and ${b.count} blue! See SAM's outlines? Which color has more?`)
      speak(`SAM counted ${r.count} red and ${b.count} blue. Which color has more?`)
    } catch { setMsg('SAM is resting. Play this round with the tap blocks below!') }
    setBusy(false)
  }
  const answer = (choice: 'red' | 'blue') => {
    const truth = counts ? (counts.red > counts.blue ? 'red' : counts.blue > counts.red ? 'blue' : 'same') : (blocksRound.red > blocksRound.blue ? 'red' : 'blue')
    if (choice === truth) { pop(720); setMsg('Yes! Great counting!'); speak('Yes! Great counting!'); setTimeout(next, 900) }
    else { pop(210); setMsg(`Good try! Count with your finger, one by one. ${name} is cheering for you!`); speak('Good try! Count again, one by one.') }
  }
  const useBlocks = !photo
  const shownRed = counts?.red ?? blocksRound.red, shownBlue = counts?.blue ?? blocksRound.blue
  const redTapped = blocks.filter(x => x.c === 'red' && tapped.has(x.id)).length, blueTapped = blocks.filter(x => x.c === 'blue' && tapped.has(x.id)).length
  const ready = counts ? true : tapped.size === blocks.length
  return (<section className="panel"><h1>Dresser Drawer</h1><GameTop round={round} total={totalRounds} onBack={onBack} />
    <Companion name={name} img={img} msg={msg} />
    {!photo && <CameraSnap onSnap={onSnap} />}
    {photo && <div className="photoWrap"><div className="visionWrap"><img src={photo} alt="Your table" className="tablePhoto" />{vision.map((v, i) => <div key={i} className="visionBox" style={{ left: `${v.b.x1 / v.b.frameW * 100}%`, top: `${v.b.y1 / v.b.frameH * 100}%`, width: `${(v.b.x2 - v.b.x1) / v.b.frameW * 100}%`, height: `${(v.b.y2 - v.b.y1) / v.b.frameH * 100}%`, borderColor: v.color }}>SAM</div>)}</div>{counts && <div className="countChips"><span className="chip redChip">Red: {counts.red}</span><span className="chip blueChip">Blue: {counts.blue}</span></div>}</div>}
    {busy && <p className="cheer">SAM is looking…</p>}
    {useBlocks && <><p>Or tap every block to count it. <strong>{redTapped} red</strong> · <strong>{blueTapped} blue</strong></p>
      <div className="blocks">{blocks.map(b => <button key={b.id} className={`block ${b.c} ${tapped.has(b.id) ? 'counted' : ''}`} onClick={() => { setTapped(s => new Set(s).add(b.id)); pop(b.c === 'red' ? 500 : 380) }}>{tapped.has(b.id) ? '✓' : ''}</button>)}</div></>}
    {photo && !counts && !busy && <button className="btn" onClick={() => { setPhoto(null); setMsg('Okay, new photo! Show SAM your red and blue things.') }}>📷 Snap again</button>}
    {ready && <><p className="ask">Which color has more?</p><div className="row"><button className="btn redBtn" onClick={() => answer('red')}>Red ({shownRed})</button><button className="btn blueBtn" onClick={() => answer('blue')}>Blue ({shownBlue})</button>{counts && counts.red === counts.blue && <button className="btn" onClick={() => { pop(720); setMsg('Yes! They are the same!'); speak('Yes! They are the same!'); setTimeout(next, 900) }}>They're the same!</button>}</div></>}
    </section>)
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
  const next = () => { if (round >= totalRounds) onWin(); else { const np = { a: 3 + Math.floor(Math.random() * 6), b: 2 + Math.floor(Math.random() * 6) }; setRound(r => r + 1); setSliced(new Set()); setProblem(np); if (photo === 'sprite' || photo === 'hand') { const ans = np.a + np.b; const opts = [...new Set([ans, ans + 2, ans - 1, ans + 4])]; setLabels(opts.map((n, i) => ({ n, x: 6 + i * 24, y: 30 + (i % 2) * 28, w: 20, h: 26 }))); setMsg(`Round ${round + 1}! Slice the answer!`) } else { setPhoto(null); setLabels([]); setMsg(`Round ${round + 1}! New table, new problem. Snap your toys!`) } } }
  const spriteLabels = () => { const opts = [...new Set([answer, answer + 2, answer - 1, answer + 4])]; return opts.map((n, i) => ({ n, x: 6 + i * 24, y: 30 + (i % 2) * 28, w: 20, h: 26 })) }
  const onSnap = async (d: string) => {
    setPhoto(d); setBusy(true); setMsg('SAM is finding your toys...')
    try {
      let j = await sam('toy', d)
      for (const w of ['block', 'cup', 'apple', 'banana', 'ball']) { if (j.count && j.count >= 3) break; const k = await sam(w, d); if ((k.count || 0) > (j.count || 0)) j = k }
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
  return (<section className="panel"><h1>Nightstand Slice</h1><GameTop round={round} total={totalRounds} onBack={onBack} />
    <Companion name={name} img={img} msg={msg} />
    <p className="ask">{problem.a} + {problem.b} = ?</p>
    {!photo && <><CameraSnap onSnap={onSnap} /><p className="note">No toys handy?</p><button className="btn" onClick={() => { setPhoto('sprite'); setLabels(spriteLabels()) }}>🍎 Play with sprite fruit</button>
      <button className="btn" onClick={() => { setPhoto('hand'); setLabels(spriteLabels()); setMsg('Wave your hand in front of the camera — your fingertip is the blade! Slice the answer!') }}>✋ Hand blade (camera)</button></>}
    {busy && <p className="cheer">SAM is looking…</p>}
    {photo && labels.length > 0 && <div className={`stage ${photo === 'sprite' ? 'spriteStage' : ''}`} onPointerUp={() => dragging.current = false} onPointerLeave={() => dragging.current = false}>
      {photo === 'hand' && <HandBlade sliced={sliced} onSliceAt={(x, y) => { const el = document.elementFromPoint(x, y) as HTMLElement | null; const idx = el?.dataset?.idx; if (idx != null) slice(labels[+idx].n, +idx) }} />}
      {photo !== 'sprite' && photo !== 'hand' && <img src={photo} alt="Your table toys" className="stageImg" />}
      {labels.map((l, i) => <button key={i} data-idx={i} className={`fruitTag ${sliced.has(i) ? 'sliced' : ''}`} style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${Math.max(l.w, 14)}%`, minHeight: `${Math.max(l.h, 14)}%` }}
        onPointerDown={() => { dragging.current = true; slice(l.n, i) }} onPointerEnter={() => dragging.current && slice(l.n, i)}>{sliced.has(i) ? '✂️' : '🍎'} {l.n}</button>)}
    </div>}
    {photo && !busy && labels.length > 0 && <button className="btn ghost" onClick={() => { setPhoto(null); setLabels([]); setMsg('New photo! Put toys on the table and snap.') }}>📷 New table photo</button>}
    </section>)
}

function Rounds({ round, total }: { round: number; total: number }) { return <div className="segBar" aria-label={`Round ${round} of ${total}`}>{Array.from({ length: total }, (_, i) => <span key={i} className={`seg ${i < round ? 'segOn' : ''}`} />)}</div> }
function GameTop({ round, total, onBack }: { round?: number; total?: number; onBack: () => void }) {
  return <div className="gameTop"><button className="xBtn" onClick={onBack} aria-label="Back to map">✕</button>{total ? <Rounds round={round || 1} total={total} /> : <span />}</div>
}

function ShowMe({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const total = 3; const [round, setRound] = useState(1); const [target, setTarget] = useState(() => 3 + Math.floor(Math.random() * 6))
  const [picked, setPicked] = useState<Set<number>>(new Set()); const [msg, setMsg] = useState('')
  const [photoCount, setPhotoCount] = useState<number | null>(null)
  useEffect(() => { setMsg(`Show me ${target}! Tap blocks — or snap toys on the table and SAM will count them.`); speak(`Show me ${target}!`) }, [target])
  const next = () => { if (round >= total) onWin(); else { setRound(r => r + 1); setTarget(3 + Math.floor(Math.random() * 6)); setPicked(new Set()); setPhotoCount(null) } }
  const check = (n: number) => { if (n === target) { pop(740); speak(`Yes! That is ${target}!`); setTimeout(next, 800) } else { pop(210); setMsg(n < target ? `That is ${n}. ${name} needs a few more!` : `That is ${n}. A few too many — tap one off!`); speak(n < target ? 'A few more!' : 'A few too many!') } }
  const onSnap = async (d: string) => { setMsg('SAM is counting your toys...'); try { let j = await sam('toy', d); if (!j.count) j = await sam('block', d); setPhotoCount(j.count ?? 0); if ((j.count ?? 0) > 0) check(j.count) } catch { setMsg('SAM is resting — tap blocks still works!') } }
  return (<section className="panel"><h1>Bookshelf Heights</h1><GameTop round={round} total={total} onBack={onBack} /><Companion name={name} img={img} msg={msg} />
    <p className="ask">Show me {target}!</p>
    <div className="blocks">{Array.from({ length: 12 }, (_, i) => <button key={i} className={`block pick ${picked.has(i) ? 'picked' : ''}`} onClick={() => { const s = new Set(picked); s.has(i) ? s.delete(i) : s.add(i); setPicked(s); pop(420 + i * 30) }}>{picked.has(i) ? picked.size : ''}</button>)}</div>
    <p className="note">You are showing: <strong>{picked.size}</strong></p>
    <div className="row"><button className="btn big" onClick={() => check(picked.size)}>Check!</button></div>
    <CameraSnap onSnap={onSnap} />{photoCount !== null && <p className="cheer">SAM counted {photoCount} in your photo.</p>}
    </section>)
}

function BuildNumber({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const total = 3; const goal = 10; const [round, setRound] = useState(1); const [msg, setMsg] = useState(`Pick fruit numbers that add up to ${goal}!`)
  const deal = () => { const a = 2 + Math.floor(Math.random() * 6); const pair = [a, goal - a]; const extra = [2, 3, 4, 5, 6, 7, 8].filter(n => !pair.includes(n)).sort(() => 0.5 - Math.random()).slice(0, 4); return [...pair, ...extra].sort(() => 0.5 - Math.random()) }
  const [opts, setOpts] = useState(deal); const [picked, setPicked] = useState<Set<number>>(new Set())
  const sum = [...picked].reduce((a, i) => a + opts[i], 0)
  useEffect(() => { speak(`Build the number ${goal}! Pick fruit that add up to ${goal}.`) }, [round])
  const toggle = (i: number) => { const s = new Set(picked); s.has(i) ? s.delete(i) : s.add(i); setPicked(s); pop(500) }
  const check = () => { if (sum === goal) { pop(760); speak(`You built ${goal}!`); if (round >= total) setTimeout(onWin, 800); else { setRound(r => r + 1); setPicked(new Set()); setOpts(deal()); setMsg(`Round ${round + 1} — build ${goal} another way!`) } } else { pop(210); setMsg(sum < goal ? `That is ${sum}. Add a little more fruit!` : `That is ${sum}. Too much — tap a fruit to put it back!`); speak(sum < goal ? 'Add a little more!' : 'Too much!') } }
  return (<section className="panel"><h1>Build-a-Number Bed</h1><GameTop round={round} total={total} onBack={onBack} /><Companion name={name} img={img} msg={msg} />
    <p className="ask">Build {goal}: {sum} so far</p>
    <div className="grove">{opts.map((n, i) => <button key={i} className={`fruit ${picked.has(i) ? 'sliced' : ''}`} onClick={() => toggle(i)}>🍎 {n}</button>)}</div>
    <button className="btn big" onClick={check}>Check!</button><br /></section>)
}

function Balance({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const total = 3; const [round, setRound] = useState(1); const [msg, setMsg] = useState('Which side has more blocks? Tap that side!')
  const [sides, setSides] = useState(() => { const l = 1 + Math.floor(Math.random() * 8); let r = 1 + Math.floor(Math.random() * 8); if (r === l) r += 1; return { l, r } })
  useEffect(() => { speak('Which side has more blocks?') }, [round])
  const pick = (side: 'l' | 'r') => { const truth = sides.l > sides.r ? 'l' : 'r'; if (side === truth) { pop(740); speak('Yes! That side has more!'); if (round >= total) setTimeout(onWin, 800); else { setRound(r2 => r2 + 1); const l = 1 + Math.floor(Math.random() * 8); let r = 1 + Math.floor(Math.random() * 8); if (r === l) r += 1; setSides({ l, r }); setMsg(`Round ${round + 1} — which side has more?`) } } else { pop(210); setMsg(`Good looking! Count each side slowly, one by one.`); speak('Good looking! Count each side slowly.') } }
  const pile = (n: number) => <div className="pile">{Array.from({ length: n }, (_, i) => <span key={i} className="miniBlock" />)}</div>
  return (<section className="panel"><h1>Lamp Balance</h1><GameTop round={round} total={total} onBack={onBack} /><Companion name={name} img={img} msg={msg} />
    <div className="balanceRow"><button className="side" onClick={() => pick('l')}>{pile(sides.l)}<span>{sides.l}</span></button><div className="vs">⚖️</div><button className="side" onClick={() => pick('r')}>{pile(sides.r)}<span>{sides.r}</span></button></div>
    <p className="note">Tap the side with more blocks. No wrong turns — just count again!</p>
    </section>)
}

function HomeTree({ name, img, doneCount, total, onWin, onBack }: { name: string; img: string | null; doneCount: number; total: number; onWin: () => void; onBack: () => void }) {
  const ready = doneCount >= total - 1
  return (<section className="panel"><h1>The Warm Lamp</h1><Companion name={name} img={img} msg={ready ? `We made it home! Thank you for counting, slicing, showing, building and balancing with me!` : `The Home Tree is waiting! Finish ${total - 1 - doneCount} more stop${total - 1 - doneCount === 1 ? '' : 's'} on the trail and ${name} can come home.`} />
    <div className="homeTree">🛋️</div>
    {ready ? <><p className="ask">{name} is home!</p><button className="btn big" onClick={onWin}>🎉 Celebrate the rescue!</button></> : <button className="btn" onClick={onBack}>Back to the trail — adventure awaits!</button>}
    <br /></section>)
}

function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d')!; c.width = c.offsetWidth; c.height = 260
    const colors = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#fdd835']
    const parts = Array.from({ length: 90 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * 200, s: 5 + Math.random() * 7, vy: 1.5 + Math.random() * 2.5, vx: -1 + Math.random() * 2, r: Math.random() * Math.PI, col: colors[Math.floor(Math.random() * colors.length)] }))
    let raf = 0; const t0 = performance.now()
    const tick = () => { ctx.clearRect(0, 0, c.width, c.height); for (const q of parts) { q.y += q.vy; q.x += q.vx; q.r += 0.05; if (q.y > c.height + 20) { q.y = -20; q.x = Math.random() * c.width } ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillStyle = q.col; ctx.fillRect(-q.s / 2, -q.s / 2, q.s, q.s * 0.6); ctx.restore() } if (performance.now() - t0 < 5000) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} className="confetti" aria-hidden="true" />
}

function Estimate({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const total = 3; const [round, setRound] = useState(1); const [guess, setGuess] = useState<number | null>(null)
  const [real, setReal] = useState<number | null>(null); const [busy, setBusy] = useState(false)
  const [pile] = useState(() => 4 + Math.floor(Math.random() * 8)); const [usePile, setUsePile] = useState(true)
  const [msg, setMsg] = useState('Estimation is a superpower! Guess first — how many are in the jar? Then we count for real.')
  useEffect(() => { speak('How many do you think are in the jar? Make a guess!') }, [round])
  const reveal = (n: number) => { setReal(n); const d = Math.abs(n - (guess ?? 0)); setTimeout(() => { if (round >= total) onWin(); else { setRound(r => r + 1); setGuess(null); setReal(null); setUsePile(true); setMsg(`Round ${round + 1}! New jar — guess first!`) } }, 2600); setMsg(d === 0 ? `WOW! Exactly ${n}! You are an estimation star!` : d <= 2 ? `So close! There are ${n}. Great estimating!` : `There are ${n}! Estimating takes practice — ${name} loves your guess!`); speak(`There are ${n}!`) }
  const onSnap = async (d: string) => { if (guess === null) { setMsg('Guess first! Tap a number, then snap.'); return } setBusy(true); setMsg('SAM is counting the real jar...'); try { let j = await sam('toy', d); for (const w of ['block', 'ball', 'cup', 'banana']) { if (j.count) break; j = await sam(w, d) } if (j.count) { setUsePile(false); reveal(j.count) } else setMsg('SAM could not count that photo. Try spreading the toys out — or use the jar below!') } catch { setMsg('SAM is resting — count the jar below together!') } setBusy(false) }
  return (<section className="panel"><h1>Toy Jar Corner</h1><GameTop round={round} total={total} onBack={onBack} /><Companion name={name} img={img} msg={msg} />
    {usePile && <div className="jar">{Array.from({ length: pile }, (_, i) => <span key={i} className="jarBall" style={{ background: ['#e53935', '#1e88e5', '#43a047', '#fb8c00'][i % 4] }} />)}</div>}
    {real !== null ? <p className="ask">There are {real}!</p> : <>
      <p className="note">Your guess: <strong>{guess ?? '?'}</strong></p>
      <div className="row">{[2, 4, 6, 8, 10, 12].map(n => <button key={n} className={`btn ${guess === n ? '' : 'ghost'}`} onClick={() => { setGuess(n); pop(440 + n * 30) }}>{n}</button>)}</div>
      {usePile && guess !== null && <button className="btn big" onClick={() => reveal(pile)}>Count them for real!</button>}
      <p className="note">With real toys: guess, then snap — SAM counts your jar.</p><CameraSnap onSnap={onSnap} />{busy && <p className="cheer">SAM is counting…</p>}</>}
    </section>)
}

function PatternCopy({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const total = 3; const [round, setRound] = useState(1); const [msg, setMsg] = useState('Watch the pattern, then copy it!')
  const deal = () => { const cols = ['red', 'blue', 'green']; const base = [cols[Math.floor(Math.random() * 3)], cols[Math.floor(Math.random() * 3)]]; if (base[0] === base[1]) base[1] = cols.find(c => c !== base[0])!; return [base[0], base[1], base[0], base[1], base[0]] }
  const [pattern, setPattern] = useState(deal); const [mine, setMine] = useState<string[]>([])
  useEffect(() => { speak('Copy the pattern!') }, [round])
  const tap = (c: string) => { const next = [...mine, c]; setMine(next); pop(c === 'red' ? 500 : c === 'blue' ? 400 : 600); if (next.length === pattern.length) { if (next.every((v, i) => v === pattern[i])) { speak('You copied the pattern!'); setTimeout(() => { if (round >= total) onWin(); else { setRound(r => r + 1); setPattern(deal()); setMine([]); setMsg(`Round ${round + 1} — new pattern!`) } }, 900) } else { setMsg(`So close! Watch the colors again and start over. ${name} believes in you!`); speak('So close! Try again.'); setTimeout(() => setMine([]), 800) } } }
  const row = (arr: string[], onTap?: (c: string) => void) => <div className="blocks">{arr.map((c, i) => <button key={i} className={`block ${c}`} onClick={() => onTap?.(c)} aria-label={`${c} block`}>{c === 'green' ? '🟢' : ''}</button>)}</div>
  return (<section className="panel"><h1>Rug Pattern Path</h1><GameTop round={round} total={total} onBack={onBack} /><Companion name={name} img={img} msg={msg} />
    <p className="note">Copy this pattern:</p>{row(pattern)}
    <p className="note">Your pattern:</p>{mine.length ? row(mine) : <p className="cheer">Tap colors below…</p>}
    <div className="row"><button className="btn redBtn" onClick={() => tap('red')}>Red</button><button className="btn blueBtn" onClick={() => tap('blue')}>Blue</button><button className="btn" onClick={() => tap('green')}>Green</button><button className="btn ghost" onClick={() => setMine([])}>Start over</button></div>
    </section>)
}

function HandBlade({ onSliceAt }: { sliced: Set<number>; onSliceAt: (clientX: number, clientY: number) => void }) {
  const video = useRef<HTMLVideoElement>(null); const [tip, setTip] = useState<{ x: number; y: number } | null>(null); const [err, setErr] = useState('')
  const cb = useRef(onSliceAt); cb.current = onSliceAt
  useEffect(() => {
    let raf = 0, landmarker: any = null, stream: MediaStream | null = null, last: { x: number; y: number } | null = null, lastVideoTime = -1
    ;(async () => {
      try {
        const vision = await import('@mediapipe/tasks-vision')
        const fileset = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm')
        landmarker = await vision.HandLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 1 })
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        if (!video.current) return; video.current.srcObject = stream; await video.current.play()
        const loop = () => {
          const v = video.current; if (v && landmarker && v.currentTime !== lastVideoTime) { lastVideoTime = v.currentTime
            try { const res = landmarker.detectForVideo(v, performance.now()); const lm = res?.landmarks?.[0]?.[8]
              if (lm) { const x = (1 - lm.x) * 100, y = lm.y * 100; setTip({ x, y }); const rect = v.getBoundingClientRect()
                if (last && Math.hypot(x - last.x, y - last.y) > 2.5) cb.current(rect.left + x / 100 * rect.width, rect.top + y / 100 * rect.height)
                last = { x, y } } else setTip(null) } catch {}
          }
          raf = requestAnimationFrame(loop) }
        raf = requestAnimationFrame(loop)
      } catch { setErr('Hand tracking could not start (camera or model). Drag slicing still works!') }
    })()
    return () => { cancelAnimationFrame(raf); stream?.getTracks().forEach(tr => tr.stop()); try { landmarker?.close() } catch {} }
  }, [])
  return <div className="handStage"><video ref={video} autoPlay playsInline muted className="handVideo" />
    {tip && <div className="tipDot" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>✋</div>}
    {err ? <p className="handErr">{err}</p> : !tip && <p className="handHint">Show your hand to the camera…</p>}</div>
}

function Hunt({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const pool = ['cup', 'book', 'banana', 'apple', 'spoon', 'hat', 'shoe', 'toy car', 'teddy bear', 'block']
  const [items] = useState(() => [...pool].sort(() => 0.5 - Math.random()).slice(0, 3))
  const [found, setFound] = useState<Record<string, any[]>>({}); const [photo, setPhoto] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(`SAM hunts with words! Hide these where SAM can see them, then snap a photo: ${items.join(', ')}.`)
  useEffect(() => { speak(`Scavenger hunt! Can SAM find ${items.join(', ')}?`) }, [])
  const foundCount = items.filter(i => found[i]).length
  useEffect(() => { if (foundCount === items.length && items.length) { speak('SAM found everything! Look at the outlines!'); setTimeout(onWin, 4500) } }, [foundCount])
  const onSnap = async (d: string) => {
    setPhoto(d); setBusy(true); setMsg('SAM is hunting, one word at a time...')
    const next: Record<string, any[]> = { ...found }; let newly = 0
    for (const item of items) { if (next[item]) continue; try { const j = await sam(item, d); if (j.count > 0) { next[item] = j.boxes; newly++ } } catch {} }
    setFound(next); setBusy(false)
    const left = items.filter(i => !next[i])
    setMsg(newly ? `SAM found ${newly} new thing${newly > 1 ? 's' : ''}! ${left.length ? `Still hiding: ${left.join(', ')}. Move them into the light and snap again!` : 'Everything found!'}` : `SAM could not spot them yet. Bring them closer, spread them out, and snap again!`)
    if (left.length) speak(`Still hiding: ${left.join(', ')}`)
  }
  const allBoxes = items.flatMap(item => (found[item] || []).map(b => ({ b, item })))
  return (<section className="panel"><h1>SAM Scavenger Hunt</h1><GameTop onBack={onBack} /><GameTop round={Math.min(foundCount + 1, items.length)} total={items.length} onBack={onBack} /><p className="caughtLine">Found {foundCount} of {items.length}</p>
    <Companion name={name} img={img} msg={msg} />
    <div className="huntList">{items.map(i => <span key={i} className={`chip ${found[i] ? 'foundChip' : 'hideChip'}`}>{found[i] ? '★' : '🔍'} {i}</span>)}</div>
    {!photo && <CameraSnap onSnap={onSnap} />}
    {photo && <div className="visionWrap"><img src={photo} alt="Hunt photo" className="tablePhoto" />{allBoxes.map((v, i) => <div key={i} className="visionBox huntBox" style={{ left: `${v.b.x1 / v.b.frameW * 100}%`, top: `${v.b.y1 / v.b.frameH * 100}%`, width: `${(v.b.x2 - v.b.x1) / v.b.frameW * 100}%`, height: `${(v.b.y2 - v.b.y1) / v.b.frameH * 100}%` }}>{v.item}</div>)}</div>}
    {busy && <p className="cheer">SAM is hunting…</p>}
    {photo && !busy && foundCount < items.length && <button className="btn" onClick={() => { setPhoto(null); setMsg('New photo! Show SAM where the hiding things are.') }}>📷 Snap again</button>}
    <p className="note">This only works because SAM 3.1 understands words: tell it "banana" and it finds the banana's exact pixels.</p>
    </section>)
}

function Spotlight({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<'idle' | 'live' | 'working' | 'done'>('idle'); const [frames, setFrames] = useState<{ src: string; boxes: any[] }[]>([])
  const [word, setWord] = useState('teddy bear'); const [msg, setMsg] = useState('SAM can follow a toy! Point the camera at a toy, press Start, and move it slowly. SAM will spot it in every photo.')
  const [err, setErr] = useState('')
  const stop = () => { stream.current?.getTracks().forEach(tr => tr.stop()) }
  useEffect(() => () => stop(), [])
  const start = async () => { try { stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); setPhase('live'); setMsg('Move your toy slowly... press the big button and SAM takes 5 photos!'); setTimeout(() => { if (video.current && stream.current) { video.current.srcObject = stream.current; video.current.play().catch(() => {}) } }, 60) } catch { setErr('Camera is shy right now. Your other games still work!') } }
  const burst = async () => {
    const v = video.current; if (!v) return; setPhase('working'); setFrames([]); speak('SAM is watching! Move your toy slowly.')
    const shots: string[] = []
    for (let i = 0; i < 5; i++) { const s = Math.min(1, 768 / Math.max(v.videoWidth, v.videoHeight)); const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s); c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height); shots.push(c.toDataURL('image/jpeg', 0.8)); setMsg(`Photo ${i + 1} of 5... keep moving slowly!`); await new Promise(r => setTimeout(r, 650)) }
    stop(); const results: { src: string; boxes: any[] }[] = []
    for (let i = 0; i < shots.length; i++) { setMsg(`SAM is spotting your ${word} in photo ${i + 1}...`); try { const j = await sam(word, shots[i]); results.push({ src: shots[i], boxes: j.boxes || [] }) } catch { results.push({ src: shots[i], boxes: [] }) } setFrames([...results]) }
    setPhase('done'); const hits = results.filter(r => r.boxes.length).length
    if (hits >= 3) { setMsg(`SAM followed your ${word} in ${hits} of 5 photos! Spotlight star!`); speak('SAM followed your toy!'); setTimeout(onWin, 3200) }
    else { setMsg(`SAM spotted it in ${hits} of 5 photos. Big, slow moves in good light help SAM follow! Try again.`); speak('Try again with big slow moves!') }
  }
  return (<section className="panel"><h1>SAM Spotlight</h1><GameTop onBack={onBack} /><Companion name={name} img={img} msg={msg} />
    <label className="nameRow">SAM hunts for a… <input value={word} onChange={e => setWord(e.target.value)} maxLength={24} /></label>
    {phase === 'idle' && <button className="btn big" onClick={start}>📷 Turn on the camera</button>}
    {err && <p className="note">{err}</p>}
    {(phase === 'live' || phase === 'working') && <><video ref={video} autoPlay playsInline muted className="camVideo" />{phase === 'live' && <button className="btn big" onClick={burst}>⭐ Start Spotlight — 5 photos!</button>}</>}
    {phase === 'working' && <p className="cheer">{msg}</p>}
    {frames.length > 0 && <div className="filmstrip">{frames.map((f, i) => <div key={i} className="filmFrame"><div className="visionWrap"><img src={f.src} alt={`Spotlight photo ${i + 1}`} />{f.boxes.map((b, j) => <div key={j} className="visionBox huntBox" style={{ left: `${b.x1 / b.frameW * 100}%`, top: `${b.y1 / b.frameH * 100}%`, width: `${(b.x2 - b.x1) / b.frameW * 100}%`, height: `${(b.y2 - b.y1) / b.frameH * 100}%` }}>{word}</div>)}</div><span>{f.boxes.length ? '★ SAM sees it!' : 'SAM missed it'}</span></div>)}</div>}
    {phase === 'done' && <button className="btn" onClick={() => { setPhase('idle'); setFrames([]) }}>Try again</button>}
    <p className="note">SAM 3.1 can track the same thing from photo to photo. Green outlines show every spot where SAM found it.</p>
    </section>)
}

function CatchGame({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const need = 3; const [caught, setCaught] = useState(0); const [problem, setProblem] = useState(() => ({ a: 2 + Math.floor(Math.random() * 6), b: 2 + Math.floor(Math.random() * 5) }))
  const answer = problem.a + problem.b
  const [fruits, setFruits] = useState<{ id: number; n: number; x: number; y: number; v: number }[]>([]); const [basketX, setBasketX] = useState(50)
  const idRef = useRef(0); const caughtRef = useRef(0); const ansRef = useRef(answer); ansRef.current = answer
  const [msg, setMsg] = useState('Move the basket with your finger or mouse. Catch the fruit with the answer!')
  useEffect(() => { speak(`Catch the fruit that says ${answer}!`) }, [problem])
  useEffect(() => {
    const spawn = setInterval(() => { setFruits(f => f.length > 5 ? f : [...f, { id: ++idRef.current, n: Math.random() < 0.45 ? ansRef.current : Math.max(1, ansRef.current + [-3, -1, 2, 4, -2][Math.floor(Math.random() * 5)]), x: 6 + Math.random() * 86, y: -8, v: 0.55 + Math.random() * 0.5 }]) }, 1500)
    const tick = setInterval(() => { setFruits(f => { const next: typeof f = []; for (const fr of f) { const y = fr.y + fr.v; if (y > 88) { if (Math.abs(fr.x - basketXRef.current) < 13) { if (fr.n === ansRef.current) { caughtRef.current++; pop(760); setCaught(caughtRef.current); if (caughtRef.current >= need) { setTimeout(onWin, 600) } else { setMsg(`Caught it! ${need - caughtRef.current} more!`); setProblem({ a: 2 + Math.floor(Math.random() * 6), b: 2 + Math.floor(Math.random() * 5) }) } } else { pop(220); setMsg(`That one says ${fr.n} — it bounces away! Find ${ansRef.current}!`) } } } else if (y < 108) next.push({ ...fr, y }) } return next }) }, 50)
    return () => { clearInterval(spawn); clearInterval(tick) }
  }, [])
  const basketXRef = useRef(50); basketXRef.current = basketX
  const move = (e: React.PointerEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); setBasketX(Math.min(92, Math.max(8, (e.clientX - r.left) / r.width * 100))) }
  return (<section className="panel"><h1>Catch Grove</h1><GameTop round={Math.min(caught + 1, need)} total={need} onBack={onBack} /><p className="caughtLine">Caught {caught} of {need} 🧺</p><Companion name={name} img={img} msg={msg} />
    <p className="ask">{problem.a} + {problem.b} = ?</p>
    <div className="catchStage" onPointerMove={move} onPointerDown={move}>
      {fruits.map(f => <div key={f.id} className="fallFruit" style={{ left: `${f.x}%`, top: `${f.y}%` }}>🍎<span>{f.n}</span></div>)}
      <div className="basket" style={{ left: `${basketX}%` }}>🧺</div>
    </div>
    <p className="note">Wrong fruit just bounces away — no losing, just catching!</p>
    </section>)
}

function SortSize({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const [photo, setPhoto] = useState<string | null>(null); const [objs, setObjs] = useState<{ b: any; area: number }[]>([]); const [step, setStep] = useState(0); const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('Snap toys on the table! SAM measures them, then you tap biggest to smallest.')
  const sorted = useMemo(() => [...objs].sort((a, b2) => b2.area - a.area), [objs])
  const onSnap = async (d: string) => {
    setPhoto(d); setBusy(true); setStep(0); setMsg('SAM is measuring your toys...')
    try { let j = await sam('toy', d); for (const w of ['block', 'cup', 'ball']) { if ((j.count || 0) >= 3) break; const k = await sam(w, d); if ((k.count || 0) > (j.count || 0)) j = k }
      if (!j.boxes || j.boxes.length < 3) { setMsg('SAM needs at least 3 toys to sort. Spread them out and snap again!'); setObjs([]) }
      else { setObjs(j.boxes.map((b: any) => ({ b, area: (b.x2 - b.x1) * (b.y2 - b.y1) }))); setMsg(`SAM found ${j.boxes.length} toys! Tap the BIGGEST one first.`) ; speak('Tap the biggest toy first!') }
    } catch { setMsg('SAM is resting — snap again in a moment!') }
    setBusy(false)
  }
  const tap = (origIdx: number) => {
    const target = sorted[step]; const targetIdx = objs.indexOf(target)
    if (origIdx === targetIdx) { pop(600 + step * 60); const n = step + 1; setStep(n); if (n >= objs.length) { setMsg('You sorted them all — biggest to smallest!'); setTimeout(onWin, 900) } else setMsg(`Yes! Now the next biggest.`) }
    else { pop(210); setMsg(`That one is not the biggest left. Look for the widest, tallest toy!`); speak('Look for the biggest one left!') }
  }
  return (<section className="panel"><h1>Big &amp; Small Shelf</h1><GameTop onBack={onBack} /><Companion name={name} img={img} msg={msg} />
    {!photo && <CameraSnap onSnap={onSnap} />}
    {busy && <p className="cheer">SAM is measuring…</p>}
    {photo && objs.length > 0 && <div className="visionWrap"><img src={photo} alt="Toys to sort" className="tablePhoto" />
      {objs.map((o, i) => { const doneOrder = sorted.slice(0, step).indexOf(o); return <button key={i} className={`visionBox sortBox ${doneOrder >= 0 ? 'sortedBox' : ''}`} style={{ left: `${o.b.x1 / o.b.frameW * 100}%`, top: `${o.b.y1 / o.b.frameH * 100}%`, width: `${(o.b.x2 - o.b.x1) / o.b.frameW * 100}%`, height: `${(o.b.y2 - o.b.y1) / o.b.frameH * 100}%` }} onClick={() => tap(i)}>{doneOrder >= 0 ? `#${doneOrder + 1}` : 'tap me'}</button> })}</div>}
    {photo && !busy && <button className="btn" onClick={() => { setPhoto(null); setObjs([]); setStep(0) }}>📷 New photo</button>}
    <p className="note">SAM measures the exact pixels of each toy — that is how it knows which is biggest!</p>
    </section>)
}

function Fingers({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const total = 3; const [round, setRound] = useState(1); const [target, setTarget] = useState(() => 2 + Math.floor(Math.random() * 6))
  const [count, setCount] = useState(0); const [err, setErr] = useState(''); const hold = useRef(0); const [msg, setMsg] = useState('')
  useEffect(() => { setMsg(`Show me ${target} fingers! Hold them up to the camera.`); speak(`Show me ${target} fingers!`) }, [target])
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    let raf = 0, lm: any = null, stream: MediaStream | null = null, lastT = -1, dead = false
    ;(async () => { try {
      const vision = await import('@mediapipe/tasks-vision'); const fs = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm')
      lm = await vision.HandLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2 })
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }); if (!video.current) return; video.current.srcObject = stream; await video.current.play()
      const loop = () => { const v = video.current; if (v && lm && v.currentTime !== lastT) { lastT = v.currentTime; try { const res = lm.detectForVideo(v, performance.now()); let total = 0
        for (const hand of res?.landmarks || []) { const tips = [8, 12, 16, 20], pips = [6, 10, 14, 18]; tips.forEach((tp, i) => { if (hand[tp].y < hand[pips[i]].y) total++ }); if (Math.abs(hand[4].x - hand[3].x) > 0.04) total++ }
        if (!dead) setCount(total) } catch {} } raf = requestAnimationFrame(loop) }; raf = requestAnimationFrame(loop)
    } catch { if (!dead) setErr('Camera fingers could not start. Tap the answer below instead!') } })()
    return () => { dead = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(tr => tr.stop()); try { lm?.close() } catch {} }
  }, [])
  useEffect(() => { if (count === target && target > 0) { hold.current++; if (hold.current === 45) { pop(760); speak(`Yes! ${target} fingers!`); if (round >= total) setTimeout(onWin, 700); else { setRound(r => r + 1); setTarget(2 + Math.floor(Math.random() * 8)) } } } else hold.current = 0 }, [count])
  return (<section className="panel"><h1>Finger Meadow</h1><GameTop round={round} total={total} onBack={onBack} /><Companion name={name} img={img} msg={msg} />
    <p className="ask">Show me {target}!</p><video ref={video} autoPlay playsInline muted className="camVideo fingerCam" />
    <p className="fingerCount">{count} 🖐️</p>{err && <p className="note">{err}</p>}
    {err && <div className="row">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <button key={n} className="btn ghost" onClick={() => setCount(n)}>{n}</button>)}</div>}
    <p className="note">Hold your fingers still — when the number matches, it counts!</p>
    </section>)
}

function Mischief({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const total = 3; const [round, setRound] = useState(1); const [photo, setPhoto] = useState<string | null>(null); const [objs, setObjs] = useState<any[]>([])
  const [clue, setClue] = useState<{ text: string; idx: number } | null>(null); const [foundIdx, setFoundIdx] = useState<number | null>(null); const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('A mischief-maker hid among your toys! Snap them, and SAM will give you a clue.')
  const makeClue = (boxes: any[]) => {
    const areas = boxes.map(b => (b.x2 - b.x1) * (b.y2 - b.y1)); const cxs = boxes.map(b => (b.x1 + b.x2) / 2); const cys = boxes.map(b => (b.y1 + b.y2) / 2)
    const options = [
      { text: 'the BIGGEST toy', idx: areas.indexOf(Math.max(...areas)) }, { text: 'the smallest toy', idx: areas.indexOf(Math.min(...areas)) },
      { text: 'the toy on the far LEFT', idx: cxs.indexOf(Math.min(...cxs)) }, { text: 'the toy on the far RIGHT', idx: cxs.indexOf(Math.max(...cxs)) },
      { text: 'the toy nearest the TOP', idx: cys.indexOf(Math.min(...cys)) }]
    return options[Math.floor(Math.random() * options.length)]
  }
  const onSnap = async (d: string) => {
    setPhoto(d); setBusy(true); setFoundIdx(null); setMsg('SAM is peeking at your toys...')
    try { let j = await sam('toy', d); for (const w of ['block', 'cup', 'ball']) { if ((j.count || 0) >= 3) break; const k = await sam(w, d); if ((k.count || 0) > (j.count || 0)) j = k }
      if (!j.boxes || j.boxes.length < 3) { setMsg('SAM needs at least 3 toys to hide among. Spread them out!'); setObjs([]) }
      else { setObjs(j.boxes); const c = makeClue(j.boxes); setClue(c); setMsg(`Clue: tap ${c.text}!`); speak(`Tap ${c.text}!`) }
    } catch { setMsg('SAM is resting — snap again in a moment!') }
    setBusy(false)
  }
  const tap = (i: number) => {
    if (!clue || foundIdx !== null) return
    if (i === clue.idx) { pop(740); setFoundIdx(i); speak('You found the mischief!'); if (round >= total) setTimeout(onWin, 1200); else setTimeout(() => { setRound(r => r + 1); setPhoto(null); setObjs([]); setClue(null); setFoundIdx(null); setMsg(`Round ${round + 1}: hide the toys again!`) }, 1200) }
    else { pop(210); setMsg(`Not that one — the clue was ${clue.text}. Look again!`); speak('Not that one. Look again!') }
  }
  return (<section className="panel"><h1>Find the Mischief</h1><GameTop onBack={onBack} /><GameTop round={round} total={total} onBack={onBack} /><Companion name={name} img={img} msg={msg} />
    {!photo && <CameraSnap onSnap={onSnap} />}{busy && <p className="cheer">SAM is peeking…</p>}
    {photo && objs.length > 0 && <div className="visionWrap"><img src={photo} alt="Toys with a mischief hiding" className="tablePhoto" />
      {objs.map((b, i) => <button key={i} className={`visionBox sortBox ${foundIdx === i ? 'sortedBox' : ''}`} style={{ left: `${b.x1 / b.frameW * 100}%`, top: `${b.y1 / b.frameH * 100}%`, width: `${(b.x2 - b.x1) / b.frameW * 100}%`, height: `${(b.y2 - b.y1) / b.frameH * 100}%` }} onClick={() => tap(i)}>{foundIdx === i ? '😈★' : '?'}</button>)}</div>}
    {photo && !busy && !clue && <button className="btn" onClick={() => { setPhoto(null) }}>📷 New photo</button>}
    </section>)
}

const DOOR_FALLBACK = [
  { scene: 'comes to a wiggly bridge over a babbling stream. A frog in a tiny hat is fishing!', a: 'Cross the wiggly bridge', b: 'Ask the frog for a boat' },
  { scene: 'finds a garden where the flowers hum lullabies and the paths smell like warm biscuits.', a: 'Follow the humming flowers', b: 'Follow the biscuit smell' },
  { scene: 'sees the warm lamp glowing at last, just past a hill of soft pillows!', a: 'Climb the pillow hill', b: 'Call out to the lamp' }]
function StoryDoors({ name, img, onWin, onBack }: { name: string; img: string | null; onWin: () => void; onBack: () => void }) {
  const total = 3; const [chapter, setChapter] = useState(1); const [picked, setPicked] = useState<string[]>([])
  const [scene, setScene] = useState<{ scene: string; a: string; b: string } | null>(null); const [loading, setLoading] = useState(false)
  const load = async (ch: number, prev: string[]) => {
    setLoading(true); setScene(null)
    try { const r = await fetch('/api/story', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, doors: { chapter: ch, previous: prev } }) }); const j = await r.json(); if (j.doors) setScene(j.doors); else setScene(DOOR_FALLBACK[ch - 1]) } catch { setScene(DOOR_FALLBACK[ch - 1]) }
    setLoading(false)
  }
  useEffect(() => { load(1, []) }, [])
  useEffect(() => { if (scene) speak(`${name} ${scene.scene}. Which way? ${scene.a}, or ${scene.b}?`) }, [scene])
  const pick = (choice: string) => { pop(620); const prev = [...picked, choice]; setPicked(prev); if (chapter >= total) { speak(`${name} made it! What an adventure you chose!`); setTimeout(onWin, 1000) } else { setChapter(c => c + 1); load(chapter + 1, prev) } }
  return (<section className="panel"><h1>Story Doors</h1><GameTop round={Math.min(chapter, total)} total={total} onBack={onBack} />
    <Companion name={name} img={img} msg={picked.length ? `You chose: ${picked.join(' → ')}` : `${name}'s story is yours to steer. There are no wrong doors!`} />
    {loading && <p className="cheer">Muse Spark is writing the next page…</p>}
    {scene && <><p className="story storyScene">{name} {scene.scene}</p><p className="ask">Which way, storyteller?</p>
      <div className="doorRow"><button className="btn doorBtn" onClick={() => pick(scene.a)}>🚪 {scene.a}</button><button className="btn doorBtn alt" onClick={() => pick(scene.b)}>🚪 {scene.b}</button></div></>}
    </section>)
}
