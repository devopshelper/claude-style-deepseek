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
    const DEFAULT_PREFS = { colors: true, flow: true };

    const FLOW_ATTR = 'data-cc-flow';
    const COLORS_ATTR = 'data-cc-colors';

    /**
     * The stylesheet. Every rule is scoped to `body[data-cc-flow]`, so
     * removing the attribute restores the shipped transcript exactly.
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
        /* Knobs the thinking-window engine reads back through
           getComputedStyle, so a reader can retune the window from a
           stylesheet instead of the module: height ceiling, lines per step,
           rest between steps, fade depth, and the glide of one step. */
        '--cc-reason-window-cap:380px;' +
        '--cc-reason-lines:2;' +
        '--cc-reason-hold:840ms;' +
        '--cc-reason-fade:26px;' +
        '--cc-reason-duration:500ms;' +
        '--cc-reason-ease:cubic-bezier(.22,.61,.36,1);' +
        /* Claude Code keeps a narrow, stable reading measure. The Chat body
           derives its content width from this variable, so the composer and
           every Markdown table follow it. */
        '--dsh-chat-user-width:min(820px,100%);' +
        '--dsh-chat-flow-gap:6px}' +

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
      'body[data-cc-flow] [data-variant=think][data-expanded]{padding:5px 12px 8px 12px;background:var(--cc-think-bg);border-radius:0 10px 10px 0}' +
      'body[data-cc-flow] [data-variant=think]>div>[data-disclosure-header]>[data-disclosure-row]{color:var(--dsw-alias-label-tertiary)!important;font-style:italic}' +
      'body[data-cc-flow] [data-variant=think]>div>[data-disclosure-header]>[data-disclosure-row]::before{content:"";display:inline-block;flex:none;width:5px;height:5px;margin:0 8px 0 2px;border-radius:50%;background:color-mix(in srgb,#d97757 70%,transparent)}' +
      'body[data-cc-flow] [data-variant=think]>div>[data-disclosure-header]>[data-disclosure-row]>:first-child{width:0;min-width:0;margin:0;padding:0;overflow:hidden}' +
      'body[data-cc-flow] [data-variant=think]>div[data-open]>[data-disclosure-header]+div{padding-left:0!important;color:var(--dsw-alias-label-secondary);font-style:italic}' +
      'body[data-cc-flow] [data-variant=think][data-state=running]>div>[data-disclosure-header]>[data-disclosure-row]{color:var(--dsw-alias-label-secondary)!important}' +
      /* The running dot breathes while the row is live, then rests. */
      '@keyframes cc-think-pulse{0%,100%{opacity:.4;transform:scale(.82)}50%{opacity:1;transform:scale(1.14)}}' +
      'body[data-cc-flow] [data-variant=think][data-state=running]>div>[data-disclosure-header]>[data-disclosure-row]::before{animation:cc-think-pulse 1.6s ease-in-out infinite}' +
      '@media (prefers-reduced-motion:reduce){body[data-cc-flow] [data-variant=think][data-state=running]>div>[data-disclosure-header]>[data-disclosure-row]::before{animation:none}}' +

      /* ---- live thinking window ------------------------------------------
         The module clips an open, still-streaming reasoning body to the
         ceiling and steps its text upward two lines at a time; the rules here
         only paint the clip, the fade and the glide of one step. Nothing is
         touched once the row settles, so a finished block reads whole. */
      'body[data-cc-flow] [data-cc-reason-window]{overflow:hidden;transition:height 180ms var(--cc-reason-ease)}' +
      'body[data-cc-flow] [data-cc-reason-window][data-cc-reason-capped]{-webkit-mask-image:linear-gradient(transparent 0,#000 var(--cc-reason-fade),#000 calc(100% - var(--cc-reason-fade)),transparent 100%);mask-image:linear-gradient(transparent 0,#000 var(--cc-reason-fade),#000 calc(100% - var(--cc-reason-fade)),transparent 100%)}' +
      'body[data-cc-flow] [data-cc-reason-window] [data-cc-reason-text]{transform:translateY(0);transition:transform var(--cc-reason-duration) var(--cc-reason-ease);will-change:transform}' +
      '@media (prefers-reduced-motion:reduce){' +
        'body[data-cc-flow] [data-cc-reason-window]{transition:none}' +
        'body[data-cc-flow] [data-cc-reason-window][data-cc-reason-capped]{-webkit-mask-image:none;mask-image:none}' +
        'body[data-cc-flow] [data-cc-reason-window] [data-cc-reason-text]{transition:none}' +
      '}' +

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
      '.cc-set-hint{margin:0;padding-top:10px;border-top:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:11px}' +
      '.cc-set-hint code{font-family:var(--cc-mono,var(--ds-font-family-code,ui-monospace,monospace));font-size:11px;padding:0 3px;border-radius:3px;background:var(--dsw-alias-markdown-inline-code)}' +
      '@media (prefers-reduced-motion:reduce){.cc-set-switch,.cc-set-switch::after{transition:none}}';

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
      'settings.hint': 'Step summaries use the built-in Work details setting: Settings -> General -> Work details. Compact, Standard and Detailed collapse finished steps into one expandable line; Verbose keeps every row open. The thinking window follows a reasoning block you expand while it is still streaming, and stops when the block settles.',
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
      'settings.hint': '步骤摘要沿用内置的“工作详情”设置：设置 -> 通用 -> 工作详情。紧凑、标准与详细会把已完成的步骤折叠成一行；详细输出会保持每个步骤展开。思考窗口只作用于你在流式输出期间展开的思考块，块结束后自动停止。',
      'settings.on': '开',
      'settings.off': '关',
      'label.title': 'Claude 风格',
    };

    /** Read the two switches; anything unreadable falls back to "on". */
    function readPrefs() {
      try {
        const raw = window.localStorage.getItem(PREF_KEY);
        if (typeof raw === 'string') {
          const parsed = JSON.parse(raw);
          if (parsed !== null && typeof parsed === 'object') {
            return {
              colors: parsed.colors !== false,
              flow: parsed.flow !== false,
            };
          }
        }
      } catch (error) {
        /* private mode, blocked origin, or a hand-edited value */
      }
      return { colors: DEFAULT_PREFS.colors, flow: DEFAULT_PREFS.flow };
    }

    function writePrefs(prefs) {
      try {
        window.localStorage.setItem(PREF_KEY, JSON.stringify({ colors: prefs.colors === true, flow: prefs.flow === true }));
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
     * An open reasoning row that is still streaming is clipped to a ceiling
     * and its text stepped upward two lines at a time, the way a terminal
     * window follows a live log: the newest lines stay in view without the
     * block outgrowing the transcript. The ceiling, the lines per step and
     * the rest between steps are read from the CSS custom properties above,
     * so they can be retuned without touching this module.
     *
     * This is the only place the plugin touches the host's DOM, and it only
     * writes on `[data-variant=think][data-state=running][data-expanded]`
     * rows: attributes it removes again on settle, collapse, or unload, plus
     * the `height` and `transform` it owns on two host elements. It never
     * re-parents a node, never inserts one, and stops on reduced motion.
     * ------------------------------------------------------------------ */
    const REASON_ROW = '[data-variant="think"][data-state="running"][data-expanded]';
    const REASON_WINDOW_ATTR = 'data-cc-reason-window';
    const REASON_TEXT_ATTR = 'data-cc-reason-text';
    const REASON_CAPPED_ATTR = 'data-cc-reason-capped';

    function createReasonWindow() {
      const states = new Map();
      let observer = null;
      let frame = 0;
      let stopped = true;
      const reduced =
        typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

      /** Read a positive numeric CSS custom property from the body. */
      const knob = (name, fallback) => {
        let raw = '';
        try {
          raw = getComputedStyle(document.body).getPropertyValue(name);
        } catch (error) {
          return fallback;
        }
        const value = Number.parseFloat(raw);
        return Number.isFinite(value) && value > 0 ? value : fallback;
      };

      const clear = (row) => {
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
        for (const row of [...states.keys()]) clear(row);
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

      /** The reasoning text element inside a body (Markdown compact root). */
      const textOf = (box) => {
        const markdown = box.querySelector('[data-markdown-variant]');
        if (markdown !== null) return markdown;
        /* A replaced reasoning body may carry no Markdown marker: take the
           first descendant that actually renders a box. */
        const queue = [box];
        while (queue.length > 0) {
          const node = queue.shift();
          for (const child of node.children) {
            if (getComputedStyle(child).display !== 'contents') return child;
            queue.push(child);
          }
        }
        return null;
      };

      const measure = (state) => {
        const lineHeight = Number.parseFloat(getComputedStyle(state.text).lineHeight);
        const line = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 22;
        const cap = knob('--cc-reason-window-cap', 380);
        const lines = Math.max(1, knob('--cc-reason-lines', 2));
        const height = state.text.offsetHeight;
        state.step = Math.max(1, Math.round(line * lines));
        state.height = Math.min(height, cap);
        state.reachable = Math.max(0, Math.round(height - state.height));
        state.capped = height > cap && state.reachable > 0;
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

      const stepLater = (row, state) => {
        state.timer = window.setTimeout(
          () => {
            state.timer = 0;
            if (stopped || !states.has(row)) return;
            if (
              !row.isConnected ||
              !row.hasAttribute('data-expanded') ||
              row.getAttribute('data-state') !== 'running'
            ) {
              clear(row);
              return;
            }
            if (reduced !== null && reduced.matches) {
              clear(row);
              return;
            }
            measure(state);
            const next = Math.min(state.offset + state.step, state.reachable);
            if (next !== state.offset) state.offset = next;
            paint(state);
            if (state.capped && state.offset < state.reachable) stepLater(row, state);
          },
          knob('--cc-reason-hold', 840),
        );
      };

      const run = (row) => {
        let state = states.get(row);
        if (state !== undefined) {
          const attached =
            state.box.isConnected && state.text.isConnected && state.box.contains(state.text);
          if (!attached) {
            clear(row);
            state = undefined;
          }
        }
        if (state === undefined) {
          const box = boxOf(row);
          if (box === null) return;
          const text = textOf(box);
          if (text === null) return;
          state = {
            box,
            text,
            timer: 0,
            offset: 0,
            step: 0,
            height: 0,
            reachable: 0,
            capped: false,
          };
          states.set(row, state);
        }
        measure(state);
        paint(state);
        if (state.capped && state.offset < state.reachable && state.timer === 0) stepLater(row, state);
      };

      const sync = () => {
        frame = 0;
        if (stopped) return;
        if (typeof document === 'undefined' || document.body === null) return;
        if (!document.body.hasAttribute(FLOW_ATTR) || (reduced !== null && reduced.matches)) {
          clearAll();
          return;
        }
        /* Scan the transcript, not the whole document: the flow slot is the
           only place a reasoning row can appear. */
        const scope = document.querySelector('[data-slot="conversation.chat.flow"]') ?? document.body;
        const active = new Set(scope.querySelectorAll(REASON_ROW));
        for (const row of [...states.keys()]) {
          if (!active.has(row) || !row.isConnected) clear(row);
        }
        for (const row of active) run(row);
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
            attributeFilter: ['data-state', 'data-expanded'],
          });
          schedule();
        },
        stop() {
          if (stopped) return;
          stopped = true;
          if (observer !== null) {
            observer.disconnect();
            observer = null;
          }
          if (frame !== 0) {
            window.cancelAnimationFrame(frame);
            frame = 0;
          }
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

    /**
     * Settings page. Local state mirrors storage so the switch responds
     * immediately; the transcript listens to the change event for the paint.
     */
    function ClaudeFlowSettings(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key;
      const [prefs, setPrefs] = React.useState(readPrefs);
      const update = (key, value) => {
        const next = { colors: prefs.colors, flow: prefs.flow, [key]: value };
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
        ),
        h('p', { className: 'cc-set-hint' }, t('settings.hint')),
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
