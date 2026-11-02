import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

// Original vector artwork; no external images or runtime service.
const nodes = [
  [760, 170, 'Neural networks'], [998, 130, 'Mathematics'],
  [1090, 280, 'Computing history'], [855, 345, 'Distributed systems'],
  [1035, 480, 'Design'], [740, 520, 'Language'],
];
const twigs = nodes.flatMap(([x, y], i) => Array.from({ length: 4 }, (_, j) => {
  const angle = i * 1.7 + j * 1.9;
  const tx = x + Math.cos(angle) * (45 + j * 9);
  const ty = y + Math.sin(angle) * (40 + j * 6);
  return `<path d="M${x} ${y}Q${x} ${ty} ${tx} ${ty}" fill="none" stroke="#4c6e7c" stroke-width="1"/><circle cx="${tx}" cy="${ty}" r="2.5" fill="#6e929d"/>`;
})).join('');
const branches = nodes.map(([x,y,label],i) => `<path d="M660 300C${750+i*20} 300 ${x-95} ${y} ${x} ${y}" fill="none" stroke="${i===3?'#e6b56f':'#526f80'}" stroke-width="${i===3?3:1.5}"/><circle cx="${x}" cy="${y}" r="6" fill="${i===3?'#e6b56f':'#94c4f0'}"/><text x="${x}" y="${y+30}" fill="#c6d7df" text-anchor="middle" font-size="15">${label}</text>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#10242d"/>
<g font-family="Arial, sans-serif">
<g stroke="#94c4f0" stroke-width="3" fill="none"><path d="M65 101V57M65 85C65 62 101 80 101 52M65 101C65 81 99 98 99 75"/><circle cx="65" cy="55" r="4"/><circle cx="101" cy="51" r="4"/><circle cx="99" cy="74" r="4"/></g>
<text x="119" y="88" fill="#edf4f5" font-size="38" font-weight="600" letter-spacing="-1.5">offbranch.</text>
<text x="62" y="245" fill="#edf4f5" font-size="68" font-weight="600" letter-spacing="-3">Find a talk.</text>
<text x="62" y="322" fill="#edf4f5" font-size="68" font-weight="600" letter-spacing="-3">Follow an idea.</text>
<text x="65" y="385" fill="#9bb1ba" font-size="21">6,454 videos. A thousand ways in.</text>
<rect x="64" y="435" width="390" height="58" rx="11" fill="#1c3540" stroke="#45616e"/>
<circle cx="91" cy="462" r="7" fill="none" stroke="#9bb1ba" stroke-width="2"/><path d="M96 468l6 6" stroke="#9bb1ba" stroke-width="2"/>
<text x="120" y="470" fill="#b3c6cd" font-size="17">What are you curious about?</text>
<text x="65" y="576" fill="#9bb1ba" font-size="14">A new way into the HackerTube collection · TheSyBuilder</text>
${twigs}${branches}
<circle cx="660" cy="300" r="22" fill="#1c3540" stroke="#e6b56f" stroke-width="2"/>
<circle cx="660" cy="300" r="5" fill="#e6b56f"/>
</g></svg>`;
writeFileSync('public/social.svg', svg);
writeFileSync('public/social.png', new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } }).render().asPng());
console.log('Created public/social.png and its editable SVG source.');
