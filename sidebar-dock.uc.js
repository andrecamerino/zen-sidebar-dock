// sidebar-dock.uc.js — Sine mod: Cmd+Shift+S toggles the sidebar into/out of
// a permanently docked, icon-only ("minimal") state, mirroring exactly what
// Zen's own "Collapsed Sidebar" Browser Layout preset does (Settings > Looks
// and Feel > Browser Layout). Verified against that preset's real click
// handler (applySidebarLayout() in zen-settings.js), which sets:
//   - `zen.view.sidebar-expanded` = false (icon-only width)
//   - `zen.view.use-single-toolbar` = false
// and nothing else - notably it does NOT touch compact mode. We do the same
// two pref writes, then force gZenVerticalTabsManager._updateEvent()
// ourselves so the change applies immediately: the preset button's click
// handler only sets the prefs and relies on the pref-observer chain
// ZenUIManager registers via XPCOMUtils.defineLazyPreferenceGetter, which is
// why doing this without also calling _updateEvent() required an unrelated
// settings click to "catch up" before.
//
// Compact mode (gZenCompactModeManager.preference, driving Zen's native
// Cmd+S hover/overlay popover) is intentionally left completely untouched -
// it's an independent setting from Zen's Browser Layout presets, and Cmd+S
// should always behave exactly as it already does for you, in both docked
// and undocked states. (Earlier versions of this mod incorrectly also
// forced compact mode on/off, which fought against this independent axis
// for no reason - removed.)
//
// The install guard is version-tagged rather than a one-time boolean, and
// tears down its own previous listener before reinstalling: Sine can push
// updated mod content into an already-running browser window without a
// full app restart, and a plain "already installed, skip" guard would have
// left a stale, possibly-buggy older version of this script silently still
// in control after such a reload.
(function () {
  const SCRIPT_VERSION = 4;
  if (window.__zenSidebarDockVersion === SCRIPT_VERSION) return;
  window.__zenSidebarDockCleanup?.();

  const SIDEBAR_EXPANDED_PREF = "zen.view.sidebar-expanded";
  const SINGLE_TOOLBAR_PREF = "zen.view.use-single-toolbar";

  let docked = false;
  let priorSidebarExpanded = null;
  let priorSingleToolbar = null;

  const applyAndSync = (expanded, singleToolbar) => {
    Services.prefs.setBoolPref(SIDEBAR_EXPANDED_PREF, expanded);
    Services.prefs.setBoolPref(SINGLE_TOOLBAR_PREF, singleToolbar);
    window.gZenVerticalTabsManager?._updateEvent({ dontRebuildAreas: true });
  };

  const enterDock = () => {
    priorSidebarExpanded = Services.prefs.getBoolPref(
      SIDEBAR_EXPANDED_PREF,
      true
    );
    priorSingleToolbar = Services.prefs.getBoolPref(SINGLE_TOOLBAR_PREF, false);
    applyAndSync(false, false);
    docked = true;
  };

  const exitDock = () => {
    applyAndSync(priorSidebarExpanded ?? true, priorSingleToolbar ?? false);
    docked = false;
    priorSidebarExpanded = null;
    priorSingleToolbar = null;
  };

  const onKeydown = (event) => {
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
    // Cmd+S (no shift) is intentionally left unhandled - it always falls
    // through to Zen's native shortcut, in both docked and undocked states.
  };

  window.addEventListener("keydown", onKeydown, { capture: true });
  window.__zenSidebarDockCleanup = () => {
    window.removeEventListener("keydown", onKeydown, { capture: true });
  };
  window.__zenSidebarDockVersion = SCRIPT_VERSION;
})();
