// Teste de ponta a ponta da loja em Chrome real (DevTools Protocol), com mouse,
// teclado e toque de verdade. Percorre: vitrine → configurador (foto, prévia) →
// carrinho (com endereço de entrega) → pedido → acompanhamento → painel do dono
// (só aparece para a conta do dono: lista, endereço, fotos, arquivo 3D, status,
// anotações) e varre contraste e nomes acessíveis em cada estado. Não precisa
// de nenhuma conta real: usa a IA simulada e contas na memória do servidor.
//
//   1. npm run build
//   2. ADMIN_EMAILS=dono@exemplo.com PREVIEWS_PER_DAY_PER_IP=100 MOCK_DELAY_MS=2500 npm run dev:full   (outro terminal)
//      (cada rodada gera 3 prévias; sem subir o limite por rede, a 3ª rodada
//       seguida bate na cota de 8 por IP, que está funcionando como deveria)
//   3. npm run test:e2e                (desktop)
//      npm run test:e2e -- 390 844 1   (celular)
//   Se usar outro e-mail de dono, passe o mesmo em OWNER_EMAIL.
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
// o dono é a conta cujo e-mail está em ADMIN_EMAILS no servidor (não há senha do painel)
const ownerEmail = process.env.OWNER_EMAIL ?? 'dono@exemplo.com'
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
const stamp = Date.now()
const accountEmail = `e2e-${stamp}@exemplo.com`
const accountPassword = 'senha-e2e-2026'
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
    // componentes inativos (desabilitados) e enfeites escondidos da leitura (aria-hidden: números
    // em marca-d'água, faixa que rola, selo giratório) não têm requisito de contraste (WCAG 1.4.3)
    if (el.closest('video, dialog:not([open]), :disabled, [aria-disabled="true"], [aria-hidden="true"]')) continue;
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
  await waitFor(`!!document.querySelector('header button[aria-label="Faça login"]')`, 8000, 'botão "Faça login" no cabeçalho')
  check('visitante navega sem conta: o cabeçalho mostra "Faça login" (e não "Minha conta")', !(await evaluate(`!!document.querySelector('header button[aria-label="Minha conta"]')`)))
  await waitFor(`document.querySelector('[role=status]')?.textContent.includes('Modo demonstração')`, 8000)
  check('banner "Modo demonstração" aparece (IA simulada)', true)
  // "Monte a sua": as escolhas da vitrine viram o link do configurador
  const ctaHref = () => evaluate(`document.querySelector('#tamanhos a')?.getAttribute('href')`)
  check('vitrine: "Monte a sua" já vem com escolhas e leva ao configurador', (await ctaHref()) === '/personalizar?tamanho=media&tipo=sentado&cor=branco', await ctaHref())
  await click('#tamanhos label:has(input[value=grande])')
  await click('#tamanhos label:has(input[value=busto])')
  await click('#tamanhos label:has(input[value=preto])')
  check('vitrine: trocar tamanho, tipo e cor atualiza o link', (await ctaHref()) === '/personalizar?tamanho=grande&tipo=busto&cor=preto', await ctaHref())
  check('vitrine: a prévia mostra a escolha em texto', /Grande · Busto · Preto/.test(await evaluate(`document.querySelector('#tamanhos figcaption')?.textContent`)))
  await shot('00b-monte-a-sua')
  await go('/personalizar?tamanho=grande&tipo=busto&cor=preto')
  check('configurador: tamanho, tipo e cor vindos da vitrine já começam no passo do nome', /Qual é o nome do seu pet/.test(await text()) && /Grande/.test(await evaluate(`document.querySelector('aside[aria-label^="Resumo"]')?.innerText`)) && /Preto/.test(await evaluate(`document.querySelector('aside[aria-label^="Resumo"]')?.innerText`)))
  await go('/')

  // ───────── 2. configurador ─────────
  phase = 'configurador'
  await go('/personalizar?tamanho=media')
  const pre = await evaluate(`({ checked: document.querySelector('input[name=tamanho]:checked')?.value, stepText: document.querySelector('[aria-current=step]')?.textContent })`)
  check('configurador: tamanho vindo da vitrine já vem marcado', pre.checked === 'media', JSON.stringify(pre))
  await shot('01-tamanho')
  const next = () => click('button', 'Continuar')
  await next() // → tipo
  await shot('01b-tipo')
  const noPose = await evaluate(find('button', 'Continuar'))
  check('"Continuar" fica desabilitado até escolher o tipo', noPose.disabled === true)
  await click('label:has(input[value=sentado])') ; await next() // → cor
  await shot('01c-cor')
  await click('label:has(input[value=cinza])'); await next() // → nome
  await type('input[maxlength="30"]', 'Thor')
  await shot('01d-nome')
  await next() // → foto
  await shot('02-foto-vazia')
  check('chegou à etapa da foto', /Envie (a|uma) foto/.test(await text()))
  check('sem foto, o botão "Gerar a prévia" fica desabilitado', (await evaluate(find('button', 'Gerar a prévia'))).disabled === true)
  await setFile('input[type=file]', photoPath)
  await waitFor(`!!document.querySelector('img[alt="A foto que você escolheu"]')`, 15000, 'miniatura da foto')
  const thumb = await evaluate(`(() => { const i = document.querySelector('img[alt="A foto que você escolheu"]'); return { ok: i.naturalWidth > 0, src: i.src.slice(0, 5) } })()`)
  check('a foto foi aceita e aparece em miniatura (blob local)', thumb.ok && thumb.src === 'blob:')
  await shot('03-foto-escolhida')
  const summary = await evaluate(`document.querySelector('aside[aria-label^="Resumo"]')?.innerText`)
  check('resumo mostra tamanho, tipo, cor e nome', /Média/.test(summary) && /Sentado/.test(summary) && /Cinza/.test(summary) && /Thor/.test(summary), summary?.replace(/\n/g, ' | '))

  check('sem login: o passo da foto avisa que a prévia precisa de conta', /Crie a sua conta grátis para ver a prévia/.test(await text()))
  await click('button', 'Gerar a prévia')
  await waitFor(`!!document.querySelector('dialog[open]')`, 8000, 'diálogo de login')
  await sleep(400)
  const dialogText = await evaluate(`document.querySelector('dialog[open]').innerText`)
  check('sem login: "Gerar a prévia" abre o diálogo "Faça login ou crie a sua conta para poder gerar a sua prévia"', /Faça login ou crie a sua conta para poder gerar a sua prévia/.test(dialogText), dialogText.slice(0, 120))
  check('o diálogo abre sem sair da página (as escolhas e a foto ficam)', (await evaluate('location.pathname')) === '/personalizar' && !!(await evaluate(`!!document.querySelector('img[alt="A foto que você escolheu"]')`)))
  await shot('03b-dialogo-conta')
  // cadastro dentro do diálogo
  await click('dialog[open] button', 'Criar conta grátis') // envia vazio: mostra os erros
  check('cadastro vazio: mostra os erros e não fecha o diálogo', /Informe o seu nome/.test(await evaluate(`document.querySelector('dialog[open]')?.innerText ?? ''`)))
  await type('dialog[open] input[autocomplete="name"]', 'Maria Teste')
  await type('dialog[open] input[type=email]', accountEmail)
  await type('dialog[open] input[autocomplete="new-password"]', accountPassword)
  await click('dialog[open] input[type=checkbox]')
  await click('dialog[open] button', 'Criar conta grátis')
  await waitFor(`!document.querySelector('dialog[open]')`, 10000, 'diálogo fecha depois do cadastro')
  check('depois do cadastro o cabeçalho mostra "Minha conta"', await evaluate(`!!document.querySelector('header button[aria-label="Minha conta"]')`))
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
  check('mostra quantas prévias ainda restam na conta', /Você ainda pode gerar 2 prévias nesta conta/.test(await text()), (await text()).match(/Você ainda[^.]*\./)?.[0])

  // gerar outra (mesma foto, sem novo upload)
  const uploadsBefore = await evaluate(`performance.getEntriesByType('resource').filter(r => /\\/photo$/.test(r.name)).length`)
  await click('button', 'Gerar outra')
  await waitFor(`document.body.innerText.includes('Gerando a prévia')`, 8000)
  await waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('Gostei'))`, 30000)
  const uploadsAfter = await evaluate(`performance.getEntriesByType('resource').filter(r => /\\/photo$/.test(r.name)).length`)
  check('"Gerar outra" reaproveita a foto (nenhum novo upload)', uploadsAfter === uploadsBefore, `uploads ${uploadsBefore}→${uploadsAfter}`)
  check('a contagem de prévias restantes cai para 1', /ainda pode gerar 1 prévia nesta conta/.test(await text()))

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
  check('o nome já vem preenchido com o da conta', (await evaluate(`document.querySelector('input[name=name]')?.value`)) === 'Maria Teste')
  // apaga o nome (como o React enxerga: valor nativo + evento de input) para testar o erro
  await evaluate(`(() => { const i = document.querySelector('input[name=name]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await click('button', 'Enviar pedido')
  await sleep(500)
  const errs = await evaluate(`({ invalid: [...document.querySelectorAll('[aria-invalid=true]')].map(e => e.name || e.type), focusedName: document.activeElement?.name })`)
  const wanted = ['name', 'phone', 'cep', 'street', 'number', 'neighborhood', 'city', 'state', 'checkbox']
  check('enviar vazio: erros no nome, WhatsApp, endereço e aceite, e foca o primeiro', wanted.every((n) => errs.invalid.includes(n)) && errs.focusedName === 'name', JSON.stringify(errs))
  await shot('07-carrinho-erros', true)

  // retirada: o endereço some; voltar para a entrega traz os campos de volta
  await click('label', 'Retirada com a loja')
  check('retirada: o endereço não é pedido', !(await evaluate(`!!document.querySelector('input[name=cep]')`)))
  await shot('07b-carrinho-retirada')
  await click('label', 'Entrega no endereço')
  check('entrega: os campos do endereço voltam', await evaluate(`!!document.querySelector('input[name=cep]')`))

  await type('input[name=name]', 'Maria Souza')
  await type('input[name=phone]', '(19) 99999-1234')
  // o servidor consulta o CEP no ViaCEP; aqui a resposta é simulada para o teste não depender da internet
  await evaluate(`(() => { const real = window.fetch; window.fetch = (url, init) => String(url).includes('/api/cep/') ? Promise.resolve(new Response(JSON.stringify({ found: true, address: { street: 'Rua das Flores', neighborhood: 'Centro', city: 'Indaiatuba', state: 'SP' } }), { status: 200, headers: { 'content-type': 'application/json' } })) : real(url, init) })()`)
  await type('input[name=cep]', '13330000')
  await waitFor(`document.querySelector('input[name=street]')?.value === 'Rua das Flores'`, 5000, 'endereço preenchido pelo CEP')
  const filled = await evaluate(`({ cep: document.querySelector('input[name=cep]').value, bairro: document.querySelector('input[name=neighborhood]').value, city: document.querySelector('input[name=city]').value, uf: document.querySelector('select[name=state]').value, hint: document.body.innerText.includes('Endereço encontrado') })`)
  check('CEP completo ganha a máscara e preenche rua, bairro, cidade e estado', filled.cep === '13330-000' && filled.bairro === 'Centro' && filled.city === 'Indaiatuba' && filled.uf === 'SP' && filled.hint, JSON.stringify(filled))
  await type('input[name=number]', '123')
  await type('input[name=complement]', 'Casa 2')
  await shot('07c-carrinho-endereco', true)
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
  check('o cliente NÃO vê o telefone, o endereço nem anotações internas', !order.t.includes('99999-1234') && !order.t.includes('19999991234') && !order.t.includes('Rua das Flores'))
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
  const notFound = await evaluate(`fetch('/api/rota-que-nao-existe').then(async (r) => ({ status: r.status, body: await r.text() }))`)

  // visitante: /admin parece qualquer endereço que não existe
  await send('Network.clearBrowserCookies')
  await go('/admin')
  await waitFor(`document.body.innerText.includes('Página não encontrada')`, 8000, 'visitante vê "não encontrada"')
  const visitor = await evaluate(`({ t: document.body.innerText, pw: !!document.querySelector('input[type=password]'), title: document.title })`)
  check('visitante em /admin: vê a página "não encontrada", sem login do painel e sem pista do painel', !visitor.pw && !/[Pp]ainel|[Pp]edidos/.test(visitor.t) && visitor.title === 'Página não encontrada | Cristal Pet Esculturas', JSON.stringify(visitor))
  await shot('10-admin-visitante')
  const visitorApi = await evaluate(`Promise.all(['/api/admin/stats', '/api/admin/orders', '/api/admin/accounts'].map(async (p) => { const r = await fetch(p); return { status: r.status, body: await r.text() } }))`)
  check('visitante na API do painel: 404 idêntico ao de uma rota que não existe', visitorApi.every((r) => r.status === 404 && r.body === notFound.body), JSON.stringify(visitorApi).slice(0, 200))

  // cliente comum (logado): também não vê nem sabe do painel
  await go('/entrar')
  await type('input[type=email]', accountEmail)
  await type('input[autocomplete="current-password"]', accountPassword)
  await click('button[type=submit]', 'Entrar')
  await waitFor(`!!document.querySelector('header button[aria-label="Minha conta"]')`, 10000, 'cliente logado')
  await click('header button[aria-label="Minha conta"]')
  const customerMenu = await evaluate(`document.querySelector('header [id]:not(svg)')?.closest('div.relative')?.innerText ?? ''`)
  check('cliente comum: o menu da conta não mostra o painel', /Minha conta/.test(customerMenu) && !/Painel/.test(customerMenu), customerMenu.replace(/\n/g, ' | ').slice(0, 160))
  const customerApi = await evaluate(`Promise.all(['/api/admin/stats', '/api/auth/me'].map(async (p) => { const r = await fetch(p); return { status: r.status, body: await r.text() } }))`)
  check('cliente comum: API do painel responde 404 igual a rota inexistente, e a conta não traz sinal de dono', customerApi[0].status === 404 && customerApi[0].body === notFound.body && !/isAdmin/.test(customerApi[1].body), JSON.stringify(customerApi).slice(0, 200))
  await go('/admin')
  await waitFor(`document.body.innerText.includes('Página não encontrada')`, 8000, 'cliente vê "não encontrada"')
  check('cliente comum em /admin: vê a página "não encontrada"', !/Buscar pedido/.test(await text()))
  await evaluate(`fetch('/api/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => r.status)`)

  // dono: a conta com o e-mail de ADMIN_EMAILS (cria no primeiro uso; nas rodadas seguintes só entra)
  const ownerHow = await evaluate(`(async () => {
    const call = (path, body) => fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.status)
    const login = { email: ${JSON.stringify(ownerEmail)}, password: ${JSON.stringify(accountPassword)} }
    if ((await call('/api/auth/login', login)) === 200) return 'entrou'
    const created = await call('/api/auth/signup', { name: 'Dona da Cristal', ...login })
    return created === 200 || created === 201 ? 'cadastrou' : 'erro ' + created
  })()`)
  check('conta do dono criada ou aberta (e-mail de ADMIN_EMAILS)', ownerHow === 'entrou' || ownerHow === 'cadastrou', `${ownerHow} — o servidor foi iniciado com ADMIN_EMAILS=${ownerEmail}?`)
  await go('/')
  await waitFor(`!!document.querySelector('header button[aria-label="Minha conta"]')`, 8000, 'dono logado')
  await click('header button[aria-label="Minha conta"]')
  const ownerMenu = await evaluate(`document.querySelector('header [id]:not(svg)')?.closest('div.relative')?.innerText ?? ''`)
  check('conta do dono: o menu mostra "Painel do dono"', /Painel do dono/.test(ownerMenu), ownerMenu.replace(/\n/g, ' | ').slice(0, 160))
  await shot('10b-menu-dono')
  await click('header a[href="/admin"]', 'Painel do dono')
  await waitFor(`document.body.innerText.includes('Buscar pedido')`, 10000, 'dashboard')
  await shot('11-admin-lista')
  const dash = await evaluate(`({ t: document.body.innerText, rows: document.querySelectorAll('.orders-table tbody tr').length, title: document.title })`)
  check('painel do dono: lista o pedido novo, com cliente, cidade/UF e status "Novo"', dash.rows >= 1 && dash.t.includes(sent.code) && dash.t.includes('Maria Souza') && dash.t.includes('Indaiatuba - SP') && /NOVO/.test(dash.t) && dash.title === 'Painel do dono', dash.title)
  const cookieFlags = await send('Network.getCookies', { urls: [base] })
  const ck = cookieFlags.result.cookies.find((c) => c.name === 'cp_user')
  check('cookie da sessão: HttpOnly e SameSite=Strict', ck && ck.httpOnly && ck.sameSite === 'Strict', JSON.stringify(ck && { httpOnly: ck.httpOnly, sameSite: ck.sameSite }))
  check('o JavaScript da página não enxerga o cookie da sessão', !(await evaluate('document.cookie')).includes('cp_user'))
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
  check('detalhe: forma de entrega, destinatário, WhatsApp e endereço completo para a etiqueta', /Entrega no endereço/.test(detail) && /Maria Souza/.test(detail) && detail.includes('(19) 99999-1234') && detail.includes('Rua das Flores, 123 - Casa 2') && detail.includes('Centro') && detail.includes('Indaiatuba - SP') && detail.includes('CEP 13330-000'))
  check('detalhe: escultura, tamanho, pose, valor e conta do cliente', /Média/.test(detail) && /Sentado/.test(detail) && /A combinar/.test(detail) && detail.includes(accountEmail))
  check('detalhe: foto original e prévia aprovada lado a lado', (await evaluate(`document.querySelectorAll('button[aria-label^="Ampliar"]').length`)) === 2)
  await click('button[aria-label="Ampliar: Foto original"]')
  await waitFor(`!!document.querySelector('dialog[open]')`, 5000)
  check('foto original amplia no lightbox', true)
  await key('Escape'); await sleep(400)

  // baixar a foto do pet e a prévia (arquivos com o nome do pedido e do pet)
  const downloads = await evaluate(`Promise.all([...document.querySelectorAll('a[download]')].filter((a) => /^Baixar (foto original|prévia aprovada)/.test(a.textContent.trim())).map(async (a) => { const r = await fetch(a.href); return { status: r.status, disp: r.headers.get('content-disposition') || '' } }))`)
  check('baixar a foto do pet e a prévia: dois arquivos com o nome do pedido e do pet', downloads.length === 2 && downloads.every((d) => d.status === 200 && /attachment/.test(d.disp)) && downloads.some((d) => d.disp.includes(`${sent.code}-Thor-foto`)) && downloads.some((d) => d.disp.includes(`${sent.code}-Thor-previa`)), JSON.stringify(downloads))

  // dados de envio copiáveis
  await send('Browser.grantPermissions', { origin: base, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] })
  await click('button', 'Copiar dados de envio')
  await waitFor(`document.body.innerText.includes('Copiado!') || document.body.innerText.includes('Não deu para copiar')`, 5000, 'resposta do botão de copiar')
  check('"Copiar dados de envio" copia para a área de transferência', (await text()).includes('Copiado!'))
  const clip = await evaluate(`navigator.clipboard.readText().catch(() => '')`)
  if (clip) check('o texto copiado traz destinatário, WhatsApp e endereço', clip.includes('Destinatário: Maria Souza') && clip.includes('(19) 99999-1234') && clip.includes('Rua das Flores, 123 - Casa 2') && clip.includes('CEP 13330-000'), clip.replace(/\n/g, ' ⏎ '))

  // arquivo 3D: pede confirmação (custa dinheiro), mostra o andamento, baixa, e gera de novo
  const confirmButtons = '[role=group][aria-label="Confirmar a geração"] button'
  await click('button', 'Gerar arquivo 3D')
  await waitFor(`document.body.innerText.includes('tem custo por arquivo')`, 5000, 'confirmação antes de gerar')
  await shot('12b-admin-3d-confirmar', true)
  await click(confirmButtons, 'Cancelar')
  check('gerar o 3D pede confirmação (tem custo); cancelar não gera nada', !(await text()).includes('Pode levar alguns minutos') && !!(await evaluate(find('button', 'Gerar arquivo 3D'))))
  await click('button', 'Gerar arquivo 3D')
  await click(confirmButtons, 'Sim, gerar')
  await waitFor(`document.body.innerText.includes('Pode levar alguns minutos')`, 8000, 'gerando')
  await shot('12c-admin-3d-gerando', true)
  check('enquanto gera: mostra o andamento e avisa que continua sem a página aberta', await evaluate(`!!document.querySelector('[role=progressbar]') || document.body.innerText.includes('Gerando o arquivo 3D')`))
  await waitFor(`[...document.querySelectorAll('a')].some(a => /Baixar STL/.test(a.textContent))`, 30000, 'STL pronto')
  const stlHref = await evaluate(`[...document.querySelectorAll('a')].find(a => /Baixar STL/.test(a.textContent)).href`)
  const stl = await evaluate(`fetch(${JSON.stringify(stlHref)}).then(async r => ({ status: r.status, disp: r.headers.get('content-disposition'), body: (await r.text()).slice(0, 40) }))`)
  check('arquivo 3D: gera, mostra "Baixar STL" e o arquivo baixa como STL com o nome do pedido', stl.status === 200 && stl.body.startsWith('solid ') && stl.disp.includes(`${sent.code}-Thor.stl`), JSON.stringify(stl))
  check('arquivo 3D de teste é avisado como demonstração', (await text()).includes('Arquivo de teste (modo demonstração)'))
  check('arquivo pronto traz o guia "Antes de imprimir"', (await text()).includes('Antes de imprimir'))
  await shot('13-admin-3d-pronto', true)

  await click('button', 'Gerar de novo')
  await waitFor(`document.body.innerText.includes('troca os arquivos atuais')`, 5000, 'confirmação para gerar de novo')
  await click(confirmButtons, 'Sim, gerar')
  await waitFor(`document.body.innerText.includes('Pode levar alguns minutos')`, 8000, 'gerando de novo')
  await waitFor(`[...document.querySelectorAll('a')].some(a => /Baixar STL/.test(a.textContent))`, 30000, 'STL de novo')
  check('gerar de novo: pede confirmação, refaz o arquivo e o STL volta a ficar disponível', true)

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
  check('o cliente vê "Pedido confirmado" e o recado, mas não as anotações internas nem o endereço', cust.includes('Pix recebido') && !cust.includes('Cliente prefere retirar') && !/Arquivo 3D/.test(cust) && !cust.includes('Rua das Flores'))

  // a lista mostra o andamento dos arquivos 3D
  await go('/admin')
  await waitFor(`document.body.innerText.includes('Buscar pedido')`, 8000)
  await type('input[type=search]', sent.code)
  await waitFor(`document.querySelectorAll('.orders-table tbody tr').length === 1`, 5000)
  check('a lista mostra quantos arquivos 3D do pedido estão prontos', /1 de 1 pronto/.test(await text()))

  // sair: volta para a loja e o painel deixa de existir para este aparelho
  await click('header button', 'Sair')
  await waitFor(`!!document.querySelector('header button[aria-label="Faça login"]')`, 8000, 'visitante de novo')
  check('"Sair" no painel volta para a loja como visitante', true)
  await go('/admin')
  await waitFor(`document.body.innerText.includes('Página não encontrada')`, 8000)
  check('depois de sair, /admin volta a ser "não encontrada"', !/Buscar pedido/.test(await text()))

  // ───────── 6. falhas pelo nome do pet (gatilhos do modo demonstração) ─────────
  phase = 'falhas'
  // o painel limpou os cookies (aparelho "novo"): a conta entra de novo pela página de login
  await go('/entrar?proximo=/personalizar')
  await type('input[type=email]', accountEmail)
  await type('input[autocomplete="current-password"]', accountPassword)
  await click('button[type=submit]', 'Entrar')
  await waitFor(`location.pathname === '/personalizar'`, 10000, 'volta para onde ia depois do login (?proximo=)')
  check('login por /entrar?proximo=/personalizar volta para a página pedida', true)
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

  // ───────── 7. conta: menu, cota, sair e entrar ─────────
  phase = 'conta'
  await go('/')
  await waitFor(`!!document.querySelector('header button[aria-label="Minha conta"]')`, 8000, 'menu da conta (sessão guardada no cookie)')
  check('a sessão continua depois de recarregar a página (cookie)', true)
  await click('header button[aria-label="Minha conta"]')
  const menu = await evaluate(`document.querySelector('header [id]:not(svg)')?.closest('div.relative')?.innerText ?? ''`)
  check('menu da conta: nome, e-mail, prévias que sobram, minha conta, meus pedidos e sair', /Olá, Maria/.test(menu) && menu.includes(accountEmail) && /prévia/.test(menu) && /Minha conta/.test(menu) && /Meus pedidos/.test(menu) && /Sair/.test(menu), menu.replace(/\n/g, ' | ').slice(0, 200))
  await shot('15-menu-conta')
  await click('header a[href="/minha-conta"]')
  await waitFor(`document.body.innerText.includes('Prévias de escultura')`, 8000, 'página Minha conta')
  const mine = await text()
  check('Minha conta: dados do cadastro e as prévias usadas', mine.includes('Maria Teste') && mine.includes(accountEmail) && /2 de 3 usadas/.test(mine), mine.match(/\(\d de \d usadas\)/)?.[0])
  await shot('16-minha-conta')

  // sair: volta a ser visitante, o carrinho some, navegar continua livre
  await click('button', 'Sair da conta')
  await waitFor(`!!document.querySelector('header button[aria-label="Faça login"]')`, 8000, 'visitante de novo')
  check('sair devolve o cabeçalho "Faça login"', true)
  await go('/carrinho')
  check('sem login o carrinho/pedidos pedem a conta, sem quebrar a página', /Entre para ver/.test(await text()) || /Seu carrinho está vazio/.test(await text()))
  await go('/meus-pedidos')
  check('"Meus pedidos" sem login oferece entrar ou criar conta', /Entre para ver os seus pedidos/.test(await text()))
  await shot('17-pedidos-sem-login')

  // entrar: senha errada (mensagem genérica) e depois a certa
  await go('/entrar')
  await type('input[type=email]', accountEmail)
  await type('input[autocomplete="current-password"]', 'senha-errada-123')
  await click('button[type=submit]', 'Entrar')
  await waitFor(`document.body.innerText.includes('E-mail ou senha incorretos')`, 8000, 'erro de login')
  check('senha errada: "E-mail ou senha incorretos" (não diz qual dos dois)', true)
  await shot('18-entrar-erro')
  await type('input[autocomplete="current-password"]', accountPassword)
  await click('button[type=submit]', 'Entrar')
  await waitFor(`!!document.querySelector('header button[aria-label="Minha conta"]')`, 8000, 'logado de novo')
  check('entrar com a senha certa leva à conta e mostra "Minha conta"', true)
  await waitFor(`location.pathname === '/minha-conta'`, 8000, 'redireciona para a conta')

  // "Meus pedidos" logado lista o pedido feito antes (vem do servidor, não do aparelho)
  await go('/meus-pedidos')
  await waitFor(`/CP-[A-Z0-9]{6}/.test(document.body.innerText)`, 8000, 'pedido da conta na lista')
  check('"Meus pedidos" logado lista os pedidos da conta (do servidor)', true)

  // esqueci a senha: a resposta é a mesma exista ou não a conta
  await go('/esqueci-a-senha')
  await type('input[type=email]', 'ninguem-aqui@exemplo.com')
  await click('button[type=submit]', 'Enviar o link')
  await waitFor(`document.body.innerText.includes('Se existir uma conta')`, 8000, 'aviso de recuperação')
  check('esqueci a senha: resposta neutra (não revela se o e-mail tem conta)', true)
  await shot('19-esqueci-senha')

  // cota esgotada: uma segunda conta gasta as 3 prévias e a tela explica
  await evaluate(`fetch('/api/auth/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => r.status)`)
  await go('/criar-conta')
  await type('input[autocomplete="name"]', 'Segunda Conta')
  await type('input[type=email]', `e2e-segunda-${stamp}@exemplo.com`)
  await type('input[autocomplete="new-password"]', accountPassword)
  await click('input[type=checkbox]')
  await shot('20-criar-conta')
  await click('button[type=submit]', 'Criar conta grátis')
  await waitFor(`!!document.querySelector('header button[aria-label="Minha conta"]')`, 10000, 'segunda conta criada')
  const burst = await evaluate(`(async () => { const out = []; for (let i = 0; i < 4; i++) { const r = await fetch('/api/previews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ options: { sizeId: 'media', poseId: 'sentado', colorId: 'branco' } }) }); out.push(r.status) } return out })()`)
  check('o servidor recusa a 4ª prévia da conta (403) depois de 3 criadas', JSON.stringify(burst) === '[201,201,201,403]', JSON.stringify(burst))
  await go('/personalizar?tamanho=media&tipo=sentado&cor=branco')
  await click('button', 'Continuar') // nome → foto
  await setFile('input[type=file]', photoPath)
  await waitFor(`!!document.querySelector('img[alt="A foto que você escolheu"]')`, 15000)
  await waitFor(`document.body.innerText.includes('Você já usou todas as prévias da sua conta')`, 8000, 'aviso de cota esgotada')
  check('cota esgotada: a tela explica e manda para o WhatsApp', /Falar no WhatsApp/.test(await text()))
  check('cota esgotada: "Gerar a prévia" fica desabilitado', (await evaluate(find('button', 'Gerar a prévia'))).disabled === true)
  await shot('21-cota-esgotada')
} catch (error) {
  check('execução sem exceção', false, String(error.message))
  // ajuda a depurar: o que havia na tela quando quebrou
  try { await shot('zz-falha'); console.log('TELA NA FALHA [' + phase + ']:', (await text()).replace(/s+/g, ' ').slice(0, 600)) } catch {}
}

const fails = results.filter((r) => !r.ok)
console.log(`\n=== ${mobile ? 'CELULAR' : 'DESKTOP'} ${width}x${height} | ${version} ===`)
console.log(`${results.length - fails.length}/${results.length} verificações ok`)
for (const r of results) console.log(`${r.ok ? 'OK   ' : 'FALHA'} ${r.name}${!r.ok && r.detail ? '  → ' + r.detail : ''}`)
const uniq = [...new Set(problems)]
console.log(uniq.length ? `\nProblemas de console (${uniq.length}):\n` + uniq.join('\n') : '\nConsole limpo (sem erros nem avisos).')
ws.close(); chrome.kill(); process.exit(fails.length ? 1 : 0)
