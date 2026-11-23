import { mountSuperWilds } from './main.mjs';
import { createSuperWildsHttpTransport } from './http-transport.mjs';

/** Entry for the same-site dashboard Play route, using its existing session. */
export async function startSuperWilds({ root = document.getElementById('zplay-superwilds'), fetchImpl = globalThis.fetch } = {}) {
  if (!root || root.dataset.booting === 'true' || root.dataset.superWildsMounted === 'true') return null;
  const d = root.ownerDocument;
  root.dataset.booting = 'true';
  const status = d.createElement('p'); status.className = 'sw-boot-message'; status.setAttribute('role', 'status');
  status.textContent = 'Furitaanka ciyaarta…'; root.replaceChildren(status);
  try {
    const transport = createSuperWildsHttpTransport({ fetchImpl });
    let initial = await transport.state();
    if (typeof initial.subject !== 'string' || !initial.subject) throw Error('PLAYER_LOGIN_REQUIRED');
    const subject = initial.subject;
    // The bootstrap reply is the first controller state too. Do not make a
    // duplicate authentication request or create an independent wallet.
    const connected = { ...transport, state: async () => {
      if (initial) { const value = initial; initial = null; return value; }
      return transport.state();
    } };
    return mountSuperWilds({ root, transport: connected, subject, onExit: () => d.defaultView.location.assign('/') });
  } catch (error) {
    const message = d.createElement('p'); message.className = 'sw-boot-message'; message.setAttribute('role', 'status');
    message.textContent = error?.status === 401 || error?.message === 'PLAYER_LOGIN_REQUIRED'
      ? 'Fadlan gal koontadaada si aad ciyaarta u furto.'
      : 'Xiriirka ciyaarta ma dhammaan. Mar kale isku day.';
    const retry = d.createElement('button'); retry.type = 'button'; retry.className = 'sw-boot-retry'; retry.textContent = 'Mar kale isku day';
    retry.addEventListener('click', () => { void startSuperWilds({ root, fetchImpl }); }, { once: true });
    const back = d.createElement('a'); back.href = '/'; back.className = 'sw-boot-back'; back.textContent = '← ZPLAY';
    root.replaceChildren(message, retry, back); return null;
  } finally { delete root.dataset.booting; }
}

if (typeof document !== 'undefined' && document.getElementById('zplay-superwilds')) void startSuperWilds();
