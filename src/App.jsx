import { useEffect, useMemo, useRef, useState } from 'react'
import { TEAS, TYPES, FAQ, fmt } from './data.js'

function bell() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)()
    const o = c.createOscillator(), g = c.createGain()
    o.frequency.value = 880; o.connect(g); g.connect(c.destination)
    g.gain.setValueAtTime(0.25, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.6)
    o.start(); o.stop(c.currentTime + 1.6)
  } catch {}
}

function Timer() {
  const [id, setId] = useState(TEAS[0].id)
  const tea = TEAS.find(t => t.id === id)
  const [left, setLeft] = useState(tea.sec)
  const [run, setRun] = useState(false)
  const done = useRef(false)

  useEffect(() => { setRun(false); setLeft(tea.sec); done.current = false }, [id])
  useEffect(() => {
    if (!run) return
    const t = setInterval(() => setLeft(l => l - 1), 1000)
    return () => clearInterval(t)
  }, [run])
  useEffect(() => {
    if (run && left <= 0 && !done.current) { done.current = true; setRun(false); bell() }
  }, [left, run])

  const R = 70, C = 2 * Math.PI * R
  const mm = String(Math.floor(Math.max(left, 0) / 60)).padStart(2, '0')
  const ss = String(Math.max(left, 0) % 60).padStart(2, '0')
  const finished = left <= 0

  return (
    <div className="timer" role="group" aria-label="Таймер заваривания">
      <svg viewBox="0 0 160 160" className="ring" aria-hidden="true">
        <circle cx="80" cy="80" r={R} className="ring-bg" />
        <circle cx="80" cy="80" r={R} className="ring-fg" strokeDasharray={C}
          strokeDashoffset={C * (1 - Math.max(left, 0) / tea.sec)} />
      </svg>
      <div className="clock" aria-live="off">
        <b>{mm}:{ss}</b>
        <span>{finished ? 'Готово! Наливайте' : `${tea.temp}°C · первая проливка`}</span>
      </div>
      <label className="sel">
        <span>Что завариваем</span>
        <select value={id} onChange={e => setId(+e.target.value)}>
          {TEAS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <div className="row">
        <button className="btn yellow" onClick={() => { if (finished) { setLeft(tea.sec); done.current = false } setRun(r => !r) }}>
          {run ? 'Пауза' : finished ? 'Заварить снова' : 'Запустить'}
        </button>
        <button className="btn ghost" onClick={() => { setRun(false); setLeft(tea.sec); done.current = false }}>Сбросить</button>
      </div>
    </div>
  )
}

function Ticket({ t, onAdd, added }) {
  return (
    <article className="ticket">
      <div className="route">
        <span>{t.from}</span><i aria-hidden="true" /><span>{t.to}</span>
      </div>
      <h3>{t.name}</h3>
      <p className="meta">{t.type} · {t.origin}</p>
      <p>{t.note}</p>
      <div className="perf" aria-hidden="true" />
      <div className="buy">
        <div><b>{fmt(t.price)}</b><small>50 г · {t.temp}°C · {t.sec >= 60 ? `${Math.round(t.sec / 60)} мин` : `${t.sec} с`}</small></div>
        <button className={'btn ' + (added ? 'ok' : 'green')} onClick={() => onAdd(t.id)}>{added ? 'Добавлено' : 'В багаж'}</button>
      </div>
    </article>
  )
}

function Cart({ open, onClose, cart, setCart }) {
  const items = TEAS.filter(t => cart[t.id]).map(t => ({ ...t, qty: cart[t.id] }))
  const sum = items.reduce((s, t) => s + t.price * t.qty, 0)
  const free = 3000
  const [f, setF] = useState({ name: '', phone: '', city: '' })
  const [err, setErr] = useState({})
  const [sent, setSent] = useState(false)
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const change = (id, d) => setCart(c => {
    const n = (c[id] || 0) + d, x = { ...c }
    if (n <= 0) delete x[id]; else x[id] = Math.min(n, 20)
    return x
  })
  const submit = e => {
    e.preventDefault()
    const er = {}
    if (f.name.trim().length < 2) er.name = 'Введите имя'
    if (f.phone.replace(/\D/g, '').length < 10) er.phone = 'Введите телефон полностью'
    if (f.city.trim().length < 2) er.city = 'Укажите город доставки'
    setErr(er)
    if (!Object.keys(er).length) { setSent(true); setCart({}) }
  }
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])

  return (
    <>
      <div className={'veil' + (open ? ' on' : '')} onClick={onClose} />
      <aside className={'drawer' + (open ? ' on' : '')} aria-hidden={!open} aria-label="Корзина">
        <header><h2>Ваш багаж</h2><button className="x" onClick={onClose} aria-label="Закрыть">✕</button></header>
        {sent ? (
          <div className="empty"><h3>Заказ принят!</h3><p>Спасибо, {f.name}. Мы позвоним на {f.phone}, чтобы подтвердить доставку в город {f.city}.</p>
            <button className="btn green" onClick={() => { setSent(false); setF({ name: '', phone: '', city: '' }); onClose() }}>Вернуться к чаю</button></div>
        ) : !items.length ? (
          <div className="empty"><h3>Пока пусто</h3><p>Добавьте чай из каталога — он появится здесь.</p></div>
        ) : (
          <>
            <ul className="lines">
              {items.map(t => (
                <li key={t.id}>
                  <div><b>{t.name}</b><small>{fmt(t.price)} × {t.qty}</small></div>
                  <div className="qty">
                    <button onClick={() => change(t.id, -1)} aria-label="Меньше">−</button>
                    <span>{t.qty}</span>
                    <button onClick={() => change(t.id, 1)} aria-label="Больше">+</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="bar" aria-hidden="true"><i style={{ width: Math.min(100, sum / free * 100) + '%' }} /></div>
            <p className="hint">{sum >= free ? 'Доставка бесплатная' : `До бесплатной доставки: ${fmt(free - sum)}`}</p>
            <form onSubmit={submit} noValidate>
              {[['name', 'Имя', 'text'], ['phone', 'Телефон', 'tel'], ['city', 'Город', 'text']].map(([k, l, ty]) => (
                <label key={k}>{l}
                  <input type={ty} value={f[k]} onChange={e => set(k, e.target.value)} placeholder={k === 'phone' ? '+7 900 000-00-00' : ''} aria-invalid={!!err[k]} />
                  {err[k] && <em>{err[k]}</em>}
                </label>
              ))}
              <button className="btn yellow wide">Оформить заказ · {fmt(sum + (sum >= free ? 0 : 290))}</button>
              <small className="hint">{sum >= free ? '' : 'Включая доставку 290 ₽'}</small>
            </form>
          </>
        )}
      </aside>
    </>
  )
}

export default function App() {
  const [type, setType] = useState('Все')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('def')
  const [open, setOpen] = useState(false)
  const [flash, setFlash] = useState(null)
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('cart')) || {} } catch { return {} } })
  const [faq, setFaq] = useState(0)

  useEffect(() => { try { localStorage.setItem('cart', JSON.stringify(cart)) } catch {} }, [cart])
  const count = Object.values(cart).reduce((a, b) => a + b, 0)

  const list = useMemo(() => {
    let r = TEAS.filter(t => (type === 'Все' || t.type === type) && (t.name + t.origin + t.note).toLowerCase().includes(q.trim().toLowerCase()))
    if (sort === 'up') r = [...r].sort((a, b) => a.price - b.price)
    if (sort === 'down') r = [...r].sort((a, b) => b.price - a.price)
    return r
  }, [type, q, sort])

  const add = id => {
    setCart(c => ({ ...c, [id]: Math.min((c[id] || 0) + 1, 20) }))
    setFlash(id); setTimeout(() => setFlash(null), 900)
  }

  return (
    <>
      <header className="top">
        <a href="#top" className="logo">Чайный экспресс</a>
        <nav>
          <a href="#timer">Таймер</a><a href="#catalog">Каталог</a><a href="#faq">Вопросы</a>
        </nav>
        <button className="cartbtn" onClick={() => setOpen(true)}>Багаж{count > 0 && <span>{count}</span>}</button>
      </header>

      <main id="top">
        <section className="hero">
          <div>
            <h1>Чай, который<br />приезжает издалека</h1>
            <p>Восемь сортов рассыпного чая от небольших ферм. Каждый — со своим маршрутом, температурой воды и временем заваривания.</p>
            <div className="row">
              <a className="btn yellow" href="#catalog">Выбрать чай</a>
              <a className="btn ghost light" href="#timer">Заварить прямо сейчас</a>
            </div>
          </div>
          <div id="timer"><Timer /></div>
        </section>

        <section id="catalog" className="sec">
          <div className="head">
            <h2>Каталог</h2>
            <div className="tools">
              <input type="search" placeholder="Поиск: улун, мёд, Китай…" value={q} onChange={e => setQ(e.target.value)} aria-label="Поиск" />
              <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Сортировка">
                <option value="def">По умолчанию</option><option value="up">Сначала дешёвые</option><option value="down">Сначала дорогие</option>
              </select>
            </div>
          </div>
          <div className="chips" role="tablist">
            {TYPES.map(t => <button key={t} role="tab" aria-selected={type === t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{t}</button>)}
          </div>
          {list.length ? (
            <div className="grid">{list.map(t => <Ticket key={t.id} t={t} onAdd={add} added={flash === t.id} />)}</div>
          ) : (
            <p className="none">Ничего не нашли. Попробуйте другое слово или сбросьте фильтр.</p>
          )}
        </section>

        <section className="sec perks">
          <div><h3>Свежий урожай</h3><p>Берём чай напрямую у ферм и не держим дольше года.</p></div>
          <div><h3>Пробники в подарок</h3><p>К каждому заказу добавляем 10 г случайного сорта.</p></div>
          <div><h3>Бесплатно от 3 000 ₽</h3><p>Ниже этой суммы доставка — 290 ₽ по всей России.</p></div>
        </section>

        <section id="faq" className="sec">
          <h2>Вопросы и ответы</h2>
          <div className="faq">
            {FAQ.map(([a, b], i) => (
              <div key={i} className={faq === i ? 'it on' : 'it'}>
                <button aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}>{a}<span>{faq === i ? '−' : '+'}</span></button>
                {faq === i && <p>{b}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <b>Чайный экспресс</b>
        <span>Ежедневно с 10:00 до 20:00 · hello@chai-express.example</span>
      </footer>
      <Cart open={open} onClose={() => setOpen(false)} cart={cart} setCart={setCart} />
    </>
  )
}
