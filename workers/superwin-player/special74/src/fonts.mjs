// Provider fonts observed loading in the official Burning Ice 40 demo, then
// restored locally using the source URLs and hashes in media-manifest.json.
export async function loadReferenceFonts(){
 const faces=[
  new FontFace('IntroBlackCaps','url(/special-games/assets/Fonts/Intro/Intro-Black-Caps.otf)'),
  new FontFace('IntroRegular','url(/special-games/assets/Fonts/Intro/Intro-Regular.otf)')
 ];
 await Promise.all(faces.map(async face=>{await face.load();document.fonts.add(face);}));
}
