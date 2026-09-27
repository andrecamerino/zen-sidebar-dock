// sidebar-dock.uc.js — Sine mod: Cmd+Shift+S forces the sidebar into its
// permanently docked, icon-only ("minimal") state — the opposite of Zen's
// own Cmd+S (cmd_toggleCompactModeIgnoreHover), which flips compact mode on
// and pins the sidebar open as a hover-style overlay/popover on top of the
// page.
//
// The two behaviors live on independent axes in Zen's source
// (ZenCompactMode.mjs / ZenUIManager.mjs):
//   - `gZenCompactModeManager.preference` is a live getter/setter backed by
//     the `zen-compact-mode` root attribute (persisted to the
//     `zen.view.compact.enable-at-startup` pref) and gates ALL of compact
//     mode's hover/overlay CSS. Forcing it false makes the sidebar render in
//     normal in-flow document layout - permanently visible, pushing page
//     content, never a popover - regardless of hover state. Cmd+S's own
//     toggle() flips this same property, so it still works as the way back
//     into compact/popover mode afterwards.
//   - `zen.view.sidebar-expanded` (pref, flipped by
//     gZenVerticalTabsManager.toggleExpand(), which also updates the
//     `zen-sidebar-expanded` attribute) controls sidebar width: full (icons
//     + labels) vs minimal (icons only), independent of the above.
//
// So "minimal, permanent, not a popover" = compact mode off + sidebar width
// forced to its minimal state. toggleExpand() only flips the width, so we
// guard the call to make repeated presses idempotent (always land on
// minimal, never bounce back to full).
(function () {
  if (window.__zenSidebarDockInstalled) return;
  window.__zenSidebarDockInstalled = true;

  const dockMinimalSidebar = () => {
    if (window.gZenCompactModeManager?.preference) {
      window.gZenCompactModeManager.preference = false;
    }
    if (Services.prefs.getBoolPref("zen.view.sidebar-expanded", true)) {
      window.gZenVerticalTabsManager?.toggleExpand();
    }
  };

  window.addEventListener(
    "keydown",
    (event) => {
      if (
        !event.metaKey ||
        !event.shiftKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key.toLowerCase() !== "s"
      ) {
        return;
      }

      dockMinimalSidebar();
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    { capture: true }
  );
})();
