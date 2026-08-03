import LegalLayout, { Section } from "../components/LegalLayout";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="August 2026">
      <Section heading="What we collect">
        <p>
          To create an account we store your email address, a hashed password, and the
          organization you belong to. When your organization ingests logs, we store the log
          content you send (level, service name, message, and related metadata) and the derived
          pattern hash used for clustering.
        </p>
      </Section>

      <Section heading="How we use it">
        <p>
          Your account details authenticate you and determine your role and organization. Log
          data is indexed and aggregated purely to power the dashboard, search, and pattern-cluster
          views you and your teammates see — nothing is used for advertising, and nothing is sold
          or shared with other organizations.
        </p>
      </Section>

      <Section heading="Multi-tenant isolation">
        <p>
          Every read path — search, live streaming, and aggregations — is scoped server-side to
          the organization derived from your authenticated session or API key. Your organization
          cannot read another organization&apos;s logs, and vice versa.
        </p>
      </Section>

      <Section heading="Local storage and cookies">
        <p>
          We store your session token and a few UI preferences (theme, dashboard time range) in
          your browser&apos;s local storage. We don&apos;t use third-party tracking or advertising
          cookies.
        </p>
      </Section>

      <Section heading="API keys">
        <p>
          API keys are stored hashed, the same way passwords are. The raw key is shown once, at
          generation time, and cannot be retrieved again afterward — only regenerated.
        </p>
      </Section>

      <Section heading="Data retention">
        <p>
          Log data persists until your organization stops using the product or requests deletion.
          Account data persists for as long as your account exists.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We may update this policy as the product changes. Material changes will be reflected
          here with an updated date at the top of this page.
        </p>
      </Section>
    </LegalLayout>
  );
}
