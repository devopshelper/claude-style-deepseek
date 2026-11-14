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

**Settings -> Plugins -> Claude Style** has three switches:

- **Claude palette** retracts the token layer, leaving your current theme's colors.
- **Claude transcript** drops the stylesheet and the thinking-window engine, leaving
  the shipped chat untouched.
- **Thinking animation** drives the window and the breathing running mark. It is on by
  default and deliberately does **not** follow the system's reduced-motion query: the
  desktop app reports reduced motion on Windows with animation effects turned off, and
  a theme whose whole point is this window would otherwise stand still. Switch it off
  here for a still transcript.

All choices persist in the browser's `localStorage` for the profile you are using.

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
sooner.

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
