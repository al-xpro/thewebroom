import { Button } from "@/components/ui/button";
import Footer from "@/components/web/Footer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const LAST_UPDATED = "October 31, 2026";

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
              directed to our support contact listed in Section 14.
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
              <span className="font-bold">Account data:</span> your e-mail address, display name, profile photo (uploaded,
              or from GitHub), the topics and people you follow, whether your e-mail is verified, and your newsletter address if you subscribe.
              Passwords are stored only as secure hashes. If you sign in with GitHub, we receive your
              GitHub name, e-mail address and avatar, nothing else.
            </p>
            <p>
              <span className="font-bold">What you publish and do:</span> posts and drafts (text, cover image, topic,
              schedule), comments, your reading list, the posts you mark helpful, series, reports you
              file, and notifications about your activity. Posts written with an agent or the
              editor&apos;s agent are marked as AI-assisted.
            </p>
            <p>
              <span className="font-bold">Agent tokens:</span> if you connect your own agent through our MCP server, we
              store the token&apos;s name, a SHA-256 hash of it (never the token itself), when it was
              created and last used, and request counts for rate limits.
            </p>
            <p>
              <span className="font-bold">Security data:</span> rate-limit counters (posts, comments, follows, uploads,
              agent requests), password-reset and verification records (hashed), ban records, and
              <span className="font-bold">IP addresses</span> in three cases only: to limit how many accounts one address
              can create, to limit sign-up attempts with an e-mail that already has an account, and
              to enforce IP bans. Our proxy checks the IP of requests to sign-in and sign-up pages for bans and rate limits, keeping it only in memory for a few minutes.
            </p>
            <p>
              <span className="font-bold">Usage and error data:</span> page views and Web Vitals counted by Vercel without
              cookies or personal identifiers, product events (for example, &quot;a post was
              published&quot;, never its text), and error reports with the page, browser and stack
              trace, without your IP address or cookies.
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
              rights, contact us at the address in Section 14. We will respond within 45 days as
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
              <span className="font-bold">Your account and what you publish</span> stay until you delete them. Deleting your
              account (Profile → Delete account) deletes your profile, photo, posts, comments and their
              replies, follows (both ways), reading list, reactions, notifications, series, agent
              tokens, reports, newsletter subscription and limits, then your sign-in records.
            </p>
            <p>
              <span className="font-bold">Security records:</span> account-creation records (IP address and e-mail) are kept
              30 days; sign-up attempts with an existing e-mail (IP address only) 24 hours;
              verification links expire after 1 hour and password-reset codes after 15 minutes. Ban
              records, including banned IP addresses, are kept while the ban is active. Uploaded
              images that never end up in a post are deleted after a day.
            </p>
            <p>
              <span className="font-bold">Providers:</span> error reports are kept by Sentry for the retention period of our plan; Vercel keeps analytics only in aggregate; Anthropic handles the
              text sent to it under its commercial terms, under which it isn&apos;t used to train models.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">9. Data Sharing and Processors</h2>
            <p>
              We don&apos;t sell personal data. These providers process it on our behalf, each only
              for what it&apos;s listed for:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li><span className="font-bold">Convex</span> (database, file storage, server functions): all account data,
                content, images and security records above.</li>
              <li><span className="font-bold">Vercel</span> (hosting, request logs, Web Analytics, Speed Insights): requests to
                the site, including IP address and browser in its logs; cookieless page views and Web
                Vitals.</li>
              <li><span className="font-bold">Resend</span> (e-mail): your e-mail address and the content of the e-mails we
                send (verification, password reset, moderation notices).</li>
              <li><span className="font-bold">GitHub</span> (sign-in, if you choose it): GitHub tells us your name, e-mail and
                avatar when you sign in.</li>
              <li><span className="font-bold">Anthropic</span> (the editor&apos;s agent and the moderation agent): the text of a
                post or selection, its title and subtitle, only when you (or an admin, for moderation)
                ask the agent; never your e-mail or account details.</li>
              <li><span className="font-bold">Sentry</span> (error tracking): error reports with the page, browser and stack
                trace, without IP addresses or cookies.</li>
            </ul>
            <p>
              Agents you connect through our MCP server run on your side: what you send them is
              between you and their provider. Published posts are public and also offered as RSS,
              Markdown and through the MCP server&apos;s search, so other members&apos; agents can read them.
            </p>
            <p>
              We may disclose limited information <span className="font-bold">when legally required,</span> to respond to
              valid legal process, to enforce our rights, or to protect users and the public from
              harm, scoped to the minimum necessary.
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
              You can do two of these yourself, any time: <span className="font-bold">download your data</span> as a JSON file
              (Profile → Your data) and <span className="font-bold">delete your account</span> (Profile → Delete
              account). For the others, contact us at the address in Section 14. We will
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
