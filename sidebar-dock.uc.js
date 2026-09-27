// sidebar-dock.uc.js — Sine mod: Cmd+Shift+S toggles a permanently docked,
// icon-only ("minimal") sidebar visible/gone. Cmd+S is left completely
// untouched in both states - it always runs Zen's native
// cmd_toggleCompactModeIgnoreHover, opening the full-width floating popover
// sidebar, regardless of whether the permanent dock is currently showing.
//
// Verified against Zen's source (ZenCompactMode.mjs / ZenUIManager.mjs):
//   - `gZenCompactModeManager.preference` (getter/setter backed by the
//     `zen-compact-mode` root attribute) gates all of compact mode's
//     hover/overlay behavior. Forcing it false renders the sidebar in
//     normal in-flow layout - permanently visible, pushing page content -
//     regardless of hover state. Its setter calls its own _updateEvent()
//     synchronously, so this takes effect immediately.
//   - `zen.view.sidebar-expanded` controls width (full labels vs
//     icon-only), flipped via gZenVerticalTabsManager.toggleExpand().
//     Unlike compact mode's setter, toggleExpand() only writes the pref and
//     relies on an async lazy-pref-observer to eventually call
//     ZenUIManager's own _updateEvent() to flip the `zen-sidebar-expanded`
//     DOM attribute - which is what made this glitchy (the visual change
//     wouldn't apply until some unrelated settings change happened to also
//     trigger that observer). We call _updateEvent() ourselves right after,
//     matching what Zen's own pref-change handler does
//     (`{ dontRebuildAreas: true }`), to force it to apply synchronously.
(function () {
  if (window.__zenSidebarDockInstalled) return;
  window.__zenSidebarDockInstalled = true;

  const SIDEBAR_EXPANDED_PREF = "zen.view.sidebar-expanded";

  let docked = false;
  let priorCompactPreference = null;
  let priorSidebarExpanded = null;

  const setExpanded = (value) => {
    if (Services.prefs.getBoolPref(SIDEBAR_EXPANDED_PREF, true) !== value) {
      window.gZenVerticalTabsManager?.toggleExpand();
      window.gZenVerticalTabsManager?._updateEvent({ dontRebuildAreas: true });
    }
  };

  const enterDock = () => {
    priorCompactPreference = window.gZenCompactModeManager?.preference ?? true;
    priorSidebarExpanded = Services.prefs.getBoolPref(
      SIDEBAR_EXPANDED_PREF,
      true
    );
    if (window.gZenCompactModeManager) {
      window.gZenCompactModeManager.preference = false;
    }
    setExpanded(false);
    docked = true;
  };

  const exitDock = () => {
    if (window.gZenCompactModeManager && priorCompactPreference !== null) {
      window.gZenCompactModeManager.preference = priorCompactPreference;
    }
    if (priorSidebarExpanded !== null) {
      setExpanded(priorSidebarExpanded);
    }
    docked = false;
    priorCompactPreference = null;
    priorSidebarExpanded = null;
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

      docked ? exitDock() : enterDock();
      event.preventDefault();
      event.stopImmediatePropagation();
      // Cmd+S (no shift) is intentionally left unhandled here - it always
      // falls through to Zen's native shortcut, in both docked and
      // undocked states.
    },
    { capture: true }
  );
})();
