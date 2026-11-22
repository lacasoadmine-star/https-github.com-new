/** Consume one physical Space/Enter press, including focused native buttons. */
export function activateFromKeyboard(event, { root, scene, held, action }) {
  if (![' ', 'Enter'].includes(event.key)) return false;
  const button = event.target?.closest?.('button[data-action]');
  if (button ? !root.contains(button) || button.disabled : event.target !== root && event.target !== scene) return false;
  event.preventDefault();
  if (event.repeat || held.has(event.key)) return true;
  held.add(event.key);
  void action(button?.dataset.action || 'spin', button?.dataset.value, button || null);
  return true;
}
