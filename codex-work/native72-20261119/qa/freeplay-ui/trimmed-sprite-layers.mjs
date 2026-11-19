// Place trimmed atlas layers in one source coordinate system. The atlas bank
// still owns packing rotation; these boxes use the unrotated sprite geometry.
export function trimmedSpriteLayers(sharpMetadata, blurMetadata, sharpBox) {
  const trim = entry => entry.spriteSourceSize ?? {x:0,y:0,w:entry.frame.w,h:entry.frame.h};
  const sharp = trim(sharpMetadata), blur = trim(blurMetadata);
  const scale = Math.min(sharpBox.width / sharp.w, sharpBox.height / sharp.h);
  const origin = {
    x:sharpBox.x + (sharpBox.width - sharp.w * scale) / 2 - sharp.x * scale,
    y:sharpBox.y + (sharpBox.height - sharp.h * scale) / 2 - sharp.y * scale
  };
  const box = bounds => ({x:origin.x + bounds.x * scale,y:origin.y + bounds.y * scale,
    width:bounds.w * scale,height:bounds.h * scale});
  return {scale,origin,sharp:box(sharp),blur:box(blur)};
}
