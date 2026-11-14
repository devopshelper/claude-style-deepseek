/**
 * Host half of the Claude Style bundle.
 *
 * The bundle paints the existing Client surfaces, so nothing here is
 * model-facing. It owns one thing: the profile's auto-compaction threshold.
 * The Web page reads and writes it through one same-origin route
 * (`/claude-style/auto-compact`), because a page cannot touch the loader
 * config directly and the desktop page has no other channel to the Host.
 *
 * The value lives where the loader already reads it: a marked entry in the
 * profile's `cordis.patch.yml`. Writing that entry keeps the choice durable
 * across restarts; when the compaction service exposes a mutable config, the
 * new ratio is also applied to the running engine so the change is immediate.
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

/**
 * Mount the route. The Host service registry is read lazily: a Host without a
 * Web server simply has no control, and the Client falls back to a read-only
 * section instead of failing to load.
 */
export function apply(ctx) {
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
