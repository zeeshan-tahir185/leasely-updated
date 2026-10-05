import LegalDoc from "./LegalDoc";
import { SITE } from "./site";

const SECTIONS = [
  {
    id: "agreement",
    heading: "1. Agreement to these terms",
    content: (
      <>
        <p>
          These Terms &amp; Conditions ("Terms") govern your access to and use of
          the Leasely property-management platform, websites, and related services
          (together, the "Service"), provided by {SITE.legalEntity} ("Leasely",
          "we", "us", or "our").
        </p>
        <p>
          By creating an account, accessing, or using the Service, you agree to be
          bound by these Terms on behalf of yourself and the company you represent
          ("you" or "Customer"). If you do not agree, do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "service",
    heading: "2. The Service",
    content: (
      <>
        <p>
          Leasely helps real-estate management firms run their operations —
          including rent collection and post-dated cheque tracking, leasing and
          contracts, finance and accounting, and related property-management
          workflows. Features may be added, changed, or removed over time.
        </p>
        <p>
          <strong>Current status.</strong> The Service is presently provided as a
          prototype for demonstration and evaluation. Data you enter may be stored
          locally in your browser, and authentication and billing are simulated.
          Do not rely on the prototype as a system of record or for storing
          confidential production data until advised otherwise in writing.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    heading: "3. Accounts and registration",
    content: (
      <>
        <p>You are responsible for:</p>
        <ul>
          <li>Providing accurate, current, and complete registration information.</li>
          <li>Maintaining the confidentiality of your login credentials.</li>
          <li>All activity that occurs under your account and those of your team.</li>
          <li>
            Ensuring each member of your team uses their own account and that
            access roles are assigned appropriately.
          </li>
        </ul>
        <p>
          Notify us promptly at{" "}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> of any unauthorised use
          of your account or any other breach of security.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    heading: "4. Acceptable use",
    content: (
      <>
        <p>You agree not to, and not to permit anyone to:</p>
        <ul>
          <li>Use the Service in violation of any applicable law or regulation.</li>
          <li>
            Upload unlawful, infringing, or malicious content, or data you have no
            right to process.
          </li>
          <li>
            Attempt to gain unauthorised access to the Service, other accounts, or
            our systems and networks.
          </li>
          <li>
            Reverse engineer, resell, or copy the Service except as expressly
            permitted.
          </li>
          <li>
            Interfere with or disrupt the integrity or performance of the Service.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-data",
    heading: "5. Your data",
    content: (
      <>
        <p>
          As between you and Leasely, you own all data and content you and your
          team submit to the Service ("Customer Data"), including tenant, contract,
          cheque, and financial records. You grant us a limited licence to host,
          process, and display Customer Data solely to provide and improve the
          Service and as described in our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
        <p>
          You are responsible for the accuracy and legality of Customer Data and
          for obtaining any consents required to process the personal data of your
          tenants and staff.
        </p>
      </>
    ),
  },
  {
    id: "fees",
    heading: "6. Fees and payment",
    content: (
      <>
        <p>
          Pricing for paid plans is provided on request and is based on the scale
          of your portfolio. Where fees apply, you agree to pay all charges for
          your selected plan. Unless stated otherwise, fees are exclusive of
          applicable taxes, including UAE Value Added Tax (VAT), which will be
          added where required by law.
        </p>
        <p>
          During the prototype phase, no fees are charged. Any future paid terms
          will be presented to you before they take effect.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    heading: "7. Intellectual property",
    content: (
      <p>
        The Service, including its software, design, branding, and content
        (excluding Customer Data), is owned by {SITE.legalEntity} and its licensors
        and is protected by intellectual-property laws. These Terms grant you a
        limited, non-exclusive, non-transferable right to use the Service; no other
        rights are granted.
      </p>
    ),
  },
  {
    id: "third-party",
    heading: "8. Third-party services",
    content: (
      <p>
        The Service may integrate with or link to third-party services (for
        example, payment, banking, or email providers). We are not responsible for
        third-party services, and your use of them is governed by their own terms.
      </p>
    ),
  },
  {
    id: "disclaimers",
    heading: "9. Disclaimers",
    content: (
      <p>
        The Service is provided "as is" and "as available". To the fullest extent
        permitted by law, we disclaim all warranties, express or implied, including
        merchantability, fitness for a particular purpose, and non-infringement. We
        do not warrant that the Service will be uninterrupted, error-free, or
        secure, and the Service does not constitute legal, financial, tax, or
        accounting advice.
      </p>
    ),
  },
  {
    id: "liability",
    heading: "10. Limitation of liability",
    content: (
      <p>
        To the fullest extent permitted by law, Leasely and its affiliates will not
        be liable for any indirect, incidental, special, consequential, or punitive
        damages, or any loss of profits, revenue, data, or goodwill. Our total
        aggregate liability arising out of or relating to the Service will not
        exceed the amount you paid to us in the twelve (12) months preceding the
        event giving rise to the claim, or, during the prototype phase, AED 0.
      </p>
    ),
  },
  {
    id: "indemnity",
    heading: "11. Indemnification",
    content: (
      <p>
        You agree to indemnify and hold harmless {SITE.legalEntity} and its
        officers, employees, and agents from any claims, damages, and expenses
        (including reasonable legal fees) arising from your Customer Data, your use
        of the Service, or your breach of these Terms.
      </p>
    ),
  },
  {
    id: "termination",
    heading: "12. Term and termination",
    content: (
      <p>
        These Terms apply while you use the Service. You may stop using the Service
        at any time. We may suspend or terminate your access if you breach these
        Terms or if we discontinue the Service. On termination, your right to use
        the Service ceases; you may request an export of your Customer Data before
        your account is closed, subject to the Privacy Policy.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "13. Changes to these terms",
    content: (
      <p>
        We may update these Terms from time to time. If we make material changes,
        we will take reasonable steps to notify you, such as by posting the updated
        Terms with a new "last updated" date or by email. Continued use of the
        Service after changes take effect constitutes acceptance of the revised
        Terms.
      </p>
    ),
  },
  {
    id: "law",
    heading: "14. Governing law and jurisdiction",
    content: (
      <p>
        These Terms are governed by the laws of {SITE.jurisdiction}, without regard
        to conflict-of-laws principles. The courts of Dubai, United Arab Emirates
        will have exclusive jurisdiction over any dispute arising out of or in
        connection with these Terms, unless otherwise required by applicable law.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "15. Contact",
    content: (
      <p>
        Questions about these Terms can be sent to {SITE.legalEntity} at{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>, or by post to{" "}
        {SITE.addressFull}.
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalDoc
      title="Terms & Conditions"
      intro="The terms under which you and your company may use Leasely. Please read them carefully."
      sections={SECTIONS}
    />
  );
}
