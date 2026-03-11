import { Button } from "@/components/ui/button";
import Footer from "@/components/web/Footer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const LAST_UPDATED = "March 9, 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="flex flex-col pt-20 max-w-3xl mx-auto px-4">
      <section className="mx-auto w-full py-5">
        <header className="mb-5 space-y-5 pb-3">
          <div className="flex w-full items-center justify-between gap-5">
            <h1 className="text-4xl font-extrabold text-primary">Privacy Policy</h1>
            <Link href="/" className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="relative flex px-2 py-1 items-center left-0 top-0 z-20 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Home
              </Button>
            </Link>
          </div>

          <p className="text-paragraph text-justify">
            The Web Room is built as a{" "}
            <span className="text-foreground font-medium">secure publishing platform</span> for
            developers and readers. This Privacy Policy explains what data we collect, why we
            collect it, how we protect it, how users can control it, and how we handle moderation
            and security events.
          </p>
        </header>

        <article className="space-y-8 leading-7 text-paragraph text-justify">
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">1. Scope and Principles</h2>
            <p className="text-paragraph">
              This policy applies to{" "}
              <span className="text-foreground font-medium">
                all visitors, readers, authors, and administrators
              </span>{" "}
              using The Web Room website and related authentication, moderation, and
              email-notification features. Our core principles are data minimization, purpose
              limitation, security by default, and transparent user rights. We only collect
              information that is <span className="text-foreground font-medium">necessary</span> to
              operate the blog, prevent abuse, maintain platform integrity, and comply with legal
              obligations.
            </p>
            <p className="text-paragraph">
              We do not sell personal data. We do not build hidden user profiles for advertising. We
              process account and activity data to{" "}
              <span className="text-foreground font-medium">deliver core product features</span>{" "}
              such as sign-up, login, profile completion, post and comment publication, password
              recovery, abuse prevention, moderation decisions, and account lifecycle operations
              including deletion requests. When we introduce new processing purposes, we update this
              policy and communicate material changes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">2. Data We Collect</h2>
            <p className="text-paragraph">
              Account data may include{" "}
              <span className="text-foreground font-medium">
                email address, display name, authentication provider metadata, and security-related
                session information.
              </span>{" "}
              If you sign in with GitHub, we receive the minimum identity information needed to
              authenticate your account. If you sign in with credentials, we store password hashes
              through secure authentication systems; plaintext passwords are never stored in our
              database.
            </p>
            <p className="text-paragraph">
              Content data includes{" "}
              <span className="text-foreground font-medium">
                posts, comments, timestamps, status flags ("published" or "hidden"), and moderation
                records.
              </span>{" "}
              Security and operational data includes rate-limit state, password reset verification
              tokens, account deletion reauthentication records, and ban records used to{" "}
              <span className="text-foreground font-medium">enforce</span> platform safety. Contact
              and transactional data includes{" "}
              <span className="text-foreground font-medium">
                {" "}
                service emails such as onboarding confirmations, password reset emails, moderation
                warnings, and account-access notices.
              </span>
            </p>
            <p className="text-paragraph">
              Technical data may include device and network metadata associated with active
              sessions, such as{" "}
              <span className="text-foreground font-medium">
                generic user agent and IP information supplied by authentication infrastructure.
              </span>{" "}
              We use this data to prevent fraud, protect accounts, and investigate abuse. We do not
              intentionally collect sensitive categories of personal data through normal product
              use, and users should avoid publishing sensitive personal information in posts or
              comments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">3. Why We Process Data</h2>
            <p className="text-paragraph">
              We process data to <span className="text-foreground font-medium">provide</span>{" "}
              authentication and account management,{" "}
              <span className="text-foreground font-medium">publish</span> user content,{" "}
              <span className="text-foreground font-medium">support</span>
              community interactions, <span className="text-foreground font-medium">
                enforce
              </span>{" "}
              moderation rules, and <span className="text-foreground font-medium">protect</span> the
              platform from spam and malicious activity. Security controls include OTP-based reset
              flows, request throttling, suspicious behavior checks, and administrative moderation
              actions when content violates policies.
            </p>
            <p className="text-paragraph">
              We also <span className="text-foreground font-medium">process data</span> to comply
              with legal requirements, resolve disputes, and preserve evidence in case of serious
              abuse. For example, if an account is permanently banned for policy violations, limited
              records may be retained to enforce the ban, prevent repeated abuse, and document
              moderation decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">4. Security and Risk Controls</h2>
            <p className="text-paragraph">
              The Web Room applies{" "}
              <span className="text-foreground font-medium">layered security controls:</span> hashed
              credentials, secure sessions, provider reauthentication for high-risk operations,
              anti-spam rate limits, verification code expiration windows, and account-level
              moderation controls. Administrative actions that materially affect users, such as ban
              or post moderation, are restricted to authorized roles and recorded through auditable
              backend logic.
            </p>
            <p className="text-paragraph">
              We use secure email delivery providers for transactional messages and maintain
              operational logs to detect delivery failures and abuse attempts. Password reset and
              account deletion flows are designed to prevent account takeover by requiring valid
              proof of control. While no internet system can guarantee absolute security, we
              continuously <span className="text-foreground font-medium">improve safeguards</span>{" "}
              based on threat patterns and operational experience.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">5. Moderation and User Behavior</h2>
            <p className="text-paragraph">
              The Web Room is intended for{" "}
              <span className="text-foreground font-medium">
                respectful, constructive technical discussion
              </span>
              . Content that contains harassment, hate speech, illegal material, exploitative abuse,
              persistent spam, deceptive behavior, or severe community-rule violations may be
              hidden, deleted, or escalated to account enforcement. Moderation actions can trigger
              policy notification emails so users understand what happened and how to improve.
            </p>
            <p className="text-paragraph">
              If a post is hidden, the user may be asked to edit content to{" "}
              <span className="text-foreground font-medium">comply with guidelines.</span> If a post
              is deleted for serious violations, the user may receive a warning that repeated
              behavior can lead to permanent bans. These controls protect the rights of readers and
              contributors to participate in a safer, higher-quality community.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">6. Data Retention</h2>
            <p className="text-paragraph">
              We retain account and content data only{" "}
              <span className="text-foreground font-medium">as long as needed</span> for platform
              operations, security, legal obligations, and moderation integrity. Account deletion
              requests trigger <span className="text-foreground font-medium">cascade deletion</span>{" "}
              for user-generated content where technically supported, but some minimal records{" "}
              <span className="text-foreground font-medium">may be retained</span> for abuse
              prevention, legal compliance, or system integrity (for example, active ban records and
              security audit artifacts).
            </p>
            <p className="text-paragraph">
              Verification codes and reset sessions are short-lived by design and automatically
              expire. Session records and security tokens are pruned according to authentication
              lifecycle rules. Operational logs are kept for bounded periods needed to troubleshoot
              incidents, maintain reliability, and investigate fraud.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">7. Data Sharing and Processors</h2>
            <p className="text-paragraph">
              We use carefully selected infrastructure providers to run the platform, including
              hosting, authentication, database, and transactional email services. These processors{" "}
              <span className="text-foreground font-medium">act on our instructions</span> and are
              required to protect data appropriately.{" "}
              <span className="text-foreground font-medium">
                We do not disclose personal data to third parties for unrelated marketing use.
              </span>
            </p>
            <p className="text-paragraph">
              We may disclose limited information{" "}
              <span className="text-foreground font-medium">when legally required,</span> to respond
              to valid legal process, to enforce our rights, or to protect users and the public from
              harm. Disclosures are scoped to the minimum necessary data for the legitimate purpose.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">8. International Access</h2>
            <p className="text-paragraph">
              The Web Room may be accessed from multiple jurisdictions. Data may be processed in
              regions where our service providers operate. Where applicable, we use contractual and
              organizational safeguards for cross-border processing and apply security measures
              consistent with platform risk profile.
            </p>
            <p className="text-paragraph">
              If local law grants additional privacy rights, those rights apply to the extent
              required by law.{" "}
              <span className="text-foreground font-medium">
                Nothing in this policy is intended to limit non-waivable rights under applicable
                regulations.
              </span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">9. Your Rights and Controls</h2>
            <p className="text-paragraph">
              Depending on applicable law, users may have rights to{" "}
              <span className="text-foreground font-medium">
                access, rectify, or delete personal data
              </span>
              , object to certain processing,{" "}
              <span className="text-foreground font-medium">and request data portability.</span> You
              may also update your profile information and manage account status from in-product
              settings where available. For security reasons, we may require identity verification
              before fulfilling sensitive requests.
            </p>
            <p className="text-paragraph">
              Users can <span className="text-foreground font-medium">request clarification</span>{" "}
              on moderation decisions and{" "}
              <span className="text-foreground font-medium">report potential errors.</span> We
              evaluate appeals in good faith while preserving safeguards against abuse and
              coordinated manipulation. Rights requests that conflict with mandatory legal
              obligations or essential security controls may be partially limited with explanation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">10. Children and Restricted Use</h2>
            <p className="text-paragraph">
              The Web Room is <span className="text-foreground font-medium">not intended</span> for
              children under the minimum age permitted by applicable law in their jurisdiction. If
              we learn that personal data was provided in violation of age requirements, we will
              take <span className="text-foreground font-medium">reasonable action</span> to remove
              the data and disable associated accounts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">11. Changes to This Policy</h2>
            <p className="text-paragraph">
              We may update this policy to reflect legal, product, or security changes. The latest
              version is published on this page with an updated effective date. Material changes may
              also be communicated in-product or by email when appropriate.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">12. Contact and Complaints</h2>
            <p className="text-paragraph">
              If you have privacy questions, rights requests, or security concerns, contact us at
              <a
                href="mailto:alxpro.dev@gmail.com?subject=Re: The Web Room"
                className="ml-1 text-primary hover:underline"
              >
                alxpro.dev@gmail.com
              </a>
              . Include your account email, a clear description of the issue, and relevant dates so
              we can resolve requests efficiently.
            </p>
            <p className="text-paragraph">
              If you believe your rights were not handled correctly, you may also contact the
              competent data protection authority in your jurisdiction. We encourage contacting us
              first so we can investigate and resolve the issue quickly.
            </p>
          </section>
          <div className="flex w-full gap-2">
            <p className="text-foreground font-medium">Last updated:</p>
            <p className="text-paragraph">{LAST_UPDATED}</p>
          </div>
        </article>
      </section>
      <Suspense fallback={<div>Loading footer...</div>}>
        <Footer />
      </Suspense>
    </main>
  );
}
