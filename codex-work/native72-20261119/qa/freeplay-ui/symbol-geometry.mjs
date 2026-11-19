// Isolated UI QA only. This module draws supplied artwork; it has no game,
// account, outcome, network, or balance API.

export function symbolFrame(entry) {
  const source = entry?.sourceSize;
  const bounds = entry?.visibleBounds || entry?.spriteSourceSize;
  if (!source || !bounds || ![source.w, source.h, bounds.w, bounds.h].every(value => Number.isFinite(value) && value > 0) ||
      ![bounds.x, bounds.y].every(Number.isFinite) || bounds.x < 0 || bounds.y < 0 ||
      bounds.x + bounds.w > source.w || bounds.y + bounds.h > source.h) {
    throw new Error('INVALID_SYMBOL_SOURCE_GEOMETRY');
  }
  return Object.freeze({sourceWidth: source.w, sourceHeight: source.h,
    x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h});
}

// Every appearance of a symbol uses the sharp artwork's source coordinate
// system. Blurred pixels may extend outside its alpha bounds but keep the same
// scale and origin. The stationary visible footprint is preserved exactly.
export function symbolTransform(frame, x, y, width, height) {
  if (!frame) return {x, y, width, height};
  const scale = Math.min(width / frame.width, height / frame.height);
  return {
    x: x + (width - frame.width * scale) / 2 - frame.x * scale,
    y: y + (height - frame.height * scale) / 2 - frame.y * scale,
    width: frame.sourceWidth * scale,
    height: frame.sourceHeight * scale
  };
}

export function drawSymbolFrame(context, artwork, frame, x, y, width, height) {
  if (!artwork) return;
  if (!frame) { context.drawImage(artwork, x, y, width, height); return; }
  const scale = Math.min(width / frame.width, height / frame.height);
  context.drawImage(artwork,
    x + (width - frame.width * scale) / 2 - frame.x * scale,
    y + (height - frame.height * scale) / 2 - frame.y * scale,
    frame.sourceWidth * scale, frame.sourceHeight * scale);
}

export function sameArtwork(first, second) {
  if (first === second) return true;
  const firstSource = first?.currentSrc || first?.src;
  const secondSource = second?.currentSrc || second?.src;
  return !!firstSource && firstSource === secondSource;
}

export function drawSymbolTransition(context, blurred, sharp, frame, x, y, width, height, clarity) {
  const amount = Math.max(0, Math.min(1, Number.isFinite(clarity) ? clarity : 0));
  if (sameArtwork(blurred, sharp) || amount >= 1 || !blurred) {
    drawSymbolFrame(context, sharp, frame, x, y, width, height);
    return;
  }
  if (amount <= 0 || !sharp) {
    drawSymbolFrame(context, blurred, frame, x, y, width, height);
    return;
  }
  // The caller's alpha and transform stay intact. Identical atlas entries take
  // the single-draw branch above, avoiding both duplicate work and alpha dips.
  context.save();
  const alpha = context.globalAlpha;
  context.globalAlpha = alpha * (1 - amount);
  drawSymbolFrame(context, blurred, frame, x, y, width, height);
  context.globalAlpha = alpha * amount;
  drawSymbolFrame(context, sharp, frame, x, y, width, height);
  context.restore();
}
