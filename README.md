# Claude Style for DeepSeek Harness

**Claude Code's quiet terminal, drawn over the DeepSeek Harness transcript.**
Warm charcoal or warm paper, one line per tool call, a thinking block that scrolls
like a live log, and every finished step folded into one expandable line.

[![license](https://img.shields.io/badge/license-MIT-D97757)](LICENSE)
[![platform](https://img.shields.io/badge/platform-DeepSeek%20Harness%20Web-4D6BFE)](https://github.com/deepseek-ai/deepseek-harness)
[![dsh](https://img.shields.io/badge/dsh-%E2%89%A5%200.2.2--rc.1-8f8b80)](#compatibility)
[![PRs](https://img.shields.io/badge/PRs-welcome-2EA44F)](#contributing)

Most Claude Code skins stop at the palette and carry the old chat chrome with it:
bubbles, cards, borders, glow. This plugin takes the transcript apart instead. The
conversation reads the way the terminal prints it.

```text
> make the sidebar quieter, keep the transcript

  Done. The sidebar now paints the same warm surface as the canvas.

● Think   the previous card kept a border on every row, which is what reads as
│         noise. One rule on the process group is enough.
│         ...
⏺ Read    src/chat/ChatView.module.css
│         ⎿ 448 lines
⏺ Edit    src/chat/ChatView.module.css
● Thought, read 3 files, ran 1 command                              12s  ⌄
```

## What it changes

Two independent layers, both switchable from **Settings -> Plugins -> Claude Style**.

| Layer | Effect |
| --- | --- |
| **Palette** | Alias-token overrides for the Harness theme service. Warm charcoal `#1f1e1c` in dark, warm paper `#faf9f5` in light, muted warm text, Claude's `#d97757` on links, primary actions, the running status and diff markers. Light and dark carry their own values, so `system` keeps working. |
| **Transcript** | A stylesheet over the attributes the Chat surface already publishes. No shipped class name, stylesheet or component is copied or replaced. |

In the transcript:

- input becomes a full-measure prompt block: `>` marker, one accent rule, no bubble
- reasoning becomes a dim italic thinking row on an accent rail, expanding into a soft box
- while a thinking block streams, its row opens by itself and is clipped to a ten-line window: the text glides up two lines every 840ms, both edges of the window are masked so new lines arrive soft, and the window catches up by whole lines without ever passing the newest one; when the block settles the row folds back and the full text is one click away
- a hand toggle always wins: a row you open or close yourself is never touched again
- every tool call is one monospace line with a bullet, the localized tool name and the command or path; output hangs off a thin rail underneath
- a finished turn's steps collapse into one line whose bullet becomes a chevron on hover, with an indented body when opened
- the conversation font is opt-in: the harness face, a reading serif, or a terminal monospace, code always in monospace
- the sidebar's identity is yours: the DeepSeek wordmark can become your own name, the new-session button can say
  anything, the whale can become a twelve-ray Claude mark, and workspace folder rows can carry the Claude star
- in `Full`, sending flies the composer's send control: the icon leaves up and to the right, a ring opens and a
  check lands in the accent, then the control returns
- the model menu drills like Claude's: the current provider's models are the main screen, flat (its provider
  heading is hidden), **More models ›** opens every other provider on a second screen with a **‹ Back** row,
  the checked row takes an accent wash, and the **Effort** screen opens with one line on what higher effort costs
- a **Context** tab in the right sidebar: percent and tokens used, a bar split into messages, tools and system
  prompt, plus free space and any unaccounted remainder, read from the token meter's own projections

Step folding itself is the Harness's **Work details** setting (`Settings -> General ->
Work details`). This plugin only restyles the summary line and its body.

## Install

### Windows

One line, no clone, no saved script. Paste it into PowerShell (it also works from
`cmd` and the Run dialog):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/devopshelper/claude-style-deepseek/main/install.ps1 | iex"
```

The outer `powershell` matters: the installer ends with `exit`, and running it in a
child process reports that exit code instead of closing your window. What runs is
[install.ps1](install.ps1) from `main`, which you can read first.

Prefer a file you can re-run? Download [install.bat](install.bat) and double-click it,
or fetch it in `cmd` (Windows 10 1803 and later carry `curl`):

```bat
curl -fsSL -o install.bat https://raw.githubusercontent.com/devopshelper/claude-style-deepseek/main/install.bat && install.bat
```

It does the whole job:

- finds `dsh` on PATH, in the desktop app's own `resources\runtime\cli\bin`, in the
  Add/Remove Programs entry, or installs the CLI from npm when neither exists
- adds that folder to your user PATH when the entry is missing (the registry value
  kind is preserved, and the current process gets it immediately)
- picks the profile for you: `desktop` when the app has been opened once, `web`
  otherwise
- installs the plugin and makes sure the profile **selects the bundle** in
  `dsh.profile.bundles`: a plain add selects a brand-new dependency, but an update of
  one that is already present can leave it installed and mounted nowhere
- verifies the dependency, the client file and the selection, then prints the version

Options:

```bat
install.bat -Profile web      :: force a profile
install.bat -Uninstall        :: remove the plugin and deselect the bundle
install.bat -NoPathRepair     :: leave PATH alone
install.bat -CompactThreshold 0.75  :: compact the context earlier
```

No execution-policy change is needed: the `.bat` starts the `.ps1` with
`-ExecutionPolicy Bypass` for that one process only. Running `install.ps1` directly on
a locked-down machine needs the same flag:

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

Exit codes: `0` installed, `1` failed, `2` open DeepSeek Harness once so it creates the
profile, then run it again.

### Manual install

```bash
# browser / dsh web profile
dsh plugin --profile web add github:devopshelper/claude-style-deepseek
```

```powershell
# Windows desktop app
dsh plugin --profile desktop add github:devopshelper/claude-style-deepseek
```

Then select the bundle, because the dependency alone is inert: **Settings -> Plugins ->
Claude Style** must show as enabled. The installer does this for you.

No `dsh` on PATH? Call the app's own launcher, which is the same CLI:

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add github:devopshelper/claude-style-deepseek
```

Or install the CLI from npm on a machine without the app:

```powershell
npm install -g @deepseek-ai/dsh
dsh plugin --profile web add github:devopshelper/claude-style-deepseek
dsh web
```

Working on the plugin itself? Install the checkout instead of GitHub and the profile
links the directory:

```powershell
dsh plugin --profile desktop add C:\path\to\claude-style-deepseek
```

> Installing into a profile applies to every session in that profile. Keep one theme
> bundle selected at a time.

## Settings

**Settings -> Plugins -> Claude Style** has three switches and one choice:

- **Claude palette** retracts the token layer, leaving your current theme's colors.
- **Claude transcript** drops the stylesheet and the thinking-window engine, leaving
  the shipped chat untouched.
- **Thinking animation** is a two-way choice, not a switch:
  - `RDP` keeps the transcript still and instant for high-latency remote sessions:
    no stepping, no breathing mark, no send flight, no transitions.
  - `Full` is the rich profile: the breathing running mark, the stepping window and
    the send flight. It deliberately does **not** follow the system's reduced-motion
    query, because the desktop app reports reduced motion on Windows with animation
    effects off and this skin would otherwise never animate. Pick `RDP` here for a
    still transcript.
- **Conversation font** is optional, and off by default: `Default` keeps the harness
  face (Thmanyah Sans in current builds), `Serif` sets the transcript in a reading
  serif, `Mono` sets the transcript and the composer in the terminal face. Code blocks
  keep their own monospace in every mode. The harness itself exposes no font-family
  setting and no font token, so this is the only supported way to change it.

The second group holds the sidebar:

- **Brand name** replaces the DeepSeek wordmark with your own text (the wordmark is an
  SVG, so the text is drawn over its slot). Empty restores the shipped mark.
- **New session label** replaces the words on the sidebar button and its accessible
  name. Empty restores the shipped label.
- **Brand mark** picks the glyph beside the name: the shipped whale, or a twelve-ray
  sunburst drawn in code and tinted with the accent.
- **Folder icon** picks the glyph on workspace rows: the shipped folder, or the Claude
  star nested inside a folder outline.
- **Auto-compact** turns the host's automatic compaction on or off and picks the
  threshold between 60% and 90% of the context window. The value is stored by the
  plugin's Host half in the profile patch, so it survives restarts.

All choices persist in the browser's `localStorage` for the profile you are using, except
the auto-compact threshold, which belongs to the profile patch.

## Auto-compact

The harness already ships automatic compaction (`dsh-compaction-basic`, `auto: true`),
so there is no engine to add, only a threshold to expose. That threshold now lives in
the plugin's own menu: **Settings -> Plugins -> Claude Style -> Auto-compact**, with an
on/off switch and a percentage choice (60-90%).

The plugin's Host half owns the value and serves it to the page over one same-origin
route, `/claude-style/auto-compact`. That route writes the same marked block into
`%USERPROFILE%\.dsh\profiles\<profile>\cordis.patch.yml` that the installer writes:

```yaml
# >>> claude-style-deepseek auto-compact
- id: compaction-basic
  name: "@deepseek-ai/dsh-compaction-basic"
  config:
    thresholdRatio: 0.75
# <<< claude-style-deepseek auto-compact
```

The change is pushed into the running engine when the compaction service exposes a
writable config, so it can take effect immediately; otherwise the section says
"restart to apply", because the loader reads the patch at boot.

The installer flag still works for a fresh machine:

```bat
install.bat -CompactThreshold 0.75
```

The engine's other knobs live in the same entry: `headroomTokens` (65536),
`retainRatio`, `retainTokens`, `compactionRetries`, `maxOverflowRetries`,
`modelPolicies`, and `auto`. A lower threshold compacts sooner and keeps the context
window smaller, at the cost of summarizing away detail earlier.

## Context tab

The right sidebar gains a **Context** tab: open the right sidebar and pick **Context**
from its guide. It shows the numbers the composer meter already knows, laid out the way
Claude's context panel does:

- percent used and `used / capacity` in tokens
- a bar split into messages, tools and system prompt, plus the unaccounted remainder
- each bucket's tokens and share of the window, a free-space row, and a hint that points
  at the profile threshold above

It reads the `contextPressure` and `contextBreakdown` client projections, so it agrees
with the meter and stays live during a turn. Nothing is scraped from the host's DOM.

## Tuning

The thinking window reads its numbers from CSS custom properties on
`body[data-cc-flow]`, so you can retune them from a stylesheet without touching the
module:

| Variable | Default | Meaning |
| --- | --- | --- |
| `--cc-reason-window-cap` | `240px` | height ceiling of the live thinking window (ten 24px lines) |
| `--cc-reason-lines` | `2` | lines travelled per step |
| `--cc-reason-hold` | `840ms` | rest between two steps |
| `--cc-reason-fade` | `24px` | depth of the top and bottom fade |
| `--cc-reason-duration` | `500ms` | glide of one step |
| `--cc-reason-ease` | `cubic-bezier(.22,.61,.36,1)` | curve of one step |

The reading measure is `--dsh-chat-user-width` (`min(820px, 100%)`). Raise the ceiling
and the window only appears on longer thoughts; lower it and it starts stepping
sooner. The window steps only in the `Full` animation profile.

## How it works

- The palette is a **token layer** (`ctx.theme.overrideTokens`), not a registered
  theme. It stacks over whatever theme is selected, composes with light/dark/system,
  and disappears cleanly when switched off.
- The transcript skin targets documented Chat attributes (`data-chat-flow-kind`,
  `data-message-bubble`, `data-variant="think"`, `data-tool`, `data-step-process`,
  `data-disclosure-row`). The hashed class names beside them change between builds and
  are not used. The reasoning body is found through the Markdown variant attribute when
  the host draws one, and through the first laid-out child of the disclosure body when
  it does not (this host build draws none).
- The thinking window is the only DOM write. It opens and folds the live thinking
  row through the host's own disclosure toggle, then sets and removes its own
  attributes plus the `height` and `transform` it owns on that row. It stops on
  unload, when the animation switch is off, or when the transcript layer is switched
  off.
- The sidebar identity rides on the slots the host publishes (`sidebar.brand.name`,
  `sidebar.brand.mark`) and on `:has()`: the shipped SVG stays in the document and the
  custom text or masked star is drawn over it, so an emptied field restores the
  original without moving any node. Only the new-session words are rewritten in place,
  with their originals remembered and put back, and only while a custom label is set.
- The model submenu writes group attributes, inserts a **More models** row and a **Back** row into the
  host's model pane, and switches one `data-cc-view` attribute between the two screens. The host still
  renders every model row and owns every choice; nothing is re-parented or re-bound.
- No Harness Client package is imported: `react` comes from the page's module table,
  every other control is markup and tokens.

## Compatibility

- DeepSeek Harness `>= 0.2.2-rc.1`, `web` client platform.
- Any theme selected in Appearance; the token layer stacks over it. If another plugin
  also overrides tokens, the layer registered last wins.
- Uninstall: `dsh plugin --profile <profile> remove claude-style-deepseek`, or remove
  the bundle from **Settings -> Plugins**.

## Credits

- The thinking window follows the reasoning window in
  [`dsh-claude-style`](https://github.com/Nwflower/dsh-claude-style) (MIT); this is a
  reimplementation, not a copy of its engine.
- Accent sampled from Claude Code's terminal. Not affiliated with or endorsed by
  Anthropic.

## Contributing

The plugin is plain JavaScript with no build step: `client.js` is the module the
browser loads. Node's parser check (`node --check client.js`) and the package
manifest are enough to validate a change before a refresh; there is no test runner in
the repository.

## License

MIT. See [LICENSE](LICENSE).
