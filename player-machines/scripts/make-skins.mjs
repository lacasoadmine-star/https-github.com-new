import {writeFile} from 'node:fs/promises';
const defs=`<defs>
 <linearGradient id="gold" x2=".8" y2="1"><stop stop-color="#fff9b4"/><stop offset=".16" stop-color="#dbb45b"/><stop offset=".32" stop-color="#f1df85"/><stop offset=".46" stop-color="#766523"/><stop offset=".7" stop-color="#d5b552"/><stop offset=".86" stop-color="#fff0a2"/><stop offset="1" stop-color="#76622a"/></linearGradient>
 <linearGradient id="pink" x2=".3" y2="1"><stop stop-color="#ff79ae"/><stop offset=".13" stop-color="#ed075a"/><stop offset=".48" stop-color="#7b092e"/><stop offset=".75" stop-color="#c8174a"/><stop offset="1" stop-color="#fa165e"/></linearGradient>
 <linearGradient id="green" x2=".3" y2="1"><stop stop-color="#09684b"/><stop offset=".36" stop-color="#00553e"/><stop offset="1" stop-color="#003b2e"/></linearGradient>
 <linearGradient id="shine" x2="0" y2="1"><stop stop-color="#d2ffca"/><stop offset=".25" stop-color="#2f9878"/><stop offset=".5" stop-color="#084b39"/><stop offset="1" stop-color="#126c4e"/></linearGradient>
 <linearGradient id="circle" x2=".2" y2="1"><stop stop-color="#1b9971"/><stop offset=".36" stop-color="#14815e"/><stop offset="1" stop-color="#075046"/></linearGradient>
 <pattern id="grain" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".45" fill="#b7f8bf" opacity=".13"/><circle cx="4" cy="4" r=".45" fill="#001d21" opacity=".3"/></pattern>
 </defs>`;
const svg=(box,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${defs}${body}</svg>`;
const oct='M44 8Q50 4 59 4H164Q173 4 179 9L216 36Q222 42 219 53L194 164Q191 175 182 184L173 193H48L37 182Q31 176 29 164L5 53Q2 43 8 37Z';
await writeFile(new URL('../public/spin-multi.svg',import.meta.url),svg('0 0 224 202',`
 <path d="${oct}" fill="#092c24" stroke="#00231c" stroke-width="7"/>
 <path d="${oct}" fill="url(#gold)" stroke="#776329" stroke-width="2"/>
 <path d="${oct}" transform="translate(5 4) scale(.955 .96)" fill="url(#pink)" stroke="#ff9fc0" stroke-width="1.8"/>
 <path d="${oct}" transform="translate(12 10) scale(.895 .90)" fill="#721133" stroke="#b51e4c" stroke-width="2"/>
 <path d="${oct}" transform="translate(17 15) scale(.85 .85)" fill="url(#shine)" stroke="#d1eec6" stroke-width="2.2"/>
 <path d="${oct}" transform="translate(20 20) scale(.825 .81)" fill="url(#green)" stroke="#0a3d2d" stroke-width="2.4"/>
 <path d="${oct}" transform="translate(20 20) scale(.825 .81)" fill="url(#grain)"/>
 `));
const hex='M56 4Q60 2 64 4L110 28Q114 30 114 35V91Q114 95 110 97L64 121Q60 123 56 121L10 97Q6 95 6 91V35Q6 30 10 28Z';
await writeFile(new URL('../public/hex-control.svg',import.meta.url),svg('0 0 120 126',`
 <path d="${hex}" stroke="#003729" stroke-width="7" fill="url(#gold)"/>
 <path d="${hex}" stroke="url(#gold)" stroke-width="2" fill="url(#gold)"/>
 <path d="${hex}" transform="translate(4 4) scale(.935)" stroke="#197052" stroke-width="1.5" fill="url(#shine)"/>
 <path d="${hex}" transform="translate(7 7) scale(.885)" stroke="#003a2c" stroke-width="2" fill="url(#green)"/>
 <path d="${hex}" transform="translate(7 7) scale(.885)" fill="url(#grain)"/>`));
await writeFile(new URL('../public/spin-foxy.svg',import.meta.url),svg('0 0 160 160',`
 <circle cx="80" cy="80" r="77" fill="#003a2b" stroke="#006c43" stroke-width="4"/>
 <circle cx="80" cy="80" r="74" fill="url(#circle)" stroke="url(#gold)" stroke-width="1.8"/>
 <circle cx="80" cy="80" r="71" fill="url(#circle)" stroke="#73c7a2" stroke-width="1.5"/>
 <circle cx="80" cy="80" r="68" fill="url(#circle)" stroke="#05634c" stroke-width="1"/>
 <circle cx="80" cy="80" r="68" fill="url(#grain)" opacity=".4"/>`));
await writeFile(new URL('../public/stake-bar.svg',import.meta.url),svg('0 0 420 108',`
 <rect x="4" y="8" width="412" height="93" rx="36" fill="#004b36" stroke="#006f43" stroke-width="4"/>
 <rect x="8" y="11" width="404" height="87" rx="32" fill="url(#shine)" stroke="url(#gold)" stroke-width="2"/>
 <rect x="14" y="16" width="392" height="76" rx="29" fill="#075443" stroke="#6caf74" stroke-width="2"/>
 <rect x="18" y="20" width="384" height="68" rx="25" fill="#073931" stroke="#002a20" stroke-width="2"/>
 <rect x="18" y="20" width="384" height="68" rx="25" fill="url(#grain)"/>
 <path d="M14 42l-5 3v22l5 3M406 42l5 3v22l-5 3" fill="none" stroke="url(#gold)" stroke-width="3"/>`));
console.log('Generated four vector control surfaces');
