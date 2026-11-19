// Native launcher settings: Sound Effects controls the master sound switch;
// Background Music controls the bed separately while master sound is enabled.
// Source: GameLauncher/Content/Scripts/menu.js, handlers at lines 196–220.
const selectedGames = new Set(['habesha_fortune_5_native']);
const choiceKey = 'zplay:sound-choice';

export function createOfficialAudioControls({gameId, audio, storage} = {}) {
  if (!selectedGames.has(gameId) || !audio) return null;
  const musicKey = 'zplay:habesha-background-music:v1';
  const volumeKey = 'zplay:habesha-volume:v1';
  if (!storage) { try { storage = globalThis.localStorage; } catch {} }
  const read = key => { try { return storage?.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { storage?.setItem(key, value); } catch {} };
  const choice = read(choiceKey), savedMusic = read(musicKey);
  if (volumeKey) {
    const saved = read(volumeKey), volume = Number(saved);
    if (saved !== null && saved !== '' && Number.isFinite(volume) && volume >= 0 && volume <= 1) audio.setVolume(volume);
  }
  let consented = choice === 'yes';
  let music = consented && savedMusic !== 'no';
  let disposed = false;
  const listeners = new Set();
  const getState = () => ({effectsEnabled: !audio.muted, musicEnabled: music, volume: audio.volume});
  const emit = () => { if (!disposed) for (const listener of listeners) listener(getState()); };
  const restore = () => {
    if (disposed) return;
    audio.setBackgroundEnabled(consented && !audio.muted && music);
    emit();
  };
  // Preserve the legacy consent key for the other cabinets and sound prompt.
  // An unset choice retains the existing foreground behavior without loading music.
  if (choice === 'no' && !audio.muted) audio.toggle();
  if (choice === 'yes' && audio.muted) audio.toggle();
  restore();
  const controls = {
    getState,
    restore,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async setEffects(enabled) {
      if (disposed) return;
      enabled = !!enabled;
      // The official Effects switch clears Music when off and restores it on.
      consented = enabled; music = enabled;
      if (audio.muted === enabled) audio.toggle();
      write(choiceKey, enabled ? 'yes' : 'no');
      write(musicKey, enabled ? 'yes' : 'no');
      restore();
      if (enabled) await audio.unlock();
    },
    async setMusic(enabled) {
      if (disposed) return;
      music = !!enabled;
      // An explicit Music-on gesture can consent while the existing master is on.
      // A previous No/master mute is never overridden by the music switch.
      if (music && !audio.muted && !consented) { consented = true; write(choiceKey, 'yes'); }
      write(musicKey, music ? 'yes' : 'no');
      restore();
      // Changing music never unmutes the master sound switch.
      if (consented && !audio.muted && music) await audio.unlock();
    },
    dispose() { disposed = true; listeners.clear(); }
  };
  controls.setVolume = value => {
    if (disposed || !Number.isFinite(value)) return;
    audio.setVolume(value);
    write(volumeKey, String(audio.volume));
    emit();
  };
  return controls;
}
