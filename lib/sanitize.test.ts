// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { sanitizeComment, sanitizeHtml } from "./sanitize";
import { sanitizePostHtml } from "./sanitize-server";

const ATTACKS = [
  `<img src=x onerror="alert(1)">`,
  `<script>alert(1)</script>`,
  `<a href="javascript:alert(1)">x</a>`,
  `<iframe src="https://evil.example"></iframe>`,
  `<div style="background:url(javascript:alert(1))">x</div>`,
  `<svg><script>alert(1)</script></svg>`,
];

describe.each([
  ["sanitizeHtml (browser)", sanitizeHtml],
  ["sanitizePostHtml (server)", sanitizePostHtml],
])("%s", (_name, sanitize) => {
  test.each(ATTACKS)("strips %s", (dirty) => {
    const clean = sanitize(dirty);
    expect(clean).not.toMatch(/onerror|<script|javascript:|<iframe/i);
  });

  test("keeps the post markup it allows", () => {
    const html = `<h2>Title</h2><p><strong>Bold</strong> and <code>code</code></p><pre data-type="file-code-block" data-filename="a.ts"><code>const a = 1;</code></pre>`;
    const clean = sanitize(html);
    expect(clean).toContain("<h2>Title</h2>");
    expect(clean).toContain("<strong>Bold</strong>");
    expect(clean).toContain('data-type="file-code-block"');
  });
});

describe("inline styles", () => {
  test("keep alignment and code colours, drop the rest", () => {
    const html = `<p style="text-align: center; position: fixed; top: 0">x</p><span style="color:#111;--shiki-dark:#eee">y</span>`;
    for (const clean of [sanitizeHtml(html), sanitizePostHtml(html)]) {
      expect(clean).toContain('style="text-align: center"');
      expect(clean).toContain('style="color:#111; --shiki-dark:#eee"');
      expect(clean).not.toContain("position");
    }
  });
});

describe("sanitizeComment", () => {
  test("keeps only basic prose", () => {
    expect(sanitizeComment(`<p>Hi <a href="https://x.y">there</a> <strong>you</strong></p>`)).toBe(
      "<p>Hi there <strong>you</strong></p>"
    );
  });
});
