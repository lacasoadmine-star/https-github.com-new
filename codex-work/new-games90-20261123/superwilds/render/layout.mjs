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
  const w=width, h=height, margin=Math.max(9,w*.025);
  // A five-by-three cabinet keeps nearly square symbol cells. Additional
  // portrait height belongs between the cabinet and controls, not in reels.
  const cabinetWidth=w-2*margin;
  const cabinetHeight=Math.min(cabinetWidth*3/5,Math.max(108,h-235));
  const cabinetTop=Math.max(97,Math.min(h*.285,h-170-cabinetHeight));
  const controlsY=Math.max(cabinetTop+cabinetHeight+8,h-162);
  const spinSize=76, centre=w/2, aux=48, plateWidth=Math.max(105,(w-110)/2), plateY=h-68;
  return Object.freeze({width,height,portrait,scene:rect(0,0,w,h),title:rect(12,Math.max(13,cabinetTop-Math.min(w*.245,96)-58),w-24,41),
    wheel:rect(w*.11,cabinetTop-Math.min(w*.245,96),w*.78,Math.min(w*.245,96)-3),cabinet:rect(margin,cabinetTop,cabinetWidth,cabinetHeight),
    controls:Object.freeze({spin:rect(centre-spinSize/2,controlsY,spinSize,spinSize),
      auto:rect(Math.max(5,centre-135),controlsY+13,aux,aux),take:rect(Math.min(w-53,centre+87),controlsY+13,aux,aux),
      quick:rect(centre+38,controlsY+16,44,44),double:rect(centre-82,controlsY+16,44,44),
      menu:rect(3,h-53,44,44),sound:rect(w-47,h-53,44,44),
      balance:rect(49,plateY,plateWidth,44),bet:rect(w-49-plateWidth,plateY,plateWidth,44)}),
    balance:rect(49,plateY,plateWidth,44),bet:rect(w-49-plateWidth,plateY,plateWidth,44),
    win:rect(centre-72,controlsY+77,144,16)});
}

export function reelRectangles(layout) {
  const b=layout.cabinet,pad=Math.max(3,b.width*.007),w=(b.width-2*pad)/5;
  return Array.from({length:5},(_,column)=>rect(b.x+pad+column*w,b.y+pad,w,b.height-pad*2));
}
