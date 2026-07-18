import { test } from "node:test";
import assert from "node:assert";
import { videoEmbed } from "./videoEmbed";

test("YouTube watch, short, youtu.be and shorts links become the embed origin", () => {
  assert.deepEqual(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), { kind: "youtube", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
  assert.deepEqual(videoEmbed("https://youtu.be/dQw4w9WgXcQ"), { kind: "youtube", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
  assert.deepEqual(videoEmbed("https://www.youtube.com/shorts/dQw4w9WgXcQ"), { kind: "youtube", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
});

test("Vimeo links become the player origin", () => {
  assert.deepEqual(videoEmbed("https://vimeo.com/123456789"), { kind: "vimeo", embedUrl: "https://player.vimeo.com/video/123456789" });
  assert.deepEqual(videoEmbed("https://vimeo.com/video/123456789"), { kind: "vimeo", embedUrl: "https://player.vimeo.com/video/123456789" });
});

test("a direct video file is played, not embedded", () => {
  assert.deepEqual(videoEmbed("https://cdn.example.com/tour.mp4"), { kind: "file", src: "https://cdn.example.com/tour.mp4" });
  assert.deepEqual(videoEmbed("https://cdn.example.com/tour.webm?token=1"), { kind: "file", src: "https://cdn.example.com/tour.webm?token=1" });
});

test("an arbitrary URL is a plain link, never an iframe", () => {
  const r = videoEmbed("https://evil.example.com/watch");
  assert.deepEqual(r, { kind: "link", href: "https://evil.example.com/watch" });
});

test("empty, non-URL, or malformed input returns null", () => {
  assert.equal(videoEmbed(""), null);
  assert.equal(videoEmbed(null), null);
  assert.equal(videoEmbed("just some text"), null);
  assert.equal(videoEmbed("ftp://x/y.mp4"), null);
});

test("a lookalike host is not treated as YouTube", () => {
  // youtube.com.evil.com must not match as YouTube
  const r = videoEmbed("https://youtube.com.evil.com/watch?v=abcdef");
  assert.equal(r?.kind, "link");
});
