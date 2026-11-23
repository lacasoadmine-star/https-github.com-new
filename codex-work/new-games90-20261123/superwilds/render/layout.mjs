const rect = (x,y,width,height) => Object.freeze({x,y,width,height});

/** The renderer and actual DOM buttons use the same rectangles. */
export function superWildsLayout(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 240 || height < 320) throw new RangeError('SUPERWILDS_VIEWPORT');
  const portrait = width < 480 || width / height < 1.3;
  if (!portrait) {
    const w = Math.min(width, height * 16 / 9), h = w * 9 / 16, x = (width-w)/2, y = (height-h)/2;
    const box = (a,b,c,d) => rect(x+a*w,y+b*h,c*w,d*h);
    const spin = box(.832,.424,.116,.206);
    return Object.freeze({width,height,portrait,scene:rect(x,y,w,h),cabinet:box(.242,.307,.500,.535),
      title:box(.023,.163,.239,.105),wheel:box(.272,.105,.442,.205),
      controls:Object.freeze({spin,auto:box(.864,.300,.060,.106),quick:box(.926,.385,.043,.076),
        take:box(.862,.646,.063,.112),double:box(.775,.647,.063,.112),
        menu:box(.018,.884,.052,.092),sound:box(.931,.884,.052,.092),
        balance:box(.278,.895,.121,.062),bet:box(.592,.895,.121,.062)}),
      balance:box(.278,.895,.121,.062),bet:box(.592,.895,.121,.062),win:box(.438,.890,.123,.066)});
  }
  const w=width, h=height;
  // Video reference 42764 (576x1280): 5x3 cabinet at x~22,y~465,
  // wheel top ~346, 160px SPIN at y~1021 and footer y~1202.
  // Scale the portrait controls by width, not fixed CSS pixels; smaller
  // phones preserve independent hitboxes without changing the game rules.
  const margin=Math.max(9,w*.037);
  const cabinetWidth=w-2*margin;
  const cabinetHeight=Math.min(cabinetWidth*3/5,Math.max(108,h-235));
  const cabinetTop=Math.max(97,Math.min(h*.363,h-170-cabinetHeight));
  const plateY=h-w*.135;
  const controlsY=Math.max(cabinetTop+cabinetHeight+12,h-w*.45);
  const spinSize=Math.max(44,Math.min(w*.28,plateY-controlsY-8));
  const centre=w/2, aux=Math.max(44,w*.135), corner=Math.max(44,w*.08);
  const footerHeight=Math.max(44,w*.095);
  const quickSize=44, quickY=controlsY-25;
  const wheelHeight=w*.205;
  // WIN text sits in the genuine empty band between the reels and SPIN.
  // On short screens, scale the badge rather than cover a real touch control.
  const winGap=controlsY-(cabinetTop+cabinetHeight);
  const winHeight=Math.min(24,Math.max(8,winGap-4));
  const winY=cabinetTop+cabinetHeight+Math.max(1,(winGap-winHeight)/2);
  return Object.freeze({width,height,portrait,scene:rect(0,0,w,h),
    title:rect(w*.02,Math.max(13,cabinetTop-w*.42),w*.96,w*.106),
    wheel:rect(w*.11,cabinetTop-wheelHeight,w*.78,wheelHeight-3),
    cabinet:rect(margin,cabinetTop,cabinetWidth,cabinetHeight),
    controls:Object.freeze({
      spin:rect(centre-spinSize/2,controlsY,spinSize,spinSize),
      auto:rect(centre-w*.30,controlsY+spinSize*.25,aux,aux),
      take:rect(centre+w*.165,controlsY+spinSize*.25,aux,aux),
      quick:rect(centre+spinSize/2+2,quickY,quickSize,quickSize),
      double:rect(centre-w*.34,quickY,quickSize,quickSize),
      menu:rect(w*.04,h-w*.13,corner,corner),
      sound:rect(w-w*.04-corner,h-w*.13,corner,corner),
      balance:rect(w*.163,plateY,w*.325,footerHeight),
      bet:rect(w*.512,plateY,w*.325,footerHeight)}),
    balance:rect(w*.163,plateY,w*.325,footerHeight),
    bet:rect(w*.512,plateY,w*.325,footerHeight),
    win:rect(centre-w*.21,winY,w*.42,winHeight)});
}

export function reelRectangles(layout) {
  const b=layout.cabinet,pad=Math.max(3,b.width*.007),w=(b.width-2*pad)/5;
  return Array.from({length:5},(_,column)=>rect(b.x+pad+column*w,b.y+pad,w,b.height-pad*2));
}
