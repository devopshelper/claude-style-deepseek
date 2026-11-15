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
       for another.

       The sidebar names are the same kind of choice: the wordmark is an SVG
       and the labels are React text, so anything the reader types here is
       applied over them, never instead of them. */
    const DEFAULT_PREFS = {
      colors: true,
      flow: true,
      motion: 'full',
      typeface: 'default',
      brand: '',
      newSession: '',
      brandMark: 'default',
      folderIcon: 'default',
    };

    const FLOW_ATTR = 'data-cc-flow';
    const COLORS_ATTR = 'data-cc-colors';
    const MOTION_ATTR = 'data-cc-motion';
    const TYPEFACE_ATTR = 'data-cc-typeface';
    const BRAND_ATTR = 'data-cc-brand';
    const BRAND_MARK_ATTR = 'data-cc-brand-mark';
    const FOLDER_ATTR = 'data-cc-folder';
    const SEND_ATTR = 'data-cc-sending';
    const CONTEXT_TAB_ID = 'claude-style-deepseek/context';
    const CONTEXT_TAB_KIND = 'cc-context';
    const USAGE_TAB_ID = 'claude-style-deepseek/usage';
    const USAGE_TAB_KIND = 'cc-usage';
    const BRAND_TEXT_PROPERTY = '--cc-brand-text';

    /* A twelve-ray mark, drawn in code rather than shipped as a file: the
       Claude sunburst in one generated SVG, tinted by the mask's background
       so it follows the accent in either scheme. The folder keeps a folder
       outline and nests a small star inside it, so the row still reads as a
       workspace. */
    function rayMark() {
      let rays = '';
      for (let i = 0; i < 12; i += 1) {
        const angle = i * 30;
        rays += '<rect x="11.15" y="1.2" width="1.7" height="7.4" rx=".85" transform="rotate(' + angle + ' 12 12)"/>';
      }
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="#fff">' + rays + '</g></svg>';
    }

    const FOLDER_MARK_SVG =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
      '<path d="M3.6 7.1c0-.8.7-1.5 1.5-1.5h3.6l1.6 1.9h7.7c.8 0 1.5.7 1.5 1.5v7.4c0 .8-.7 1.5-1.5 1.5H5.1c-.8 0-1.5-.7-1.5-1.5z" fill="none" stroke="#fff" stroke-width="1.5"/>' +
      '<g stroke="#fff" stroke-width="1.5" stroke-linecap="round">' +
      '<path d="M12 10.5v5"/><path d="M9.85 11.75l4.3 2.5"/><path d="M14.15 11.75l-4.3 2.5"/>' +
      '</g></svg>';

    const CLAUDE_MARK_URI = 'data:image/svg+xml,' + encodeURIComponent(rayMark());
    const FOLDER_MARK_URI = 'data:image/svg+xml,' + encodeURIComponent(FOLDER_MARK_SVG);
    const CHECK_MARK_URI = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    );

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
        '--dsh-chat-flow-gap:6px;' +
        '--cc-check:url("' + CHECK_MARK_URI + '")}' +

      /* ---- conversation font ---------------------------------------------
         Off by default: the shipped font stands until the reader picks one.
         The family goes on the chat column, so the whole transcript follows
         while the composer follows only in the terminal face, where a mono
         input matches the mono transcript. Code keeps its own monospace in
         both modes; the host sets that family on code elements directly. */
      'body[data-cc-flow][data-cc-typeface=serif] [data-chat-flow]{font-family:var(--cc-prose)}' +
      'body[data-cc-flow][data-cc-typeface=mono] :is([data-chat-flow],[data-composer-seat]){font-family:var(--cc-mono)}' +

      /* ---- sidebar identity ----------------------------------------------
         The wordmark is an SVG and the sidebar labels are React text, so the
         sidebar marks are found through the slots the host publishes and the
         shipped art stays in the document underneath: an emptied field
         removes the attribute and the original returns. The mark is a
         generated twelve-ray sunburst, masked so the accent tints it; the
         folder option keeps the folder outline and nests the same star. */
      'body[data-cc-brand] span:has(>[data-slot="sidebar.brand.name"]) svg{display:none}' +
      'body[data-cc-brand] span:has(>[data-slot="sidebar.brand.name"])::before{content:var(--cc-brand-text);display:block;flex:0 1 auto;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:inherit;font-size:17px;font-weight:600;letter-spacing:-.01em;line-height:24px;color:var(--dsw-alias-label-primary)}' +
      'body[data-cc-brand-mark=claude] span:has(>[data-slot="sidebar.brand.mark"]) svg{display:none}' +
      'body[data-cc-brand-mark=claude] span:has(>[data-slot="sidebar.brand.mark"])::before{content:"";display:block;flex:none;width:18px;height:18px;background-color:var(--cc-accent,#d97757);-webkit-mask:var(--cc-claude-mark) center/contain no-repeat;mask:var(--cc-claude-mark) center/contain no-repeat}' +
      'body[data-cc-folder=claude] svg[data-icon^="dsw-icon-folder"]>use{display:none}' +
      'body[data-cc-folder=claude] svg[data-icon^="dsw-icon-folder"]{background-color:var(--cc-accent,#d97757);-webkit-mask:var(--cc-folder-mark) center/contain no-repeat;mask:var(--cc-folder-mark) center/contain no-repeat}' +
      'body[data-cc-brand],body[data-cc-brand-mark=claude],body[data-cc-folder=claude]{--cc-claude-mark:url("' + CLAUDE_MARK_URI + '");--cc-folder-mark:url("' + FOLDER_MARK_URI + '")}' +

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

      /* ---- the send flight ------------------------------------------------
         Full profile only. The control pops, its icon leaves up and to the
         right, a ring opens, and a check lands in the accent, the way a chat
         app acknowledges a send. The engine marks the button for exactly one
         flight; RDP never gets here, so a remote session pays nothing. */
      '@keyframes cc-send-pop{0%{transform:scale(1)}35%{transform:scale(.86)}70%{transform:scale(1.08)}100%{transform:scale(1)}}' +
      '@keyframes cc-send-plane{0%{transform:none;opacity:1}40%{transform:translate(9px,-11px) rotate(18deg) scale(.7);opacity:0}100%{transform:translate(13px,-15px) rotate(24deg) scale(.6);opacity:0}}' +
      '@keyframes cc-send-ring{0%{transform:scale(.55);opacity:.6}100%{transform:scale(1.85);opacity:0}}' +
      '@keyframes cc-send-check{0%{transform:scale(.3);opacity:0}45%{transform:scale(1.12);opacity:1}72%{transform:scale(1);opacity:1}100%{transform:scale(1);opacity:0}}' +
      'body[data-cc-motion=full] [data-cc-sending]{position:relative;animation:cc-send-pop .5s ease}' +
      'body[data-cc-motion=full] [data-cc-sending] svg{animation:cc-send-plane .55s cubic-bezier(.3,.7,.4,1) forwards}' +
      'body[data-cc-motion=full] [data-cc-sending]::before{content:"";position:absolute;inset:-5px;border-radius:999px;border:1.5px solid var(--cc-accent,#d97757);animation:cc-send-ring .6s ease-out;pointer-events:none}' +
      'body[data-cc-motion=full] [data-cc-sending]::after{content:"";position:absolute;inset:0;border-radius:999px;background-color:var(--cc-accent,#d97757);-webkit-mask:var(--cc-check) center/46% no-repeat;mask:var(--cc-check) center/46% no-repeat;animation:cc-send-check .6s .16s both;pointer-events:none}' +

      /* ---- the model menu, drilled like Claude's -------------------------
         The pane keeps the current provider's models on its main screen and
         puts every other provider behind one "More models" row, which opens
         the secondary screen with a back row. The engine marks the groups and
         inserts the two rows; the host still renders every model row. */
      'body[data-cc-flow] [data-cc-model-menu]>section[data-cc-model-group=primary][data-cc-model-label]::before{content:attr(data-cc-model-label);display:block;padding:3px 6px 5px;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-caption)}' +
      'body[data-cc-flow] [data-cc-model-menu][data-cc-view=main]>section[data-cc-model-group=secondary]{display:none}' +
      'body[data-cc-flow] [data-cc-model-menu][data-cc-view=more]>section[data-cc-model-group=primary]{display:none}' +
      'body[data-cc-flow] [data-cc-model-menu][data-cc-view=more]>[data-cc-model-more]{display:none}' +
      'body[data-cc-flow] [data-cc-model-menu][data-cc-view=main]>[data-cc-model-back]{display:none}' +
      'body[data-cc-flow] [data-cc-model-menu] [data-cc-model-more],' +
      'body[data-cc-flow] [data-cc-model-menu] [data-cc-model-back]{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;margin:2px 0;padding:7px 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:20px;text-align:left;cursor:pointer}' +
      'body[data-cc-flow] [data-cc-model-menu] [data-cc-model-more]:hover,' +
      'body[data-cc-flow] [data-cc-model-menu] [data-cc-model-back]:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      'body[data-cc-flow] [data-cc-model-menu] [data-cc-model-more]::after{content:"\\203A";color:var(--dsw-alias-label-tertiary);font-size:15px;line-height:1}' +
      'body[data-cc-flow] [data-cc-model-menu] [data-cc-model-back]::before{content:"\\2039";color:var(--dsw-alias-label-tertiary);font-size:15px;line-height:1}' +
      'body[data-cc-flow] [data-cc-model-menu] button[role="menuitemradio"][aria-checked=true]{background:var(--dsw-alias-interactive-bg-hover-accent);border-radius:8px}' +
      /* A flat list, the way Claude lists models: the provider heading of the
         group in use is redundant beside its own tab, and the secondary screen
         keeps its headings because it really is several providers. */
      'body[data-cc-flow] [data-cc-model-menu]>section[data-cc-model-group=primary] [data-menu-group-heading]{display:none}' +
      'body[data-cc-flow] [data-cc-model-menu]>section[data-cc-model-group=primary]{padding-top:0}' +
      'body[data-cc-flow] [data-cc-effort-note]{padding:4px 10px 8px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.45}' +

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
      /* ---- the context panel ---------------------------------------------
         A right-sidebar tab fed by the token meter's own projections: the
         occupancy headline, one bar split the way the meter splits the
         window, and the three buckets it measures. Nothing here reads the
         host's DOM. */
      '.cc-ctx{display:flex;flex-direction:column;gap:10px;padding:14px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.5}' +
      '.cc-ctx-empty{color:var(--dsw-alias-label-tertiary);font-size:12px}' +
      '.cc-ctx-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}' +
      '.cc-ctx-percent{font-size:15px;font-weight:600}' +
      '.cc-ctx-tokens{color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums}' +
      '.cc-ctx-bar{display:flex;height:6px;border-radius:999px;overflow:hidden;background:var(--dsw-alias-bg-layer-3)}' +
      '.cc-ctx-seg{height:100%;min-width:1px}' +
      '.cc-ctx-messages{background:#4d8dff}' +
      '.cc-ctx-tools{background:#ff9f5a}' +
      '.cc-ctx-system{background:#3ecf9a}' +
      '.cc-ctx-other{background:#9a958a}' +
      '.cc-ctx-rows{display:flex;flex-direction:column;gap:4px}' +
      '.cc-ctx-row{display:flex;align-items:center;gap:8px;font-size:12px}' +
      '.cc-ctx-dot{width:8px;height:8px;border-radius:2px;flex:none}' +
      '.cc-ctx-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.cc-ctx-val{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}' +
      '.cc-ctx-pct{width:54px;text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary)}' +
      '.cc-ctx-sep{height:1px;margin:2px 0;background:var(--dsw-alias-border-l2)}' +
      '.cc-ctx-hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}' +
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
      '.cc-set-input{flex:none;width:180px;margin-top:1px;padding:5px 9px;border:.5px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}' +
      '.cc-set-input::placeholder{color:var(--dsw-alias-label-caption)}' +
      '.cc-set-input:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px;border-color:transparent}' +
      '.cc-set-hint{margin:0;padding-top:10px;border-top:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:11px}' +
      '.cc-set-hint code{font-family:var(--cc-mono,var(--ds-font-family-code,ui-monospace,monospace));font-size:11px;padding:0 3px;border-radius:3px;background:var(--dsw-alias-markdown-inline-code)}' +

      /* ---- the usage board ------------------------------------------------
         The statusline's density in this skin's palette: one bordered panel,
         figures in the terminal face, proportional bars instead of numbers
         alone. Nothing here reads the host's DOM, and every colour is either
         a theme token or one of the four fixed hues below. */
      '.cc-usage{--cc-usage-input:#d97757;--cc-usage-output:#3ecf9a;--cc-usage-read:#9a958a;--cc-usage-write:#4d8dff;display:flex;flex-direction:column;gap:11px;margin:6px 0;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.45}' +
      '.cc-usage-quiet{gap:8px}' +
      '.cc-usage-head{display:flex;align-items:baseline;gap:8px}' +
      '.cc-usage-title{font-size:13px;font-weight:600}' +
      '.cc-usage-scope{color:var(--dsw-alias-label-caption);font-size:11px}' +
      '.cc-usage-refresh{margin-left:auto;flex:none;padding:2px 9px;border:.5px solid var(--dsw-alias-border-l3);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;line-height:1.6;cursor:pointer;font-variant-numeric:tabular-nums}' +
      '.cc-usage-refresh:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.cc-usage-refresh:disabled{opacity:.65;cursor:default}' +
      '.cc-usage-refresh:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}' +
      '.cc-usage-cells{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}' +
      '.cc-usage-cell{display:flex;flex-direction:column;gap:1px;min-width:0}' +
      '.cc-usage-value{font-family:var(--cc-mono,var(--ds-font-family-code,ui-monospace,monospace));font-size:17px;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}' +
      '.cc-usage-label{color:var(--dsw-alias-label-tertiary);font-size:10px;letter-spacing:.09em;text-transform:uppercase}' +
      '.cc-usage-note-inline{color:var(--dsw-alias-label-caption);font-size:10px}' +
      '.cc-usage-note{color:var(--dsw-alias-label-tertiary);font-size:11px}' +
      '.cc-usage-text{margin:0;color:var(--dsw-alias-label-secondary);font-family:var(--cc-mono,var(--ds-font-family-code,ui-monospace,monospace));font-size:12px;line-height:1.6;white-space:pre;overflow-x:auto}' +
      '.cc-usage-fallback{display:flex;flex-direction:column;gap:6px}' +
      '.cc-usage-split{display:flex;height:7px;border-radius:999px;overflow:hidden;background:var(--dsw-alias-bg-layer-3)}' +
      '.cc-usage-seg{height:100%;min-width:1px}' +
      '.cc-usage-input{background:#d97757}' +
      '.cc-usage-output{background:#3ecf9a}' +
      '.cc-usage-cache{background:#9a958a}' +
      '.cc-usage-write{background:#4d8dff}' +
      '.cc-usage-legend{display:flex;flex-wrap:wrap;gap:3px 14px;color:var(--dsw-alias-label-secondary);font-size:11px;font-variant-numeric:tabular-nums}' +
      '.cc-usage-key{display:inline-flex;align-items:center;gap:6px}' +
      '.cc-usage-dot{flex:none;width:7px;height:7px;border-radius:2px}' +
      '.cc-usage-days{display:flex;flex-direction:column;gap:5px}' +
      '.cc-usage-section{display:flex;align-items:baseline;justify-content:space-between;gap:8px;color:var(--dsw-alias-label-tertiary);font-size:10px;letter-spacing:.09em;text-transform:uppercase}' +
      '.cc-usage-section-value{color:var(--dsw-alias-label-secondary);letter-spacing:0;text-transform:none;font-variant-numeric:tabular-nums}' +
      '.cc-usage-columns{display:flex;align-items:flex-end;gap:3px;height:44px}' +
      '.cc-usage-col{flex:1 1 0;min-width:0;display:flex;align-items:flex-end;height:100%}' +
      '.cc-usage-fill{width:100%;min-height:0;border-radius:2px 2px 0 0;background:color-mix(in srgb,#d97757 45%,transparent)}' +
      '.cc-usage-col[data-today] .cc-usage-fill{background:#d97757}' +
      '.cc-usage-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}' +
      '.cc-usage-column{display:flex;flex-direction:column;gap:4px;min-width:0}' +
      '.cc-usage-row{display:flex;align-items:center;gap:8px;min-width:0;font-size:11.5px}' +
      '.cc-usage-name{flex:0 0 42%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary)}' +
      '.cc-usage-bar{flex:1 1 auto;height:5px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);overflow:hidden}' +
      '.cc-usage-bar-fill{display:block;height:100%;border-radius:999px;background:color-mix(in srgb,#d97757 62%,transparent)}' +
      '.cc-usage-row-value{flex:none;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}' +
      '.cc-usage-now{display:flex;flex-wrap:wrap;gap:3px 12px;padding-top:8px;border-top:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-tertiary);font-size:11px}' +
      '.cc-usage-now b{color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums}' +
      '.cc-usage-now-label{color:var(--dsw-alias-label-caption);letter-spacing:.06em;text-transform:uppercase;font-size:10px}' +
      '@media (max-width:560px){.cc-usage-cells{grid-template-columns:repeat(2,minmax(0,1fr))}.cc-usage-grid{grid-template-columns:minmax(0,1fr)}.cc-usage-columns{height:34px}}' +
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
      'settings.motion.title': 'Animation',
      'settings.motion.description': 'RDP keeps the transcript still and instant for high-latency remote sessions. Full adds the breathing running mark, the stepping window and the send flight.',
      'settings.motion.lite': 'RDP',
      'settings.motion.full': 'Full',
      'settings.typeface.title': 'Conversation font',
      'settings.typeface.description': 'Leave the harness font alone, or set the transcript in a reading serif or a terminal monospace. Code keeps its own monospace either way.',
      'settings.typeface.default': 'Default',
      'settings.typeface.serif': 'Serif',
      'settings.typeface.mono': 'Mono',
      'settings.brand.title': 'Brand name',
      'settings.brand.description': 'Replaces the wordmark in the sidebar with your own text. Leave it empty for the shipped mark.',
      'settings.brand.placeholder': 'DeepSeek',
      'settings.newSession.title': 'New session label',
      'settings.newSession.description': 'Text on the sidebar new-session button. Leave it empty for the shipped label.',
      'settings.newSession.placeholder': 'New Session',
      'settings.brandMark.title': 'Brand mark',
      'settings.brandMark.description': 'The glyph beside the brand name. Claude draws a twelve-ray sunburst.',
      'settings.brandMark.default': 'Default',
      'settings.brandMark.claude': 'Claude',
      'settings.folder.title': 'Folder icon',
      'settings.folder.description': 'The folder glyph on workspace rows. Claude nests its star inside the folder.',
      'settings.folder.default': 'Default',
      'settings.folder.claude': 'Claude',
      'menu.main': 'Main models',
      'menu.more': 'More models',
      'menu.back': 'Back',
      'context.title': 'Context',
      'context.empty': 'No context figures yet. They appear once a model reports both pressure and capacity.',
      'context.messages': 'Messages',
      'context.tools': 'Tools',
      'context.system': 'System prompt',
      'context.free': 'Free space',
      'context.used': 'used',
      'context.other': 'Unaccounted',
      'context.guide': 'Context usage and what fills it.',
      'effort.note': 'Higher effort means more thorough responses, but takes longer and uses your limits faster.',
      'settings.compact.title': 'Auto-compact',
      'settings.compact.description': 'Compact the conversation when context pressure crosses the threshold. The harness already compacts on its own; this moves the line.',
      'settings.compact.threshold': 'Compact at',
      'settings.compact.thresholdDescription': 'Share of the context window that triggers compaction. Lower means earlier and smaller, at the cost of summarizing detail away sooner.',
      'settings.compact.loading': 'Reading the Host setting...',
      'settings.compact.unavailable': 'This window cannot reach the Host route. Use install.bat -CompactThreshold instead.',
      'settings.compact.live': 'Applied to the running engine.',
      'settings.compact.restart': 'Saved. Restart DeepSeek Harness to apply it.',
      'context.hint': 'Auto-compact is set in Claude Style settings.',
      'settings.hint': 'Step summaries use the built-in Work details setting: Settings -> General -> Work details. Compact, Standard and Detailed collapse finished steps into one expandable line; Verbose keeps every row open. A thinking block opens while it streams and folds when it settles; open or close one yourself and the plugin leaves it alone. The window only steps once a thought outgrows its 240px ceiling.',
      'settings.motionHint': 'Windows with animation effects off report reduced motion, which is why this switch is the plugin\'s own rather than the system\'s.',
      'settings.on': 'On',
      'settings.off': 'Off',
      'stats.title': 'Session usage',
      'stats.show': 'Show',
      'stats.hide': 'Hide',
      'stats.running': 'Reading session usage',
      'stats.failed': 'Session usage failed',
      'usage.title': 'Usage',
      'usage.scope': 'across all sessions',
      'usage.tokens': 'tokens',
      'usage.calls': 'calls',
      'usage.turns': 'turns',
      'usage.sessions': 'sessions',
      'usage.subagent': 'subagent',
      'usage.input': 'input',
      'usage.output': 'output',
      'usage.cacheRead': 'cache read',
      'usage.cacheWrite': 'cache write',
      'usage.days': 'last 14 days',
      'usage.today': 'today',
      'usage.models': 'models',
      'usage.recent': 'recent sessions',
      'usage.thisSession': 'this session',
      'usage.thisInput': 'in',
      'usage.thisOutput': 'out',
      'usage.thisCache': 'cache',
      'usage.thisTurns': 'turns',
      'usage.thisContext': 'context',
      'usage.refresh': 'refresh',
      'usage.scanning': 'scanning',
      'usage.loading': 'Reading the usage roll-up...',
      'usage.unavailable': 'This window cannot reach the usage route. Restart DeepSeek Harness to load it.',
      'usage.empty': 'No billed work recorded yet.',
      'usage.noModels': 'No model calls yet.',
      'usage.noSessions': 'No sessions yet.',
      'usage.guide': 'Tokens across every session.',
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
      'settings.motion.title': '动画',
      'settings.motion.description': 'RDP 面向高延迟远程会话：不播放动画，转录保持静止。完整模式保留运行标记呼吸、思考窗口步进和发送动画。',
      'settings.motion.lite': 'RDP',
      'settings.motion.full': '完整',
      'settings.typeface.title': '会话字体',
      'settings.typeface.description': '保持 Harness 自带的字体，或把对话换成阅读用的衬线体、终端用的等宽体。两种模式下代码块都保持等宽。',
      'settings.typeface.default': '默认',
      'settings.typeface.serif': '衬线',
      'settings.typeface.mono': '等宽',
      'settings.brand.title': '品牌名称',
      'settings.brand.description': '用你自己的文字替换侧栏的字标。留空则保留自带字标。',
      'settings.brand.placeholder': 'DeepSeek',
      'settings.newSession.title': '新会话按钮文字',
      'settings.newSession.description': '侧栏新会话按钮上的文字。留空则保留自带文字。',
      'settings.newSession.placeholder': 'New Session',
      'settings.brandMark.title': '品牌标记',
      'settings.brandMark.description': '品牌名旁的图形。Claude 画的是十二道光芒。',
      'settings.brandMark.default': '默认',
      'settings.brandMark.claude': 'Claude',
      'settings.folder.title': '文件夹图标',
      'settings.folder.description': '工作区行上的文件夹图形。Claude 会在文件夹里嵌一颗星。',
      'settings.folder.default': '默认',
      'settings.folder.claude': 'Claude',
      'menu.main': '主要模型',
      'menu.more': '更多模型',
      'menu.back': '返回',
      'context.title': '上下文',
      'context.empty': '还没有上下文数据。等模型同时报告压力与容量后才会出现。',
      'context.messages': '消息',
      'context.tools': '工具',
      'context.system': '系统提示',
      'context.free': '剩余空间',
      'context.used': '已用',
      'context.other': '其他',
      'context.guide': '上下文用量与构成。',
      'effort.note': '更高的推理强度会更细致，但耗时更长，也更快消耗用量。',
      'settings.compact.title': '自动压缩',
      'settings.compact.description': '上下文压力越过阈值时压缩对话。Harness 本身就会自动压缩，这里只调整触发线。',
      'settings.compact.threshold': '压缩阈值',
      'settings.compact.thresholdDescription': '触发压缩的上下文占用比例。越低越早、占用越小，但会更早把细节压缩掉。',
      'settings.compact.loading': '正在读取 Host 设置...',
      'settings.compact.unavailable': '当前窗口无法访问 Host 路由。请改用 install.bat -CompactThreshold。',
      'settings.compact.live': '已应用到运行中的引擎。',
      'settings.compact.restart': '已保存。重启 DeepSeek Harness 后生效。',
      'context.hint': '自动压缩阈值在 Claude 风格设置里调整。',
      'settings.hint': '步骤摘要沿用内置的“工作详情”设置：设置 -> 通用 -> 工作详情。紧凑、标准与详细会把已完成的步骤折叠成一行；详细输出会保持每个步骤展开。思考块在流式输出时自动展开、结束后自动折叠；你手动开关过的思考块不会再被改动。思考内容超过 240px 的上限后窗口才开始步进。',
      'settings.motionHint': '关闭了 Windows 动画效果的系统会报告“减少动态效果”，所以这里用插件自己的开关，而不跟随系统。',
      'settings.on': '开',
      'settings.off': '关',
      'stats.title': '会话用量',
      'stats.show': '展开',
      'stats.hide': '收起',
      'stats.running': '正在读取会话用量',
      'stats.failed': '会话用量读取失败',
      'usage.title': '用量',
      'usage.scope': '全部会话',
      'usage.tokens': '令牌',
      'usage.calls': '调用',
      'usage.turns': '轮次',
      'usage.sessions': '会话',
      'usage.subagent': '子代理',
      'usage.input': '输入',
      'usage.output': '输出',
      'usage.cacheRead': '缓存读',
      'usage.cacheWrite': '缓存写',
      'usage.days': '最近 14 天',
      'usage.today': '今天',
      'usage.models': '模型',
      'usage.recent': '最近会话',
      'usage.thisSession': '本会话',
      'usage.thisInput': '输入',
      'usage.thisOutput': '输出',
      'usage.thisCache': '缓存',
      'usage.thisTurns': '轮次',
      'usage.thisContext': '上下文',
      'usage.refresh': '刷新',
      'usage.scanning': '扫描中',
      'usage.loading': '正在读取用量汇总...',
      'usage.unavailable': '当前窗口无法访问用量路由，请重启 DeepSeek Harness。',
      'usage.empty': '还没有记录到计费调用。',
      'usage.noModels': '还没有模型调用。',
      'usage.noSessions': '还没有会话。',
      'usage.guide': '所有会话的令牌用量。',
      'label.title': 'Claude 风格',
    };

    /** A reader-supplied name, trimmed, with control characters dropped. */
    function text(value, max) {
      if (typeof value !== 'string') return '';
      return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
    }

    /** Read the switches; anything unreadable falls back to "on". */
    function readPrefs() {
      try {
        const raw = window.localStorage.getItem(PREF_KEY);
        if (typeof raw === 'string') {
          const parsed = JSON.parse(raw);
          if (parsed !== null && typeof parsed === 'object') {
            const typeface = parsed.typeface === 'serif' || parsed.typeface === 'mono' ? parsed.typeface : 'default';
            const brandMark = parsed.brandMark === 'claude' ? 'claude' : 'default';
            const folderIcon = parsed.folderIcon === 'claude' ? 'claude' : 'default';
            const motion = parsed.motion === false || parsed.motion === 'lite' ? 'lite' : 'full';
            return {
              colors: parsed.colors !== false,
              flow: parsed.flow !== false,
              motion,
              typeface,
              brand: text(parsed.brand, 24),
              newSession: text(parsed.newSession, 24),
              brandMark,
              folderIcon,
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
        brand: DEFAULT_PREFS.brand,
        newSession: DEFAULT_PREFS.newSession,
        brandMark: DEFAULT_PREFS.brandMark,
        folderIcon: DEFAULT_PREFS.folderIcon,
      };
    }

    function writePrefs(prefs) {
      try {
        const typeface = prefs.typeface === 'serif' || prefs.typeface === 'mono' ? prefs.typeface : 'default';
        const brandMark = prefs.brandMark === 'claude' ? 'claude' : 'default';
        const folderIcon = prefs.folderIcon === 'claude' ? 'claude' : 'default';
        window.localStorage.setItem(
          PREF_KEY,
          JSON.stringify({
            colors: prefs.colors === true,
            flow: prefs.flow === true,
            motion: prefs.motion === 'lite' ? 'lite' : 'full',
            typeface,
            brand: text(prefs.brand, 24),
            newSession: text(prefs.newSession, 24),
            brandMark,
            folderIcon,
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

    /* ------------------------------------------------------------------ *
     * The send flight.
     *
     * The composer's send control is the last button in its card. A press is a
     * send only while the field still holds text (the host clears it as the
     * message is taken), which tells a send from a stop press without reading
     * a localized label. The mark lives for one flight, then comes off.
     * ------------------------------------------------------------------ */
    function createSendFlight() {
      let timer = 0;

      const trigger = (button) => {
        /* A second send restarts the flight rather than reusing a finished one. */
        button.removeAttribute(SEND_ATTR);
        void button.offsetWidth;
        button.setAttribute(SEND_ATTR, '');
        if (timer !== 0) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          timer = 0;
          button.removeAttribute(SEND_ATTR);
        }, 900);
      };

      const onPress = (event) => {
        if (typeof document === 'undefined' || document.body === null) return;
        if (document.body.getAttribute(MOTION_ATTR) !== 'full') return;
        const target = event.target;
        if (target === null || target === undefined || typeof target.closest !== 'function') return;
        const button = target.closest('[data-composer-card] button');
        if (button === null) return;
        const card = button.closest('[data-composer-card]');
        if (card === null) return;
        const buttons = card.querySelectorAll('button');
        if (buttons[buttons.length - 1] !== button) return;
        const input = card.querySelector('[data-composer-input]');
        if (input === null || input.textContent.trim() === '') return;
        trigger(button);
      };

      const onKeyDown = (event) => {
        if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
        if (typeof document === 'undefined' || document.body === null) return;
        if (document.body.getAttribute(MOTION_ATTR) !== 'full') return;
        const target = event.target;
        if (target === null || target === undefined || typeof target.closest !== 'function') return;
        const input = target.closest('[data-composer-card] [data-composer-input]');
        if (input === null || input.textContent.trim() === '') return;
        const card = input.closest('[data-composer-card]');
        if (card === null) return;
        const buttons = card.querySelectorAll('button');
        if (buttons.length === 0) return;
        trigger(buttons[buttons.length - 1]);
      };

      document.addEventListener('pointerup', onPress, true);
      document.addEventListener('keydown', onKeyDown, true);
      return () => {
        document.removeEventListener('pointerup', onPress, true);
        document.removeEventListener('keydown', onKeyDown, true);
        if (timer !== 0) {
          window.clearTimeout(timer);
          timer = 0;
        }
      };
    }

    /* ------------------------------------------------------------------ *
     * The model submenu.
     *
     * The host renders one scrolling pane of provider groups. This keeps the
     * provider group that holds the selected model on the pane's main screen,
     * puts every other group behind one "More models" row, and gives that
     * secondary screen a back row. The two rows are the only nodes inserted;
     * every model row still belongs to the host, and the view is one
     * attribute on the pane.
     * ------------------------------------------------------------------ */
    function createModelSplit(label) {
      let observer = null;
      let frame = 0;

      const insert = (pane, primary) => {
        let back = pane.querySelector(':scope > [data-cc-model-back]');
        if (back === null) {
          back = document.createElement('button');
          back.type = 'button';
          back.setAttribute('role', 'menuitem');
          back.setAttribute('data-cc-model-back', '');
          pane.insertBefore(back, pane.firstElementChild);
        }
        back.textContent = label('menu.back');

        let more = pane.querySelector(':scope > [data-cc-model-more]');
        if (more === null) {
          more = document.createElement('button');
          more.type = 'button';
          more.setAttribute('role', 'menuitem');
          more.setAttribute('data-cc-model-more', '');
          primary.after(more);
        }
        more.textContent = label('menu.more');
      };

      const apply = () => {
        frame = 0;
        if (typeof document === 'undefined') return;

        /* The effort screen gets one line of its own copy above the levels:
           the host names the levels, not what choosing one costs.
           In DSH, the effort sub-menu contains role="menuitemradio" buttons
           without section[data-menu-group]. */
        const radios = document.querySelectorAll('button[role="menuitemradio"]');
        if (radios.length > 0 && document.querySelector('section[data-menu-group]') === null) {
          const effortContainer = radios[0].closest('[role="menu"]') ?? radios[0].parentElement;
          if (effortContainer !== null && effortContainer.querySelector('[data-cc-effort-note]') === null) {
            const note = document.createElement('div');
            note.setAttribute('data-cc-effort-note', '');
            note.textContent = label('effort.note');
            effortContainer.insertBefore(note, effortContainer.firstElementChild);
          }
        }

        /* The model pane contains section[data-menu-group]. Target it structurally
           so this works in any UI language (en, zh, ja, etc.). */
        const group = document.querySelector('section[data-menu-group]');
        const pane = group === null ? null : (group.closest('[role="menu"]') ?? group.parentElement);
        if (pane === null) return;
        pane.setAttribute('data-cc-model-menu', '');

        const groups = [...pane.querySelectorAll(':scope > section[data-menu-group]')];
        if (groups.length < 2) return;

        const checked = pane.querySelector('[role="menuitemradio"][aria-checked="true"]');
        const primary = checked === null ? groups[0] : checked.closest('section[data-menu-group]') ?? groups[0];

        /* The main screen shows the provider in use; a menu that just opened
           always starts there, even when the reader left it on the other one. */
        if (!pane.hasAttribute('data-cc-view')) pane.setAttribute('data-cc-view', 'main');

        for (const group of groups) {
          group.setAttribute('data-cc-model-group', group === primary ? 'primary' : 'secondary');
          if (group === primary) group.setAttribute('data-cc-model-label', label('menu.main'));
          else group.removeAttribute('data-cc-model-label');
        }

        insert(pane, primary);
      };

      const onPress = (event) => {
        const target = event.target;
        if (target === null || target === undefined || typeof target.closest !== 'function') return;
        const row = target.closest('[data-cc-model-more], [data-cc-model-back]');
        if (row === null) return;
        const pane = row.closest('[data-cc-model-menu]') ?? row.closest('[role="menu"]');
        if (pane === null) return;

        event.preventDefault();
        event.stopPropagation();
        const toMore = row.hasAttribute('data-cc-model-more');
        pane.setAttribute('data-cc-view', toMore ? 'more' : 'main');
        const next = pane.querySelector(toMore ? '[data-cc-model-back]' : '[data-cc-model-more]');
        if (next !== null) next.focus();
      };

      /* Capture, so the host's own menu bookkeeping never sees these presses
         as a model choice. */
      document.addEventListener('click', onPress, true);

      const schedule = () => {
        if (frame !== 0) return;
        frame = window.requestAnimationFrame(apply);
      };

      observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        document.removeEventListener('click', onPress, true);
        observer.disconnect();
        observer = null;
        if (frame !== 0) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
      };
    }

    /** A compact token count, the way the meter panel prints one. */
    function formatCount(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
      if (value < 1000) return String(Math.round(value));
      if (value < 1000000) return (Math.round(value / 100) / 10) + 'k';
      return (Math.round(value / 100000) / 10) + 'M';
    }

    /**
     * The right-sidebar Context tab.
     *
     * Everything comes from the token meter's client projections: the same
     * numbers the composer meter reads, so the panel and the meter never
     * disagree. The bar proportions those buckets over the whole window and
     * the rest of the window is the free row.
     */
    function ContextPanel(props) {
      const t = props.t;
      const pressure = typeof props.useProjection === 'function' ? props.useProjection('contextPressure') : undefined;
      const breakdown = typeof props.useProjection === 'function' ? props.useProjection('contextBreakdown') : undefined;

      const used = pressure === undefined ? undefined : (pressure.projectedTokens ?? pressure.pressureTokens);
      const capacity = pressure === undefined ? undefined : pressure.contextWindow;
      if (used === undefined || capacity === undefined || capacity <= 0) {
        return h('div', { className: 'cc-ctx cc-ctx-empty' }, t('context.empty'));
      }

      const percent = Math.min(100, Math.round((used / capacity) * 100));
      const share = (tokens) => Math.min(100, (tokens / capacity) * 100);
      const rows = [
        { key: 'messages', label: t('context.messages'), tokens: breakdown?.messageTokens ?? 0, cls: 'cc-ctx-messages' },
        { key: 'tools', label: t('context.tools'), tokens: breakdown?.toolsTokens ?? 0, cls: 'cc-ctx-tools' },
        { key: 'system', label: t('context.system'), tokens: breakdown?.systemTokens ?? 0, cls: 'cc-ctx-system' },
      ];
      const accounted = rows.reduce((sum, row) => sum + row.tokens, 0);
      const other = Math.max(0, used - accounted);
      const free = Math.max(0, capacity - used);
      const segments = other > 0
        ? rows.concat([{ key: 'other', tokens: other, cls: 'cc-ctx-other' }])
        : rows;

      const row = (item, dots) => h(
        'div',
        { key: item.key, className: 'cc-ctx-row' },
        dots ? h('span', { className: 'cc-ctx-dot ' + item.cls }) : h('span', { className: 'cc-ctx-dot' }),
        h('span', { className: 'cc-ctx-name' }, item.label),
        h('span', { className: 'cc-ctx-val' }, formatCount(item.tokens)),
        h('span', { className: 'cc-ctx-pct' }, item.tokens === undefined ? '' : (share(item.tokens)).toFixed(1) + '%'),
      );

      return h(
        'div',
        { className: 'cc-ctx' },
        h(
          'div',
          { className: 'cc-ctx-head' },
          h('span', { className: 'cc-ctx-percent' }, percent + '% ' + t('context.used')),
          h('span', { className: 'cc-ctx-tokens' }, formatCount(used) + ' / ' + formatCount(capacity)),
        ),
        h(
          'div',
          { className: 'cc-ctx-bar' },
          segments.map((segment) => h('span', {
            key: segment.key,
            className: 'cc-ctx-seg ' + segment.cls,
            style: { width: share(segment.tokens) + '%' },
          })),
        ),
        h(
          'div',
          { className: 'cc-ctx-rows' },
          rows.map((item) => row(item, true)),
          other > 0 ? row({ key: 'other', label: t('context.other'), tokens: other, cls: 'cc-ctx-other' }, true) : null,
          h('div', { className: 'cc-ctx-sep' }),
          row({ key: 'free', label: t('context.free'), tokens: free, cls: 'cc-ctx-free' }, false),
        ),
        h('div', { className: 'cc-ctx-hint' }, t('context.hint')),
      );
    }

    /** A token count at board scale: 2.32B, 380M, 12.4k, 918. */
    function formatBig(value) {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) return '0';
      const units = [[1000000000, 'B'], [1000000, 'M'], [1000, 'k']];
      for (let index = 0; index < units.length; index += 1) {
        if (number >= units[index][0]) return String(Math.round((number / units[index][0]) * 10) / 10) + units[index][1];
      }
      return String(Math.round(number));
    }

    /** A grouped integer, for counts that read better exact. */
    function formatExact(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return '0';
      return Math.round(number).toLocaleString('en-US');
    }

    /** The last path segment of a workspace directory, whatever the separator. */
    function baseName(path) {
      if (typeof path !== 'string' || path === '') return '';
      const parts = path.split(/[\\/]/).filter((part) => part !== '');
      return parts.length === 0 ? path : parts[parts.length - 1];
    }

    /**
     * The all-session usage board.
     *
     * Every figure comes from `/claude-style/usage`, the Host's cached roll-up
     * over the stored Session logs; the board itself measures nothing. A pass
     * still running is reported in the header and polled, so a first-ever scan
     * fills the panel instead of showing an empty one. The last section is the
     * live Session, read from the same projections the composer meter uses.
     *
     * `fallback` is the settled `/stats` text: a Host that never loaded the
     * route (an older process) still leaves a readable report in the row.
     */
    function UsageBoard(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key;
      const [data, setData] = React.useState(null);
      const [error, setError] = React.useState('');
      const [nonce, setNonce] = React.useState(0);

      React.useEffect(() => {
        let live = true;
        let timer = 0;
        const load = (force) => {
          fetch('/claude-style/usage' + (force ? '?refresh=1' : ''))
            .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
            .then((json) => {
              if (!live) return;
              setError('');
              setData(json);
              const refresh = json === null || json === undefined ? undefined : json.refresh;
              if (refresh !== undefined && refresh !== null && refresh.running === true) {
                timer = window.setTimeout(() => load(false), 900);
              }
            })
            .catch(() => {
              if (live) setError(t('usage.unavailable'));
            });
        };
        load(nonce > 0);
        return () => {
          live = false;
          if (timer !== 0) window.clearTimeout(timer);
        };
      }, [nonce]);

      /* The live Session, from the meter's own projections. These hooks run
         before the loading return: a hook after it would change the hook order
         once the fetch lands, and the slot boundary abdicates a component that
         throws mid-session ("Rendered more hooks than during the previous
         render"), which left only the plain /stats text. */
      const usageNow = typeof props.useProjection === 'function' ? props.useProjection('tokenUsage') : undefined;
      const statsNow = typeof props.useProjection === 'function' ? props.useProjection('sessionStats') : undefined;
      const pressureNow = typeof props.useProjection === 'function' ? props.useProjection('contextPressure') : undefined;

      const fallback = typeof props.fallback === 'string' ? props.fallback.trim() : '';
      if (data === null) {
        return h(
          'div',
          { className: 'cc-usage cc-usage-quiet' },
          h('div', { className: 'cc-usage-head' },
            h('span', { className: 'cc-usage-title' }, t('usage.title')),
            h('span', { className: 'cc-usage-scope' }, t('usage.scope'))),
          error === ''
            ? h('span', { className: 'cc-usage-note' }, t('usage.loading'))
            : (fallback === ''
              ? h('span', { className: 'cc-usage-note' }, error)
              : h('div', { className: 'cc-usage-fallback' },
                h('span', { className: 'cc-usage-note' }, error),
                h('pre', { className: 'cc-usage-text' }, fallback))),
        );
      }

      const totals = data.totals;
      const refresh = data.refresh === undefined || data.refresh === null ? {} : data.refresh;
      const running = refresh.running === true;
      const scanning = running
        ? t('usage.scanning') + ' ' + formatExact(refresh.scanned) + '/' + formatExact(refresh.pending)
        : t('usage.refresh');

      const cells = [
        { key: 'tokens', value: formatBig(totals.total), label: t('usage.tokens'), note: '' },
        { key: 'calls', value: formatExact(totals.calls), label: t('usage.calls'), note: '' },
        { key: 'turns', value: formatExact(totals.turns), label: t('usage.turns'), note: '' },
        {
          key: 'sessions',
          value: formatExact(totals.sessions),
          label: t('usage.sessions'),
          note: totals.subagentSessions > 0 ? '+' + formatExact(totals.subagentSessions) + ' ' + t('usage.subagent') : '',
        },
      ];

      const split = [
        { key: 'input', label: t('usage.input'), tokens: totals.input, cls: 'cc-usage-input' },
        { key: 'output', label: t('usage.output'), tokens: totals.output, cls: 'cc-usage-output' },
        { key: 'cacheRead', label: t('usage.cacheRead'), tokens: totals.cacheRead, cls: 'cc-usage-cache' },
        { key: 'cacheWrite', label: t('usage.cacheWrite'), tokens: totals.cacheWrite, cls: 'cc-usage-write' },
      ].filter((part) => Number(part.tokens) > 0);
      const splitTotal = split.reduce((sum, part) => sum + Number(part.tokens), 0) || 1;

      const days = Array.isArray(data.days) ? data.days : [];
      const dayMax = days.reduce((max, day) => (Number(day.tokens) > max ? Number(day.tokens) : max), 0) || 1;
      const today = days.length === 0 ? 0 : Number(days[days.length - 1].tokens);

      const models = Array.isArray(data.models) ? data.models : [];
      const modelMax = models.reduce((max, row) => (Number(row.tokens) > max ? Number(row.tokens) : max), 0) || 1;
      const recent = Array.isArray(data.recent) ? data.recent : [];
      const recentMax = recent.reduce((max, row) => (Number(row.tokens) > max ? Number(row.tokens) : max), 0) || 1;

      const bar = (tokens, max) => Math.max(2, Math.round((Number(tokens) / max) * 100)) + '%';

      const now = [];
      if (usageNow !== undefined && usageNow !== null) {
        now.push(h('span', { key: 'io' },
          t('usage.thisInput') + ' ', h('b', {}, formatBig(usageNow.uncachedInputTokens)),
          '  ' + t('usage.thisOutput') + ' ', h('b', {}, formatBig(usageNow.outputTokens))));
        const promptSide = Number(usageNow.cacheReadTokens) || 0;
        if (promptSide > 0) now.push(h('span', { key: 'cache' }, t('usage.thisCache') + ' ', h('b', {}, formatBig(promptSide))));
      }
      if (statsNow !== undefined && statsNow !== null) {
        now.push(h('span', { key: 'turns' }, t('usage.thisTurns') + ' ', h('b', {}, formatExact(statsNow.turns))));
      }
      if (pressureNow !== undefined && pressureNow !== null) {
        const used = pressureNow.projectedTokens === undefined ? pressureNow.pressureTokens : pressureNow.projectedTokens;
        if (typeof used === 'number' && typeof pressureNow.contextWindow === 'number' && pressureNow.contextWindow > 0) {
          const percent = Math.min(100, Math.round((used / pressureNow.contextWindow) * 100));
          now.push(h('span', { key: 'ctx' }, t('usage.thisContext') + ' ', h('b', {}, percent + '%')));
        }
      }

      return h(
        'section',
        { className: 'cc-usage' },
        h('header', { className: 'cc-usage-head' },
          h('span', { className: 'cc-usage-title' }, t('usage.title')),
          h('span', { className: 'cc-usage-scope' }, t('usage.scope')),
          h('button', {
            type: 'button',
            className: 'cc-usage-refresh',
            disabled: running,
            onClick: () => setNonce((value) => value + 1),
          }, scanning)),
        totals.calls === 0
          ? h('span', { className: 'cc-usage-note' }, t('usage.empty'))
          : h('div', { className: 'cc-usage-cells' }, cells.map((cell) => h('div', { key: cell.key, className: 'cc-usage-cell' },
            h('span', { className: 'cc-usage-value' }, cell.value),
            h('span', { className: 'cc-usage-label' }, cell.label),
            cell.note === '' ? null : h('span', { className: 'cc-usage-note-inline' }, cell.note),
          ))),
        split.length === 0 ? null : h('div', { className: 'cc-usage-split' }, split.map((part) => h('span', {
          key: part.key,
          className: 'cc-usage-seg ' + part.cls,
          style: { width: (Number(part.tokens) / splitTotal) * 100 + '%' },
        }))),
        split.length === 0 ? null : h('div', { className: 'cc-usage-legend' }, split.map((part) => h('span', { key: part.key, className: 'cc-usage-key' },
          h('span', { className: 'cc-usage-dot ' + part.cls }),
          h('span', {}, part.label + ' ' + formatBig(part.tokens)),
        ))),
        days.length === 0 ? null : h('div', { className: 'cc-usage-days' },
          h('div', { className: 'cc-usage-section' },
            h('span', {}, t('usage.days')),
            h('span', { className: 'cc-usage-section-value' }, t('usage.today') + ' ' + formatBig(today))),
          h('div', { className: 'cc-usage-columns' }, days.map((day, index) => h('span', {
            key: day.day,
            className: 'cc-usage-col',
            title: day.day + '  ' + formatExact(day.tokens),
            'data-today': index === days.length - 1 ? '' : undefined,
          }, h('span', {
            className: 'cc-usage-fill',
            style: { height: Number(day.tokens) === 0 ? '0%' : Math.max(8, Math.round((Number(day.tokens) / dayMax) * 100)) + '%' },
          })))),
        ),
        h('div', { className: 'cc-usage-grid' },
          h('div', { className: 'cc-usage-column' },
            h('div', { className: 'cc-usage-section' }, h('span', {}, t('usage.models'))),
            models.length === 0
              ? h('span', { className: 'cc-usage-note' }, t('usage.noModels'))
              : models.map((row) => h('div', { key: row.model, className: 'cc-usage-row' },
                h('span', { className: 'cc-usage-name', title: row.model }, row.model),
                h('span', { className: 'cc-usage-bar' }, h('span', { className: 'cc-usage-bar-fill', style: { width: bar(row.tokens, modelMax) } })),
                h('span', { className: 'cc-usage-row-value' }, formatBig(row.tokens)),
              )),
          ),
          h('div', { className: 'cc-usage-column' },
            h('div', { className: 'cc-usage-section' }, h('span', {}, t('usage.recent'))),
            recent.length === 0
              ? h('span', { className: 'cc-usage-note' }, t('usage.noSessions'))
              : recent.map((row) => h('div', { key: row.id, className: 'cc-usage-row' },
                h('span', { className: 'cc-usage-name', title: row.cwd === '' ? row.id : row.cwd }, baseName(row.cwd) || row.id.slice(0, 10)),
                h('span', { className: 'cc-usage-bar' }, h('span', { className: 'cc-usage-bar-fill', style: { width: bar(row.tokens, recentMax) } })),
                h('span', { className: 'cc-usage-row-value' }, formatBig(row.tokens)),
              )),
          ),
        ),
        now.length === 0 ? null : h('div', { className: 'cc-usage-now' },
          h('span', { className: 'cc-usage-now-label' }, t('usage.thisSession')),
          now,
        ),
      );
    }

    /**
     * The `/stats` row: the usage board, with the settled report as the
     * fallback a Host without the roll-up route leaves behind.
     */
    function StatsCard(props) {
      const node = props.node;
      const outcome = node === null || node === undefined ? null : node.outcome;
      const text = outcome !== null && typeof outcome.text === 'string' ? outcome.text : '';
      return h(UsageBoard, Object.assign({}, props, { fallback: text }));
    }

    /** One text row: a field that commits on blur or Enter, so typing does not repaint the transcript per keystroke. */
    function TextRow({ description, label, placeholder, value, onCommit }) {
      return h(
        'div',
        { className: 'cc-set-row' },
        h(
          'div',
          { className: 'cc-set-copy' },
          h('span', { className: 'cc-set-label' }, label),
          h('span', { className: 'cc-set-desc' }, description),
        ),
        h('input', {
          type: 'text',
          className: 'cc-set-input',
          defaultValue: value,
          placeholder,
          maxLength: 24,
          'aria-label': label,
          onBlur: (event) => onCommit(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          },
        }),
      );
    }

    /* ------------------------------------------------------------------ *
     * Sidebar labels.
     *
     * The new-session button's words are React text rather than a slot, so the
     * text is swapped in place and put back when the field is emptied. The
     * wordmark needs no swap: it is an SVG behind a slot, and the stylesheet
     * draws the custom text over it. Original words are captured before the
     * first write, per element; an observer re-applies after a React render
     * replaces the node, and only while a custom label is set.
     * ------------------------------------------------------------------ */
    function createLabelSwap() {
      const originals = new WeakMap();
      const tracked = new Set();
      let observer = null;
      let frame = 0;
      let wanted = '';

      const remember = (element) => {
        let record = originals.get(element);
        if (record === undefined) {
          record = { text: element.textContent, aria: element.getAttribute('aria-label') };
          originals.set(element, record);
          tracked.add(element);
        }
        return record;
      };

      const labelSpanOf = (button) => {
        for (const span of button.querySelectorAll('span')) {
          if (span.children.length !== 0) continue;
          if (span.closest('[aria-hidden="true"]') !== null) continue;
          if (span.textContent.trim() === '') continue;
          return span;
        }
        return null;
      };

      const apply = () => {
        frame = 0;
        if (typeof document === 'undefined') return;

        const buttons = document.querySelectorAll('[data-slot="sidebar.session.action"] button');
        for (const button of buttons) {
          const label = labelSpanOf(button);
          if (label === null) continue;
          const record = remember(label);
          const ariaRecord = remember(button);
          if (wanted !== '') {
            if (label.textContent !== wanted) label.textContent = wanted;
            if (button.getAttribute('aria-label') !== wanted) button.setAttribute('aria-label', wanted);
          } else {
            if (label.textContent !== record.text) label.textContent = record.text;
            if (ariaRecord.aria !== null && button.getAttribute('aria-label') !== ariaRecord.aria) {
              button.setAttribute('aria-label', ariaRecord.aria);
            }
          }
        }

        /* The brand button starts a new session too, so its accessible name follows. */
        const mark = document.querySelector('[data-slot="sidebar.brand.mark"]');
        const brandButton = mark === null ? null : mark.closest('button');
        if (brandButton !== null) {
          const record = remember(brandButton);
          if (wanted !== '') {
            if (brandButton.getAttribute('aria-label') !== wanted) brandButton.setAttribute('aria-label', wanted);
          } else if (record.aria !== null && brandButton.getAttribute('aria-label') !== record.aria) {
            brandButton.setAttribute('aria-label', record.aria);
          }
        }

        for (const element of tracked) {
          if (!element.isConnected) tracked.delete(element);
        }
      };

      const schedule = () => {
        if (frame !== 0) return;
        frame = window.requestAnimationFrame(apply);
      };

      const observe = (on) => {
        if (on && observer === null) {
          const scope = document.querySelector('[data-slot="sidebar"]') ?? document.body;
          observer = new MutationObserver(schedule);
          observer.observe(scope, { childList: true, subtree: true, characterData: true });
        } else if (!on && observer !== null) {
          observer.disconnect();
          observer = null;
        }
      };

      return {
        set(value) {
          wanted = value;
          if (wanted === '') {
            if (observer !== null) {
              observe(false);
              apply();
            }
            return;
          }
          observe(true);
          apply();
        },
        stop() {
          wanted = '';
          observe(false);
          if (frame !== 0) {
            window.cancelAnimationFrame(frame);
            frame = 0;
          }
          apply();
        },
      };
    }

    /**
     * The Host-owned auto-compaction threshold.
     *
     * The page reaches its own Host through one same-origin route: read on
     * mount, write on change. The Host writes the profile patch and applies
     * the ratio to the running engine when its config is writable, so the
     * section reports which of the two happened instead of pretending.
     */
    function CompactSection({ t }) {
      const [state, setState] = React.useState(null);
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        let live = true;
        fetch('/claude-style/auto-compact')
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
          .then((data) => {
            if (live) setState(data);
          })
          .catch(() => {
            if (live) setError(t('settings.compact.unavailable'));
          });
        return () => {
          live = false;
        };
      }, []);

      const post = (enabled, threshold) => {
        setState((previous) => Object.assign({}, previous, { enabled, threshold, notice: '' }));
        fetch('/claude-style/auto-compact', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ enabled, threshold }),
        })
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
          .then((data) => {
            setState(Object.assign({}, data, { notice: data.live ? t('settings.compact.live') : t('settings.compact.restart') }));
          })
          .catch(() => setError(t('settings.compact.unavailable')));
      };

      if (error !== '') {
        return h(
          'div',
          { className: 'cc-set-group' },
          h(SwitchRow, { checked: false, disabled: true, label: t('settings.compact.title'), description: error, onChange: () => {} }),
        );
      }

      if (state === null) {
        return h(
          'div',
          { className: 'cc-set-group' },
          h('span', { className: 'cc-set-label' }, t('settings.compact.title')),
          h('span', { className: 'cc-set-desc' }, t('settings.compact.loading')),
        );
      }

      const options = [0.6, 0.7, 0.75, 0.8, 0.85, 0.9].map((value) => ({ value: String(value), label: Math.round(value * 100) + '%' }));

      return h(
        'div',
        { className: 'cc-set-group' },
        h(SwitchRow, {
          checked: state.enabled === true,
          label: t('settings.compact.title'),
          description: t('settings.compact.description'),
          onChange: (value) => post(value, state.threshold === null ? 0.8 : state.threshold),
        }),
        h(ChoiceRow, {
          label: t('settings.compact.threshold'),
          description: t('settings.compact.thresholdDescription'),
          value: state.threshold === null ? '' : String(state.threshold),
          options,
          onChange: (value) => post(true, Number(value)),
        }),
        state.notice ? h('span', { className: 'cc-set-desc' }, state.notice) : null,
      );
    }

    /** One switch row: label + description on the left, the control right. */
    function SwitchRow({ checked, description, disabled, label, onChange }) {
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
          'aria-disabled': disabled === true ? 'true' : undefined,
          disabled: disabled === true,
          'aria-label': label,
          className: 'cc-set-switch',
          style: disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined,
          onClick: disabled ? undefined : () => onChange(!checked),
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
        const next = Object.assign({}, prefs, { [key]: value });
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
          h(ChoiceRow, {
            description: t('settings.motion.description'),
            label: t('settings.motion.title'),
            value: prefs.motion,
            options: [
              { value: 'lite', label: t('settings.motion.lite') },
              { value: 'full', label: t('settings.motion.full') },
            ],
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
        h(
          'div',
          { className: 'cc-set-group' },
          h(TextRow, {
            label: t('settings.brand.title'),
            description: t('settings.brand.description'),
            placeholder: t('settings.brand.placeholder'),
            value: prefs.brand,
            onCommit: (value) => update('brand', text(value, 24)),
          }),
          h(TextRow, {
            label: t('settings.newSession.title'),
            description: t('settings.newSession.description'),
            placeholder: t('settings.newSession.placeholder'),
            value: prefs.newSession,
            onCommit: (value) => update('newSession', text(value, 24)),
          }),
          h(ChoiceRow, {
            label: t('settings.brandMark.title'),
            description: t('settings.brandMark.description'),
            value: prefs.brandMark,
            options: [
              { value: 'default', label: t('settings.brandMark.default') },
              { value: 'claude', label: t('settings.brandMark.claude') },
            ],
            onChange: (value) => update('brandMark', value),
          }),
          h(ChoiceRow, {
            label: t('settings.folder.title'),
            description: t('settings.folder.description'),
            value: prefs.folderIcon,
            options: [
              { value: 'default', label: t('settings.folder.default') },
              { value: 'claude', label: t('settings.folder.claude') },
            ],
            onChange: (value) => update('folderIcon', value),
          }),
        ),
        h(CompactSection, { t: t }),
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

      /* ---- the Context tab in the right sidebar --------------------------- */
      const label = (key) => {
        try {
          return ctx.locale.bind(NS)(key);
        } catch (error) {
          return key;
        }
      };
      /* The tab service may not exist yet when this module applies: the sidebar
         package can load after this one. `ctx.inject` defers registration until
         the service appears and drops it again when the service goes away. */
      try {
        if (typeof ctx.inject === 'function') {
          ctx.inject(['sidebarRightTabs'], (scope) => {
            const tabs = scope.sidebarRightTabs;
            const disposers = [];
            const mount = (id, kind, title, guide, body) => {
              try {
                disposers.push(tabs.register({
                  id,
                  kind,
                  title: () => label(title),
                  guide: [{ id: kind, title: label(title), description: label(guide) }],
                }));
                disposers.push(scope.slots.register({ name: 'sidebar.right.pane.tab', key: id }, body));
              } catch (error) {
                /* a host without this seat keeps the rest of the skin */
              }
            };
            mount(
              CONTEXT_TAB_ID,
              CONTEXT_TAB_KIND,
              'context.title',
              'context.guide',
              (props) => h(ContextPanel, Object.assign({}, props, { t: label })),
            );
            mount(
              USAGE_TAB_ID,
              USAGE_TAB_KIND,
              'usage.title',
              'usage.guide',
              (props) => h(UsageBoard, Object.assign({}, props, { t: label })),
            );
            return () => {
              for (const dispose of disposers.reverse()) {
                if (typeof dispose === 'function') dispose();
              }
            };
          });
        }
      } catch (error) {
        /* a host without a right sidebar keeps the rest of the skin */
      }

      /* ---- the /stats card in the transcript ------------------------------
         The slot is dispatched by command name, so this replaces the generic
         command row only for `stats`. `slots.inject` waits for the Chat
         surface to declare the slot; a Host without it keeps the plain
         report the command already settled. */
      try {
        ctx.slots.inject('conversation.chat.commandview', () =>
          ctx.slots.register(
            { name: 'conversation.chat.commandview', key: 'stats', locale: NS },
            (props) => h(StatsCard, Object.assign({}, props, {
              t: typeof props.t === 'function' ? props.t : label,
            })),
          ),
        );
      } catch (error) {
        /* a host without the chat command slot keeps the plain report */
      }

      /* ---- palette layer, flow attribute, thinking window ----------------- */
      const reasonWindow = createReasonWindow();
      const labels = createLabelSwap();
      const stopSendFlight = createSendFlight();
      const stopModelSplit = createModelSplit((key) => {
        try {
          return ctx.locale.bind(NS)(key);
        } catch (error) {
          return key;
        }
      });

      ctx.effect(() => {
        let paletteLayer = null;

        const sync = () => {
          if (typeof document === 'undefined') return;
          const prefs = readPrefs();
          const body = document.body;
          if (body === null) return;
          body.toggleAttribute(FLOW_ATTR, prefs.flow);
          body.toggleAttribute(COLORS_ATTR, prefs.colors);
          body.setAttribute(MOTION_ATTR, prefs.flow ? (prefs.motion === 'lite' ? 'lite' : 'full') : 'off');
          body.setAttribute(TYPEFACE_ATTR, prefs.typeface);
          body.setAttribute(BRAND_MARK_ATTR, prefs.brandMark);
          body.setAttribute(FOLDER_ATTR, prefs.folderIcon);

          /* The wordmark text is a property the stylesheet reads through
             `content`, so it needs a CSS string literal, not a bare value. */
          if (prefs.brand !== '') {
            body.setAttribute(BRAND_ATTR, '');
            body.style.setProperty(BRAND_TEXT_PROPERTY, JSON.stringify(prefs.brand));
          } else {
            body.removeAttribute(BRAND_ATTR);
            body.style.removeProperty(BRAND_TEXT_PROPERTY);
          }

          labels.set(prefs.newSession);

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
          labels.stop();
          stopSendFlight();
          stopModelSplit();
          if (paletteLayer !== null) paletteLayer();
          if (typeof document !== 'undefined' && document.body !== null) {
            document.body.removeAttribute(FLOW_ATTR);
            document.body.removeAttribute(COLORS_ATTR);
            document.body.removeAttribute(MOTION_ATTR);
            document.body.removeAttribute(TYPEFACE_ATTR);
            document.body.removeAttribute(BRAND_ATTR);
            document.body.removeAttribute(BRAND_MARK_ATTR);
            document.body.removeAttribute(FOLDER_ATTR);
            document.body.style.removeProperty(BRAND_TEXT_PROPERTY);
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
