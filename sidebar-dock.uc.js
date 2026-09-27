// sidebar-dock.uc.js — Sine mod: Cmd+Shift+S toggles the sidebar into/out of
// a permanently docked, icon-only ("minimal") state - the opposite of Zen's
// own Cmd+S (cmd_toggleCompactModeIgnoreHover), which flips compact mode on
// and pins the sidebar open as a hover-style overlay/popover on top of the
// page. While docked, Cmd+S is repurposed to widen the docked sidebar to its
// full (labeled) width in place, instead of invoking Zen's native overlay.
//
// Why Cmd+S can't just be left alone while docked: Zen's compact-mode hover
// system (ZenCompactMode.mjs) has no "stay visible but minimal" resting
// state - once compact mode is enabled, moving the mouse off the sidebar
// hides it completely (that's the whole point of compact mode). Enabling it
// on top of our permanent dock would make the "permanent" bar vanish on the
// next mouseout, defeating the feature. So instead, whenever our dock is
// active, we intercept Cmd+S ourselves and just flip sidebar width in place
// (still docked, still pushing page content, never floating) rather than
// letting the native hover/overlay command run.
//
// The two axes involved, verified against Zen's source
// (ZenCompactMode.mjs / ZenUIManager.mjs):
//   - `gZenCompactModeManager.preference` is a live getter/setter backed by
//     the `zen-compact-mode` root attribute (persisted to the
//     `zen.view.compact.enable-at-startup` pref) and gates ALL of compact
//     mode's hover/overlay CSS. Forcing it false makes the sidebar render in
//     normal in-flow document layout - permanently visible, pushing page
//     content - regardless of hover state.
//   - `zen.view.sidebar-expanded` (pref, flipped by
//     gZenVerticalTabsManager.toggleExpand(), which also updates the
//     `zen-sidebar-expanded` attribute) controls sidebar width: full (icons
//     + labels) vs minimal (icons only), independent of the above. This is
//     read unconditionally at `:root` (sidebar.inc.css), so it applies to
//     compact mode's overlay too - there's no separate "overlay width" state
//     to keep the dock minimal while a same-pref overlay shows full.
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

  const toggleDock = () => (docked ? exitDock() : enterDock());

  const toggleDockedWidth = () => {
    setExpanded(!Services.prefs.getBoolPref(SIDEBAR_EXPANDED_PREF, true));
  };

  window.addEventListener(
    "keydown",
    (event) => {
      if (!event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== "s") return;

      if (event.shiftKey) {
        toggleDock();
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (docked) {
        toggleDockedWidth();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      // Not docked and plain Cmd+S: let Zen's native shortcut run untouched.
    },
    { capture: true }
  );
})();
