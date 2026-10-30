// Presentation only. The existing game controller supplies the settled amount.
const banner=document.getElementById('result-banner'),frame=document.getElementById('game-frame');
if(banner&&frame){frame.append(banner);banner.classList.add('settled-plaque');}
const icons={wallet:'M4 6h15v13H4z M4 6V3h12v3 M15 11h5v5h-5z',win:'M7 3h10v7a5 5 0 0 1-10 0z M7 5H3v3a4 4 0 0 0 4 4 M17 5h4v3a4 4 0 0 1-4 4 M12 15v5 M8 21h8',multiplier:'M7 7l10 10 M17 7 7 17'};
document.querySelectorAll('.meter-icon').forEach((node,i)=>{const path=Object.values(icons)[i];if(path)node.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;});
