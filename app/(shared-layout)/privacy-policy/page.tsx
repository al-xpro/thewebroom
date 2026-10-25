import { Button } from "@/components/ui/button";
import Footer from "@/components/web/Footer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const LAST_UPDATED = "March 14, 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="flex flex-col pt-20 max-w-3xl mx-auto px-4">
      <section className="mx-auto w-full py-5">
        <header className="mb-5 space-y-5 pb-3">
          <div className="flex w-full items-center justify-between gap-5">
            <h1 className="text-4xl font-extrabold text-primary">Privacy Policy</h1>
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="flex px-2 py-1 items-center cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Home
              </Button>
            </Link>
          </div>
          <p className="text-paragraph text-justify">
            The Web Room is built as a <span className="font-bold">secure publishing platform</span>{" "}
            for developers and readers. This Privacy Policy explains what data we collect, why we
            collect it, how we protect it, and how users can exercise their rights. It applies
            globally and is written to meet the requirements of the EU General Data Protection
            Regulation (<span className="font-bold">GDPR</span>), the UK GDPR, the California
            Consumer Privacy Act (<span className="font-bold">CCPA/CPRA</span>), Brazil&apos;s Lei Geral
            de Proteção de Dados (<span className="font-bold">LGPD</span>), Canada&apos;s Personal
            Information Protection and Electronic Documents Act (
            <span className="font-bold">PIPEDA</span>), and other applicable privacy frameworks.
            Where local law grants stronger rights, those rights apply.
          </p>
        </header>

        <article className="space-y-8 leading-7 text-paragraph text-justify">
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">1. Data Controller</h2>
            <p>
              For users in the European Economic Area, United Kingdom, and Switzerland, The Web Room
              operates as the <span className="font-bold">data controller</span> for personal data
              processed through this platform. For California residents, we act as a{" "}
              <span className="font-bold">business</span> under the CCPA/CPRA. For all other
              jurisdictions, we are the <span className="font-bold">operator or equivalent</span>{" "}
              responsible for data processing decisions. Questions about data processing can be
              directed to our support contact listed in Section 12.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">2. Scope and Principles</h2>
            <p>
              This policy applies to{" "}
              <span className="font-bold">all visitors, readers, authors, and administrators</span>{" "}
              using The Web Room. Our core principles are data minimization, purpose limitation,
              security by default, and transparent user rights. We only collect information{" "}
              <span className="font-bold">necessary</span> to operate the blog, prevent abuse,
              maintain platform integrity, and comply with legal obligations.
            </p>
            <p>
              We do not sell personal data. We do not build hidden user profiles for advertising. We
              process account and activity data to{" "}
              <span className="font-bold">deliver core product features</span> such as sign-up,
              login, profile completion, post and comment publication, password recovery, abuse
              prevention, moderation decisions, and account lifecycle operations including deletion
              requests.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">3. Data We Collect</h2>
            <p>
              <span className="font-bold">Account data</span> may include email address, display
              name, authentication provider metadata, and security-related session information. If
              you sign in with GitHub, we receive the minimum identity information needed to
              authenticate your account. Passwords are never stored in plaintext — only secure
              hashes.
            </p>
            <p>
              <span className="font-bold">Content data</span> includes posts, comments, timestamps,
              status flags, and moderation records.{" "}
              <span className="font-bold">Security and operational data</span> includes rate-limit
              state, password reset tokens (hashed), account deletion reauthentication records, and
              ban records used to enforce platform safety.
            </p>
            <p>
              <span className="font-bold">Technical data</span> may include device and network
              metadata associated with active sessions such as IP information supplied by
              authentication infrastructure. We use this to prevent fraud and investigate abuse. We
              do not intentionally collect sensitive categories of personal data through normal
              product use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              4. Legal Basis for Processing (GDPR / UK GDPR)
            </h2>
            <p>
              For users in the EEA and United Kingdom, we process personal data under the following
              legal bases:
            </p>
            <p>
              <span className="font-bold">Contract performance (Article 6(1)(b) GDPR):</span>{" "}
              Account creation, authentication, publishing posts and comments, and account deletion
              are necessary to provide the service you signed up for.
            </p>
            <p>
              <span className="font-bold">Legitimate interests (Article 6(1)(f) GDPR):</span>{" "}
              Security monitoring, abuse prevention, rate limiting, moderation enforcement, and
              fraud detection. We balance these interests against your rights and freedoms.
            </p>
            <p>
              <span className="font-bold">Legal obligation (Article 6(1)(c) GDPR):</span> Retention
              of certain records where required by applicable law, and cooperation with lawful legal
              process.
            </p>
            <p>
              <span className="font-bold">Consent:</span> Where we rely on consent (e.g. optional
              communications), you may withdraw it at any time without affecting the lawfulness of
              prior processing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              5. California Residents (CCPA / CPRA)
            </h2>
            <p>
              California residents have the right to <span className="font-bold">know</span> what
              personal information we collect, <span className="font-bold">delete</span> their
              personal information, <span className="font-bold">correct</span> inaccurate
              information, <span className="font-bold">opt out</span> of the sale or sharing of
              personal information (we do not sell or share personal information for cross-context
              behavioral advertising), and
              <span className="font-bold"> not be discriminated against</span> for exercising these
              rights.
            </p>
            <p>
              We do not sell personal information as defined by the CCPA/CPRA. We do not share
              personal information for cross-context behavioral advertising. To exercise your
              rights, contact us at the address in Section 12. We will respond within 45 days as
              required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">6. Security and Risk Controls</h2>
            <p>
              The Web Room applies <span className="font-bold">layered security controls:</span>{" "}
              hashed credentials, secure sessions, reauthentication for high-risk operations,
              anti-spam rate limits, token expiration windows, and account-level moderation
              controls. All verification tokens and OTPs are stored as SHA-256 hashes — raw values
              are only transmitted in emails and never persisted.
            </p>
            <p>
              While no internet system can guarantee absolute security, we continuously{" "}
              <span className="font-bold">improve safeguards</span> based on threat patterns and
              operational experience. In the event of a personal data breach that poses a risk to
              your rights and freedoms, we will notify the relevant supervisory authority within 72
              hours where required by applicable law (e.g. GDPR Article 33), and affected users
              without undue delay where required.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">7. Moderation and User Behavior</h2>
            <p>
              Content that violates our standards may be hidden, deleted, or escalated to account
              enforcement. Moderation actions can trigger policy notification emails. If a post is
              hidden, the user may be asked to edit content to{" "}
              <span className="font-bold">comply with guidelines.</span> Repeated or severe
              violations can result in <span className="font-bold">permanent bans.</span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">8. Data Retention</h2>
            <p>
              We retain account and content data only{" "}
              <span className="font-bold">as long as needed</span> for platform operations,
              security, legal obligations, and moderation integrity. Account deletion triggers{" "}
              <span className="font-bold">cascade deletion</span> for user-generated content where
              technically supported, but some minimal records{" "}
              <span className="font-bold">may be retained</span> for abuse prevention, legal
              compliance, or system integrity.
            </p>
            <p>
              Verification codes and reset sessions expire automatically (15 minutes). Session
              records and security tokens are pruned according to authentication lifecycle rules.
              Where GDPR applies, we do not retain personal data longer than necessary for its
              stated purpose.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">9. Data Sharing and Processors</h2>
            <p>
              We use carefully selected infrastructure providers for hosting, authentication,
              database, and transactional email. These processors{" "}
              <span className="font-bold">act on our instructions</span> under appropriate data
              processing agreements. Where required by GDPR, we use Standard Contractual Clauses
              (SCCs) or equivalent transfer mechanisms for cross-border data transfers.
            </p>
            <p>
              We may disclose limited information{" "}
              <span className="font-bold">when legally required,</span> to respond to valid legal
              process, to enforce our rights, or to protect users and the public from harm.
              Disclosures are scoped to the minimum necessary data for the legitimate purpose.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">10. International Transfers</h2>
            <p>
              The Web Room may be accessed from multiple jurisdictions. Data may be processed in
              regions where our service providers operate. For transfers from the EEA, UK, or
              Switzerland to countries without an adequacy decision, we rely on Standard Contractual
              Clauses or other approved transfer mechanisms under GDPR section 5. For other
              jurisdictions, we apply security measures consistent with the platform&apos;s risk profile.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">11. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the following rights:</p>
            <p>
              <span className="font-bold">EEA / UK (GDPR / UK GDPR):</span> Right of access (Article
              15), rectification (Article 16), erasure (Article 17), restriction of processing
              (Article 18), data portability (Article 20), and the right to object (Article 21). You
              also have the right to lodge a complaint with your local supervisory authority (e.g.
              the ICO in the UK, or your national DPA in the EU).
            </p>
            <p>
              <span className="font-bold">California (CCPA/CPRA):</span> Right to know, delete,
              correct, and opt-out of sale/sharing. See Section 5.
            </p>
            <p>
              <span className="font-bold">Brazil (LGPD):</span> Rights under Articles 17–22,
              including access, correction, anonymization, deletion, and portability.
            </p>
            <p>
              <span className="font-bold">Canada (PIPEDA):</span> Right to access and correct
              personal information.
            </p>
            <p>
              To exercise any of these rights, contact us at the address in Section 12. We will
              respond within the timeframe required by your applicable law. We may require identity
              verification before fulfilling sensitive requests.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">12. Children</h2>
            <p>
              The Web Room is <span className="font-bold">not intended</span> for children under 16
              (or the minimum age in their jurisdiction). We do not knowingly collect personal data
              from children. If we learn that such data was collected, we will take reasonable
              action to delete it and disable associated accounts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">13. Changes to This Policy</h2>
            <p>
              We may update this policy to reflect legal, product, or security changes. The latest
              version is published on this page with an updated effective date. Material changes may
              also be communicated in-product or by email when appropriate. Where required by
              applicable law, we will seek fresh consent for material changes to how we use your
              data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">14. Contact and Complaints</h2>
            <p>
              If you have privacy questions, rights requests, or security concerns,{" "}
              <a
                href="mailto:alxpro.dev@gmail.com?subject=Re: The Web Room"
                className="text-primary hover:underline"
              >
                contact support
              </a>
              . Include your account email, a clear description of the issue, and relevant dates.
            </p>
            <p>
              EEA and UK residents may also lodge a complaint with their local data protection
              authority (e.g. the ICO at ico.org.uk for UK residents, or your national DPA for EU
              residents). We encourage contacting us first so we can resolve the issue quickly.
            </p>
          </section>

          <div className="flex w-full gap-2">
            <p className="font-bold">Last updated:</p>
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
