/**
 * Host half of the Claude Style bundle.
 *
 * The bundle paints the existing Client surfaces, so nothing here is
 * model-facing. It owns three things.
 *
 * 1. The profile's auto-compaction threshold. The Web page reads and writes it
 *    through one same-origin route (`/claude-style/auto-compact`), because a
 *    page cannot touch the loader config directly and the desktop page has no
 *    other channel to the Host. The value lives where the loader already reads
 *    it: a marked entry in the profile's `cordis.patch.yml`. Writing that entry
 *    keeps the choice durable across restarts; when the compaction service
 *    exposes a mutable config, the new ratio is also applied to the running
 *    engine so the change is immediate.
 *
 * 2. The `/stats` command. It is a human command: the handler reads the live
 *    Session, the all-session roll-up, and returns one text report, so nothing
 *    is sent to the model. The report is the durable record the transcript
 *    keeps; the Client half paints a usage board over the same data.
 *
 * 3. The all-session usage roll-up behind `/claude-style/usage`. It is the one
 *    number a Session cannot report about itself, so it is folded from the
 *    stored logs once, cached, and then advanced incrementally: a pass compares
 *    each stored Session's size and event count against the cache and re-reads
 *    only the ones that moved. Passes run in small batches off the request path
 *    so a first scan never blocks the Host, and every figure is billed provider
 *    usage — the same `assistant/message` samples the token meter folds.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const ROUTE = '/claude-style/auto-compact'
const START = '# >>> claude-style-deepseek auto-compact'
const END = '# <<< claude-style-deepseek auto-compact'
const MIN_RATIO = 0.5
const MAX_RATIO = 0.95
const DEFAULT_RATIO = 0.8
const BODY_LIMIT = 4096

/**
 * The bundle's own version, read once from the manifest beside this file.
 *
 * It is reported on the route so a stale Host is visible without guessing: an
 * updated bundle whose files changed on disk but whose process kept the old
 * module answers with the version it actually loaded.
 */
const VERSION = (() => {
  try {
    const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
    return typeof manifest.version === 'string' ? manifest.version : 'unknown'
  } catch {
    return 'unknown'
  }
})()

/** The harness home, the same default the loader uses. */
function dshHome() {
  const fromEnv = process.env.DSH_HOME
  return fromEnv !== undefined && fromEnv.trim() !== '' ? fromEnv : join(homedir(), '.dsh')
}

/** This process's profile; the desktop app runs the `desktop` profile. */
function profileName() {
  const fromEnv = process.env.DSH_PROFILE
  return fromEnv !== undefined && fromEnv.trim() !== '' ? fromEnv : 'desktop'
}

function patchPath() {
  return join(dshHome(), 'profiles', profileName(), 'cordis.patch.yml')
}

/** The marked block, as a regular expression over the patch text. */
function blockPattern() {
  return new RegExp(START + '[\\s\\S]*?' + END)
}

/** The threshold the profile currently carries, if any. */
function readState() {
  try {
    const text = readFileSync(patchPath(), 'utf8')
    const block = text.match(blockPattern())
    if (block === null) return { enabled: false, threshold: null }
    const ratio = block[0].match(/thresholdRatio:\s*([0-9.]+)/)
    if (ratio === null) return { enabled: true, threshold: DEFAULT_RATIO }
    return { enabled: true, threshold: Number(ratio[1]) }
  } catch {
    return { enabled: false, threshold: null }
  }
}

/** Rewrite the profile patch with the block set, replaced or removed. */
function writeState(enabled, threshold) {
  const path = patchPath()
  const text = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, threshold))
  let next

  if (!enabled) {
    next = text.replace(new RegExp('\\n*' + START + '[\\s\\S]*?' + END), '').trimEnd() + '\n'
  } else {
    const block = [
      START,
      '- id: compaction-basic',
      '  name: "@deepseek-ai/dsh-compaction-basic"',
      '  config:',
      '    thresholdRatio: ' + String(ratio),
      END,
    ].join('\n')
    next = blockPattern().test(text) ? text.replace(blockPattern(), block) : text.trimEnd() + '\n\n' + block + '\n'
  }

  const temporary = path + '.claude-style.tmp'
  writeFileSync(temporary, next)
  renameSync(temporary, path)
  return ratio
}

/** Push the ratio into the running engine when its config is writable. */
function applyLive(ctx, enabled, threshold) {
  if (!enabled) return false
  const compaction = typeof ctx.get === 'function' ? ctx.get('compaction') : undefined
  if (compaction === undefined || compaction === null || typeof compaction.config !== 'object' || compaction.config === null) {
    return false
  }
  try {
    compaction.config.thresholdRatio = threshold
    return true
  } catch {
    return false
  }
}

function send(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload))
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': String(body.byteLength), 'cache-control': 'no-store' })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > BODY_LIMIT) {
        reject(new Error('too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/* ------------------------------------------------------------------------- *
 * `/stats`
 *
 * One human command that reports the whole Session: cumulative provider
 * tokens, current context occupancy, turn and step counts, and wall times.
 * Every figure comes from the projections the Host already folds over the
 * durable log (`tokenUsage`, `contextPressure`, `sessionStats`), so the report
 * cannot drift from the numbers the composer meter shows and nothing here
 * re-implements a fold.
 *
 * The command is registered through `ctx.inject(['commands'])`: a Host
 * without a command registry simply has no `/stats`, and the rest of the
 * bundle keeps working.
 * ------------------------------------------------------------------------- */

const COMMAND_NAME = 'stats'
const KEY_WIDTH = 13
const TITLE = 'Session usage'

/** The agent's live Session, falling back to the store when the handle omits it. */
function sessionOf(ctx, agent) {
  if (agent !== null && agent !== undefined && agent.session !== null && agent.session !== undefined) {
    return agent.session
  }
  const sessions = typeof ctx.get === 'function' ? ctx.get('sessions') : undefined
  if (sessions === undefined || sessions === null || typeof sessions.get !== 'function') return undefined
  if (agent === null || agent === undefined) return undefined
  return sessions.get(agent.id)
}

/** A grouped integer, the way the report prints every count. */
function amount(value) {
  const count = Number(value)
  return Number.isFinite(count) ? Math.round(count).toLocaleString('en-US') : '0'
}

/** The largest unit a wall time needs, plus the next one when it carries. */
function formatDuration(milliseconds) {
  const total = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total / 60) % 60
  const seconds = total % 60
  if (hours > 0) return hours + 'h ' + minutes + 'm'
  if (minutes > 0) return minutes + 'm ' + seconds + 's'
  return seconds + 's'
}

/** One row: a label padded to the report's column, then the value. */
function row(label, value) {
  return label.padEnd(KEY_WIDTH) + value
}

/** The provider/model currently routed for this Session, when it reports one. */
function routeOf(session) {
  try {
    const context = typeof session.requestContext === 'function' ? session.requestContext() : undefined
    if (context === null || context === undefined) return undefined
    const provider = typeof context.provider === 'string' ? context.provider : ''
    const model = typeof context.model === 'string' ? context.model : ''
    if (provider === '' && model === '') return undefined
    return {
      label: provider === '' ? model : (model === '' ? provider : provider + '/' + model),
      contextWindow: typeof context.contextWindow === 'number' ? context.contextWindow : undefined,
    }
  } catch {
    return undefined
  }
}

/**
 * Build the report text from one projection snapshot.
 * @param session - the Session the report describes.
 * @param values - the `tokenUsage`, `contextPressure`, and `sessionStats` views.
 * @param now - wall clock read once, so the duration is one number.
 * @returns the report, one line per field group.
 */
function buildSessionReport(session, values, now) {
  const usage = values.tokenUsage === undefined ? {} : values.tokenUsage
  const pressure = values.contextPressure === undefined ? {} : values.contextPressure
  const stats = values.sessionStats === undefined ? {} : values.sessionStats
  const route = routeOf(session)

  const input = Number(usage.uncachedInputTokens) || 0
  const output = Number(usage.outputTokens) || 0
  const cacheRead = Number(usage.cacheReadTokens) || 0
  const cacheWrite = Number(usage.cacheWriteTokens) || 0
  const total = input + output + cacheRead + cacheWrite

  const createdAt = session.header === undefined || session.header === null ? undefined : session.header.createdAt
  const started = typeof createdAt === 'number' ? createdAt : undefined

  const lines = [TITLE]
  if (route !== undefined) lines.push(row('Model', route.label))
  if (started !== undefined) lines.push(row('Duration', formatDuration(now - started)))
  lines.push(row('Turns', amount(stats.turns)))
  lines.push(row('Steps', amount(stats.steps)))

  lines.push('')
  if (total === 0) {
    lines.push(row('Tokens', 'no requests recorded yet'))
  } else {
    lines.push(row('Tokens', amount(total)))
    lines.push(row('Input', amount(input)))
    lines.push(row('Output', amount(output)))
    lines.push(row('Cache read', amount(cacheRead)))
    lines.push(row('Cache write', amount(cacheWrite)))
  }

  lines.push('')
  const used = pressure.projectedTokens !== undefined ? pressure.projectedTokens : pressure.pressureTokens
  const capacity = pressure.contextWindow !== undefined ? pressure.contextWindow : (route === undefined ? undefined : route.contextWindow)
  if (typeof used === 'number' && typeof capacity === 'number' && capacity > 0) {
    const percent = Math.round((used / capacity) * 1000) / 10
    lines.push(row('Context', amount(used) + ' / ' + amount(capacity) + ' (' + percent + '%)'))
  } else if (typeof used === 'number') {
    lines.push(row('Context', amount(used)))
  } else {
    lines.push(row('Context', 'not measured yet'))
  }

  if (typeof stats.llmMs === 'number' && stats.llmMs > 0) lines.push(row('Model time', formatDuration(stats.llmMs)))
  if (typeof stats.toolMs === 'number' && stats.toolMs > 0) lines.push(row('Tool time', formatDuration(stats.toolMs)))

  return lines.join('\n')
}

/**
 * Read the three projection views the report needs.
 * @param ctx - Host context carrying the projection registry.
 * @param session - Session to read.
 * @returns the views, or an error result when this assembly cannot serve them.
 */
function readStats(ctx, session) {
  const projections = typeof ctx.get === 'function' ? ctx.get('sessionProjections') : undefined
  if (projections === undefined || projections === null || typeof projections.snapshot !== 'function') {
    return { error: 'Session usage is unavailable: this Host has no session projection registry.' }
  }
  try {
    const snapshot = projections.snapshot(session, ['tokenUsage', 'contextPressure', 'sessionStats'])
    const values = snapshot === null || snapshot === undefined || snapshot.values === undefined ? {} : snapshot.values
    return { values }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { error: 'Session usage could not be read: ' + reason }
  }
}

/* ------------------------------------------------------------------------- *
 * All-session usage
 *
 * A Session can report itself; the corpus cannot, so this is the one figure
 * the Host has to fold for us. Each stored Session contributes the same
 * provider samples the token meter counts (the last usage chunk of a settled
 * assistant message, with a retried attempt replacing its slot), plus its turn
 * and step boundaries. The fold is cached per Session and keyed by the stored
 * log's size and event count, so a refresh re-reads only the Sessions that
 * moved and a first-ever scan is the only expensive pass.
 *
 * Passes run in small batches with a yield between them: a 160-Session corpus
 * takes a few seconds and the Host keeps answering while it runs.
 * ------------------------------------------------------------------------- */

const USAGE_ROUTE = '/claude-style/usage'
const USAGE_SAVE = 20
const USAGE_DAYS = 14
const USAGE_STALE_MS = 60000
const USAGE_MODELS = 6
const USAGE_RECENT = 5
const USAGE_TITLE = 'Usage across sessions'

/** The roll-up's durable cache, under the harness home the loader already uses. */
function usageCachePath() {
  return join(dshHome(), 'storages', 'claude-style-deepseek', 'usage-cache.json')
}

/**
 * One process-local roll-up. `entries` maps a Session id to its fold; the
 * progress fields describe the pass that is running, so the page can show a
 * scan instead of an empty board.
 */
const USAGE = {
  entries: null,
  loaded: false,
  refreshing: false,
  pending: 0,
  scanned: 0,
  elapsedMs: 0,
  finishedAt: 0,
  attemptedAt: 0,
  failures: 0,
  error: '',
  disposed: false,
}

function pad2(value) {
  return value < 10 ? '0' + value : String(value)
}

/** The local calendar day a timestamp falls on. */
function dayKeyOf(time) {
  const date = new Date(time)
  if (!Number.isFinite(date.getTime())) return ''
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
}

/** A compact token count for the one-line summaries. */
function compact(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '0'
  const units = [[1000000000, 'B'], [1000000, 'M'], [1000, 'k']]
  for (const [size, suffix] of units) {
    if (number >= size) return String(Math.round((number / size) * 10) / 10) + suffix
  }
  return String(Math.round(number))
}

/** How long ago a timestamp was, in the shortest unit that still reads. */
function formatAgo(then, now) {
  if (typeof then !== 'number' || then <= 0) return 'never'
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 60) return seconds + 's ago'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return minutes + 'm ago'
  const hours = Math.round(minutes / 60)
  if (hours < 24) return hours + 'h ago'
  return Math.round(hours / 24) + 'd ago'
}

/** The usage sample one settled assistant record reports, if any. */
function sampleOf(event) {
  const data = event === null || event === undefined ? undefined : event.data
  if (data === null || data === undefined || typeof data !== 'object') return undefined
  if (event.type === 'assistant/message' && data.usage !== undefined) return data.usage
  if (event.type !== 'assistant/message' && event.type !== 'assistant/attempt') return undefined
  const stream = data.stream
  if (!Array.isArray(stream)) return undefined
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index]
    if (record !== null && typeof record === 'object' && record.type === 'chunk'
      && record.chunk !== null && typeof record.chunk === 'object' && record.chunk.type === 'usage') {
      return record.chunk.usage
    }
  }
  return undefined
}

/** An entry with no billed work, so a corpus row always has its shape. */
function emptyUsageEntry(header) {
  const cwd = header !== null && header !== undefined && typeof header.cwd === 'string' ? header.cwd : ''
  return {
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    calls: 0,
    turns: 0,
    steps: 0,
    days: {},
    models: {},
    first: 0,
    last: 0,
    cwd,
    origin: header !== null && header !== undefined && header.origin === 'subagent' ? 'subagent' : 'user',
    createdAt: header !== null && header !== undefined && typeof header.createdAt === 'number' ? header.createdAt : 0,
  }
}

/** Apply one sample to an entry, with a sign so a retry can take its slot back. */
function applySample(entry, sample, model, day, sign) {
  const buckets = {
    input: Math.max(0, Math.round(Number(sample.inputTokens) || 0)),
    output: Math.max(0, Math.round(Number(sample.outputTokens) || 0)),
    cacheRead: Math.max(0, Math.round(Number(sample.cacheReadTokens) || 0)),
    cacheWrite: Math.max(0, Math.round(Number(sample.cacheWriteTokens) || 0)),
  }
  const total = buckets.input + buckets.output + buckets.cacheRead + buckets.cacheWrite
  entry.tokens.input += sign * buckets.input
  entry.tokens.output += sign * buckets.output
  entry.tokens.cacheRead += sign * buckets.cacheRead
  entry.tokens.cacheWrite += sign * buckets.cacheWrite
  entry.calls += sign
  if (day !== '') {
    const cell = entry.days[day] === undefined ? { tokens: 0, calls: 0 } : entry.days[day]
    cell.tokens += sign * total
    cell.calls += sign
    if (cell.tokens <= 0 && cell.calls <= 0) delete entry.days[day]
    else entry.days[day] = cell
  }
  const label = model === '' ? 'unknown' : model
  const modelCell = entry.models[label] === undefined ? { tokens: 0, calls: 0 } : entry.models[label]
  modelCell.tokens += sign * total
  modelCell.calls += sign
  if (modelCell.tokens <= 0 && modelCell.calls <= 0) delete entry.models[label]
  else entry.models[label] = modelCell
}

/**
 * Fold one stored Session log.
 * @param events - the Session's complete event log.
 * @param header - the Session header, for cwd, origin, and creation time.
 * @returns the cached entry: tokens by bucket, calls, turns, steps, and the
 * day and model cells the board draws.
 */
function foldSession(events, header) {
  const entry = emptyUsageEntry(header)
  let model = ''
  let lastSample = null
  for (const event of events) {
    const time = Number(event.time)
    if (Number.isFinite(time)) {
      if (entry.first === 0 || time < entry.first) entry.first = time
      if (time > entry.last) entry.last = time
    }
    if (event.type === 'request/context' && typeof event.data.model === 'string') model = event.data.model
    if (event.type === 'step/end') {
      entry.steps += 1
      continue
    }
    if (event.type === 'turn/end') {
      entry.turns += 1
      continue
    }
    if (event.type === 'llm/retry-started') {
      /* The retried attempt owns the same slot, so its next sample replaces
         the one this slot already contributed. */
      if (lastSample !== null && lastSample.turn === event.data.turn && lastSample.step === event.data.step) {
        lastSample = null
      }
      continue
    }
    const sample = sampleOf(event)
    if (sample === undefined) continue
    const turn = event.data.turn
    const step = event.data.step
    const label = typeof event.data.message?.source?.model === 'string' ? event.data.message.source.model : model
    const day = Number.isFinite(time) ? dayKeyOf(time) : ''
    if (lastSample !== null && lastSample.turn === turn && lastSample.step === step) {
      applySample(entry, lastSample.sample, lastSample.model, lastSample.day, -1)
    }
    const next = { turn, step, sample, model: label, day }
    applySample(entry, sample, label, day, 1)
    lastSample = next
  }
  return entry
}

/** Read the roll-up cache once; a missing or unreadable file is an empty one. */
function loadUsageCache() {
  if (USAGE.loaded) return
  USAGE.loaded = true
  USAGE.entries = {}
  try {
    const parsed = JSON.parse(readFileSync(usageCachePath(), 'utf8'))
    if (parsed !== null && typeof parsed === 'object' && parsed.version === 1
      && parsed.sessions !== null && typeof parsed.sessions === 'object') {
      USAGE.entries = parsed.sessions
    }
  } catch {
    /* the next pass rebuilds it */
  }
}

/** Write the roll-up cache atomically; a failure costs a rescan, never a figure. */
function saveUsageCache() {
  try {
    const path = usageCachePath()
    mkdirSync(dirname(path), { recursive: true })
    const body = JSON.stringify({ version: 1, updatedAt: Date.now(), sessions: USAGE.entries })
    const temporary = path + '.tmp'
    writeFileSync(temporary, body)
    renameSync(temporary, path)
  } catch {
    /* an unwritable cache only means the next scan is a full one */
  }
}

/** The last `count` local days, zero-filled, oldest first. */
function daySeries(now, days) {
  const out = []
  const today = new Date(now)
  for (let back = USAGE_DAYS - 1; back >= 0; back -= 1) {
    const key = dayKeyOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() - back).getTime())
    const cell = days.get(key)
    out.push({ day: key, tokens: cell === undefined ? 0 : cell.tokens, calls: cell === undefined ? 0 : cell.calls })
  }
  return out
}

/**
 * Aggregate every cached entry into the board's data.
 * @param now - wall clock read once, for the day window and "ago" copy.
 * @returns totals, the day series, the model split, the newest Sessions, and
 * the progress of the pass that is running.
 */
function aggregateUsage(now) {
  const totals = {
    sessions: 0, subagentSessions: 0, turns: 0, steps: 0, calls: 0,
    input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0, first: 0, last: 0,
  }
  const days = new Map()
  const models = new Map()
  const rows = []
  const entries = USAGE.entries === null ? {} : USAGE.entries
  for (const id of Object.keys(entries)) {
    const entry = entries[id]
    if (entry === null || typeof entry !== 'object' || entry.tokens === undefined) continue
    const input = Number(entry.tokens.input) || 0
    const output = Number(entry.tokens.output) || 0
    const cacheRead = Number(entry.tokens.cacheRead) || 0
    const cacheWrite = Number(entry.tokens.cacheWrite) || 0
    const total = input + output + cacheRead + cacheWrite
    if (entry.origin === 'subagent') totals.subagentSessions += 1
    else totals.sessions += 1
    totals.input += input
    totals.output += output
    totals.cacheRead += cacheRead
    totals.cacheWrite += cacheWrite
    totals.total += total
    totals.turns += Number(entry.turns) || 0
    totals.steps += Number(entry.steps) || 0
    totals.calls += Number(entry.calls) || 0
    if (typeof entry.last === 'number' && entry.last > totals.last) totals.last = entry.last
    if (typeof entry.first === 'number' && entry.first > 0 && (totals.first === 0 || entry.first < totals.first)) {
      totals.first = entry.first
    }
    for (const day of Object.keys(entry.days ?? {})) {
      const cell = entry.days[day]
      const target = days.get(day) ?? { tokens: 0, calls: 0 }
      target.tokens += Number(cell.tokens) || 0
      target.calls += Number(cell.calls) || 0
      days.set(day, target)
    }
    for (const model of Object.keys(entry.models ?? {})) {
      const cell = entry.models[model]
      const target = models.get(model) ?? { tokens: 0, calls: 0 }
      target.tokens += Number(cell.tokens) || 0
      target.calls += Number(cell.calls) || 0
      models.set(model, target)
    }
    rows.push({ id, tokens: total, last: Number(entry.last) || 0, cwd: entry.cwd ?? '', origin: entry.origin ?? 'user' })
  }
  const modelList = [...models.entries()]
    .map(([model, cell]) => ({ model, tokens: cell.tokens, calls: cell.calls }))
    .sort((left, right) => right.tokens - left.tokens)
    .slice(0, USAGE_MODELS)
  const recent = rows
    .filter((row) => row.tokens > 0)
    .sort((left, right) => right.last - left.last)
    .slice(0, USAGE_RECENT)
  return {
    generatedAt: now,
    totals,
    days: daySeries(now, days),
    models: modelList,
    recent,
    refresh: {
      running: USAGE.refreshing,
      pending: USAGE.pending,
      scanned: USAGE.scanned,
      finishedAt: USAGE.finishedAt,
      elapsedMs: USAGE.elapsedMs,
      failures: USAGE.failures,
      error: USAGE.error,
    },
  }
}

/**
 * Advance the roll-up. Only Sessions whose stored log moved are re-read, and
 * the pass yields between batches so the rest of the Host keeps running.
 * @param ctx - Host context carrying persistence and session-query.
 * @param force - re-read every Session, even one whose key still matches.
 */
async function refreshUsage(ctx, force) {
  if (USAGE.refreshing || USAGE.disposed) return
  const get = (name) => (typeof ctx.get === 'function' ? ctx.get(name) : undefined)
  const persistence = get('sessionPersistence')
  const query = get('sessionQuery')
  if (persistence === null || persistence === undefined || typeof persistence.list !== 'function'
    || query === null || query === undefined || typeof query.readSession !== 'function') {
    USAGE.error = 'This Host cannot list stored Sessions.'
    USAGE.attemptedAt = Date.now()
    return
  }
  loadUsageCache()
  USAGE.refreshing = true
  USAGE.error = ''
  USAGE.scanned = 0
  USAGE.failures = 0
  const startedAt = Date.now()
  try {
    const snapshots = await persistence.list()
    const queue = []
    for (const snapshot of snapshots) {
      const header = snapshot === null || snapshot === undefined ? undefined : snapshot.header
      if (header === null || header === undefined || typeof header.id !== 'string') continue
      const key = String(snapshot.sizeBytes ?? 0) + ':' + String(snapshot.eventCount ?? 0)
      const cached = USAGE.entries[header.id]
      if (force !== true && cached !== undefined && cached !== null && cached.key === key) continue
      queue.push({ id: header.id, key })
    }
    USAGE.pending = queue.length
    for (let index = 0; index < queue.length; index += 1) {
      if (USAGE.disposed) break
      const item = queue[index]
      try {
        const snapshot = await query.readSession(item.id)
        USAGE.entries[item.id] = Object.assign({ key: item.key }, foldSession(snapshot.events, snapshot.session))
      } catch (error) {
        USAGE.failures += 1
        /* Keep whatever this Session last contributed instead of publishing a
           zero for it; the key moves on only when the log is readable again. */
        const previous = USAGE.entries[item.id]
        if (previous === undefined || previous === null) {
          USAGE.entries[item.id] = Object.assign({ key: item.key }, emptyUsageEntry(null))
        }
      }
      USAGE.scanned = index + 1
      if (USAGE.scanned % USAGE_SAVE === 0) saveUsageCache()
      /* One yield per Session: a corpus read must never hold the event loop
         for the whole pass. */
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    saveUsageCache()
    USAGE.finishedAt = Date.now()
  } catch (error) {
    USAGE.error = error instanceof Error ? error.message : String(error)
  } finally {
    USAGE.elapsedMs = Date.now() - startedAt
    USAGE.attemptedAt = Date.now()
    USAGE.refreshing = false
  }
}

/** The all-session section of the `/stats` report. */
function buildUsageReport(now) {
  loadUsageCache()
  const data = aggregateUsage(now)
  const totals = data.totals
  if (totals.calls === 0) {
    const progress = USAGE.refreshing ? USAGE.scanned + ' / ' + (USAGE.pending === 0 ? '?' : USAGE.pending) : '0'
    if (USAGE.refreshing) {
      return [USAGE_TITLE, row('Scanning', progress + ' sessions'), '', 'Run /stats again in a moment.'].join('\n')
    }
    if (USAGE.error !== '') return [USAGE_TITLE, row('Unavailable', USAGE.error)].join('\n')
    return [USAGE_TITLE, row('Tokens', 'no billed work recorded yet')].join('\n')
  }
  const lines = [USAGE_TITLE]
  lines.push(row('Sessions', amount(totals.sessions) + (totals.subagentSessions > 0 ? ' (+' + amount(totals.subagentSessions) + ' subagent)' : '')))
  lines.push(row('Turns', amount(totals.turns)))
  lines.push(row('Steps', amount(totals.steps)))
  lines.push(row('Calls', amount(totals.calls)))
  lines.push('')
  lines.push(row('Tokens', amount(totals.total)))
  lines.push(row('Input', amount(totals.input)))
  lines.push(row('Output', amount(totals.output)))
  lines.push(row('Cache read', amount(totals.cacheRead)))
  lines.push(row('Cache write', amount(totals.cacheWrite)))
  if (data.models.length > 0) {
    lines.push('')
    lines.push(row('Models', data.models.map((model) => model.model + ' ' + compact(model.tokens)).join(', ')))
  }
  if (USAGE.finishedAt > 0) lines.push(row('Updated', formatAgo(USAGE.finishedAt, now)))
  return lines.join('\n')
}

/** The command handler: one text result, never a model turn. */
function executeStatsCommand(ctx, invocation) {
  const agent = invocation === null || invocation === undefined ? undefined : invocation.agent
  const session = sessionOf(ctx, agent)
  const now = Date.now()
  const sections = []

  if (session === undefined || session === null) {
    sections.push('Session usage\n' + row('Session', 'none attached to this command'))
  } else {
    const read = readStats(ctx, session)
    if (read.error !== undefined) {
      sections.push('Session usage\n' + row('Unavailable', read.error))
    } else {
      try {
        sections.push(buildSessionReport(session, read.values, now))
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        sections.push('Session usage\n' + row('Unavailable', reason))
      }
    }
  }

  /* Keep the corpus fresh without holding the command open: the report prints
     what the cache already knows and the page watches the pass finish. */
  const stale = USAGE.attemptedAt === 0 || now - USAGE.attemptedAt > USAGE_STALE_MS
  if (!USAGE.refreshing && stale) void refreshUsage(ctx, false)
  sections.push(buildUsageReport(now))

  return { kind: 'success', text: sections.join('\n\n') }
}

/** Register `/stats` for every composed command adapter. */
function mountCommand(ctx) {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['commands'], (commandCtx) => {
    commandCtx.commands.register({
      name: COMMAND_NAME,
      description: 'Show total session usage, context, and timings',
      handler: (invocation) => executeStatsCommand(ctx, invocation),
    })
  })
}

/**
 * Mount the route. The Host service registry is read lazily: a Host without a
 * Web server simply has no control, and the Client falls back to a read-only
 * section instead of failing to load.
 */
export function apply(ctx) {
  mountCommand(ctx)

  /* A reload disposes the fiber; a pass already in flight must stop writing. */
  ctx.effect(() => () => {
    USAGE.disposed = true
  }, 'claude-style: usage lifetime')

  const server = typeof ctx.get === 'function' ? ctx.get('webServer') : undefined
  if (server === undefined || server === null || typeof server.register !== 'function') return

  ctx.effect(() => {
    const dispose = server.register({
      kind: 'exact',
      path: ROUTE,
      handler: (req, res) => {
        const method = req.method === undefined ? 'GET' : req.method

        if (method === 'GET' || method === 'HEAD') {
          const state = readState()
          send(res, 200, { enabled: state.enabled, threshold: state.threshold, profile: profileName(), version: VERSION })
          return
        }

        if (method !== 'POST') {
          res.writeHead(405, { allow: 'GET, HEAD, POST' })
          res.end()
          return
        }

        /* A JSON content type forces a preflight for any cross-origin caller,
           and this route answers no preflight, so only the page itself can
           write. */
        const type = String(req.headers['content-type'] === undefined ? '' : req.headers['content-type']).toLowerCase()
        if (type.indexOf('application/json') === -1) {
          send(res, 415, { error: 'application/json required' })
          return
        }

        readBody(req).then((body) => {
          let parsed
          try {
            parsed = JSON.parse(body)
          } catch {
            send(res, 400, { error: 'invalid json' })
            return
          }
          const enabled = parsed !== null && typeof parsed === 'object' && parsed.enabled === true
          const requested = parsed !== null && typeof parsed === 'object' ? Number(parsed.threshold) : NaN
          const threshold = Number.isFinite(requested) ? requested : (readState().threshold === null ? DEFAULT_RATIO : readState().threshold)
          const written = writeState(enabled, threshold)
          const live = applyLive(ctx, enabled, written)
          send(res, 200, { enabled, threshold: enabled ? written : null, profile: profileName(), live, version: VERSION })
        }).catch(() => {
          try {
            send(res, 400, { error: 'unreadable body' })
          } catch {
            /* the peer is gone */
          }
        })
      },
    })
    return () => {
      if (typeof dispose === 'function') dispose()
    }
  }, 'claude-style: auto-compact route')

  /* The roll-up route. It answers from the cache immediately and starts a pass
     only when the cache is empty, stale, or asked to rescan, so polling never
     turns into repeated corpus reads. */
  ctx.effect(() => {
    const dispose = server.register({
      kind: 'exact',
      path: USAGE_ROUTE,
      handler: (req, res) => {
        const method = req.method === undefined ? 'GET' : req.method
        if (method !== 'GET' && method !== 'HEAD') {
          res.writeHead(405, { allow: 'GET, HEAD' })
          res.end()
          return
        }
        loadUsageCache()
        const now = Date.now()
        let forced = false
        try {
          forced = new URL(String(req.url === undefined ? USAGE_ROUTE : req.url), 'http://localhost').searchParams.get('refresh') === '1'
        } catch {
          forced = false
        }
        const stale = USAGE.attemptedAt === 0 || now - USAGE.attemptedAt > USAGE_STALE_MS
        if (!USAGE.refreshing && (forced || stale)) void refreshUsage(ctx, forced)
        send(res, 200, Object.assign({ version: VERSION }, aggregateUsage(now)))
      },
    })
    return () => {
      if (typeof dispose === 'function') dispose()
    }
  }, 'claude-style: usage route')
}
