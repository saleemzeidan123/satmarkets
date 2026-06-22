const Q = "?auto=format&fit=crop&w=900&q=72";
const SETS: Record<string, string[]> = {
  office: ["1486406146926-c627a92ad1ab","1497366754035-f200968a6e72","1497366811353-6870744d04b2","1431540015161-0bf868a2d407"],
  retail: ["1441986300917-64674bd600d8","1567401893414-76b7b1e5a7a5","1604719312566-8912e9227c6a","1555529669-e69e7aa0ba9a"],
  medical: ["1519494026892-80bbd2d6fd0d","1538108149393-fbbd81895907","1576091160550-2173dba999ef","1629909613654-28e377c37b09"],
  showroom: ["1567958451986-2de427a4a0be","1562519819-016930ada31c","1604328698692-f76ea9498e76","1503602642458-232111445657"],
  warehouse: ["1553413077-190dd305871c","1601598851547-4302969d0614","1586528116311-ad8dd3c8310d","1581094794329-c8112a89af12"],
  serviced: ["1604328698692-f76ea9498e76","1497366811353-6870744d04b2","1524758631624-e2822e304c36","1542744173-8e7e53415bb0"],
  education: ["1562774053-701939374585","1503676260728-1c00da094a0b","1592280771190-3e2e4d571952","1541339907198-e08756dedf3f"],
  land: ["1500382017468-9049fed747ef","1466692476868-aef1dfb1e735","1501594907352-04cda38ebc29","1470770841072-f978cf4d019e"]
};
function hash(s: string) { let h = 0; for (let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0; return h; }
export function photoFor(asset: string, seed: string): string {
  const set = SETS[asset] || SETS.office;
  return `https://images.unsplash.com/photo-${set[hash(seed) % set.length]}${Q}`;
}
export function galleryFor(asset: string, seed: string): string[] {
  const set = SETS[asset] || SETS.office;
  const start = hash(seed) % set.length;
  return [0,1,2].map((i)=> `https://images.unsplash.com/photo-${set[(start+i)%set.length]}${Q}`);
}
