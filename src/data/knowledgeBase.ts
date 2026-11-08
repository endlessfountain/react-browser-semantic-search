export interface DocEntry {
  id: string;
  category: "Auth" | "Billing" | "Webhooks" | "Security" | "Infra";
  title: string;
  body: string;
}

export const KNOWLEDGE_BASE: DocEntry[] = [
  {
    id: "doc-01",
    category: "Auth",
    title: "Two-Factor Authentication (2FA) Recovery & SSO Lockouts",
    body: "Reset lost authenticator TOTP devices, generate backup recovery codes, and resolve SAML single sign-on login rejections.",
  },
  {
    id: "doc-02",
    category: "Billing",
    title: "Prorated Seat Upgrades & Mid-Cycle Invoice Adjustments",
    body: "How monthly subscription charges adjust automatically when adding or removing team members mid-billing period.",
  },
  {
    id: "doc-03",
    category: "Webhooks",
    title: "Idempotency Keys & Exponential Backoff for Event Retries",
    body: "Prevent duplicate payment processing when network timeouts trigger repeated HTTP POST webhook deliveries.",
  },
  {
    id: "doc-04",
    category: "Security",
    title: "GDPR Right-to-Erasure & Automated PII Redaction",
    body: "Permanently purge customer personal records across primary PostgreSQL replicas and audit exports within 30 days.",
  },
  {
    id: "doc-05",
    category: "Infra",
    title: "Diagnosing Container OOMKilled Exit Code 137 on Kubernetes",
    body: "Profile pod working-set memory spikes, configure cgroup limits, and stop worker restarts under burst traffic.",
  },
  {
    id: "doc-06",
    category: "Auth",
    title: "Rotating Compromised API Bearer Tokens Without Downtime",
    body: "Issue overlapping dual-active secret keys with a 24-hour grace window before revoking leaked credentials.",
  },
  {
    id: "doc-07",
    category: "Billing",
    title: "Handling Declined Cards, Dunning Emails & Grace Periods",
    body: "Configure smart retry schedules for expired credit cards before downgrading workspaces to read-only tiers.",
  },
  {
    id: "doc-08",
    category: "Infra",
    title: "HTTP 429 Too Many Requests: Token-Bucket Rate Limiting",
    body: "Inspect Retry-After headers, batch bulk API reads, and avoid throttling on public REST endpoints.",
  },
];
