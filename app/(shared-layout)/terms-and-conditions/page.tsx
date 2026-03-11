import { Button } from "@/components/ui/button";
import Footer from "@/components/web/Footer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const LAST_UPDATED = "March 9, 2026";

export default function TermsAndConditionsPage() {
  return (
    <main className="flex flex-col pt-20 max-w-3xl mx-auto px-4">
      <section className="mx-auto w-full py-5">
        <header className="mb-5 space-y-5 pb-3">
          <div className="flex w-full items-center justify-between gap-5">
            <h1 className="text-4xl font-extrabold text-primary">Terms &amp; Conditions</h1>
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
            These Terms &amp; Conditions govern your use of The Web Room. By accessing or using the
            platform,{" "}
            <span className="text-foreground font-medium">you agree to follow these terms,</span>{" "}
            our moderation standards, and applicable law. If you do not agree, do not use the
            service.
          </p>
        </header>

        <article className="space-y-8 leading-7 text-paragraph text-justify">
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">1. Service Description</h2>
            <p className="text-paragraph">
              The Web Room is a{" "}
              <span className="text-foreground font-medium">
                technical blog and community platform
              </span>{" "}
              where users can authenticate, create profiles, publish posts, write comments, and
              interact with content. The service includes account security features, moderation
              tooling, and policy notification emails. We may improve, modify, suspend, or
              discontinue features <span className="text-foreground font-medium">at any time</span>{" "}
              to maintain reliability, safety, and legal compliance.
            </p>
            <p className="text-paragraph">
              We provide the platform on an as-available basis. While we aim for high availability
              and consistent behavior, downtime, data delays, maintenance windows, and temporary
              incidents <span className="text-foreground font-medium">may occur.</span> We reserve
              the right to implement technical safeguards and access controls to protect users and
              service integrity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              2. Eligibility and Account Responsibility
            </h2>
            <p className="text-paragraph">
              You must be legally capable of forming a binding agreement and meet minimum age
              requirements in your jurisdiction. You are{" "}
              <span className="text-foreground font-medium">responsible</span> for the accuracy of
              account details, maintaining the confidentiality of your credentials, and all activity
              under your account. If you suspect unauthorized access, you must notify us promptly
              and secure your account immediately.
            </p>
            <p className="text-paragraph">
              You may authenticate with supported providers such as credentials or GitHub where
              enabled. You must not bypass security controls, use stolen identities, or create
              accounts on behalf of others without permission. Accounts associated with severe abuse
              may be{" "}
              <span className="text-foreground font-medium">suspended or permanently banned.</span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">3. Acceptable Use</h2>
            <p className="text-paragraph">
              You agree to use The Web Room for{" "}
              <span className="text-foreground font-medium">
                lawful, respectful, and constructive participation.
              </span>{" "}
              Prohibited conduct includes harassment, threats, hate speech, doxxing, non-consensual
              personal data disclosure, spam, phishing, malware distribution, attempts to exploit
              platform vulnerabilities, impersonation, and deceptive behavior aimed at harming users
              or manipulating trust signals.
            </p>
            <p className="text-paragraph">
              You must not upload or publish content that infringes third-party rights, violates
              intellectual property laws, or includes illegal material. You must not automate abuse,
              scrape restricted data in violation of policy, or use bots to manipulate engagement.
              If we determine conduct creates legal or security risk, we may{" "}
              <span className="text-foreground font-medium">
                remove content and apply enforcement actions
              </span>{" "}
              without prior notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              4. Posting and Commenting Standards
            </h2>
            <p className="text-paragraph">
              The quality and safety of the community depend on{" "}
              <span className="text-foreground font-medium">responsible posting.</span> Content
              should be factual where claims are made, clearly attributable when external sources
              are used, and respectful to readers with different backgrounds. Posts and comments
              should not be used to coordinate harassment or spread malicious links. Technical
              critique is welcome when delivered in good faith and with professional tone.
            </p>
            <p className="text-paragraph">
              If a post is hidden, you may be asked to{" "}
              <span className="text-foreground font-medium">edit</span> it to comply with rules. If
              content is deleted for serious violations, you may receive a{" "}
              <span className="text-foreground font-medium">final warning.</span> Repeated or severe
              violations can result in{" "}
              <span className="text-foreground font-medium">permanent bans.</span> Moderation
              notices may be delivered by email and in-product messaging to ensure users understand
              required corrective action.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">5. Moderation and Enforcement</h2>
            <p className="text-paragraph">
              We reserve the right to review, hide, unhide, or delete content that{" "}
              <span className="text-foreground font-medium">
                violates policy or introduces legal and safety risk.
              </span>{" "}
              Moderation decisions consider context, severity, repetition, and impact on users. We
              can apply{" "}
              <span className="text-foreground font-medium">account-level restrictions,</span>{" "}
              including temporary limitations and permanent bans, when warranted by abuse patterns.
            </p>
            <p className="text-paragraph">
              Permanent bans may <span className="text-foreground font-medium">prevent access</span>{" "}
              with existing credentials and block new account creation attempts associated with the
              same identity signals. We may{" "}
              <span className="text-foreground font-medium">
                retain minimum enforcement records
              </span>{" "}
              necessary to maintain platform safety and prevent repeated abuse. Appeals may be
              submitted, but we are not obligated to reinstate access if risk remains high.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">6. Security Rules</h2>
            <p className="text-paragraph">
              You must not attempt to bypass authentication, brute-force credentials, abuse password
              reset flows, probe internal APIs without authorization, or interfere with rate-limit
              controls.{" "}
              <span className="text-foreground font-medium">
                Any attempt to compromise platform security may lead to immediate account
                enforcement and potential reporting to relevant authorities.
              </span>
            </p>
            <p className="text-paragraph">
              High-risk actions may require additional verification such as OTP codes or
              reauthentication. We may{" "}
              <span className="text-foreground font-medium">
                force session invalidation after sensitive events
              </span>{" "}
              including password resets, ban actions, or suspicious account activity. Users are
              expected to keep device software updated and use strong passwords to reduce
              account-takeover risk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">7. User Content and Rights</h2>
            <p className="text-paragraph">
              You retain <span className="text-foreground font-medium">ownership</span> of content
              you create, subject to the license you grant to operate the platform. By posting, you
              grant The Web Room a worldwide, non-exclusive,{" "}
              <span className="text-foreground font-medium">royalty-free license</span> to host,
              store, process, display, and distribute your content as required to provide and
              improve services, enforce policy, and ensure reliability.
            </p>
            <p className="text-paragraph">
              You represent that you have{" "}
              <span className="text-foreground font-medium">rights</span> to publish submitted
              content. If you post{" "}
              <span className="text-foreground font-medium">copyrighted material</span> without
              permission, you may be required to remove it, and we may remove it directly when
              legally necessary. We may{" "}
              <span className="text-foreground font-medium">preserve copies</span> of removed
              content for legal hold, abuse investigation, and platform security requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">8. Privacy and Data Protection</h2>
            <p className="text-paragraph">
              Your use of The Web Room is also governed by our{" "}
              <span className="text-foreground font-medium">Privacy Policy,</span> which explains
              data collection, processing, retention, and rights handling. By using the platform,
              you acknowledge that certain security and operational data is{" "}
              <span className="text-foreground font-medium">necessary</span> to authenticate users,
              protect the service, and enforce community rules.
            </p>
            <p className="text-paragraph">
              We implement technical and organizational measures appropriate to risk,{" "}
              <span className="text-foreground font-medium">
                but no system is guaranteed to be immune from attacks.
              </span>{" "}
              You agree that timely reporting of suspected compromise is a shared responsibility and
              that reasonable safeguards are required from both platform operators and users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              9. Account Deletion and Termination
            </h2>
            <p className="text-paragraph">
              You may request account deletion through available product features. Deletion may{" "}
              <span className="text-foreground font-medium">remove</span> your posts, comments, and
              related profile data from active views, subject to technical and legal constraints.
              Certain security or enforcement records may be{" "}
              <span className="text-foreground font-medium">retained</span> to comply with law and
              prevent recurring abuse.
            </p>
            <p className="text-paragraph">
              We may{" "}
              <span className="text-foreground font-medium">terminate or restrict accounts</span>{" "}
              that violate these terms, present security risk, or abuse platform resources.
              Termination does not remove obligations arising before termination, including
              compliance, cooperation in investigations, and legal duties tied to posted content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">10. Third-Party Services</h2>
            <p className="text-paragraph">
              The platform may integrate with third-party providers for authentication,
              infrastructure, and transactional email. Those providers may apply independent service
              terms and reliability constraints. We are{" "}
              <span className="text-foreground font-medium">not responsible</span> for external
              outages, policy changes, or service limitations beyond our control, though we work to
              maintain resilient integrations and fallback behavior.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              11. Disclaimers and Limitation of Liability
            </h2>
            <p className="text-paragraph">
              To the fullest extent permitted by law, The Web Room and its operators{" "}
              <span className="text-foreground font-medium">disclaim</span> implied warranties,
              including merchantability, fitness for a particular purpose, and non-infringement. The
              service may contain errors, interruptions, or delays.{" "}
              <span className="text-foreground font-medium">
                We do not guarantee uninterrupted access, complete accuracy of all user content, or
                error-free operation at all times.
              </span>
            </p>
            <p className="text-paragraph">
              To the extent permitted by law, we are{" "}
              <span className="text-foreground font-medium">not liable</span> for indirect,
              incidental, special, consequential, or punitive damages, data loss, or losses arising
              from use of the service. If liability cannot be excluded, it is limited to the minimum
              level required by applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">12. Indemnity</h2>
            <p>
              You agree to{" "}
              <span className="text-foreground font-medium">indemnify and hold harmless</span> The
              Web Room and its operators from claims, liabilities, damages, losses, and expenses
              arising from your content, your misuse of the service, your violation of these terms,
              or your violation of law or third-party rights. This obligation survives account
              termination to the extent legally permitted.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">13. Changes to Terms</h2>
            <p>
              We may update these terms when legal requirements, platform architecture, or
              moderation frameworks change. Updated terms become effective when posted unless a
              later date is specified. Continued use after effective date constitutes acceptance of
              the revised terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">14. Governing Law and Contact</h2>
            <p>
              These terms are governed by applicable laws determined by service operations and
              mandatory consumer protections. If a specific provision is found unenforceable, the
              remaining provisions remain in effect. Nothing here limits rights that cannot be
              waived under applicable law.
            </p>
            <p>
              For legal notices, policy questions, abuse reports, or account issues, contact
              <a
                href="mailto:alxpro.dev@gmail.com?subject=Re: The Web Room"
                className="ml-1 text-primary hover:underline"
              >
                alxpro.dev@gmail.com
              </a>
              . Please include relevant account details, timestamps, and links so we can investigate
              efficiently and respond with actionable resolution steps.
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
