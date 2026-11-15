/**
 * Host half of the Claude Style bundle.
 *
 * The bundle paints the existing Client surfaces, so nothing here is
 * model-facing. It owns two things.
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
 *    Session and its projections and returns one text report, so nothing is
 *    sent to the model. The report is the durable record the transcript keeps;
 *    the Client half renders the same text as a card.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const ROUTE = '/claude-style/auto-compact'
const START = '# >>> claude-style-deepseek auto-compact'
const END = '# <<< claude-style-deepseek auto-compact'
const MIN_RATIO = 0.5
const MAX_RATIO = 0.95
const DEFAULT_RATIO = 0.8
const BODY_LIMIT = 4096

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
function buildReport(session, values, now) {
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

/** The command handler: one text result, never a model turn. */
function executeStatsCommand(ctx, invocation) {
  const agent = invocation === null || invocation === undefined ? undefined : invocation.agent
  const session = sessionOf(ctx, agent)
  if (session === undefined || session === null) {
    return { kind: 'error', text: 'No live Session is attached to this command.' }
  }
  const read = readStats(ctx, session)
  if (read.error !== undefined) return { kind: 'error', text: read.error }
  try {
    return { kind: 'success', text: buildReport(session, read.values, Date.now()) }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { kind: 'error', text: 'Session usage could not be formatted: ' + reason }
  }
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
          send(res, 200, { enabled: state.enabled, threshold: state.threshold, profile: profileName() })
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
          send(res, 200, { enabled, threshold: enabled ? written : null, profile: profileName(), live })
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
}
