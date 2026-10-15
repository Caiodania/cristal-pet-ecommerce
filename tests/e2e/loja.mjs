// Teste de ponta a ponta da loja em Chrome real (DevTools Protocol), com mouse,
// teclado e toque de verdade. Percorre: vitrine → configurador (foto, prévia) →
// carrinho → pedido → acompanhamento → painel do dono (login, lista, detalhe,
// arquivo 3D, status, anotações) e varre contraste e nomes acessíveis em cada
// estado. Não precisa de nenhuma conta: usa a IA simulada.
//
//   1. npm run build
//   2. ADMIN_PASSWORD=senha-de-teste PREVIEWS_PER_DAY_PER_IP=100 npm run dev:full   (outro terminal)
//      (cada rodada gera 3 prévias; sem subir o limite por rede, a 3ª rodada
//       seguida bate na cota de 8 por IP, que está funcionando como deveria)
//   3. ADMIN_PASSWORD=senha-de-teste npm run test:e2e              (desktop)
//      ADMIN_PASSWORD=senha-de-teste npm run test:e2e -- 390 844 1 (celular)
//
// Argumentos opcionais: <largura> <altura> <celular:0|1> <porta do Chrome>
// Variáveis: BASE_URL (padrão http://localhost:8888), CHROME_PATH (caminho do
// Chrome), SHOT_DIR (pasta para salvar capturas de tela dos passos principais).
// O servidor guarda os pedidos em memória: reinicie-o entre rodadas se quiser a
// lista do painel zerada (o teste funciona nos dois casos).
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const [W = '1366', H = '900', mobileArg = '0', portArg = '9700'] = process.argv.slice(2)
const base = process.env.BASE_URL ?? 'http://localhost:8888'
const adminPassword = process.env.ADMIN_PASSWORD
if (!adminPassword) { console.error('Defina ADMIN_PASSWORD (a mesma do servidor).'); process.exit(2) }
const photoPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/pets/lulu-creme-gravata-branca.webp')
const width = Number(W), height = Number(H), mobile = mobileArg === '1', port = Number(portArg)

const chromePath = process.env.CHROME_PATH ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p))
if (!chromePath) { console.error('Chrome não encontrado. Defina CHROME_PATH.'); process.exit(2) }

const chrome = spawn(chromePath,
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--mute-audio',
   `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(path.join(tmpdir(), 'cdp-'))}`,
   `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 60 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page') } catch {}
  if (!target) await sleep(300)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let id = 0
const pending = new Map()
const problems = []
let phase = 'carga'
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return }
  const ignore = (t) => /preloaded using link preload|favicon/.test(t)
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
    const t = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
    if (!ignore(t)) problems.push(`[${phase}] console.${m.params.type}: ` + t.slice(0, 220))
  }
  if (m.method === 'Runtime.exceptionThrown') problems.push(`[${phase}] exceção: ` + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 220))
  if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(m.params.entry.level)) {
    const t = m.params.entry.text + ' ' + (m.params.entry.url || '')
    if (!ignore(t)) problems.push(`[${phase}] log.${m.params.entry.level}: ` + t.slice(0, 200))
  }
}
const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })) })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error('evaluate: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300) + ' em: ' + expression.slice(0, 140))
  return r.result?.result?.value
}
const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok: Boolean(ok), detail }); if (!ok) console.log('  ✗', name, detail) }

const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, ...extra })
const tap = async (x, y) => {
  if (mobile) { await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) }
  else { await mouse('mouseMoved', x, y, { button: 'none', clickCount: 0 }); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y) }
}
const KEYS = { Escape: [27], Enter: [13, '\r'], Tab: [9] }
const key = async (k) => { const [vk, text] = KEYS[k]
  await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(text ? { text } : {}) })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }) }

// centro de um elemento achado por seletor e, opcionalmente, por texto
const find = (sel, text) => `(() => { const all = [...document.querySelectorAll(${JSON.stringify(sel)})]; const e = ${text ? `all.find(x => x.textContent.replace(/\\s+/g,' ').trim().includes(${JSON.stringify(text)}))` : 'all[0]'}; if (!e) return null; e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, disabled: !!e.disabled } })()`
const click = async (sel, text) => {
  const p = await evaluate(find(sel, text))
  if (!p) throw new Error(`não achei ${sel} ${text ?? ''}`)
  await tap(p.x, p.y); await sleep(250); return p
}
const waitFor = async (expr, ms = 20000, label = expr) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { try { if (await evaluate(expr)) return true } catch {} ; await sleep(250) }
  throw new Error('timeout esperando: ' + label.slice(0, 140))
}
const type = async (selector, text) => {
  await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:'center',behavior:'instant'}); e.focus(); e.select?.() })()`)
  await send('Input.insertText', { text }); await sleep(120)
}
const go = async (p) => { await send('Page.navigate', { url: base + p }); await sleep(2500) }
const text = () => evaluate('document.body.innerText')
import { mkdirSync, writeFileSync as wf } from 'node:fs'
const shotDir = process.env.SHOT_DIR
if (shotDir) mkdirSync(shotDir, { recursive: true })
// varredura de acessibilidade do estado atual da tela: contraste de texto e nomes acessíveis
const SCAN = `(() => {
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 } };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const blend = (f, b) => ({ r: f.a * f.r + (1 - f.a) * b.r, g: f.a * f.g + (1 - f.a) * b.g, b: f.a * f.b + (1 - f.a) * b.b, a: 1 });
  const bgOf = (el) => { let e = el; while (e) { const s = getComputedStyle(e); if (s.backgroundImage !== 'none' && !s.backgroundImage.startsWith('radial')) return null; const c = parse(s.backgroundColor); if (c && c.a > 0.5) return c; e = e.parentElement } return { r: 250, g: 249, b: 245, a: 1 } };
  const contrast = [], seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('video, dialog:not([open])')) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none') continue;
    const bg = bgOf(el); if (!bg) continue;
    const f0 = parse(s.color); if (!f0) continue;
    const fg = blend({ ...f0, a: f0.a * (parseFloat(s.opacity) || 1) }, bg);
    const L1 = lum(fg) + 0.05, L2 = lum(bg) + 0.05, ratio = Math.max(L1, L2) / Math.min(L1, L2);
    const size = parseFloat(s.fontSize), bold = parseInt(s.fontWeight) >= 700, large = size >= 24 || (size >= 18.66 && bold);
    if (ratio < (large ? 3 : 4.5)) { const k = el.textContent.trim().slice(0, 30) + ratio.toFixed(1); if (!seen.has(k)) { seen.add(k); contrast.push(ratio.toFixed(2) + ':1 "' + el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40) + '"') } }
  }
  const nameOf = (el) => (el.getAttribute('aria-label') || '').trim() || (el.getAttribute('aria-labelledby') ? 'ok' : '') || (el.labels && el.labels.length ? 'ok' : '') || el.textContent.trim() || (el.querySelector('img[alt]:not([alt=""])') ? 'ok' : '') || (el.getAttribute('title') || '').trim();
  const unnamed = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button]')]
    .filter((el) => el.getClientRects().length > 0 || el.matches('input.sr-only, input[type=file], input[type=radio]'))
    .filter((el) => !nameOf(el)).map((el) => el.tagName.toLowerCase() + (el.name ? '[' + el.name + ']' : '') + (el.type ? ':' + el.type : ''));
  const imgsNoAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length;
  const h1 = document.querySelectorAll('h1').length;
  const overflow = document.documentElement.scrollWidth - innerWidth;
  const small = [...document.querySelectorAll('button, a[href], input[type=checkbox], summary')].filter((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.display !== 'inline' && Math.min(r.width, r.height) < 24 }).map((el) => (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 25));
  return { contrast, unnamed, imgsNoAlt, h1, overflow, small };
})()`
const scan = async (name) => {
  const r = await evaluate(SCAN)
  check(`a11y [${name}]: contraste AA`, r.contrast.length === 0, r.contrast.join(' | '))
  check(`a11y [${name}]: controles com nome acessível, imagens com alt`, r.unnamed.length === 0 && r.imgsNoAlt === 0, JSON.stringify({ semNome: r.unnamed, imgsSemAlt: r.imgsNoAlt }))
  check(`a11y [${name}]: sem rolagem horizontal e alvos de toque ≥ 24 px`, r.overflow <= 0 && r.small.length === 0, JSON.stringify({ overflow: r.overflow, pequenos: r.small }))
}
const shot = async (name, full = false) => {
  await scan(name)
  if (!shotDir) return
  await sleep(500)
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(full ? { clip: { x: 0, y: 0, width, height: Math.min(await evaluate('document.documentElement.scrollHeight'), 4000), scale: 1 } } : {}) })
  wf(path.join(shotDir, (mobile ? 'm-' : 'd-') + name + '.png'), Buffer.from(r.result.data, 'base64'))
}

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable'); await send('DOM.enable')
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
const version = (await send('Browser.getVersion')).result?.product

const setFile = async (selector, file) => {
  const doc = await send('DOM.getDocument', { depth: -1 })
  const node = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector })
  await send('DOM.setFileInputFiles', { files: [file], nodeId: node.result.nodeId })
}

try {
  // ───────── 1. vitrine ─────────
  phase = 'vitrine'
  await go('/')
  const home = await evaluate(`({ h1: document.querySelectorAll('h1').length, title: document.title, cta: [...document.querySelectorAll('a')].filter(a => /Criar minha escultura/.test(a.textContent)).map(a => a.getAttribute('href')), banner: document.querySelector('[role=status]')?.textContent || '', text: document.body.innerText })`)
  check('vitrine: 1 h1 e CTA "Criar minha escultura" leva a /personalizar', home.h1 === 1 && home.cta.length >= 2 && home.cta.every((h) => h.startsWith('/personalizar')), JSON.stringify(home.cta))
  check('vitrine: sem conteúdo institucional (banho e tosa, franquia, filhotes…)', !/banho e tosa|franquia|filhote|unidade móvel|IPOPE/i.test(home.text.replace(/Agendar/g, '')))
  await waitFor(`document.querySelector('[role=status]')?.textContent.includes('Modo demonstração')`, 8000)
  check('banner "Modo demonstração" aparece (IA simulada)', true)
  const tamanho = await evaluate(`[...document.querySelectorAll('#tamanhos a')].map(a => a.getAttribute('href'))`)
  check('cartões de tamanho levam ao configurador já com o tamanho', tamanho.length === 3 && tamanho.every((h) => /personalizar\?tamanho=/.test(h)), JSON.stringify(tamanho))

  // ───────── 2. configurador ─────────
  phase = 'configurador'
  await go('/personalizar?tamanho=media')
  const pre = await evaluate(`({ checked: document.querySelector('input[name=tamanho]:checked')?.value, stepText: document.querySelector('[aria-current=step]')?.textContent })`)
  check('configurador: tamanho vindo da vitrine já vem marcado', pre.checked === 'media', JSON.stringify(pre))
  await shot('01-tamanho')
  const next = () => click('button', 'Continuar')
  await next() // → tipo
  const noPose = await evaluate(find('button', 'Continuar'))
  check('"Continuar" fica desabilitado até escolher o tipo', noPose.disabled === true)
  await click('label:has(input[value=sentado])') ; await next() // → cor
  await click('label:has(input[value=cinza])'); await next() // → nome
  await type('input[maxlength="30"]', 'Thor'); await next() // → foto
  await shot('02-foto-vazia')
  check('chegou à etapa da foto', (await text()).includes('Envie a foto do seu pet'))
  check('sem foto, o botão "Gerar a prévia" fica desabilitado', (await evaluate(find('button', 'Gerar a prévia'))).disabled === true)
  await setFile('input[type=file]', photoPath)
  await waitFor(`!!document.querySelector('img[alt="A foto que você escolheu"]')`, 15000, 'miniatura da foto')
  const thumb = await evaluate(`(() => { const i = document.querySelector('img[alt="A foto que você escolheu"]'); return { ok: i.naturalWidth > 0, src: i.src.slice(0, 5) } })()`)
  check('a foto foi aceita e aparece em miniatura (blob local)', thumb.ok && thumb.src === 'blob:')
  await shot('03-foto-escolhida')
  const summary = await evaluate(`document.querySelector('aside[aria-label^="Resumo"]')?.innerText`)
  check('resumo mostra tamanho, tipo, cor e nome', /Média/.test(summary) && /Sentado/.test(summary) && /Cinza/.test(summary) && /Thor/.test(summary), summary?.replace(/\n/g, ' | '))

  await click('button', 'Gerar a prévia')
  await waitFor(`document.body.innerText.includes('Gerando a prévia') || document.body.innerText.includes('Enviando a foto')`, 8000, 'estado de geração')
  await shot('04-gerando')
  check('mostra o progresso da geração (anunciado por role=status)', await evaluate(`!!document.querySelector('[role=status] progress')`))
  await waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('Gostei'))`, 30000, 'prévia pronta')
  await waitFor(`(() => { const i = document.querySelector('img[alt^="Prévia da escultura"]'); return !!i && i.complete && i.naturalWidth > 0 })()`, 8000, 'imagem da prévia carregada')
  const prev = await evaluate(`(() => { const i = document.querySelector('img[alt^="Prévia da escultura"]'); return { ok: !!i && i.naturalWidth > 0, src: i?.getAttribute('src'), alt: i?.alt } })()`)
  await shot('05-previa-pronta')
  check('a prévia pronta aparece, com alt descritivo', prev.ok && /Thor/.test(prev.alt), JSON.stringify(prev))
  check('a imagem vem do servidor por link assinado', /\/api\/files\//.test(prev.src))
  check('aviso de imagem de demonstração', (await text()).includes('Imagem de demonstração'))
  check('mostra quantas prévias ainda restam hoje', /Você ainda pode gerar 2 prévias hoje/.test(await text()), (await text()).match(/Você ainda[^.]*\./)?.[0])

  // gerar outra (mesma foto, sem novo upload)
  const uploadsBefore = await evaluate(`performance.getEntriesByType('resource').filter(r => /\\/photo$/.test(r.name)).length`)
  await click('button', 'Gerar outra')
  await waitFor(`document.body.innerText.includes('Gerando a prévia')`, 8000)
  await waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('Gostei'))`, 30000)
  const uploadsAfter = await evaluate(`performance.getEntriesByType('resource').filter(r => /\\/photo$/.test(r.name)).length`)
  check('"Gerar outra" reaproveita a foto (nenhum novo upload)', uploadsAfter === uploadsBefore, `uploads ${uploadsBefore}→${uploadsAfter}`)
  check('a contagem de prévias restantes cai para 1', /ainda pode gerar 1 prévia hoje/.test(await text()))

  // mudar opções invalida a prévia antiga
  await click('button', 'Mudar as opções')
  await click('label:has(input[value=pequena])')
  for (let i = 0; i < 4; i++) await click('button', 'Continuar')
  check('opção mudada: o botão passa a "Gerar a prévia" (a prévia antiga não vale)', !!(await evaluate(find('button', 'Gerar a prévia'))) && !(await evaluate(find('button', 'Ver a prévia'))))
  await click('nav[aria-label="Etapas da escultura"] button', 'Voltar para a etapa 1')
  await click('label:has(input[value=media])')
  for (let i = 0; i < 4; i++) await click('button', 'Continuar')
  check('de volta às opções da prévia: o botão vira "Ver a prévia" (sem gerar de novo)', !!(await evaluate(find('button', 'Ver a prévia'))))
  await click('button', 'Ver a prévia')
  await waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('Gostei'))`, 8000, 'prévia à vista')
  await click('button', 'Gostei')
  await waitFor(`document.body.innerText.includes('adicionada ao carrinho')`, 5000)
  check('"Gostei!" adiciona ao carrinho', true)
  const badge = await evaluate(`document.querySelector('header a[href="/carrinho"]')?.getAttribute('aria-label')`)
  check('o ícone do carrinho passa a mostrar 1 escultura', /1 escultura/.test(badge), badge)

  // ───────── 3. carrinho e pedido ─────────
  phase = 'carrinho'
  await go('/carrinho')
  await waitFor(`!!document.querySelector('img[alt^="Prévia da escultura"]')`, 10000, 'imagem do item no carrinho')
  await shot('06-carrinho')
  check('carrinho mostra a escultura com imagem', (await text()).includes('Escultura de Thor'))
  await click('button', 'Enviar pedido')
  await sleep(500)
  const errs = await evaluate(`({ invalid: [...document.querySelectorAll('[aria-invalid=true]')].map(e => e.name || e.type), alerts: [...document.querySelectorAll('[role=alert]')].map(a => a.textContent), focusedName: document.activeElement?.name })`)
  check('enviar vazio: mostra erros no nome e no aceite, e foca o primeiro', errs.invalid.includes('name') && errs.invalid.includes('checkbox') && errs.focusedName === 'name', JSON.stringify(errs))
  await shot('07-carrinho-erros')
  await type('input[name=name]', 'Maria Souza')
  await type('input[name=phone]', '(19) 99999-1234')
  await type('input[name=city]', 'Indaiatuba')
  await click('input[type=checkbox]')
  await click('button', 'Enviar pedido')
  await waitFor(`document.body.innerText.includes('Pedido registrado')`, 15000, 'pedido registrado')
  await shot('08-pedido-enviado')
  const sent = await evaluate(`({ code: document.body.innerText.match(/CP-[A-Z0-9]{6}/)?.[0], wa: [...document.querySelectorAll('a')].find(a => /Enviar o pedido pelo WhatsApp/.test(a.textContent))?.href, track: [...document.querySelectorAll('a')].find(a => /Ver o pedido/.test(a.textContent))?.getAttribute('href') })`)
  check('pedido registrado com código CP-XXXXXX', /^CP-[A-Z0-9]{6}$/.test(sent.code ?? ''), sent.code)
  const msg = decodeURIComponent(sent.wa.split('text=')[1] ?? '')
  check('mensagem do WhatsApp traz o código, a escultura e o link de acompanhamento', msg.includes(sent.code) && /1x Média · Sentado · Cinza · "Thor"/.test(msg) && /Acompanhar: http.*\/pedido\?c=.*&t=/.test(msg), msg.replace(/\n/g, ' ⏎ '))
  check('o link do WhatsApp vai para o número da loja, em nova aba', /^https:\/\/wa\.me\/5519971548471\?text=/.test(sent.wa))
  const after = await evaluate(`({ cart: localStorage.getItem('cp:carrinho:v1'), orders: JSON.parse(localStorage.getItem('cp:pedidos:v1') || '[]') })`)
  check('carrinho esvaziou e o pedido ficou no histórico deste aparelho', JSON.parse(after.cart).length === 0 && after.orders[0]?.code === sent.code)

  // ───────── 4. acompanhar ─────────
  phase = 'acompanhar'
  await go(sent.track)
  await waitFor(`document.body.innerText.includes('Andamento')`, 10000, 'página do pedido')
  const order = await evaluate(`({ t: document.body.innerText, img: !!document.querySelector('img[alt^="Prévia da escultura"]') })`)
  await shot('09-pedido-cliente')
  check('página do pedido: código, status "Pedido recebido", escultura e imagem', order.t.includes(sent.code) && order.t.includes('PEDIDO RECEBIDO') && order.t.includes('Escultura de Thor') && order.img)
  check('o cliente NÃO vê o telefone nem anotações internas', !order.t.includes('99999-1234') && !order.t.includes('19999991234'))
  await go('/pedido?c=CP-AAAAAA&t=errado')
  await waitFor(`document.body.innerText.includes('não encontrado')`, 8000)
  check('código/token errado: mensagem de pedido não encontrado', true)
  await go('/meus-pedidos')
  await waitFor(`document.body.innerText.includes('PEDIDO RECEBIDO')`, 10000, 'status em meus pedidos')
  check('"Meus pedidos" lista o pedido com o status atual', (await text()).includes(sent.code))
  await shot('09b-meus-pedidos')
  await go('/'); await waitFor(`document.querySelectorAll('h1').length === 1`, 8000); await shot('00-vitrine')
  await go('/contato'); await shot('00-contato')

  // ───────── 5. painel do dono ─────────
  phase = 'painel'
  await send('Network.clearBrowserCookies')
  await go('/admin')
  await waitFor(`!!document.querySelector('input[type=password]')`, 8000, 'tela de login')
  await shot('10-admin-login')
  check('painel sem login: só mostra o formulário de senha', !(await text()).includes('Pedidos'))
  await type('input[type=password]', 'senha-errada')
  await click('button', 'Entrar')
  await waitFor(`document.body.innerText.includes('Senha incorreta')`, 8000)
  check('senha errada: mostra erro e não entra', true)
  await type('input[type=password]', adminPassword)
  await click('button', 'Entrar')
  await waitFor(`document.body.innerText.includes('Buscar pedido')`, 10000, 'dashboard')
  await shot('11-admin-lista')
  const dash = await evaluate(`({ t: document.body.innerText, rows: document.querySelectorAll('.orders-table tbody tr').length, th: document.querySelectorAll('.orders-table th').length })`)
  check('painel: lista o pedido novo, com cliente e status "Novo"', dash.rows >= 1 && dash.t.includes(sent.code) && dash.t.includes('Maria Souza') && /NOVO/.test(dash.t))
  const cookieFlags = await send('Network.getCookies', { urls: [base] })
  const ck = cookieFlags.result.cookies.find((c) => c.name === 'cp_admin')
  check('cookie do painel: HttpOnly e SameSite=Strict', ck && ck.httpOnly && ck.sameSite === 'Strict', JSON.stringify(ck && { httpOnly: ck.httpOnly, sameSite: ck.sameSite }))
  check('o JavaScript da página não enxerga o cookie do painel', !(await evaluate('document.cookie')).includes('cp_admin'))
  await type('input[type=search]', 'inexistente')
  await waitFor(`document.body.innerText.includes('Nenhum pedido com esse filtro')`, 5000)
  check('busca sem resultado mostra mensagem', true)
  await type('input[type=search]', 'souza')
  await waitFor(`document.querySelectorAll('.orders-table tbody tr').length >= 1`, 5000)
  check('busca por nome encontra o pedido', true)
  await type('input[type=search]', sent.code)
  await waitFor(`document.querySelectorAll('.orders-table tbody tr').length === 1`, 5000)
  check('busca pelo código encontra exatamente o pedido', true)

  await click('.orders-table a', sent.code)
  await waitFor(`document.body.innerText.includes('Anotações internas')`, 10000, 'detalhe do pedido')
  await shot('12-admin-detalhe', true)
  const detail = await evaluate(`document.body.innerText`)
  check('detalhe: telefone, cidade, esculturas e valor', /Maria Souza/.test(detail) && /Indaiatuba/.test(detail) && /Média/.test(detail) && /Sentado/.test(detail) && /A combinar/.test(detail))
  check('detalhe: foto original e prévia aprovada lado a lado', (await evaluate(`document.querySelectorAll('button[aria-label^="Ampliar"]').length`)) === 2)
  await click('button[aria-label="Ampliar: Foto original"]')
  await waitFor(`!!document.querySelector('dialog[open]')`, 5000)
  check('foto original amplia no lightbox', true)
  await key('Escape'); await sleep(400)

  await click('button', 'Gerar arquivo 3D')
  await waitFor(`document.body.innerText.includes('Gerando o arquivo 3D')`, 8000)
  await waitFor(`[...document.querySelectorAll('a')].some(a => /Baixar STL/.test(a.textContent))`, 30000, 'STL pronto')
  const stlHref = await evaluate(`[...document.querySelectorAll('a')].find(a => /Baixar STL/.test(a.textContent)).href`)
  const stl = await evaluate(`fetch(${JSON.stringify(stlHref)}).then(async r => ({ status: r.status, disp: r.headers.get('content-disposition'), body: (await r.text()).slice(0, 40) }))`)
  check('arquivo 3D: gera, mostra "Baixar STL" e o arquivo baixa como STL com o nome do pedido', stl.status === 200 && stl.body.startsWith('solid ') && stl.disp.includes(`${sent.code}-Thor.stl`), JSON.stringify(stl))
  check('arquivo 3D de teste é avisado como demonstração', (await text()).includes('Arquivo de teste (modo demonstração)'))

  await shot('13-admin-3d-pronto', true)
  await type('input[maxlength="300"]', 'Pix recebido')
  await click('button', 'Confirmar pedido')
  await waitFor(`document.body.innerText.includes('CONFIRMADO')`, 8000, 'status confirmado')
  check('painel: confirmar muda o status e mostra os próximos passos', /Iniciar produção/.test(await text()))
  await type('textarea', 'Cliente prefere retirar')
  await click('button', 'Salvar anotação')
  await waitFor(`document.body.innerText.includes('Salvo.')`, 5000)
  check('anotação interna salva', true)

  await go(sent.track)
  await waitFor(`document.body.innerText.includes('PEDIDO CONFIRMADO')`, 10000, 'cliente vê confirmado')
  const cust = await text()
  check('o cliente vê "Pedido confirmado" e o recado, mas não as anotações internas', cust.includes('Pix recebido') && !cust.includes('Cliente prefere retirar') && !/Arquivo 3D/.test(cust))

  // sair do painel
  await go('/admin')
  await waitFor(`document.body.innerText.includes('Buscar pedido')`, 8000)
  await click('button', 'Sair')
  await waitFor(`!!document.querySelector('input[type=password]')`, 8000)
  check('"Sair" volta ao login', true)

  // ───────── 6. falhas pelo nome do pet (gatilhos do modo demonstração) ─────────
  phase = 'falhas'
  await go('/personalizar?tamanho=grande')
  await click('button', 'Continuar'); await click('label:has(input[value=busto])'); await click('button', 'Continuar')
  await click('label:has(input[value=preto])'); await click('button', 'Continuar')
  await type('input[maxlength="30"]', 'recusar'); await click('button', 'Continuar')
  await setFile('input[type=file]', photoPath)
  await waitFor(`!!document.querySelector('img[alt="A foto que você escolheu"]')`, 15000)
  await click('button', 'Gerar a prévia')
  await waitFor(`document.body.innerText.includes('Foto recusada')`, 30000, 'foto recusada')
  await shot('14-foto-recusada')
  check('foto recusada: explica e oferece "Escolher outra foto" (sem "Tentar de novo")', /Escolher outra foto/.test(await text()) && !/Tentar de novo/.test(await text()))
} catch (error) {
  check('execução sem exceção', false, String(error.message))
}

const fails = results.filter((r) => !r.ok)
console.log(`\n=== ${mobile ? 'CELULAR' : 'DESKTOP'} ${width}x${height} | ${version} ===`)
console.log(`${results.length - fails.length}/${results.length} verificações ok`)
for (const r of results) console.log(`${r.ok ? 'OK   ' : 'FALHA'} ${r.name}${!r.ok && r.detail ? '  → ' + r.detail : ''}`)
const uniq = [...new Set(problems)]
console.log(uniq.length ? `\nProblemas de console (${uniq.length}):\n` + uniq.join('\n') : '\nConsole limpo (sem erros nem avisos).')
ws.close(); chrome.kill(); process.exit(fails.length ? 1 : 0)
