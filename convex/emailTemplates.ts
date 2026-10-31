const BLOG_URL = "https://thewebroom.alxpro.com";
const SUPPORT_EMAIL = "alxpro.dev@gmail.com";
const GUIDELINES_URL = `${BLOG_URL}/terms-and-conditions`;

// The site's minimal look in e-mail: white, black type, grey text, one black button.
const INK = "#000000";
const TEXT = "#666666";
const MUTED = "#A0A0A0";
const LINE = "#EAEAEA";
const RED = "#CB2A2E";
const GREEN = "#3FA35B";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

type EmailContent = {
  subject: string;
  body: string;
  html: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function btn(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;margin:8px 0 24px;padding:11px 22px;background:${INK};color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:500;font-family:${FONT};">${label}</a>`;
}

function lnk(href: string, label: string): string {
  return `<a href="${esc(href)}" style="color:${INK};text-decoration:underline;">${label}</a>`;
}

function strong(text: string): string {
  return `<span style="color:${INK};font-weight:500;">${text}</span>`;
}

// A short note set apart by a thin coloured line, instead of a coloured box.
function note(color: string, text: string): string {
  return `<p style="margin:20px 0;padding-left:12px;border-left:2px solid ${color};font-size:14px;color:${TEXT};line-height:1.6;font-family:${FONT};">${text}</p>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;color:${TEXT};line-height:1.6;font-family:${FONT};">${text}</p>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:${INK};letter-spacing:-0.01em;font-family:${FONT};line-height:1.3;">${text}</h1>`;
}

function code(value: string): string {
  return `<p style="margin:8px 0 24px;font-size:32px;font-weight:600;letter-spacing:10px;color:${INK};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${esc(value)}</p>`;
}

function wrap(previewText: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(previewText)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <div style="display:none;max-height:0;overflow:hidden;">${esc(previewText)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <tr>
            <td style="padding:0 0 32px;font-size:14px;font-weight:600;color:${INK};font-family:${FONT};">The Web Room</td>
          </tr>
          <tr>
            <td>${content}</td>
          </tr>
          <tr>
            <td style="padding-top:32px;border-top:1px solid ${LINE};font-size:12px;color:${MUTED};line-height:1.6;font-family:${FONT};">
              <a href="${BLOG_URL}" style="color:${MUTED};text-decoration:none;">thewebroom.alxpro.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email Verification ───────────────────────────────────────────────────────

export function buildEmailVerificationEmail(params: {
  email: string;
  verificationLink: string;
}): EmailContent {
  const subject = "Confirm your e-mail — The Web Room";
  const content = `
    ${h1("Confirm your e-mail")}
    ${p("One click confirms this address for your account.")}
    ${btn(params.verificationLink, "Confirm")}
    ${p(`The link works for 1 hour. Didn't ask for this? Ignore this e-mail.`)}`;

  return {
    subject,
    html: wrap(subject, content),
    body: [
      "Confirm this e-mail address for your account on The Web Room:",
      "",
      params.verificationLink,
      "",
      "The link works for 1 hour. Didn't ask for this? Ignore this e-mail.",
    ].join("\n"),
  };
}

// ── Password Reset ────────────────────────────────────────────────────────────

export function buildPasswordResetEmail(params: {
  email: string;
  otp: string;
  resetLink: string;
}): EmailContent {
  const subject = "Your reset code — The Web Room";
  const content = `
    ${h1("Reset your password")}
    ${p("Your code:")}
    ${code(params.otp)}
    ${p(`Enter it on the ${lnk(params.resetLink, "reset page")}. It works once, for 15 minutes.`)}
    ${p("Didn't ask for this? Ignore this e-mail; your password stays the same.")}`;

  return {
    subject,
    html: wrap(`Your reset code: ${params.otp}`, content),
    body: [
      `Your reset code for The Web Room: ${params.otp}`,
      "",
      `Enter it here: ${params.resetLink}`,
      "It works once, for 15 minutes.",
      "",
      "Didn't ask for this? Ignore this e-mail; your password stays the same.",
    ].join("\n"),
  };
}

// ── Banned ────────────────────────────────────────────────────────────────────

export function buildBannedUserEmail(params: { email: string; reason?: string }): EmailContent {
  const subject = "Your account is closed — The Web Room";
  const reason = params.reason?.trim() || "A breach of the community guidelines.";
  const content = `
    ${h1("Your account is closed")}
    ${p("After review, your account was closed for good. You can't sign in or sign up again with this address.")}
    ${note(RED, `${strong("Reason")}<br/>${esc(reason)}`)}
    ${p(`Think it's a mistake? Write to ${lnk(`mailto:${SUPPORT_EMAIL}`, SUPPORT_EMAIL)} from this address.`)}`;

  return {
    subject,
    html: wrap("Your account on The Web Room is closed.", content),
    body: [
      "Your account on The Web Room was closed for good after review.",
      `Reason: ${reason}`,
      "",
      "You can't sign in or sign up again with this address.",
      `Think it's a mistake? Write to ${SUPPORT_EMAIL} from this address.`,
    ].join("\n"),
  };
}

// ── Post hidden ───────────────────────────────────────────────────────────────

export function buildPostHiddenWarningEmail(params: {
  name: string;
  email: string;
  postTitle: string;
  editLink: string;
}): EmailContent {
  const title = params.postTitle.trim() || "your post";
  const subject = "Your post is hidden — The Web Room";
  const content = `
    ${h1("Your post is hidden")}
    ${p(`Hi ${esc(params.name ?? "there")}, ${strong(`“${esc(title)}”`)} was hidden after a report: something in it doesn't follow the ${lnk(GUIDELINES_URL, "guidelines")}.`)}
    ${note(RED, "Readers can't see it until you edit it and it's reviewed again.")}
    ${btn(params.editLink, "Edit post")}
    ${p("Repeated breaches can close the account.")}`;

  return {
    subject,
    html: wrap(`"${title}" is hidden until you edit it.`, content),
    body: [
      `Hi ${params.name ?? "there"}, "${title}" was hidden after a report.`,
      "Readers can't see it until you edit it and it's reviewed again.",
      "",
      `Edit it: ${params.editLink}`,
      `Guidelines: ${GUIDELINES_URL}`,
      "",
      "Repeated breaches can close the account.",
    ].join("\n"),
  };
}

// ── Post deleted ──────────────────────────────────────────────────────────────

export function buildPostDeletedWarningEmail(params: {
  name: string;
  email: string;
  postTitle: string;
}): EmailContent {
  const title = params.postTitle.trim() || "your post";
  const subject = "Your post was deleted — The Web Room";
  const content = `
    ${h1("Your post was deleted")}
    ${p(`Hi ${esc(params.name ?? "there")}, ${strong(`“${esc(title)}”`)} broke the ${lnk(GUIDELINES_URL, "guidelines")} and was deleted. It can't be restored.`)}
    ${note(RED, "This is a warning. Another breach can close the account.")}
    ${p(`Think it's a mistake? Write to ${lnk(`mailto:${SUPPORT_EMAIL}`, SUPPORT_EMAIL)} with the title.`)}`;

  return {
    subject,
    html: wrap(`"${title}" was deleted.`, content),
    body: [
      `Hi ${params.name ?? "there"}, "${title}" broke the guidelines and was deleted. It can't be restored.`,
      "This is a warning. Another breach can close the account.",
      "",
      `Guidelines: ${GUIDELINES_URL}`,
      `Think it's a mistake? Write to ${SUPPORT_EMAIL} with the title.`,
    ].join("\n"),
  };
}

// ── Post visible again ────────────────────────────────────────────────────────

export function buildPostPublishedNoticeEmail(params: {
  name: string;
  email: string;
  postTitle: string;
  postLink: string;
}): EmailContent {
  const title = params.postTitle.trim() || "your post";
  const subject = "Your post is back — The Web Room";
  const content = `
    ${h1("Your post is back")}
    ${p(`Hi ${esc(params.name ?? "there")}, ${strong(`“${esc(title)}”`)} was reviewed and is visible again.`)}
    ${note(GREEN, "Readers can see it now.")}
    ${btn(params.postLink, "View post")}`;

  return {
    subject,
    html: wrap(`"${title}" is visible again.`, content),
    body: [
      `Hi ${params.name ?? "there"}, "${title}" was reviewed and is visible again.`,
      "",
      `View it: ${params.postLink}`,
    ].join("\n"),
  };
}
