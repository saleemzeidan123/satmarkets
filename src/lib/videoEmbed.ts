// Turns a lister-provided video URL into a safe way to show it. We only ever embed
// (iframe) known video providers via their official embed origins; a direct video
// file is played with a <video> element; anything else becomes a plain link. We
// never iframe an arbitrary URL, which would let a pasted link run in our origin.

export type VideoEmbed =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo"; embedUrl: string }
  | { kind: "file"; src: string }
  | { kind: "link"; href: string }
  | null;

export function videoEmbed(raw: string | null | undefined): VideoEmbed {
  if (!raw) return null;
  const url = String(raw).trim();
  if (!/^https?:\/\//i.test(url)) return null;
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }

  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (m) return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${m[1]}` };
  }
  if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
    if (m) return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${m[1]}` };
  }
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
    return { kind: "file", src: url };
  }
  // Known but unparsed, or any other host: a safe outbound link, never an iframe.
  return { kind: "link", href: url };
}
