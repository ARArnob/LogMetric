import LegalLayout, { Section } from "../components/LegalLayout";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="August 2026">
      <Section heading="1. What LogMetric is">
        <p>
          LogMetric is a log-ingestion and observability platform. An organization sends log
          events to us via an API key, and we index, cluster, and display those events back to
          that organization&apos;s own members. This is a student-built design project, not a
          commercial service — these terms describe how the software behaves, not a contract with
          a company.
        </p>
      </Section>

      <Section heading="2. Accounts and organizations">
        <p>
          Creating an account creates an organization. Anyone who signs up with an invite code
          joins the inviting organization instead of creating a new one. You are responsible for
          the accuracy of the information you provide and for keeping your password and any
          generated API keys confidential.
        </p>
        <p>
          Organization admins can invite teammates, promote or demote other members, and generate
          API keys for that organization. Every read of log data is scoped to your own
          organization — no user can read another organization&apos;s logs through this product.
        </p>
      </Section>

      <Section heading="3. Acceptable use">
        <p>
          Don&apos;t use LogMetric to ingest data you don&apos;t have the right to collect, to
          attempt to access another organization&apos;s data, or to disrupt the service for other
          users. API keys are hashed at rest and are shown in full exactly once, at generation
          time — treat a leaked key as compromised and generate a new one.
        </p>
      </Section>

      <Section heading="4. Your log data">
        <p>
          Log content you send us is yours. We process it to provide the product — indexing,
          pattern clustering, aggregation, and display — and do not sell it or share it with other
          organizations. You can stop sending data at any time by revoking or not using your API
          key.
        </p>
      </Section>

      <Section heading="5. Availability">
        <p>
          This is a design project running on limited infrastructure. We don&apos;t guarantee
          uptime, and features described as planned or in-progress (visible in the product as
          clearly labelled placeholders) are not yet live.
        </p>
      </Section>

      <Section heading="6. Changes">
        <p>
          We may update these terms as the product changes. Continuing to use LogMetric after an
          update means you accept the revised terms.
        </p>
      </Section>
    </LegalLayout>
  );
}
