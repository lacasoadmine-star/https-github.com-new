// Draws individual verified sprites, never a screenshot/video of a game board.
export function validateAtlas(atlas) {
  if (!atlas || typeof atlas !== 'object' || !Object.keys(atlas).length) throw new TypeError('Missing sprite atlas');
  for (const [symbol, item] of Object.entries(atlas)) {
    const width = item.image?.naturalWidth ?? item.image?.width;
    const height = item.image?.naturalHeight ?? item.image?.height;
    if (!symbol || ![width, height, item.x, item.y, item.width, item.height].every(Number.isFinite) ||
        width <= 0 || height <= 0 || item.x < 0 || item.y < 0 || item.width <= 0 || item.height <= 0 ||
        item.x + item.width > width || item.y + item.height > height)
      throw new TypeError('Invalid or unloaded sprite: ' + symbol);
  }
  return atlas;
}

export function createReelPainter({canvas, columns, rows, atlas, maxDpr = 2}) {
  validateAtlas(atlas);
  if (!canvas || typeof canvas.getContext !== 'function' || !Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1)
    throw new TypeError('Canvas and reel dimensions are required');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas is unavailable');
  let width = 0, height = 0, disposed = false;
  function resize(cssWidth, cssHeight, devicePixelRatio = 1) {
    if (disposed) throw new Error('Reel view has been disposed');
    if (![cssWidth, cssHeight, devicePixelRatio, maxDpr].every(n => Number.isFinite(n) && n > 0)) throw new TypeError('Invalid canvas size');
    width = cssWidth; height = cssHeight;
    const dpr = Math.min(devicePixelRatio, maxDpr, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw(symbol, x, y, w, h) {
    const sprite = atlas[symbol];
    if (!sprite) throw new Error('Missing verified sprite: ' + symbol);
    context.drawImage(sprite.image, sprite.x, sprite.y, sprite.width, sprite.height, x, y, w, h);
  }
  function render(frame) {
    if (disposed) return;
    if (!width || !height || frame.reels.length !== columns) throw new Error('Size or reel count does not match');
    const cellW = width / columns, cellH = height / rows;
    context.clearRect(0, 0, width, height);
    for (const reel of frame.reels) {
      const x = reel.column * cellW;
      context.save(); context.beginPath(); context.rect(x, 0, cellW, height); context.clip();
      try {
        if (reel.settled) reel.result.forEach((symbol, row) => draw(symbol, x, row * cellH, cellW, cellH));
        else {
          const base = Math.floor(reel.offset), fraction = reel.offset - base;
          for (let row = -1; row <= rows; row++) {
            const position = base + row;
            const finalRow = position - reel.travel;
            const symbol = finalRow >= 0 && finalRow < rows ? reel.result[finalRow] : reel.strip[((position % reel.strip.length) + reel.strip.length) % reel.strip.length];
            draw(symbol, x, (row - fraction) * cellH, cellW, cellH);
          }
        }
      } finally {context.restore();}
    }
  }
  return {resize, render, dispose() {disposed = true; context.clearRect(0, 0, width, height);}};
}
