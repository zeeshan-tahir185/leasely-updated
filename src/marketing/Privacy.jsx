import LegalDoc from "./LegalDoc";
import { SITE } from "./site";

const SECTIONS = [
  {
    id: "intro",
    heading: "1. Introduction",
    content: (
      <>
        <p>
          This Privacy Policy explains how {SITE.legalEntity} ("Leasely", "we",
          "us") collects, uses, shares, and protects personal data when you use the
          Leasely platform and website (the "Service"). We are committed to handling
          personal data in line with the UAE Federal Decree-Law No. 45 of 2021 on
          the Protection of Personal Data (the "PDPL") and other applicable laws.
        </p>
        <p>
          By using the Service, you acknowledge the practices described here. Where
          you upload personal data about your tenants and staff, additional terms in
          section 5 apply.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    heading: "2. Data we collect",
    content: (
      <>
        <p>We collect the following categories of personal data:</p>
        <ul>
          <li>
            <strong>Account data</strong> — name, work email, phone number, company
            name, and role, provided when you register and manage your account.
          </li>
          <li>
            <strong>Customer Data</strong> — the records you enter to run your
            business, which may include personal data about your tenants, owners,
            and staff (names, contact details, contract and cheque details, payment
            history).
          </li>
          <li>
            <strong>Usage data</strong> — information about how you interact with the
            Service, such as pages viewed, actions taken, device and browser type,
            and approximate location derived from your IP address.
          </li>
          <li>
            <strong>Communications</strong> — messages you send us through contact
            forms, email, or support channels.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    heading: "3. How we use personal data",
    content: (
      <>
        <p>We use personal data to:</p>
        <ul>
          <li>Provide, operate, maintain, and secure the Service.</li>
          <li>Create and administer your account and authenticate users.</li>
          <li>Respond to your enquiries and provide customer support.</li>
          <li>Improve and develop features, and analyse how the Service is used.</li>
          <li>
            Send service-related communications and, where permitted, relevant
            updates about Leasely.
          </li>
          <li>Comply with legal obligations and enforce our terms.</li>
        </ul>
      </>
    ),
  },
  {
    id: "legal-basis",
    heading: "4. Legal basis for processing",
    content: (
      <p>
        We process personal data where it is necessary to perform our contract with
        you, where we have a legitimate interest that is not overridden by your
        rights, where you have given consent, or where we must comply with a legal
        obligation, in each case consistent with the PDPL.
      </p>
    ),
  },
  {
    id: "customer-data",
    heading: "5. Customer Data and your tenants",
    content: (
      <>
        <p>
          For the personal data you upload about your tenants, owners, and staff,
          <strong> you act as the controller</strong> and Leasely acts as a{" "}
          <strong>processor</strong> that processes that data on your instructions
          to provide the Service.
        </p>
        <p>As controller, you are responsible for:</p>
        <ul>
          <li>Having a valid legal basis to collect and process that data.</li>
          <li>Providing the required privacy notices to your data subjects.</li>
          <li>Responding to your data subjects' requests to exercise their rights.</li>
        </ul>
        <p>
          We will process Customer Data only as needed to provide the Service and in
          accordance with these terms.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    heading: "6. How we share personal data",
    content: (
      <>
        <p>We do not sell personal data. We share it only with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> — vetted vendors who host, support,
            or secure the Service, acting under contract and only as instructed.
          </li>
          <li>
            <strong>Legal and safety</strong> — authorities or third parties where
            required by law, to protect rights and safety, or to enforce our terms.
          </li>
          <li>
            <strong>Business transfers</strong> — a successor entity in connection
            with a merger, acquisition, or sale of assets, subject to this Policy.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "transfers",
    heading: "7. International transfers",
    content: (
      <p>
        Your data is primarily processed within the UAE. Where personal data is
        transferred outside the UAE, we take steps to ensure an adequate level of
        protection and that appropriate safeguards are in place, as required by the
        PDPL.
      </p>
    ),
  },
  {
    id: "retention",
    heading: "8. Data retention",
    content: (
      <p>
        We retain personal data for as long as your account is active and as needed
        to provide the Service, then for the period required to meet legal,
        accounting, or reporting obligations. You may request deletion of your data
        as described below, subject to those obligations.
      </p>
    ),
  },
  {
    id: "security",
    heading: "9. Security",
    content: (
      <p>
        We use technical and organisational measures to protect personal data,
        including role-based access controls that restrict financial visibility by
        role, isolation of each company's data, and secure development practices. No
        method of transmission or storage is completely secure, but we work to
        protect your data and to respond promptly to any incident.
      </p>
    ),
  },
  {
    id: "your-rights",
    heading: "10. Your rights",
    content: (
      <>
        <p>Subject to the PDPL, you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate or incomplete data.</li>
          <li>Request deletion of your data in certain circumstances.</li>
          <li>Object to or restrict certain processing.</li>
          <li>Request a copy of your data in a portable format.</li>
          <li>Withdraw consent where processing is based on consent.</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. We will respond within
          the timeframe required by law.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    heading: "11. Cookies and local storage",
    content: (
      <p>
        The Service uses cookies and browser local storage to keep you signed in,
        remember your preferences, and understand how the Service is used. You can
        control cookies through your browser settings; disabling them may affect how
        the Service works.
      </p>
    ),
  },
  {
    id: "children",
    heading: "12. Children's data",
    content: (
      <p>
        The Service is intended for business use and is not directed at children. We
        do not knowingly collect personal data from children. If you believe a child
        has provided us personal data, please contact us so we can remove it.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "13. Changes to this Policy",
    content: (
      <p>
        We may update this Privacy Policy from time to time. Material changes will
        be notified by posting the updated Policy with a new "last updated" date or
        by email where appropriate. Please review it periodically.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "14. Contact us",
    content: (
      <p>
        For any question about this Policy or your personal data, contact{" "}
        {SITE.legalEntity} at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or by
        post at {SITE.addressFull}.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalDoc
      title="Privacy Policy"
      intro="How Leasely collects, uses, and protects personal data — and your rights under UAE law."
      sections={SECTIONS}
    />
  );
}
