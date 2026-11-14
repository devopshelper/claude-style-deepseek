window.__ModuleLoader__.load({
  id: 'claude-style-deepseek',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /* ------------------------------------------------------------------ *
     * Claude Style for DeepSeek Harness — Client half.
     *
     * Two independent layers over the shipped UI:
     *
     *  1. Palette: alias-token overrides handed to the Client theme service,
     *     so every surface the harness already paints follows the warm
     *     charcoal / paper scheme and the light/dark preference keeps
     *     working. Tokens, not class names, so no shipped stylesheet is
     *     copied and none is replaced.
     *
     *  2. Transcript skin: one stylesheet keyed on the stable data
     *     attributes the Chat surface already publishes
     *     (`data-chat-flow-kind`, `[data-tool]`, `[data-variant=think]`,
     *     `[data-step-process]`, `[data-disclosure-row]`). Those attributes
     *     are part of the Chat contract; the hashed CSS-module class names
     *     next to them are not, and none are used here.
     *
     * Both layers can be switched off in Settings -> Plugins -> Claude Style,
     * and each one degrades to "no rules match" rather than a broken row.
     * ------------------------------------------------------------------ */

    const NS = 'claudeFlow';
    const PREF_KEY = 'claude-style-deepseek.prefs';
    const CHANGE_EVENT = 'claude-style-deepseek:change';
    const STYLE_TAG = 'claude-style-deepseek/flow.css';
    const SOURCE = 'claude-style-deepseek';

    /* `motion` is separate from `flow` because it is the one choice a reader
       makes against the operating system: the desktop app reports
       prefers-reduced-motion: reduce on machines with Windows animation
       effects off, and a skin whose whole point is the thinking window would
       stand completely still there. The plugin's own switch is the explicit
       answer for these rows; it defaults to moving.

       `typeface` is optional for the same reason the palette is: the harness
       fixes its font in CSS with no setting to change it, so the only polite
       way to offer one is to leave the shipped font alone until a reader asks
       for another. */
    const DEFAULT_PREFS = { colors: true, flow: true, motion: true, typeface: 'default' };

    const FLOW_ATTR = 'data-cc-flow';
    const COLORS_ATTR = 'data-cc-colors';
    const MOTION_ATTR = 'data-cc-motion';
    const TYPEFACE_ATTR = 'data-cc-typeface';

    /**
     * The stylesheet. Every transcript rule is scoped to `body[data-cc-flow]`,
     * so removing the attribute restores the shipped transcript exactly.
     */
    const CSS =
      /* ---- palette hooks -------------------------------------------------
         Local variables only; every value that must follow the theme is a
         `--dsw-*` token. The orange is the skin's artwork, sampled from
         Claude Code's terminal accent. */
      'body[data-cc-flow]{' +
        '--cc-accent:#d97757;' +
        '--cc-accent-strong:#c96442;' +
        '--cc-accent-soft:color-mix(in srgb,#d97757 42%,transparent);' +
        '--cc-rail:color-mix(in srgb,var(--dsw-alias-label-tertiary) 34%,transparent);' +
        '--cc-step-rail:color-mix(in srgb,var(--dsw-alias-label-tertiary) 22%,transparent);' +
        '--cc-think-bg:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent);' +
        '--cc-prompt-bg:color-mix(in srgb,var(--dsw-alias-label-primary) 3.5%,transparent);' +
        '--cc-mono:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);' +
        /* The reading face: system serifs that reach the same shelf as the
           editorial look, with no font file to download and nothing to
           license. --cc-mono stays the terminal face, and it is the harness's
           own code font when that is available. */
        '--cc-prose:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,"Times New Roman",serif;' +
        /* The thinking window, tuned the way the reference skin tunes it: a
           ceiling on what a live thought may occupy, two lines per step, a
           rest long enough to read a step before it moves, and the glide of
           one step. The engine reads these back through getComputedStyle, so
           a reader can retune the window from a stylesheet alone. The ceiling
           is ten lines: the reference borrows the host's 400px process-body
           cap, and this host draws no such cap, so the window takes the
           Claude Code thinking-box height instead. */
        '--cc-reason-window-cap:240px;' +
        '--cc-reason-lines:2;' +
        '--cc-reason-hold:840ms;' +
        '--cc-reason-fade:24px;' +
        '--cc-reason-duration:500ms;' +
        '--cc-reason-ease:cubic-bezier(.22,.61,.36,1);' +
        /* Claude Code keeps a narrow, stable reading measure. The Chat body
           derives its content width from this variable, so the composer and
           every Markdown table follow it. */
        '--dsh-chat-user-width:min(820px,100%);' +
        '--dsh-chat-flow-gap:6px}' +

      /* ---- conversation font ---------------------------------------------
         Off by default: the shipped font stands until the reader picks one.
         The family goes on the chat column, so the whole transcript follows
         while the composer follows only in the terminal face, where a mono
         input matches the mono transcript. Code keeps its own monospace in
         both modes; the host sets that family on code elements directly. */
      'body[data-cc-flow][data-cc-typeface=serif] [data-chat-flow]{font-family:var(--cc-prose)}' +
      'body[data-cc-flow][data-cc-typeface=mono] :is([data-chat-flow],[data-composer-seat]){font-family:var(--cc-mono)}' +

      /* ---- user prompt ---------------------------------------------------
         A prompt block, not a chat bubble: full measure, transparent, one
         accent rule and the `>` marker Claude Code prints before input. The
         column is widened through its own relationship to the bubble, so the
         rule works at any node-wrapper depth; the action row stays where the
         shipped layout puts it. */
      'body[data-cc-flow] :is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]) :is(div,section):has(>[data-message-bubble]){width:100%!important;max-width:100%!important}' +
      'body[data-cc-flow] :is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]) [data-message-bubble]{position:relative;align-self:stretch;max-width:100%;padding:5px 14px 5px 22px!important;border:0!important;border-left:2px solid var(--cc-accent-soft)!important;border-radius:0 8px 8px 0!important;background:var(--cc-prompt-bg)!important}' +
      'body[data-cc-flow] :is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]) [data-message-bubble]::before{content:">";position:absolute;left:8px;top:0;bottom:0;display:flex;align-items:center;color:var(--cc-accent);font-family:var(--cc-mono);font-size:12px;font-weight:700;line-height:1;pointer-events:none}' +

      /* ---- thinking ------------------------------------------------------
         Collapsed: one line, dim and italic, on an accent rule. Expanded: a
         soft box around the full reasoning. This is the "thinking block".
         Selectors stay on the disclosure row that belongs to this block, so
         nested disclosures inside the reasoning body keep their own chrome. */
      'body[data-cc-flow] [data-variant=think]{position:relative;margin:2px 0;padding-left:11px;border-left:2px solid color-mix(in srgb,#d97757 36%,transparent);border-radius:0 8px 8px 0}' +
      'body[data-cc-flow] [data-variant=think][data-expanded]{padding:6px 12px 8px 12px;background:var(--cc-think-bg);border-radius:0 10px 10px 0}' +
      'body[data-cc-flow] [data-variant=think]>div>[data-disclosure-header]>[data-disclosure-row]{color:var(--dsw-alias-label-tertiary)!important;font-style:italic}' +
      'body[data-cc-flow] [data-variant=think]>div>[data-disclosure-header]>[data-disclosure-row]::before{content:"";display:inline-block;flex:none;width:5px;height:5px;margin:0 8px 0 2px;border-radius:50%;background:color-mix(in srgb,#d97757 70%,transparent)}' +
      'body[data-cc-flow] [data-variant=think]>div>[data-disclosure-header]>[data-disclosure-row]>:first-child{width:0;min-width:0;margin:0;padding:0;overflow:hidden}' +
      'body[data-cc-flow] [data-variant=think]>div[data-open]>[data-disclosure-header]+div{padding-left:0!important;color:var(--dsw-alias-label-secondary);font-style:italic}' +
      'body[data-cc-flow] [data-variant=think][data-state=running]>div>[data-disclosure-header]>[data-disclosure-row]{color:var(--dsw-alias-label-secondary)!important}' +
      /* The running mark breathes for as long as the block is live. Gated on
         the plugin's own switch, never on the OS query: that query is what
         used to leave this skin still. */
      '@keyframes cc-think-pulse{0%,100%{opacity:.35;transform:scale(.78)}50%{opacity:1;transform:scale(1.18)}}' +
      'body[data-cc-flow][data-cc-motion=full] [data-variant=think][data-state=running]>div>[data-disclosure-header]>[data-disclosure-row]::before{animation:cc-think-pulse 1.6s ease-in-out infinite}' +

      /* ---- live thinking window ------------------------------------------
         The engine clips an open, still-streaming reasoning body to the
         ceiling, masks both edges once the text fills it, and glides the text
         upward a whole number of lines every hold. The rules here only paint
         what the engine marks; nothing is touched once the row settles, so a
         finished block reads whole. */
      'body[data-cc-flow] [data-cc-reason-window]{position:relative;overflow:hidden}' +
      'body[data-cc-flow] [data-cc-reason-window][data-cc-reason-capped]{-webkit-mask-image:linear-gradient(transparent 0,#000 var(--cc-reason-fade),#000 calc(100% - var(--cc-reason-fade)),transparent 100%);mask-image:linear-gradient(transparent 0,#000 var(--cc-reason-fade),#000 calc(100% - var(--cc-reason-fade)),transparent 100%)}' +
      'body[data-cc-flow] [data-cc-reason-window] [data-cc-reason-text]{transform:translateY(0);transition:transform var(--cc-reason-duration) var(--cc-reason-ease);will-change:transform}' +
      /* The newest line lands soft rather than hard: the window fades the text
         it is still receiving while the step glides over it. */
      'body[data-cc-flow] [data-cc-reason-window][data-cc-reason-capped] [data-cc-reason-text]{animation:cc-reason-settle .4s ease-out both}' +
      '@keyframes cc-reason-settle{from{opacity:.55}to{opacity:1}}' +

      /* ---- tool calls ----------------------------------------------------
         One line per call: a bullet, the localized tool title, then the
         command or path. The expanded body hangs off a thin rail, the way
         Claude Code indents tool output under the call. */
      'body[data-cc-flow] [data-tool]{padding:1px 0}' +
      'body[data-cc-flow] [data-tool]>div>[data-disclosure-header]>[data-disclosure-row]{font-family:var(--cc-mono);font-size:calc(var(--dsh-content-font-size-secondary,13px) - .5px);letter-spacing:0}' +
      'body[data-cc-flow] [data-tool]>div>[data-disclosure-header]>[data-disclosure-row]::before{content:"";display:inline-block;flex:none;width:6px;height:6px;margin:0 8px 0 3px;border-radius:50%;background:var(--cc-accent);opacity:.8}' +
      'body[data-cc-flow] [data-tool][data-state=error]>div>[data-disclosure-header]>[data-disclosure-row]::before{background:var(--dsw-alias-state-error-primary);opacity:1}' +
      'body[data-cc-flow] [data-tool][data-state=ok]>div>[data-disclosure-header]>[data-disclosure-row]::before{opacity:.65}' +
      /* The variant glyph would repeat what the title already says, and the
         chevron seat would leave a hole; the whole row is the toggle. */
      'body[data-cc-flow] [data-tool]>div>[data-disclosure-header]>[data-disclosure-row]>:first-child{width:0;min-width:0;margin:0;padding:0;overflow:hidden}' +
      'body[data-cc-flow] [data-disclosure-row][data-expandable]{cursor:pointer}' +
      'body[data-cc-flow] [data-tool]>div>[data-disclosure-header]+div{margin:2px 0 5px 18px;padding-left:11px;border-left:1px solid var(--cc-rail)}' +

      /* ---- step summaries ------------------------------------------------
         The completed-turn process group is already the "steps, summarized
         and expandable" row: a button with the derived title and a body.
         Restyle it as a Claude Code step line and indent the members. */
      'body[data-cc-flow] [data-step-process] button[data-process-activity]{gap:0;font-size:calc(var(--dsh-content-font-size,14px) - 1px);color:var(--dsw-alias-label-tertiary)}' +
      'body[data-cc-flow] [data-step-process] button[data-process-activity]>span:first-child{margin-right:8px}' +
      'body[data-cc-flow] [data-step-process] [data-step-process-icon]{display:none}' +
      'body[data-cc-flow] [data-step-process] button[data-process-activity]>span:first-child::before{content:"";position:absolute;left:2px;top:50%;width:7px;height:7px;border-radius:50%;background:var(--cc-accent);opacity:.9;transform:translateY(-50%);transition:opacity .1s}' +
      'body[data-cc-flow] [data-step-process] button[data-process-activity]:hover>span:first-child::before,' +
      'body[data-cc-flow] [data-step-process] button[data-process-activity]:focus-visible>span:first-child::before,' +
      'body[data-cc-flow] [data-step-process] button[data-process-activity][aria-expanded=true]>span:first-child::before{opacity:0}' +
      'body[data-cc-flow] [data-step-process] button[data-process-activity][aria-expanded=true]{color:var(--dsw-alias-label-secondary)}' +
      'body[data-cc-flow] [data-step-process-body]{margin-left:4px;padding-left:11px;border-left:1px solid var(--cc-step-rail)}' +

      /* ---- chrome --------------------------------------------------------
         Two last touches that read as Claude Code: disclosure rows keep a
         visible focus ring under the pointer-free transcript, and a settled
         reply gets a hair of vertical room instead of hugging the step row
         above it. `data-chat-group-part` sits on the same flow item as
         `data-chat-flow-kind`, so both attributes share one selector. */
      'body[data-cc-flow] [data-chat-flow-kind] [data-disclosure-row]:focus-visible{outline:1.5px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}' +
      'body[data-cc-flow] [data-chat-flow-kind=assistant-step][data-chat-group-part=response]{padding:1px 0}' +

      /* ---- the settings page ---------------------------------------------
         Host tokens only, so the page belongs in Settings. Not scoped to the
         transcript: it renders outside the conversation column. */
      '.cc-set{display:flex;flex-direction:column;gap:14px;max-width:720px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.5}' +
      '.cc-set-title{margin:0;font-size:15px;font-weight:600}' +
      '.cc-set-intro{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px}' +
      '.cc-set-group{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:.5px solid var(--dsw-alias-border-l2)}' +
      '.cc-set-row{display:flex;align-items:flex-start;gap:12px}' +
      '.cc-set-copy{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}' +
      '.cc-set-label{font-size:13px;color:var(--dsw-alias-label-primary)}' +
      '.cc-set-desc{font-size:12px;color:var(--dsw-alias-label-tertiary)}' +
      '.cc-set-switch{flex:none;position:relative;width:34px;height:20px;margin-top:1px;padding:0;border:.5px solid var(--dsw-alias-border-l3);border-radius:999px;background:var(--dsw-alias-bg-layer-3);cursor:pointer;transition:background .15s ease,border-color .15s ease}' +
      '.cc-set-switch::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-switch-thumb);transition:transform .15s ease}' +
      '.cc-set-switch[aria-checked=true]{background:var(--cc-accent-strong,#c96442);border-color:transparent}' +
      '.cc-set-switch[aria-checked=true]::after{transform:translateX(14px);background:#fff}' +
      '.cc-set-switch:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}' +
      '.cc-set-choice{display:flex;flex:none;gap:4px;margin-top:1px}' +
      '.cc-set-option{padding:3px 9px;border:.5px solid var(--dsw-alias-border-l3);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:1.5;cursor:pointer;transition:background .15s ease,border-color .15s ease,color .15s ease}' +
      '.cc-set-option:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.cc-set-option[aria-checked=true]{background:var(--cc-accent-strong,#c96442);border-color:transparent;color:#fff}' +
      '.cc-set-option:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}' +
      '.cc-set-hint{margin:0;padding-top:10px;border-top:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:11px}' +
      '.cc-set-hint code{font-family:var(--cc-mono,var(--ds-font-family-code,ui-monospace,monospace));font-size:11px;padding:0 3px;border-radius:3px;background:var(--dsw-alias-markdown-inline-code)}' +
      '@media (prefers-reduced-motion:reduce){.cc-set-switch,.cc-set-switch::after,.cc-set-option{transition:none}}';

    /**
     * Alias-token layer. Warm charcoal in dark, warm paper in light; the
     * Claude accent replaces the brand accent so primary actions, links and
     * the running status all carry it.
     */
    const PALETTE = {
      '--dsw-radius-xs': { light: '3px', dark: '3px' },
      '--dsw-radius-sm': { light: '6px', dark: '6px' },
      '--dsw-radius-md': { light: '10px', dark: '10px' },
      '--dsw-radius-lg': { light: '12px', dark: '12px' },
      '--dsw-radius-xl': { light: '14px', dark: '14px' },
      '--dsw-radius-panel': { light: '16px', dark: '16px' },

      '--dsw-alias-bg-base': { light: '#faf9f5', dark: '#1f1e1c' },
      '--dsw-alias-bg-layer-1': { light: '#f5f3ec', dark: '#262624' },
      '--dsw-alias-bg-layer-2': { light: '#eeece3', dark: '#2b2b28' },
      '--dsw-alias-bg-layer-3': { light: '#e6e3d7', dark: '#34332f' },
      '--dsw-alias-bg-overlay': { light: '#f6f4ed', dark: '#2a2a27' },
      '--dsw-alias-bg-module-platform': { light: '#efece2', dark: '#2b2b28' },
      '--dsw-alias-bg-multi-select': { light: '#eeece3', dark: '#2b2b28' },
      '--dsw-alias-bg-skeleton': { light: 'rgba(60,50,40,.06)', dark: 'rgba(255,255,255,.06)' },
      '--dsw-alias-bg-mask-drop': { light: 'rgba(250,249,245,.70)', dark: 'rgba(38,38,36,.70)' },

      '--dsw-alias-border-inverted': { light: 'transparent', dark: 'rgba(255,255,255,.06)' },
      '--dsw-alias-border-inverted2': { light: 'transparent', dark: 'rgba(255,255,255,.08)' },
      '--dsw-alias-border-l1': { light: 'rgba(60,50,40,.08)', dark: 'rgba(255,255,255,.06)' },
      '--dsw-alias-border-l2': { light: 'rgba(60,50,40,.14)', dark: 'rgba(255,255,255,.11)' },
      '--dsw-alias-border-l3': { light: 'rgba(60,50,40,.20)', dark: 'rgba(255,255,255,.17)' },
      '--dsw-alias-border-l4': { light: 'rgba(60,50,40,.28)', dark: 'rgba(255,255,255,.24)' },

      '--dsw-alias-label-primary': { light: '#2f2b25', dark: '#f2f0e8' },
      '--dsw-alias-label-secondary': { light: '#5c564b', dark: '#c3c0b5' },
      '--dsw-alias-label-tertiary': { light: '#7d7667', dark: '#948f83' },
      '--dsw-alias-label-caption': { light: '#9a9284', dark: '#736e62' },
      '--dsw-alias-label-dimmed': { light: '#ddd7c8', dark: '#3c3a35' },
      '--dsw-alias-label-primary-dimmed': { light: '#3a352d', dark: '#e3e0d4' },
      '--dsw-alias-label-primary-bluish': { light: '#2f2b25', dark: '#f2f0e8' },
      '--dsw-alias-label-primary-foreground': { light: '#ffffff', dark: '#ffffff' },
      '--dsw-alias-label-primary-inverted': { light: '#faf9f5', dark: '#1f1e1c' },
      '--dsw-alias-label-shimmer': { light: 'rgba(47,43,37,.30)', dark: 'rgba(242,240,232,.45)' },

      '--dsw-alias-brand-primary': { light: '#c96442', dark: '#d97757' },
      '--dsw-alias-brand-text': { light: '#c96442', dark: '#d97757' },
      '--dsw-alias-button-primary-fill': { light: '#c96442', dark: '#c96442' },
      '--dsw-alias-button-primary-hover': { light: '#b1533a', dark: '#e08a6d' },
      '--dsw-alias-button-primary-dimmed': { light: '#f2e6e0', dark: '#3a2b26' },
      '--dsw-alias-button-contrast-fill': { light: '#3a352d', dark: '#e3e0d4' },
      '--dsw-alias-button-elevated-fill': { light: '#ffffff', dark: '#34332f' },
      '--dsw-alias-button-floating-fill': { light: '#ffffff', dark: '#2a2a27' },
      '--dsw-alias-button-floating-hover': { light: '#f2f0e8', dark: '#35342f' },
      '--dsw-alias-button-ghost-active-fill': { light: '#eeece3', dark: '#34332f' },
      '--dsw-alias-button-ghost-active-hover': { light: '#e6e3d7', dark: '#3c3a35' },
      '--dsw-alias-button-ghost-active-border': { light: '#9a9284', dark: '#736e62' },

      '--dsw-alias-interactive-bg-hover': { light: 'rgba(60,50,40,.055)', dark: 'rgba(255,255,255,.055)' },
      '--dsw-alias-interactive-bg-hover-solid': { light: '#efece2', dark: '#34332f' },
      '--dsw-alias-interactive-bg-hover-accent': { light: 'rgba(201,100,66,.12)', dark: 'rgba(217,119,87,.14)' },
      '--dsw-alias-interactive-bg-hover-danger': { light: 'rgba(192,57,43,.10)', dark: 'rgba(229,105,92,.14)' },
      '--dsw-alias-interactive-bg-active': { light: 'rgba(60,50,40,.09)', dark: 'rgba(255,255,255,.09)' },

      '--dsw-alias-link': { light: '#b4532f', dark: '#e0a17f' },
      '--dsw-alias-markdown-code-block': { light: '#f2f0e8', dark: '#191918' },
      '--dsw-alias-markdown-code-block-banner': { light: '#eae7dc', dark: '#23231f' },
      '--dsw-alias-markdown-inline-code': { light: '#efece1', dark: '#2c2b27' },
      '--dsw-alias-markdown-tag': { light: '#eeeade', dark: '#2c2b27' },
      '--dsw-alias-markdown-placeholder': { light: '#eeece3', dark: '#262624' },
      '--dsw-alias-markdown-citation': { light: '#eeeade', dark: '#2c2b27' },
      '--dsw-alias-markdown-code-segment-selected': { light: '#faf9f5', dark: '#2b2b28' },
      '--dsw-alias-markdown-code-segment-unselected': { light: '#efece2', dark: '#23231f' },

      '--dsw-alias-turn-trigger-bg': { light: '#f1eee4', dark: '#24231f' },
      '--dsw-alias-turn-trigger-bg-hover': { light: '#e9e6da', dark: '#2e2d29' },
      '--dsw-specific-sidebar-fill': { light: '#f2f0e8', dark: '#1a1917' },
      '--dsw-specific-sidebar-nav-item-active': { light: '#e6e3d7', dark: '#2b2b28' },
      '--dsw-specific-sidebar-nav-item-active-accent': { light: '#f0e2da', dark: '#33261f' },
      '--dsw-specific-bubble': { light: '#f0ede3', dark: '#2f2e2a' },
      '--dsw-specific-bubble-highlight': { light: '#e3dfd0', dark: '#3d3b36' },
      '--dsw-specific-input-major': { light: '#ffffff', dark: '#262624' },
      '--dsw-specific-login-input': { light: '#f5f3ec', dark: '#232320' },
      '--dsw-specific-selector': { light: '#eeece3', dark: '#2b2b28' },
      '--dsw-specific-tip': { light: '#eeece3', dark: '#2b2b28' },
      '--dsw-specific-menu': { light: 'rgba(250,249,245,.90)', dark: 'rgba(38,38,36,.90)' },
      '--dsw-menu-surface-fill': { light: 'rgba(250,249,245,.90)', dark: 'rgba(38,38,36,.90)' },
      '--dsw-alias-menu-group-header-fill': { light: 'rgba(250,249,245,.96)', dark: 'rgba(38,38,36,.96)' },
      '--dsw-alias-menu-icon': { light: '#5c564b', dark: '#e3e0d4' },

      '--dsw-alias-state-success-primary': { light: '#3f8f4f', dark: '#66b36b' },
      '--dsw-alias-state-success-secondary': { light: '#5aa869', dark: '#86c98a' },
      '--dsw-alias-state-success-tertiary': { light: '#e6f3e6', dark: '#233c2c' },
      '--dsw-alias-state-error-primary': { light: '#c0392b', dark: '#e5695c' },
      '--dsw-alias-state-error-secondary': { light: '#d05a4c', dark: '#f08c81' },
      '--dsw-alias-state-warn-primary': { light: '#b07a1e', dark: '#d8a657' },
      '--dsw-alias-state-warn-label': { light: '#9a6a16', dark: '#d8a657' },
      '--dsw-alias-state-warn-secondary': { light: '#c9984a', dark: '#e6bd7c' },
      '--dsw-alias-state-warn-tertiary': { light: '#f7ecd8', dark: '#3a3025' },
      '--dsw-alias-state-idle-primary': { light: '#d8d3c5', dark: '#4a4844' },
      '--dsw-alias-state-done-primary': { light: '#8a6fb0', dark: '#b49ad6' },
      '--dsw-alias-label-deep-diving': { light: '#b4532f', dark: '#d97757' },
      '--dsw-alias-label-deep-diving-shimmer': { light: '#d08a68', dark: '#e8a184' },

      '--dsw-alias-toast-bg': { light: '#3a352e', dark: '#33322f' },
      '--dsw-alias-toast-label': { light: '#ffffff', dark: '#f2f0e8' },
      '--dsw-alias-tooltip-bg': { light: '#3a352e', dark: '#33322f' },
      '--dsw-alias-switch-thumb': { light: '#ffffff', dark: '#c3c0b5' },

      '--dsw-alias-scrollbar-bg-l1': { light: '#e3dfd2', dark: '#33322f' },
      '--dsw-alias-scrollbar-bg-l2': { light: '#dcd7c8', dark: '#3a3935' },
      '--dsw-alias-scrollbar-hover-l1': { light: '#cfc9b7', dark: '#45443f' },
      '--dsw-alias-scrollbar-hover-l2': { light: '#c4bda8', dark: '#514f49' },

      '--dsw-alias-code-diff-added': { light: 'rgba(63,143,79,.12)', dark: 'rgba(102,179,107,.14)' },
      '--dsw-alias-code-diff-deleted': { light: 'rgba(192,57,43,.10)', dark: 'rgba(229,105,92,.14)' },
      '--dsw-alias-file-diff-added-bg': { light: '#e9f2e6', dark: '#1f3124' },
      '--dsw-alias-file-diff-added-gutter': { light: '#f1f7ee', dark: '#132016' },
      '--dsw-alias-file-diff-added-marker': { light: '#3f8f4f', dark: '#41c977' },
      '--dsw-alias-file-diff-deleted-bg': { light: '#f7e7e2', dark: '#3c1f1b' },
      '--dsw-alias-file-diff-deleted-gutter': { light: '#fbefec', dark: '#28130e' },
      '--dsw-alias-file-diff-deleted-marker': { light: '#b0453a', dark: '#fa423e' },
    };

    const en = {
      'meta.title': 'Claude Style',
      'meta.description': 'Warm Claude Code palette with thinking blocks, one-line tool calls and collapsible step summaries.',
      'settings.title': 'Claude Style',
      'settings.intro': 'Paint the conversation the way Claude Code prints one: a warm charcoal or paper palette, a prompt block for input, a thinking block for reasoning, one line per tool call and one collapsible line per finished step.',
      'settings.colors.title': 'Claude palette',
      'settings.colors.description': 'Warm charcoal in dark, warm paper in light, with the Claude accent on links, primary actions and the running status.',
      'settings.flow.title': 'Claude transcript',
      'settings.flow.description': 'Prompt blocks, a thinking window that steps live reasoning two lines at a time, one-line tool rows and indented step summaries.',
      'settings.motion.title': 'Thinking animation',
      'settings.motion.description': 'Steps the live thinking window two lines at a time and breathes the running mark. Runs even when the system asks for reduced motion; switch it off here for a still transcript.',
      'settings.typeface.title': 'Conversation font',
      'settings.typeface.description': 'Leave the harness font alone, or set the transcript in a reading serif or a terminal monospace. Code keeps its own monospace either way.',
      'settings.typeface.default': 'Default',
      'settings.typeface.serif': 'Serif',
      'settings.typeface.mono': 'Mono',
      'settings.hint': 'Step summaries use the built-in Work details setting: Settings -> General -> Work details. Compact, Standard and Detailed collapse finished steps into one expandable line; Verbose keeps every row open. A thinking block opens while it streams and folds when it settles; open or close one yourself and the plugin leaves it alone. The window only steps once a thought outgrows its 400px ceiling.',
      'settings.motionHint': 'Windows with animation effects off report reduced motion, which is why this switch is the plugin\'s own rather than the system\'s.',
      'settings.on': 'On',
      'settings.off': 'Off',
      'label.title': 'Claude Style',
    };

    const zh = {
      'meta.title': 'Claude 风格',
      'meta.description': '暖色的 Claude Code 配色，加上思考块、单行工具调用与可折叠的步骤摘要。',
      'settings.title': 'Claude 风格',
      'settings.intro': '把对话画成 Claude Code 的样子：暖炭黑或暖纸色配色、输入用提示块、推理用思考块、每次工具调用一行、每一组已完成的步骤折叠成一行。',
      'settings.colors.title': 'Claude 配色',
      'settings.colors.description': '深色下是暖炭黑，浅色下是暖纸色，链接、主要按钮与运行状态使用 Claude 的橙色。',
      'settings.flow.title': 'Claude 会话排版',
      'settings.flow.description': '提示块、正在流式输出时按两行步进的思考窗口、单行工具行与缩进的步骤摘要。',
      'settings.motion.title': '思考动画',
      'settings.motion.description': '让正在输出的思考窗口按两行步进，并让运行中的标记呼吸。即使系统要求减少动态效果也照常运行；想完全静止就在这里关掉。',
      'settings.typeface.title': '会话字体',
      'settings.typeface.description': '保持 Harness 自带的字体，或把对话换成阅读用的衬线体、终端用的等宽体。两种模式下代码块都保持等宽。',
      'settings.typeface.default': '默认',
      'settings.typeface.serif': '衬线',
      'settings.typeface.mono': '等宽',
      'settings.hint': '步骤摘要沿用内置的“工作详情”设置：设置 -> 通用 -> 工作详情。紧凑、标准与详细会把已完成的步骤折叠成一行；详细输出会保持每个步骤展开。思考块在流式输出时自动展开、结束后自动折叠；你手动开关过的思考块不会再被改动。思考内容超过 400px 的上限后窗口才开始步进。',
      'settings.motionHint': '关闭了 Windows 动画效果的系统会报告“减少动态效果”，所以这里用插件自己的开关，而不跟随系统。',
      'settings.on': '开',
      'settings.off': '关',
      'label.title': 'Claude 风格',
    };

    /** Read the switches; anything unreadable falls back to "on". */
    function readPrefs() {
      try {
        const raw = window.localStorage.getItem(PREF_KEY);
        if (typeof raw === 'string') {
          const parsed = JSON.parse(raw);
          if (parsed !== null && typeof parsed === 'object') {
            const typeface = parsed.typeface === 'serif' || parsed.typeface === 'mono' ? parsed.typeface : 'default';
            return {
              colors: parsed.colors !== false,
              flow: parsed.flow !== false,
              motion: parsed.motion !== false,
              typeface,
            };
          }
        }
      } catch (error) {
        /* private mode, blocked origin, or a hand-edited value */
      }
      return {
        colors: DEFAULT_PREFS.colors,
        flow: DEFAULT_PREFS.flow,
        motion: DEFAULT_PREFS.motion,
        typeface: DEFAULT_PREFS.typeface,
      };
    }

    function writePrefs(prefs) {
      try {
        const typeface = prefs.typeface === 'serif' || prefs.typeface === 'mono' ? prefs.typeface : 'default';
        window.localStorage.setItem(
          PREF_KEY,
          JSON.stringify({
            colors: prefs.colors === true,
            flow: prefs.flow === true,
            motion: prefs.motion === true,
            typeface,
          }),
        );
      } catch (error) {
        /* quota or blocked storage: the choice simply does not persist */
      }
    }

    function announce() {
      try {
        window.dispatchEvent(new Event(CHANGE_EVENT));
      } catch (error) {
        /* a page without window events is not a page this plugin can run in */
      }
    }

    /* ------------------------------------------------------------------ *
     * The live thinking window.
     *
     * The reasoning spec this port follows, in full: while a thinking row is
     * live and open, the body it renders into is a window at most
     * `--cc-reason-window-cap` tall; once the text fills that window the text
     * is stepped upward by whole lines (`--cc-reason-lines` of them) every
     * `--cc-reason-hold`, gliding over `--cc-reason-duration` on
     * `--cc-reason-ease`, and the window masks `--cc-reason-fade` at both
     * edges so new lines arrive soft. A step never passes the newest line: it
     * catches up by however many whole lines the text has grown, then waits.
     *
     * The host starts every thinking row collapsed, so the engine also keeps
     * the row open while it is live and folds it back when it settles
     * (expanded <=> running). A row the reader opens or closes by hand is
     * recorded in `touched` and never pressed again for that phase.
     *
     * This is the only place the plugin touches the host's DOM: it writes two
     * attributes and the `height` / `transform` it owns, and removes them on
     * settle, collapse, unload, or when the animation switch is off.
     * ------------------------------------------------------------------ */
    const THINK_ROW = '[data-variant="think"]';
    const REASON_WINDOW_ATTR = 'data-cc-reason-window';
    const REASON_TEXT_ATTR = 'data-cc-reason-text';
    const REASON_CAPPED_ATTR = 'data-cc-reason-capped';
    const DISCLOSURE_CONTROL = '[data-disclosure-row][data-expandable]';

    function createReasonWindow() {
      const states = new Map();
      const managed = new Set();
      const touched = new WeakSet();
      let autoClicking = false;
      let observer = null;
      let frame = 0;
      let stopped = true;

      /** Read the tuning knobs from the body, with the shipped defaults. */
      const knobs = () => {
        let style = null;
        try {
          style = getComputedStyle(document.body);
        } catch (error) {
          style = null;
        }
        const read = (name, fallback) => {
          const raw = style === null ? '' : style.getPropertyValue(name);
          const value = Number.parseFloat(raw);
          return Number.isFinite(value) && value > 0 ? value : fallback;
        };
        return {
          cap: read('--cc-reason-window-cap', 240),
          lines: Math.max(1, read('--cc-reason-lines', 2)),
          hold: read('--cc-reason-hold', 840),
        };
      };

      const unfold = (row) => {
        const state = states.get(row);
        if (state === undefined) return;
        states.delete(row);
        if (state.timer !== 0) window.clearTimeout(state.timer);
        state.box.removeAttribute(REASON_WINDOW_ATTR);
        state.box.removeAttribute(REASON_CAPPED_ATTR);
        state.box.style.removeProperty('height');
        state.box.style.removeProperty('overflow');
        state.text.removeAttribute(REASON_TEXT_ATTR);
        state.text.style.removeProperty('transform');
      };

      const clearAll = () => {
        for (const row of [...states.keys()]) unfold(row);
      };

      /** The disclosure body of an open reasoning row. */
      const boxOf = (row) => {
        const disclosure = row.querySelector(':scope > [data-open]');
        if (disclosure === null) return null;
        const header = disclosure.querySelector(':scope > [data-disclosure-header]');
        if (header === null) return null;
        const box = header.nextElementSibling;
        return box === null || box === undefined ? null : box;
      };

      /** The reasoning text element inside a body (Markdown root, or the
          first laid-out child when this host draws the body without one). */
      const textOf = (box) => {
        const markdown = box.querySelector('[data-markdown-variant]');
        if (markdown !== null) return markdown;
        let node = box;
        while (node !== null) {
          let next = null;
          for (const child of node.children) {
            if (getComputedStyle(child).display !== 'contents') {
              next = child;
              break;
            }
          }
          if (next === null) return null;
          if (next.children.length === 0 || next.querySelector('[data-markdown-variant]') !== null) return next;
          node = next;
        }
        return null;
      };

      /** Window height and reachable travel for the text as it stands now. */
      const measure = (state, tuning) => {
        const lineHeight = Number.parseFloat(getComputedStyle(state.text).lineHeight);
        const line = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 24;
        const full = state.text.offsetHeight;
        const height = Math.min(full, tuning.cap);
        state.step = Math.max(1, Math.round(line * tuning.lines));
        if (state.height !== height) state.height = height;
        state.reachable = Math.max(0, Math.round(full - height));
        state.capped = full > height;
      };

      const paint = (state) => {
        state.box.setAttribute(REASON_WINDOW_ATTR, '');
        state.text.setAttribute(REASON_TEXT_ATTR, '');
        if (state.capped) {
          state.box.style.setProperty('height', state.height + 'px');
          state.box.style.setProperty('overflow', 'hidden');
          state.box.setAttribute(REASON_CAPPED_ATTR, '');
        } else {
          state.box.style.removeProperty('height');
          state.box.style.removeProperty('overflow');
          state.box.removeAttribute(REASON_CAPPED_ATTR);
          state.offset = 0;
        }
        const shift = Math.min(state.offset, state.reachable);
        if (shift > 0) state.text.style.setProperty('transform', 'translateY(-' + shift + 'px)');
        else state.text.style.removeProperty('transform');
      };

      const live = (row, state) =>
        !stopped &&
        states.has(row) &&
        row.isConnected &&
        state.box.isConnected &&
        state.text.isConnected &&
        row.hasAttribute('data-expanded') &&
        row.getAttribute('data-state') === 'running';

      const stepLater = (row, state) => {
        const tuning = knobs();
        state.timer = window.setTimeout(
          () => {
            state.timer = 0;
            if (!live(row, state)) {
              if (states.has(row)) unfold(row);
              return;
            }
            measure(state, tuning);
            const step = Math.max(1, Math.round((state.reachable - state.offset) / state.step));
            state.offset = Math.min(state.offset + step * state.step, state.reachable);
            paint(state);
            if (state.capped && state.offset < state.reachable) stepLater(row, state);
          },
          tuning.hold,
        );
      };

      const run = (row) => {
        const tuning = knobs();
        let state = states.get(row);
        if (state !== undefined) {
          const attached = state.box.isConnected && state.text.isConnected && state.box.contains(state.text);
          if (!attached) {
            unfold(row);
            state = undefined;
          }
        }
        if (state === undefined) {
          const box = boxOf(row);
          if (box === null) return;
          const text = textOf(box);
          if (text === null) return;
          state = { box, text, timer: 0, offset: 0, step: 0, height: -1, reachable: 0, capped: false };
          states.set(row, state);
        }
        measure(state, tuning);
        paint(state);
        if (state.capped && state.offset < state.reachable && state.timer === 0) stepLater(row, state);
      };

      const sync = () => {
        frame = 0;
        if (stopped) return;
        if (typeof document === 'undefined' || document.body === null) return;
        if (!document.body.hasAttribute(FLOW_ATTR)) {
          clearAll();
          return;
        }
        const motion = document.body.getAttribute(MOTION_ATTR) === 'full';
        /* Scan the transcript, not the whole document: the flow slot is the
           only place a reasoning row can appear. */
        const scope = document.querySelector('[data-slot="conversation.chat.flow"]') ?? document.body;
        const rows = scope.querySelectorAll(THINK_ROW);

        /* Keep a live thinking row open while it streams, then fold it back
           once it settles. Rows the reader touched are never pressed. */
        for (const row of rows) {
          if (!row.isConnected) {
            managed.delete(row);
            continue;
          }
          const running = row.getAttribute('data-state') === 'running';
          const expanded = row.hasAttribute('data-expanded');
          const isManaged = managed.has(row);
          if (running && !expanded && !isManaged && !touched.has(row)) {
            if (clickRow(row)) managed.add(row);
            continue;
          }
          if (!running && expanded && isManaged) {
            if (!touched.has(row)) clickRow(row);
            managed.delete(row);
            continue;
          }
          if (!running && isManaged) managed.delete(row);
        }

        if (!motion) {
          clearAll();
          return;
        }

        const open = new Set();
        for (const row of rows) {
          if (row.getAttribute('data-state') === 'running' && row.hasAttribute('data-expanded')) open.add(row);
        }
        for (const row of [...states.keys()]) {
          if (!open.has(row) || !row.isConnected) unfold(row);
        }
        for (const row of open) run(row);
      };

      /** Click the disclosure row so the host's own toggle runs. */
      const clickRow = (row) => {
        if (!row.isConnected) return false;
        const control = row.querySelector(DISCLOSURE_CONTROL) ?? row.querySelector('[data-disclosure-row]');
        if (control === null || typeof control.click !== 'function') return false;
        autoClicking = true;
        try {
          control.click();
        } catch (error) {
          return false;
        } finally {
          autoClicking = false;
        }
        return true;
      };

      /** Remember a hand toggle so an automatic one never fights the reader. */
      const markTouched = (event) => {
        if (autoClicking) return;
        const target = event.target;
        if (target === null || target === undefined || typeof target.closest !== 'function') return;
        const row = target.closest(THINK_ROW);
        if (row !== null) touched.add(row);
      };

      /** Close the rows this engine opened, best effort, on unload. */
      const release = () => {
        for (const row of [...managed]) {
          if (row.isConnected && row.hasAttribute('data-expanded') && !touched.has(row)) clickRow(row);
        }
        managed.clear();
      };

      const schedule = () => {
        if (stopped || frame !== 0) return;
        frame = window.requestAnimationFrame(sync);
      };

      return {
        start() {
          if (!stopped || typeof document === 'undefined' || document.body === null) return;
          stopped = false;
          observer = new MutationObserver(() => schedule());
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['data-state', 'data-expanded', 'data-cc-motion'],
          });
          document.addEventListener('click', markTouched, true);
          document.addEventListener('keydown', markTouched, true);
          schedule();
        },
        stop() {
          if (stopped) return;
          stopped = true;
          document.removeEventListener('click', markTouched, true);
          document.removeEventListener('keydown', markTouched, true);
          if (observer !== null) {
            observer.disconnect();
            observer = null;
          }
          if (frame !== 0) {
            window.cancelAnimationFrame(frame);
            frame = 0;
          }
          release();
          clearAll();
        },
      };
    }

    /** One switch row: label + description on the left, the control right. */
    function SwitchRow({ checked, description, label, onChange }) {
      return h(
        'div',
        { className: 'cc-set-row' },
        h(
          'div',
          { className: 'cc-set-copy' },
          h('span', { className: 'cc-set-label' }, label),
          h('span', { className: 'cc-set-desc' }, description),
        ),
        h('button', {
          type: 'button',
          role: 'switch',
          'aria-checked': checked,
          'aria-label': label,
          className: 'cc-set-switch',
          onClick: () => onChange(!checked),
        }),
      );
    }

    /** One choice row: a small radio group, for settings with more than two states. */
    function ChoiceRow({ description, label, options, value, onChange }) {
      return h(
        'div',
        { className: 'cc-set-row' },
        h(
          'div',
          { className: 'cc-set-copy' },
          h('span', { className: 'cc-set-label' }, label),
          h('span', { className: 'cc-set-desc' }, description),
        ),
        h(
          'div',
          { className: 'cc-set-choice', role: 'radiogroup', 'aria-label': label },
          options.map((option) =>
            h(
              'button',
              {
                key: option.value,
                type: 'button',
                role: 'radio',
                'aria-checked': value === option.value,
                className: 'cc-set-option',
                onClick: () => onChange(option.value),
              },
              option.label,
            ),
          ),
        ),
      );
    }

    /**
     * Settings page. Local state mirrors storage so the switch responds
     * immediately; the transcript listens to the change event for the paint.
     */
    function ClaudeFlowSettings(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key;
      const [prefs, setPrefs] = React.useState(readPrefs);
      const update = (key, value) => {
        const next = { colors: prefs.colors, flow: prefs.flow, motion: prefs.motion, typeface: prefs.typeface, [key]: value };
        setPrefs(next);
        writePrefs(next);
        announce();
      };
      return h(
        'div',
        { className: 'cc-set' },
        h('h2', { className: 'cc-set-title' }, t('settings.title')),
        h('p', { className: 'cc-set-intro' }, t('settings.intro')),
        h(
          'div',
          { className: 'cc-set-group' },
          h(SwitchRow, {
            checked: prefs.colors,
            description: t('settings.colors.description'),
            label: t('settings.colors.title'),
            onChange: (value) => update('colors', value),
          }),
          h(SwitchRow, {
            checked: prefs.flow,
            description: t('settings.flow.description'),
            label: t('settings.flow.title'),
            onChange: (value) => update('flow', value),
          }),
          h(SwitchRow, {
            checked: prefs.motion,
            description: t('settings.motion.description'),
            label: t('settings.motion.title'),
            onChange: (value) => update('motion', value),
          }),
          h(ChoiceRow, {
            description: t('settings.typeface.description'),
            label: t('settings.typeface.title'),
            value: prefs.typeface,
            options: [
              { value: 'default', label: t('settings.typeface.default') },
              { value: 'serif', label: t('settings.typeface.serif') },
              { value: 'mono', label: t('settings.typeface.mono') },
            ],
            onChange: (value) => update('typeface', value),
          }),
        ),
        h('p', { className: 'cc-set-hint' }, t('settings.hint')),
        h('p', { className: 'cc-set-hint' }, t('settings.motionHint')),
      );
    }

    /** Required services: slot registration, dictionaries, palette layers. */
    const inject = ['slots', 'locale', 'theme'];

    function apply(ctx) {
      /* ---- the settings-page name, resolved in the reader's language ----- */
      const title = () => {
        try {
          return ctx.locale.bind(NS)('label.title');
        } catch (error) {
          return 'Claude Style';
        }
      };

      /* ---- stylesheet --------------------------------------------------- */
      ctx.effect(
        () => {
          if (typeof document === 'undefined') return () => {};
          /* A hot-reloaded generation may still find the sheet of the module
             it replaced (disposal and re-apply are not ordered). Replace it
             instead of trusting it, so the stylesheet always belongs to the
             code that is running. */
          const existing = document.querySelector('style[data-plugin-css="' + STYLE_TAG + '"]');
          if (existing !== null) existing.remove();
          const tag = document.createElement('style');
          tag.dataset.plugin = SOURCE;
          tag.dataset.pluginCss = STYLE_TAG;
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => {
            if (tag.parentNode !== null) tag.parentNode.removeChild(tag);
          };
        },
        'claude-flow: transcript stylesheet',
      );

      /* ---- dictionaries -------------------------------------------------- */
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'claude-flow: dictionaries');

      /* ---- palette layer, flow attribute, thinking window ----------------- */
      const reasonWindow = createReasonWindow();

      ctx.effect(() => {
        let paletteLayer = null;

        const sync = () => {
          if (typeof document === 'undefined') return;
          const prefs = readPrefs();
          const body = document.body;
          if (body === null) return;
          body.toggleAttribute(FLOW_ATTR, prefs.flow);
          body.toggleAttribute(COLORS_ATTR, prefs.colors);
          body.setAttribute(MOTION_ATTR, prefs.motion && prefs.flow ? 'full' : 'off');
          body.setAttribute(TYPEFACE_ATTR, prefs.typeface);

          if (prefs.flow) reasonWindow.start();
          else reasonWindow.stop();

          if (prefs.colors) {
            if (paletteLayer === null) {
              try {
                paletteLayer = ctx.theme.overrideTokens(SOURCE, PALETTE);
              } catch (error) {
                /* a host without the theme service keeps the transcript skin */
                paletteLayer = null;
              }
            }
          } else if (paletteLayer !== null) {
            paletteLayer();
            paletteLayer = null;
          }
        };

        sync();

        const onChange = () => sync();
        const onStorage = (event) => {
          if (event.key === PREF_KEY) sync();
        };
        window.addEventListener(CHANGE_EVENT, onChange);
        window.addEventListener('storage', onStorage);

        return () => {
          window.removeEventListener(CHANGE_EVENT, onChange);
          window.removeEventListener('storage', onStorage);
          reasonWindow.stop();
          if (paletteLayer !== null) paletteLayer();
          if (typeof document !== 'undefined' && document.body !== null) {
            document.body.removeAttribute(FLOW_ATTR);
            document.body.removeAttribute(COLORS_ATTR);
            document.body.removeAttribute(MOTION_ATTR);
            document.body.removeAttribute(TYPEFACE_ATTR);
          }
        };
      }, 'claude-flow: preferences');

      /* ---- settings page -------------------------------------------------- */
      /* The slot may hand the page its namespaced translator; when it does
         not, bind the dictionaries registered above. Either way the switch
         rows never render a raw key. */
      const SettingsPage = (props) =>
        h(
          ClaudeFlowSettings,
          Object.assign({}, props, {
            t: typeof props.t === 'function' ? props.t : ctx.locale.bind(NS),
          }),
        );
      ctx.slots.inject('settings.plugins.tab', () =>
        ctx.slots.register(
          { name: 'settings.plugins.tab', id: 'claude-flow', order: 21, locale: NS, label: title },
          SettingsPage,
        ),
      );
    }

    return { inject, apply };
  },
});
