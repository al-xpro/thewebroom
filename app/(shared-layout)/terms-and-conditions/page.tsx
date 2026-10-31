import { Button } from "@/components/ui/button";
import Footer from "@/components/web/Footer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const LAST_UPDATED = "October 31, 2026";

export default function TermsAndConditionsPage() {
  return (
    <main className="flex flex-col pt-20 max-w-3xl mx-auto px-4">
      <section className="mx-auto w-full py-5">
        <header className="mb-5 space-y-5 pb-3">
          <div className="flex w-full items-center justify-between gap-5">
            <h1 className="text-4xl font-extrabold text-primary">Terms &amp; Conditions</h1>
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
            These Terms &amp; Conditions govern your use of The Web Room. By accessing or using the
            platform, <span className="font-bold">you agree to follow these terms,</span> our
            moderation standards, and applicable law. If you do not agree, do not use the service.
            These terms are designed to comply with the requirements of the{" "}
            <span className="font-bold">EU General Data Protection Regulation (GDPR)</span>, the{" "}
            <span className="font-bold">UK GDPR</span>, the{" "}
            <span className="font-bold">California Consumer Privacy Act (CCPA/CPRA)</span>, Brazil&apos;s{" "}
            <span className="font-bold">LGPD</span>, Canada&apos;s{" "}
            <span className="font-bold">PIPEDA</span>, and other applicable frameworks. Where local
            consumer protection or privacy laws grant stronger rights, those rights apply and
            nothing in these terms is intended to limit them.
          </p>
        </header>

        <article className="space-y-8 leading-7 text-paragraph text-justify">
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">1. Service Description</h2>
            <p>
              The Web Room is a{" "}
              <span className="font-bold">technical blog and community platform</span> where users
              can authenticate, create profiles, publish posts, write comments, and interact with
              content. We may improve, modify, suspend, or discontinue features{" "}
              <span className="font-bold">at any time</span> to maintain reliability, safety, and
              legal compliance. We will provide reasonable notice of material changes where required
              by applicable law.
            </p>
            <p>
              We provide the platform on an as-available basis. While we aim for high availability,
              downtime, maintenance windows, and temporary incidents{" "}
              <span className="font-bold">may occur.</span> We reserve the right to implement
              technical safeguards and access controls to protect users and service integrity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              2. Eligibility and Account Responsibility
            </h2>
            <p>
              You must be legally capable of forming a binding agreement and meet the minimum age
              required by your jurisdiction (at least 16 in most countries, 13 in the United States
              under COPPA where applicable). You are <span className="font-bold">responsible</span>{" "}
              for the accuracy of account details, maintaining the confidentiality of your
              credentials, and all activity under your account.
            </p>
            <p>
              You must not bypass security controls, use stolen identities, or create accounts on
              behalf of others without permission. Accounts associated with severe abuse may be{" "}
              <span className="font-bold">suspended or permanently banned.</span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">3. Acceptable Use</h2>
            <p>
              You agree to use The Web Room for{" "}
              <span className="font-bold">lawful, respectful, and constructive participation.</span>{" "}
              Prohibited conduct includes harassment, threats, hate speech, doxxing, non-consensual
              personal data disclosure, spam, phishing, malware distribution, attempts to exploit
              platform vulnerabilities, impersonation, and deceptive behavior aimed at harming users
              or manipulating trust signals.
            </p>
            <p>
              You must not upload or publish content that infringes third-party rights, violates
              intellectual property laws, or includes illegal material. You must not automate abuse
              or use bots to manipulate engagement. If we determine conduct creates legal or
              security risk, we may{" "}
              <span className="font-bold">remove content and apply enforcement actions</span>{" "}
              without prior notice, subject to applicable consumer protection requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              4. Posting and Commenting Standards
            </h2>
            <p>
              Content should be factual where claims are made, clearly attributable when external
              sources are used, and respectful to readers with different backgrounds. Technical
              critique is welcome when delivered in good faith and with professional tone.
            </p>
            <p>
              If a post is hidden, you may be asked to <span className="font-bold">edit</span> it to
              comply with rules. If content is deleted for serious violations, you may receive a{" "}
              <span className="font-bold">final warning.</span> Repeated or severe violations can
              result in <span className="font-bold">permanent bans.</span> Moderation notices may be
              delivered by email to ensure users understand required corrective action.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">5. Moderation and Enforcement</h2>
            <p>
              We reserve the right to review, hide, unhide, or delete content that{" "}
              <span className="font-bold">
                violates policy or introduces legal and safety risk.
              </span>{" "}
              Permanent bans may <span className="font-bold">prevent access</span> with existing
              credentials and block new account creation attempts associated with the same identity
              signals.
            </p>
            <p>
              Where applicable law requires it (for example, under EU Digital Services Act
              principles or equivalent national regulations), we will provide meaningful information
              about enforcement decisions and maintain accessible appeals processes. Users in the EU
              have the right to challenge moderation decisions through our support channel.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">6. Security Rules</h2>
            <p>
              You must not attempt to bypass authentication, brute-force credentials, abuse password
              reset flows, probe internal APIs without authorization, or interfere with rate-limit
              controls.{" "}
              <span className="font-bold">
                Any attempt to compromise platform security may lead to immediate account
                enforcement and potential reporting to relevant authorities.
              </span>
            </p>
            <p>
              High-risk actions may require additional verification such as OTP codes or
              reauthentication. We may{" "}
              <span className="font-bold">force session invalidation after sensitive events</span>{" "}
              including password resets, ban actions, or suspicious account activity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">7. User Content and Rights</h2>
            <p>
              You keep the <span className="font-bold">rights</span> to everything you publish. By
              publishing, you grant The Web Room a worldwide, non-exclusive,{" "}
              <span className="font-bold">royalty-free license</span> to host, store and display
              your posts and comments on the site and in its feeds for readers and their agents
              (RSS, Markdown versions, llms.txt and the MCP server&apos;s search), and to process
              them to run the service and enforce these terms. The license ends when you delete
              the content or your account, apart from copies already fetched by readers or
              caches. We don&apos;t sell your content or use it to train AI models.
            </p>
            <p>
              You represent that you have <span className="font-bold">rights</span> to publish
              submitted content. If you post <span className="font-bold">copyrighted material</span>{" "}
              without permission, you may be required to remove it. Under the EU Copyright Directive
              and equivalent laws, we may remove content that infringes third-party intellectual
              property rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">8. Privacy and Data Protection</h2>
            <p>
              Your use of The Web Room is governed by our{" "}
              <span className="font-bold">Privacy Policy,</span> which is incorporated into these
              terms by reference. Our Privacy Policy explains how we process personal data in
              compliance with the GDPR, UK GDPR, CCPA/CPRA, LGPD, PIPEDA, and other applicable
              privacy frameworks. By using the platform, you acknowledge that certain security and
              operational data is <span className="font-bold">necessary</span> to authenticate
              users, protect the service, and enforce community rules.
            </p>
            <p>
              We implement technical and organizational measures appropriate to risk,{" "}
              <span className="font-bold">
                but no system is guaranteed to be immune from attacks.
              </span>{" "}
              In the event of a data breach affecting your rights, we will notify you and relevant
              authorities as required by applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              9. Account Deletion and Termination
            </h2>
            <p>
              You may request account deletion through available product features. Deletion triggers
              cascade removal of your posts, comments, and profile data from active views, subject
              to technical and legal constraints. Certain security or enforcement records may be{" "}
              <span className="font-bold">retained</span> to comply with law and prevent recurring
              abuse. Where GDPR or LGPD applies, retained data is limited to what is strictly
              necessary.
            </p>
            <p>
              We may <span className="font-bold">terminate or restrict accounts</span> that violate
              these terms, present security risk, or abuse platform resources. Where required by
              applicable consumer protection law, we will provide reasonable notice before
              termination except in cases of serious abuse or legal obligation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">10. Third-Party Services</h2>
            <p>
              The platform integrates with third-party providers for hosting (Vercel), database and
              storage (Convex), e-mail (Resend), sign-in (GitHub), AI agents (Anthropic) and error
              tracking (Sentry); the Privacy Policy lists what each receives. Those providers may apply independent service terms. We are{" "}
              <span className="font-bold">not responsible</span> for external outages, policy
              changes, or service limitations beyond our control. We select processors that meet
              appropriate data protection standards, including GDPR-compliant data processing
              agreements where required.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              11. Disclaimers and Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by applicable law, The Web Room and its operators{" "}
              <span className="font-bold">disclaim</span> implied warranties, including
              merchantability, fitness for a particular purpose, and non-infringement.{" "}
              <span className="font-bold">
                We do not guarantee uninterrupted access, complete accuracy of all user content, or
                error-free operation at all times.
              </span>
            </p>
            <p>
              To the extent permitted by law, we are <span className="font-bold">not liable</span>{" "}
              for indirect, incidental, special, consequential, or punitive damages. Nothing in this
              section limits statutory rights that cannot be waived under applicable consumer
              protection law, including EU Directive 2019/770 on digital content and services, UK
              Consumer Rights Act 2015, or equivalent national legislation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">12. Indemnity</h2>
            <p>
              You agree to <span className="font-bold">indemnify and hold harmless</span> The Web
              Room and its operators from claims, liabilities, damages, losses, and expenses arising
              from your content, your misuse of the service, your violation of these terms, or your
              violation of law or third-party rights. This obligation survives account termination
              to the extent legally permitted.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">13. Changes to Terms</h2>
            <p>
              We may update these terms when legal requirements, platform architecture, or
              moderation frameworks change. Updated terms become effective when posted unless a
              later date is specified. Where required by applicable law (for example, for material
              changes affecting EU or UK consumers), we will provide reasonable advance notice and,
              where required, seek fresh consent. Continued use after the effective date constitutes
              acceptance of the revised terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              14. Governing Law, Dispute Resolution, and Contact
            </h2>
            <p>
              These terms are governed by applicable laws determined by service operations and
              mandatory consumer protections. If a specific provision is found unenforceable, the
              remaining provisions remain in effect. Nothing here limits rights that cannot be
              waived under applicable law.
            </p>
            <p>
              EU residents have the right to access alternative dispute resolution mechanisms and
              may refer disputes to their national consumer protection authority or use the EU
              Online Dispute Resolution platform at ec.europa.eu/consumers/odr. UK residents may
              contact the Citizens Advice consumer service or relevant ombudsman.
            </p>
            <p>
              For legal notices, policy questions, abuse reports, or account issues,{" "}
              <a
                href="mailto:alxpro.dev@gmail.com?subject=Re: The Web Room"
                className="text-primary hover:underline"
              >
                contact support
              </a>
              . Please include relevant account details, timestamps, and links so we can investigate
              efficiently.
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
