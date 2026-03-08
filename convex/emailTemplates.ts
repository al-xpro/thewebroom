type EmailContent = {
  subject: string;
  body: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paragraphs(lines: string[]) {
  return lines
    .map((line) => (line.length === 0 ? "<br />" : `<p style=\"margin:0 0 12px\">${escapeHtml(line)}</p>`))
    .join("");
}

function wrapEmailHtml(content: string) {
  return `<!DOCTYPE html>
<html>
  <body style="background:#f6f9fc;padding:20px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">
      ${content}
    </div>
  </body>
</html>`;
}

export function buildWelcomeEmail(params: { email: string; name?: string }): EmailContent {
  const greetingName = params.name || "there";
  const subject = "Welcome to The Web Room";

  const bodyLines = [
    `Hi ${greetingName},`,
    "",
    "Welcome to The Web Room!",
    "",
    "Your account has been created successfully. You can now:",
    "- Publish new blog posts",
    "- Join discussions in the comments",
    "- Stay up to date with the latest content from our community",
    "",
    "If you didn't create this account, you can safely ignore this email.",
    "",
    "Happy building,",
    "The Web Room team",
  ];

  const html = wrapEmailHtml(`
    <h1 style="margin:0 0 12px;font-size:24px;">Welcome to The Web Room</h1>
    ${paragraphs([
      `Hi ${greetingName},`,
      "Your account is ready. You can now publish blog posts, join community discussions, and keep up with the latest articles.",
      "",
      "If you didn't create this account, you can safely ignore this email.",
      "Happy building,",
      "The Web Room team",
    ])}
  `);

  return {
    subject,
    body: bodyLines.join("\n"),
    html,
  };
}

export function buildPasswordResetEmail(params: {
  email: string;
  otp: string;
  resetLink: string;
}): EmailContent {
  const subject = "Reset your password - The Web Room";

  const bodyLines = [
    "Hi there,",
    "",
    "We received a request to reset the password for your The Web Room account.",
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
  ];

  const html = wrapEmailHtml(`
    <h1 style="margin:0 0 12px;font-size:24px;">Reset your password</h1>
    ${paragraphs(["We received a request to reset your The Web Room password."])}
    <div style="margin:20px 0;padding:16px;border-radius:8px;background:#f3f4f6;text-align:center;">
      <div style="font-size:30px;letter-spacing:8px;font-weight:700;">${escapeHtml(params.otp)}</div>
    </div>
    <a href="${escapeHtml(params.resetLink)}" style="display:inline-block;margin:8px 0 20px;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;">Open OTP Verification</a>
    ${paragraphs([
      "This code expires in 15 minutes and can only be used once.",
      "If you didn't request a password reset, you can ignore this email.",
    ])}
  `);

  return {
    subject,
    body: bodyLines.join("\n"),
    html,
  };
}
