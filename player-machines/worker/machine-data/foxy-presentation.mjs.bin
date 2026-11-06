// Live Canvas presentation components measured from the supplied Foxy recording.
// Values and matched symbols are supplied by the validated round receipt.
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const money = value => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '0.00';

export function foxyShieldPath(c, {x = 160, y = 60, w = 100, h = 94} = {}) {
 const sx = w / 220, sy = h / 198;
 const point = (px, py) => [x + px * sx, y + py * sy];
 c.beginPath();
 c.moveTo(...point(12, 17));
 c.quadraticCurveTo(...point(110, -7), ...point(208, 17));
 c.quadraticCurveTo(...point(216, 19), ...point(212, 32));
 c.lineTo(...point(176, 185));
 c.quadraticCurveTo(...point(110, 200), ...point(44, 185));
 c.lineTo(...point(8, 32));
 c.quadraticCurveTo(...point(4, 19), ...point(12, 17));
 c.closePath();
}

// An optional drawValue callback paints the moving multiplier inside the shield.
// Call this after the wheel sectors and before the reel frame.
export function drawFoxyWheelShield(c, box = {}, drawValue) {
 const {x = 160, y = 60, w = 100, h = 94, winning = false, age = 0, reducedMotion = false} = box;
 const bounds = {x, y, w, h}, sx = w / 220, sy = h / 198;
 c.save();
 // The little gold-green curls sit outside the selected wedge, on the wheel.
 // They remain stationary while the value inside the shield rotates.
 c.save();c.translate(x,y);c.scale(sx,sy);
 for(const direction of [-1,1]){
  c.save();c.translate(110,0);c.scale(direction,1);
  const curl=c.createLinearGradient(85,24,111,124);
  curl.addColorStop(0,'#bfda6b');curl.addColorStop(.35,'#5e9c39');curl.addColorStop(.62,'#d5e992');curl.addColorStop(1,'#4d883b');
  c.beginPath();c.moveTo(94,23);c.bezierCurveTo(119,25,127,45,111,60);c.bezierCurveTo(96,75,104,78,112,82);c.bezierCurveTo(86,79,90,58,101,49);c.bezierCurveTo(109,43,109,32,94,23);c.closePath();c.fillStyle=curl;c.fill();
  c.beginPath();c.moveTo(84,133);c.bezierCurveTo(92,112,116,111,115,126);c.bezierCurveTo(114,137,102,138,101,132);c.bezierCurveTo(100,126,108,123,108,128);c.bezierCurveTo(107,120,92,125,84,133);c.fill();
  c.restore();
 }
 c.restore();
 foxyShieldPath(c, bounds);
 c.shadowColor = '#001e19';
 c.shadowBlur = 4;
 c.shadowOffsetY = 1;
 const jade = c.createLinearGradient(x, y, x + w, y + h);
 jade.addColorStop(0, '#2ac8ae');
 jade.addColorStop(.2, '#159b83');
 jade.addColorStop(.53, '#066f5b');
 jade.addColorStop(.8, '#065642');
 jade.addColorStop(1, '#249873');
 c.fillStyle = jade;
 c.fill();
 c.shadowBlur = 0;
 c.shadowOffsetY = 0;
 c.strokeStyle = '#215f3f';
 c.lineWidth = w * .075;
 c.stroke();
 c.strokeStyle = '#a4bd57';c.lineWidth = w * .046;c.stroke();
 c.strokeStyle = '#224c35';c.lineWidth = w * .025;c.stroke();
 c.save();
 c.clip();
 c.translate(x, y);
 c.scale(sx, sy);
 // Angular jade leaves catch the light at the shoulders; the lower half is
 // recessed so the live orange multiplier stays the dominant foreground.
 const shoulder = c.createLinearGradient(0, 0, 220, 150);
 shoulder.addColorStop(0, '#d7f3ac');
 shoulder.addColorStop(.22, '#63cda0');
 shoulder.addColorStop(.5, '#147052');
 shoulder.addColorStop(.8, '#b5d882');
 shoulder.addColorStop(1, '#3b9f70');
 for (const direction of [-1, 1]) {
  c.save();c.translate(110, 0);c.scale(direction, 1);
  c.beginPath();c.moveTo(78,21);c.lineTo(54,33);c.lineTo(58,57);c.lineTo(34,43);c.lineTo(15,16);c.lineTo(40,22);c.lineTo(50,13);c.lineTo(70,19);c.closePath();
  c.fillStyle=shoulder;c.globalAlpha=.6;c.fill();c.globalAlpha=1;
  c.beginPath();c.moveTo(77,24);c.lineTo(63,45);c.lineTo(51,28);c.moveTo(63,45);c.lineTo(67,67);
  c.strokeStyle='#7ed9b0aa';c.lineWidth=1.6;c.stroke();
  c.restore();
 }
 const facets = [
  ['#72edca49', [[24, 22], [94, 11], [76, 63], [39, 84]]],
  ['#37b58f60', [[112, 8], [192, 23], [151, 69], [133, 46]]],
  ['#003d343d', [[53, 33], [75, 61], [63, 97], [90, 122], [76, 172], [55, 170]]],
  ['#69c9a324', [[161, 30], [137, 58], [155, 78], [130, 117], [144, 168], [167, 168]]],
  ['#2bc49718', [[91, 89], [115, 69], [134, 106], [115, 162], [91, 146]]]
 ];
 for (const [color, points] of facets) {
  c.beginPath();
  points.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py));
  c.closePath();
  c.fillStyle = color;
  c.fill();
 }
 c.beginPath();
 c.moveTo(24, 27);
 c.quadraticCurveTo(110, 8, 196, 27);
 c.lineTo(166, 174);
 c.quadraticCurveTo(110, 188, 54, 174);
 c.closePath();
 c.strokeStyle = '#73d7a68c';
 c.lineWidth = 2;
 c.stroke();
 c.restore();
 if (typeof drawValue === 'function') {
  c.save();
  foxyShieldPath(c, bounds);
  c.clip();
  drawValue(c, bounds);
  c.restore();
 }
 foxyShieldPath(c, bounds);
 const foil = c.createLinearGradient(x, y, x + w * .85, y + h);
 [[0, '#fffec1'], [.2, '#aebc54'], [.5, '#f0ee9a'], [.76, '#8c9e41'], [1, '#eee6a1']]
  .forEach(([stop, color]) => foil.addColorStop(stop, color));
 c.strokeStyle = foil;
 c.lineWidth = w * .018;
 c.stroke();
 // The recorded win response lights the rim, without lighting it on losses.
 // Reduced motion receives a steady outline and no moving sparkle.
 if(winning){
  const pulse=reducedMotion?1:.78+.22*Math.sin(Math.max(0,age)/175)**2;
  c.save();foxyShieldPath(c,bounds);c.strokeStyle=`rgba(255,252,205,${pulse})`;c.lineWidth=w*.024;c.shadowColor='#ffe383';c.shadowBlur=reducedMotion?4:7;c.stroke();c.shadowBlur=0;
  if(!reducedMotion){const t=(Math.max(0,age)%1800)/1800,gx=x+w*(.08+.84*t),gy=y+h*(.085-.07*Math.sin(t*Math.PI));const glow=c.createRadialGradient(gx,gy,0,gx,gy,w*.05);glow.addColorStop(0,'#fffef2');glow.addColorStop(.25,'#fffccbaa');glow.addColorStop(1,'#fff2aa00');c.fillStyle=glow;c.fillRect(gx-w*.05,gy-w*.05,w*.1,w*.1);}
  c.restore();
 }
 c.translate(x, y);
 c.scale(sx, sy);
 c.beginPath();
 c.moveTo(70, 192);
 c.bezierCurveTo(66, 178, 83, 175, 98, 187);
 c.quadraticCurveTo(89, 171, 97, 162);
 c.quadraticCurveTo(108, 166, 110, 180);
 c.quadraticCurveTo(112, 166, 123, 162);
 c.quadraticCurveTo(131, 171, 122, 187);
 c.bezierCurveTo(137, 175, 154, 178, 150, 192);
 c.closePath();
 c.fillStyle = '#438d58';
 c.fill();
 c.strokeStyle = '#c9d879';
 c.lineWidth = 1.5;
 c.stroke();
 c.beginPath();
 c.moveTo(110, 157);
 c.lineTo(122, 173);
 c.lineTo(110, 189);
 c.lineTo(98, 173);
 c.closePath();
 c.fillStyle = '#cfb750';
 c.fill();
 c.strokeStyle = '#eee2a0';
 c.lineWidth = 2;
 c.stroke();
 c.beginPath();
 c.moveTo(110, 163);
 c.lineTo(117, 173);
 c.lineTo(110, 183);
 c.lineTo(103, 173);
 c.closePath();
 c.fillStyle = '#2bc995';
 c.fill();
 c.restore();
}

function vineLeaf(c, x, y, w, h, angle, bright = false) {
 c.save();
 c.translate(x, y);
 c.rotate(angle);
 c.beginPath();
 c.moveTo(0, 0);
 c.bezierCurveTo(-w * .8, -h * .5, -w * .55, -h * .93, 0, -h);
 c.bezierCurveTo(w * .6, -h * .75, w * .8, -h * .26, 0, 0);
 const fill = c.createLinearGradient(-w, 0, w, -h);
 fill.addColorStop(0, bright ? '#30732e' : '#0d5d3c');
 fill.addColorStop(.55, bright ? '#81d857' : '#24a96a');
 fill.addColorStop(1, bright ? '#caef71' : '#73ce83');
 c.fillStyle = fill;
 c.fill();
 c.strokeStyle = bright ? '#b5dd63' : '#80c78b';
 c.lineWidth = .6;
 c.stroke();
 c.beginPath();
 c.moveTo(0, 0);
 c.lineTo(0, -h * .85);
 c.strokeStyle = '#d7ed7a85';
 c.stroke();
 c.restore();
}

function ornament(c, anchorX, top, direction) {
 c.save();
 c.translate(anchorX, top);
 c.scale(direction, 1);
 const stem = () => {
  c.beginPath();
  c.moveTo(8, 8);
  c.bezierCurveTo(-9, 5, -19, -2, -40, 5);
  c.bezierCurveTo(-54, 11, -51, 27, -66, 27);
  c.bezierCurveTo(-52, 27, -54, 41, -43, 46);
  c.bezierCurveTo(-22, 54, -8, 43, 9, 45);
  c.moveTo(-10, 3);
  c.bezierCurveTo(-26, 11, -47, 10, -45, 24);
  c.bezierCurveTo(-43, 34, -23, 32, -17, 40);
  c.moveTo(-24, 46);
  c.bezierCurveTo(-16, 52, -14, 61, -5, 61);
  c.bezierCurveTo(-7, 54, 0, 47, 7, 47);
 };
 stem();
 c.lineWidth = 5;
 c.strokeStyle = '#073c2e';
 c.stroke();
 stem();
 c.lineWidth = 2.7;
 c.strokeStyle = '#239a71';
 c.stroke();
 stem();
 c.lineWidth = .75;
 c.strokeStyle = '#9dd4a0';
 c.stroke();
 c.beginPath();
 c.moveTo(-8, 12);
 c.bezierCurveTo(-23, 8, -37, 11, -37, 23);
 c.bezierCurveTo(-37, 35, -23, 39, -16, 30);
 c.bezierCurveTo(-11, 24, -21, 17, -25, 23);
 c.bezierCurveTo(-30, 29, -20, 30, -22, 25);
 c.moveTo(-15, 10);
 c.bezierCurveTo(-12, 2, -13, -7, -23, -8);
 c.bezierCurveTo(-30, -10, -31, -3, -26, -2);
 c.strokeStyle = '#4fa77d';
 c.lineWidth = 1.2;
 c.stroke();
 c.beginPath();
 c.moveTo(-5, 15);
 c.lineTo(-12, 27);
 c.lineTo(-5, 39);
 c.lineTo(1, 27);
 c.closePath();
 c.strokeStyle = '#52b591';
 c.lineWidth = 1.4;
 c.stroke();
 vineLeaf(c, -44, 7, 5, 15, -.65, true);
 vineLeaf(c, -57, 27, 5, 16, -1.15, true);
 vineLeaf(c, -44, 44, 5, 14, -2.2);
 vineLeaf(c, -17, 46, 5, 15, -2.6, true);
 vineLeaf(c, -9, 59, 3.7, 11, 2.55);
 vineLeaf(c, -12, 6, 4.5, 12, .55);
 c.restore();
}

function panelPath(c, x, y, w, h, inset = 0) {
 c.beginPath();
 c.moveTo(x + inset, y + inset);
 c.quadraticCurveTo(x + w * .5, y + 3 + inset, x + w - inset, y + inset);
 c.lineTo(x + w - 12 - inset, y + h - inset);
 c.quadraticCurveTo(x + w * .5, y + h + 3 - inset, x + 12 + inset, y + h - inset);
 c.closePath();
}

export function drawFoxyWinPanel(c, {
 amount = 0, progress = 1, x = 80, y = 405, w = 260, h = 58, currency = 'ETB'
} = {}) {
 c.save();
 ornament(c, x + 1, y + 1, 1);
 ornament(c, x + w - 1, y + 1, -1);
 panelPath(c, x, y, w, h);
 c.shadowColor = '#002719';
 c.shadowBlur = 4;
 c.lineWidth = 7;
 c.strokeStyle = '#123f2d';
 c.stroke();
 const body = c.createLinearGradient(0, y, 0, y + h);
 [[0, '#228465'], [.14, '#0c624f'], [.45, '#073e33'], [.8, '#064530'], [1, '#17664a']]
  .forEach(([stop, color]) => body.addColorStop(stop, color));
 c.fillStyle = body;
 c.fill();
 c.save();
 panelPath(c, x, y, w, h, 5);c.clip();
 // Small diagonal weave is visible in the original green enamel panel.
 c.fillStyle = '#9be4b210';
 for(let py=y+6;py<y+h-5;py+=3)for(let px=x+6;px<x+w-6;px+=3){
  c.fillRect(px+((Math.round((py-y)/3)%2)*1.5),py,.65,.65);
 }
 c.restore();
 c.shadowBlur = 0;
 const bevel = c.createLinearGradient(0, y, 0, y + h);
 [[0, '#b5e9b5'], [.18, '#3dbc8c'], [.48, '#145740'], [.75, '#27885d'], [1, '#99d48b']]
  .forEach(([stop, color]) => bevel.addColorStop(stop, color));
 c.lineWidth = 2;
 c.strokeStyle = bevel;
 c.stroke();
 panelPath(c, x, y, w, h, 4);
 c.lineWidth = .6;
 c.strokeStyle = '#6ac69c7a';
 c.stroke();
 c.textAlign = 'center';
 c.textBaseline = 'middle';
 c.font = '900 10px Georgia';
 c.fillStyle = '#b9c66b';
 c.fillText('WIN', x + w / 2, y + 18);
 const shown = money(Math.max(0, Number(amount) || 0) * clamp(progress));
 c.shadowColor = '#4af8b655';
 c.shadowBlur = 3;
 c.font = '900 19px Arial';
 const amountWidth = c.measureText(shown).width;
 c.font = '900 12px Arial';
 const unitWidth = c.measureText(currency).width;
 const left = x + (w - amountWidth - unitWidth - 4) / 2;
 c.textAlign = 'left';
 c.fillStyle = '#8ff1c3';
 c.font = '900 19px Arial';
 c.fillText(shown, left, y + 38);
 c.font = '900 12px Arial';
 c.fillText(currency, left + amountWidth + 4, y + 39);
 c.restore();
}

export function drawFoxyLinePayout(c, {
 line, multiplier = 1, atlas, x = 210, y = 484, currency = 'ETB'
} = {}) {
 if (!line) return;
 const count = Math.max(0, Math.min(5, Math.trunc(Number(line.count) || 0)));
 const prefix = 'LINE ' + line.line;
 const equation = money(line.baseWin) + ' × ' + multiplier + ' = ' + money(line.win) + ' ' + currency;
 c.save();
 c.font = '900 8.5px Arial';
 c.textAlign = 'left';
 c.textBaseline = 'middle';
 const sprite = atlas?.get?.(line.symbol);
 const tile = sprite ? 15 : 0;
 const prefixWidth = c.measureText(prefix).width;
 const equationWidth = c.measureText(equation).width;
 const totalWidth = prefixWidth + 6 + count * tile + (sprite ? 5 : 0) + equationWidth;
 let cursor = x - totalWidth / 2;
 c.fillStyle = '#a3c76a';
 c.fillText(prefix, cursor, y);
 cursor += prefixWidth + 6;
 if (sprite) {
  for (let i = 0; i < count; i++) c.drawImage(sprite, cursor + i * tile, y - tile / 2, tile, tile);
  cursor += count * tile + 5;
 }
 c.fillText(equation, cursor, y);
 c.restore();
}
