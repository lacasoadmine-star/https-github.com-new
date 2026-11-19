// Foreground audio gate for Multi Hot 100. Does not change game settlement or balances.
export function createForegroundAudio({win, doc, settings, onAudio = () => {}, onSoundCue = () => {}}) {
  if (!win?.addEventListener || !doc?.addEventListener || typeof settings !== 'function')
    throw new TypeError('Browser lifecycle and game settings are required');
  let active = true;
  const visible = () => active && !doc.hidden && (typeof doc.hasFocus !== 'function' || doc.hasFocus());
  const effective = () => {
    const configured = settings();
    return {effects: visible() && configured.effects === true, music: visible() && configured.music === true};
  };
  const sync = () => onAudio(Object.freeze(effective()));
  const suspend = () => {active = false; sync();};
  const resume = () => {active = true; sync();};
  doc.addEventListener('visibilitychange', sync);
  win.addEventListener('blur', suspend);
  win.addEventListener('focus', resume);
  win.addEventListener('pagehide', suspend);
  win.addEventListener('pageshow', resume);
  sync();
  return {
    settingsChanged: sync,
    cue(name, detail) {if (effective().effects) onSoundCue(name, detail);},
    dispose() {
      active = false;
      sync();
      doc.removeEventListener('visibilitychange', sync);
      win.removeEventListener('blur', suspend);
      win.removeEventListener('focus', resume);
      win.removeEventListener('pagehide', suspend);
      win.removeEventListener('pageshow', resume);
    }
  };
}
