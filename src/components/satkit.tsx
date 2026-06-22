import React from "react";

export const HARBOR = "#3A6EA5", AZURE = "#2E5FE0", INK = "#14181B", COOL = "#F6F8FB";

type Rs = [number, number, number, number];
function buildParcel(base?: string, lit?: string, litPos?: string) {
  base = base || COOL; lit = lit || HARBOR; litPos = litPos || "tr";
  const p = 7, foot = 100 - 2 * p, vx = 0.40 * foot, hy = 0.58 * foot, st = 0.05 * foot, R = 10, ir = 2.5;
  const f = (v: number) => Math.round(v * 1000) / 1000;
  const rr = (x: number, y: number, w: number, h: number, rs: Rs, fill: string) => {
    const [tl, tr, br, bl] = rs;
    const d = `M${f(x+tl)} ${f(y)}H${f(x+w-tr)}A${f(tr)} ${f(tr)} 0 0 1 ${f(x+w)} ${f(y+tr)}`
      + `V${f(y+h-br)}A${f(br)} ${f(br)} 0 0 1 ${f(x+w-br)} ${f(y+h)}`
      + `H${f(x+bl)}A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y+h-bl)}`
      + `V${f(y+tl)}A${f(tl)} ${f(tl)} 0 0 1 ${f(x+tl)} ${f(y)}Z`;
    return <path key={x + "-" + y} d={d} fill={fill} />;
  };
  const w1 = vx - st/2, w2 = foot - vx - st/2, h1 = hy - st/2, h2 = foot - hy - st/2, X = p, Y = p;
  const cells: Record<string, [number, number, number, number, Rs]> = {
    tl: [X, Y, w1, h1, [R, ir, ir, ir]],
    tr: [X+vx+st/2, Y, w2, h1, [ir, R, ir, ir]],
    bl: [X, Y+hy+st/2, w1, h2, [ir, ir, ir, R]],
    br: [X+vx+st/2, Y+hy+st/2, w2, h2, [ir, ir, R, ir]],
  };
  return Object.keys(cells).map((k) => {
    const c = cells[k];
    return rr(c[0], c[1], c[2], c[3], c[4], k === litPos ? (lit as string) : (base as string));
  });
}

export function Mark({ size = 28, base, lit, litPos, style }: { size?: number; base?: string; lit?: string; litPos?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ flex: "none", display: "block", ...style }}>
      {buildParcel(base, lit, litPos)}
    </svg>
  );
}

export function Logo({ size = 28, rev = false, lg = false, base, lit }: { size?: number; rev?: boolean; lg?: boolean; base?: string; lit?: string }) {
  const blue = lit || HARBOR;
  const s = lg ? size * 1.12 : size;
  const fontPx = s * 0.48;
  const markBase = base || (rev ? COOL : INK);
  return (
    <div className="logo">
      <svg viewBox="0 0 100 100" width={Math.round(s * 1.04)} height={Math.round(s * 1.04)} style={{ flex: "none", display: "block" }}>{buildParcel(markBase, blue, "tr")}</svg>
      <div className="wm" style={{ lineHeight: 1.0 }}>
        <span className="s1" style={{ fontFamily: '"Playfair Display",Georgia,serif', fontWeight: 800, fontSize: fontPx, color: blue, letterSpacing: ".01em" }}>SAT</span>
        <span className="s2" style={{ fontFamily: '"Playfair Display",Georgia,serif', fontWeight: 800, fontSize: fontPx, textTransform: "uppercase", color: rev ? "var(--cool)" : "var(--ink)", letterSpacing: ".01em" }}>MARKETS</span>
      </div>
    </div>
  );
}

type IcP = { size?: number; sw?: number; fill?: string; stroke?: string };
function Ic({ size = 18, sw = 1.6, fill = "none", stroke = "currentColor", children, vb = 24 }: IcP & { children?: React.ReactNode; vb?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
      {children}
    </svg>
  );
}
export const Icon: Record<string, (p: IcP) => JSX.Element> = {
  search: (p) => <Ic {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Ic>,
  pin: (p) => <Ic {...p}><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></Ic>,
  heart: (p) => <Ic {...p}><path d="M12 20s-7-4.3-7-9.5A4 4 0 0112 8a4 4 0 017-2.5C19 10.7 12 20 12 20z" /></Ic>,
  check: (p) => <Ic {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Ic>,
  arrow: (p) => <Ic {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Ic>,
  chevd: (p) => <Ic {...p}><path d="M6 9l6 6 6-6" /></Ic>,
  store: (p) => <Ic {...p}><path d="M4 9l1.2-4h13.6L20 9M5 9v10h14V9M4 9h16" /></Ic>,
  download: (p) => <Ic {...p}><path d="M12 4v10M8 11l4 4 4-4M5 19h14" /></Ic>,
  grid: (p) => <Ic {...p}><rect x="4" y="4" width="7" height="7" rx="1.4" /><rect x="13" y="4" width="7" height="7" rx="1.4" /><rect x="4" y="13" width="7" height="7" rx="1.4" /><rect x="13" y="13" width="7" height="7" rx="1.4" /></Ic>,
  building: (p) => <Ic {...p}><rect x="5" y="3" width="14" height="18" rx="1.4" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /></Ic>,
  bolt: (p) => <Ic {...p}><path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" /></Ic>,
  spark: (p) => <Ic {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /></Ic>,
  chart: (p) => <Ic {...p}><path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-7" /></Ic>,
  user: (p) => <Ic {...p}><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></Ic>,
  doc: (p) => <Ic {...p}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></Ic>,
  cal: (p) => <Ic {...p}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M9 3v4M15 3v4" /></Ic>,
  star: (p) => <Ic {...p}><path d="M12 4l2.3 5 5.5.5-4.2 3.6 1.3 5.4L12 17l-4.7 3 1.3-5.4L4.4 9.5 9.9 9 12 4z" /></Ic>,
  shield: (p) => <Ic {...p}><path d="M12 3l7 3v6c0 4-3 6.6-7 8-4-1.4-7-4-7-8V6l7-3z" /><path d="M9 12l2 2 4-4" /></Ic>,
  coins: (p) => <Ic {...p}><ellipse cx="12" cy="6.5" rx="7" ry="3" /><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /><path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></Ic>,
  target: (p) => <Ic {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.6" /></Ic>,
  msg: (p) => <Ic {...p}><path d="M4 5h16v11H8l-4 4V5z" /></Ic>,
  headset: (p) => <Ic {...p}><path d="M5 13a7 7 0 0114 0M4 13h3v5H5a1 1 0 01-1-1v-4zM20 13h-3v5h2a1 1 0 001-1v-4zM12 20h3" /></Ic>,
  phone: (p) => <Ic {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L19 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" /></Ic>,
};

export function Ph({ src, label, h = 158, dark = false, style, badges, children }: { src?: string; label?: string; h?: number; dark?: boolean; style?: React.CSSProperties; badges?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className={"ph" + (dark ? " dark" : "")} style={{ height: h, position: "relative", overflow: "hidden", ...style }}>
      {src && <img alt="" loading="lazy" src={src} />}{badges && <div className="badges">{badges}</div>}
      {label && <div className="cap">{label}</div>}
      {children}
    </div>
  );
}

export function Verified({ text = "Verified owner" }: { text?: string }) {
  return <span className="verified"><span className="dot" />{text}</span>;
}

export function Photo({ src, kind = "office", label, h = 158, style, badges, fav, children }: { src?: string; kind?: string; label?: string; h?: number; style?: React.CSSProperties; badges?: React.ReactNode; fav?: boolean; children?: React.ReactNode }) {
  const grad = (({
    office: "linear-gradient(165deg,#33455c,#5d7186 58%,#a9b9cb)",
    retail: "linear-gradient(165deg,#5b4a44,#8d7560 58%,#c9b6a1)",
    warehouse: "linear-gradient(165deg,#3a414c,#5a6473 58%,#9aa6b6)",
    city: "linear-gradient(165deg,#1d2a39,#3a5a7c 52%,#86a2c0)",
    interior: "linear-gradient(165deg,#4a4f57,#7d8794 58%,#cdd4dc)",
  } as Record<string, string>)[kind]) || "linear-gradient(165deg,#33455c,#5d7186 58%,#a9b9cb)";
  const bands = (({
    office: [[6, 30, 22], [34, 22, 30], [60, 34, 18], [80, 16, 26]],
    city: [[4, 18, 34], [26, 26, 22], [56, 16, 40], [76, 28, 28]],
    warehouse: [[0, 100, 22]],
    retail: [[0, 100, 16]],
    interior: [],
  } as Record<string, number[][]>)[kind]) || [[6, 30, 22], [34, 22, 30], [60, 34, 18], [80, 16, 26]];
  return (
    <div className="photo" style={{ height: h, ...style }}>
      <div className="sky" style={{ background: grad }} />
      {src && <img alt="" loading="lazy" src={src} />}
      {bands.map((b, i) => <div key={i} className="band" style={{ left: b[0] + "%", width: b[1] + "%", height: b[2] + "%" }} />)}
      <div className="grid" />
      <div className="vig" />
      {badges && <div className="badges">{badges}</div>}
      {fav && <span className="fav"><Icon.heart size={15} /></span>}
      {label && <div className="cap">{label}</div>}
      {children}
    </div>
  );
}

export function MarkPin({ price, featured, muted, style }: { price?: string; featured?: boolean; muted?: boolean; style?: React.CSSProperties }) {
  return (
    <div className={"markpin" + (featured ? " feat" : "") + (muted ? " muted" : "")} style={style}>
      {featured && <span className="glow" />}
      <div className="body">
        <Mark size={16} base={featured ? COOL : INK} lit={HARBOR} />
        {price && <span className="price">{price}</span>}
      </div>
      <span className="tip" />
    </div>
  );
}
