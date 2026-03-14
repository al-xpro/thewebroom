const BLOG_URL = "https://thewebroom.vercel.app";
const SUPPORT_EMAIL = "alxpro.dev@gmail.com";
const GUIDELINES_URL = `${BLOG_URL}/terms-and-conditions`;
const CURRENT_YEAR = new Date().getFullYear();

const COLOR_LINK = "#FF3400";
const COLOR_TEXT = "#666666";
const COLOR_HEADING = "#111827";
const COLOR_MUTED = "#9ca3af";
const COLOR_BUTTON_BG = "#FFEDE8";
const COLOR_BUTTON_TEXT = "#FF3400";
const COLOR_BUTTON_BORDER = "#FF3400";

const LOGO_IMG = `<img src="${BLOG_URL}/logo.png" width="70" height="70" style="display:inline-block; alt="The Web Room" />`;

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

// Button: ghost style with brand color
function btn(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;margin:8px 0 20px;padding:12px 28px;background:${COLOR_BUTTON_BG};color:${COLOR_BUTTON_TEXT};text-decoration:none;border-radius:8px;border:1px solid ${COLOR_BUTTON_BORDER};font-size:14px;font-weight:600;font-family:Arial,sans-serif;">${label}</a>`;
}

// Link: brand color, no underline
function lnk(href: string, label: string): string {
  return `<a href="${esc(href)}" style="color:${COLOR_LINK};text-decoration:none;">${label}</a>`;
}

// Bold: explicit span so it only bolds the word, not the whole paragraph
function bold(text: string): string {
  return `<span style="font-weight:700;color:${COLOR_HEADING};">${text}</span>`;
}

function infoBox(
  color: { bg: string; border: string; labelColor: string },
  label: string,
  body: string
): string {
  return `<div style="background:${color.bg};border:1px solid ${color.border};border-radius:8px;padding:16px 20px;margin:20px 0;"><p style="margin:0 0 6px;font-size:17px;font-weight:700;color:${color.labelColor};font-family:Arial,sans-serif;">${label}</p><p style="margin:0;font-size:14px;color:${COLOR_TEXT};line-height:1.6;font-family:Arial,sans-serif;">${body}</p></div>`;
}

function listBox(items: string[]): string {
  const rows = items
    .map(
      (item) =>
        `<p style="margin:0 0 8px;font-size:14px;color:${COLOR_TEXT};line-height:1.5;font-family:Arial,sans-serif;">${item}</p>`
    )
    .join("");
  return `<div style="background:#EDEDED;border-radius:8px;padding:16px 20px;margin:4px 0 20px;">${rows}</div>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;color:${COLOR_TEXT};line-height:1.7;font-family:Arial,sans-serif;">${text}</p>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 20px;font-size:22px;font-weight:600;color:${COLOR_HEADING};font-family:Arial,sans-serif;line-height:1.3;">${text}</h1>`;
}

function wrap(previewText: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(previewText)}</title>
</head>
<body style="margin:0;padding:20px 0;background:#f6f9fc;font-family:Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${esc(previewText)}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;">
    <tr>
      <td align="center" style="padding:20px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
          <tr>
            <td style="padding:32px 28px;">
              <div style="text-align:center;margin-bottom:28px;">
              ${LOGO_IMG}
              </div>
              ${content}
              <div style="border-top:1px solid #e5e7eb;margin-top:28px;padding-top:20px;text-align:center;">
                <p style="margin:0;font-size:12px;color:${COLOR_MUTED};line-height:1.6;font-family:Arial,sans-serif;">
                  Copyright &copy; ${CURRENT_YEAR}
                  <a href="${BLOG_URL}" style="color:${COLOR_LINK};text-decoration:none;">The Web Room</a>.
                  All rights reserved.
                </p>
              </div>
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
  const subject = "Verify your email — The Web Room";

  const content = `
    ${h1("Verify Your Email")}
    ${p("Hi there,")}
    ${p("Thank you for creating an account on The Web Room. To complete your account setup, please verify your email address by clicking the button below.")}
    <div style="text-align:center;">${btn(params.verificationLink, "Verify Email")}</div>
    ${p("This link expires in 15 minutes. If you didn't create this account, you can safely ignore this email.")}
    ${p("Best,<br/>The Web Room team")}`;

  return {
    subject,
    html: wrap(subject, content),
    body: [
      "Hi there,",
      "",
      "Thank you for creating an account on The Web Room.",
      "Please verify your email address to complete account setup.",
      "",
      `Verification link: ${params.verificationLink}`,
      "",
      "This link expires in 15 minutes.",
      "",
      "If you didn't create this account, you can safely ignore this email.",
      "",
      "Best,",
      "The Web Room team",
    ].join("\n"),
  };
}

// ── Password Reset ────────────────────────────────────────────────────────────

export function buildPasswordResetEmail(params: {
  email: string;
  otp: string;
  resetLink: string;
}): EmailContent {
  const subject = "Reset your password — The Web Room";

  const content = `
    ${h1("Reset your password")}
    ${p("Hi there,")}
    ${p(`We received a request to reset the password on your ${lnk(`${BLOG_URL}/profile`, "The Web Room account")}. Use the one-time code below to continue.`)}
    <div style="background:#f3f4f6;border-radius:10px;padding:24px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Your verification code</p>
      <p style="margin:0 0 10px;font-size:36px;font-weight:800;letter-spacing:12px;color:${COLOR_HEADING};font-family:monospace;">${esc(params.otp)}</p>
      <p style="margin:0;font-size:12px;color:${COLOR_MUTED};">Expires in 15 minutes &nbsp;-&nbsp; Single use only</p>
    </div>
    ${p("If you didn't request a password reset, you can safely ignore this email. Your password will not change unless you complete the steps above.")}
    ${p("Best,<br/>The Web Room team")}`;

  return {
    subject,
    html: wrap("Your password reset code for The Web Room", content),
    body: [
      "Hi there,",
      "",
      "We received a request to reset your The Web Room password.",
      "",
      `Your one-time reset code is: ${params.otp}`,
      "",
      `OTP verification page: ${params.resetLink}`,
      "",
      "This code is valid for 15 minutes and can only be used once.",
      "",
      "If you didn't request a password reset, you can safely ignore this email.",
      "",
      "Best,",
      "The Web Room team",
    ].join("\n"),
  };
}

// ── Banned User ───────────────────────────────────────────────────────────────

export function buildBannedUserEmail(params: { email: string; reason?: string }): EmailContent {
  const subject = "Account access revoked — The Web Room";
  const displayReason = params.reason?.trim() ?? "Policy or moderation violation.";

  const content = `
    ${h1("Your account has been suspended")}
    ${p("Hi,")}
    ${p(`After review, your account has been permanently suspended for violating our community guidelines.`)}
    ${infoBox({ bg: "#fef2f2", border: "#fecaca", labelColor: "#ef4444" }, "Reason for suspension", `${bold(`${esc(displayReason)}`)}`)}
    ${listBox([
      "- You can no longer sign in to your account",
      "- Your posts and content have been removed from public view",
      "- New accounts cannot be created with this email address",
      "- Your data will be taken into consideration for potential legal action",
    ])}
    ${p(`If you believe this was a mistake, please contact our support team at <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLOR_LINK};">Contact Support</a>. Include your email address and a brief explanation.`)}
    ${p("The Web Room moderation team")}`;

  return {
    subject,
    html: wrap("Your The Web Room account access has been permanently revoked.", content),
    body: [
      "Hi,",
      "",
      "Your account has been permanently banned from The Web Room.",
      `Reason: ${displayReason}`,
      "",
      "You can no longer sign in or create new accounts with this email.",
      "",
      `If you believe this is a mistake, contact: ${SUPPORT_EMAIL}`,
      "",
      "The Web Room team",
    ].join("\n"),
  };
}

// ── Post Hidden ───────────────────────────────────────────────────────────────

export function buildPostHiddenWarningEmail(params: {
  name: string;
  email: string;
  postTitle: string;
  editLink: string;
}): EmailContent {
  const greetingName = params.name ?? "there";
  const subject = "Action required: your post has been hidden — The Web Room";
  const safeTitle = params.postTitle.trim() || "your post";

  const content = `
    ${h1("Your post has been hidden")}
    ${p(`Hi ${esc(greetingName)},`)}
    ${p(`Your post ${bold(`&ldquo;${esc(safeTitle)}&rdquo;`)} has been temporarily hidden by our moderation team because it was flagged for content that doesn&apos;t comply with the Web Room community guidelines.`)}
    ${infoBox(
      { bg: "#fffbeb", border: "#fde68a", labelColor: "#92400e" },
      "Post status: Hidden",
      "Your post is no longer visible to other readers until you update it and it passes a follow-up review."
    )}
    ${p("To restore your post, please review its content and make the necessary edits so it aligns with our guidelines. Once updated, it will be re-evaluated by our team.")}
    <div style="text-align:center;">${btn(params.editLink, "Edit your post")}</div>
    ${p("Repeated violations of our community guidelines may lead to permanent account suspension.")}
    ${p(`If you have questions, read our ${lnk(GUIDELINES_URL, "community guidelines")} for more context.`)}
    ${p("The Web Room moderation team")}`;

  return {
    subject,
    html: wrap(`Action required: "${safeTitle}" has been hidden by moderation.`, content),
    body: [
      `Hi ${greetingName},`,
      "",
      `Your post "${safeTitle}" has been hidden by moderation due to inappropriate content.`,
      "Please review and edit your post to comply with community guidelines.",
      "",
      `Edit your post: ${params.editLink}`,
      "",
      "Repeated violations may lead to permanent account suspension.",
      "",
      "The Web Room moderation team",
    ].join("\n"),
  };
}

// ── Post Deleted ──────────────────────────────────────────────────────────────

export function buildPostDeletedWarningEmail(params: {
  name: string;
  email: string;
  postTitle: string;
}): EmailContent {
  const greetingName = params.name ?? "there";
  const subject = "Moderation warning: your post has been deleted — The Web Room";
  const safeTitle = params.postTitle.trim() || "your post";

  const content = `
    ${h1("Your post has been deleted")}
    ${p(`Hi ${esc(greetingName)},`)}
    ${p(`Your post ${bold(`&ldquo;${esc(safeTitle)}&rdquo;`)} has been permanently deleted by our moderation team for containing content that violates the Web Room community guidelines.`)}
    ${infoBox({ bg: "#fef2f2", border: "#fecaca", labelColor: "#dc2626" }, "Warning", "This is a formal warning on your account. Deleted posts cannot be recovered. Any further violations may result in your account being permanently suspended.")}
    ${p(`We encourage you to review our ${lnk(GUIDELINES_URL, "community guidelines")} before publishing future posts.`)}
    ${p(`If you believe this deletion was made in error, please <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLOR_LINK};">Contact Support</a> with the post title and your account email. Our team will review within 3–5 business days.`)}
    ${p("Repeated violations will result in permanent account suspension without further warning.")}
    ${p("The Web Room moderation team")}`;

  return {
    subject,
    html: wrap(`Moderation warning: "${safeTitle}" has been permanently deleted.`, content),
    body: [
      `Hi ${greetingName},`,
      "",
      `Your post "${safeTitle}" has been permanently deleted by moderation for inappropriate content.`,
      "This is a serious warning.",
      "Further violations may result in a permanent ban from The Web Room.",
      "",
      `Contact support if you believe this is a mistake: ${SUPPORT_EMAIL}`,
      "",
      "The Web Room moderation team",
    ].join("\n"),
  };
}

// ── Post Published ────────────────────────────────────────────────────────────

export function buildPostPublishedNoticeEmail(params: {
  name: string;
  email: string;
  postTitle: string;
  postLink: string;
}): EmailContent {
  const greetingName = params.name ?? "there";
  const subject = "Your post is visible again — The Web Room";
  const safeTitle = params.postTitle.trim() || "your post";

  const content = `
    ${h1("Your post is live again")}
    ${p(`Hi ${esc(greetingName)},`)}
    ${p(`Good news — your post ${bold(`&ldquo;${esc(safeTitle)}&rdquo;`)} has been reviewed by our moderation team and is now visible again on The Web Room.`)}
    ${infoBox({ bg: "#f0fdf4", border: "#bbf7d0", labelColor: "#15803d" }, "Post status: Published", "Your post is now live and accessible to all readers.")}
    <div style="text-align:center;">${btn(params.postLink, "View your post")}</div>
    ${p(`You can continue to edit and update your post at any time. Please ensure future edits comply with our ${lnk(GUIDELINES_URL, "community guidelines")} to avoid further moderation actions.`)}
    ${p("Thank you for helping keep The Web Room a high-quality, respectful space for developers and builders.")}
    ${p("The Web Room moderation team")}`;

  return {
    subject,
    html: wrap(`Good news — "${safeTitle}" is now visible again on The Web Room.`, content),
    body: [
      `Hi ${greetingName},`,
      "",
      `Your post "${safeTitle}" has been published again after moderation review.`,
      "You can edit it again, but make sure future updates comply with community guidelines.",
      "",
      `View your post: ${params.postLink}`,
      "",
      "Thank you for helping keep The Web Room safe and useful for everyone.",
      "",
      "The Web Room moderation team",
    ].join("\n"),
  };
}
