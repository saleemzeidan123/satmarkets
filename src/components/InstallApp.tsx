"use client";
// PKG-PWA-2. The platform has been installable for some time: the manifest,
// the icons and the standalone display mode were all in place, and a browser
// asked directly reports no installability error. What was missing is that
// nothing on any page said so. A reader had to know to look in the browser's
// own menu.
//
// This offers the install where the browser allows a page to offer it, and
// says how where it does not:
//
//   - Chromium browsers (Android, desktop) raise `beforeinstallprompt` when the
//     app can be installed. The event is kept and the button replays it.
//   - Safari on iPhone and iPad has no such event. The only route is the Share
//     menu, so those readers are told that in one line.
//   - Already installed, or any other browser: nothing is rendered. A button
//     that cannot act would be a claim the page cannot keep.
import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

const noSubscription = () => () => {};

/** Runs in the browser only. True on an iPhone or iPad that is not already running the installed app. */
function needsIosHint(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const standalone = nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  // iPadOS reports itself as a Mac; the touch points tell them apart.
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
  return ios && !standalone;
}

export default function InstallApp({ label, iosHint }: { label: string; iosHint: string }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const ios = useSyncExternalStore(noSubscription, needsIosHint, () => false);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPromptEvent); };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (prompt) {
    return (
      <div className="foot-app">
        <button type="button" className="foot-install" onClick={async () => { await prompt.prompt(); setPrompt(null); }}>{label}</button>
      </div>
    );
  }
  if (ios) return <div className="foot-app"><p className="foot-install-hint">{iosHint}</p></div>;
  return null;
}
