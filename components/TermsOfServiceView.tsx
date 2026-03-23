import React from 'react';

const TermsOfServiceView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-surface rounded-2xl shadow-m3-sm border border-outline/30">
      <h1 className="text-3xl font-bold text-on-surface mb-2">Terms of Service</h1>
      <p className="text-on-surface-variant mb-6">Last Updated: October 26, 2023</p>

      <div className="prose prose-sm md:prose-base max-w-none text-on-surface-variant prose-headings:text-on-surface prose-strong:text-on-surface">
        <p>Please read these Terms of Service (&quot;Terms&quot;, &quot;Terms of Service&quot;) carefully before using the KW Hub application (the &quot;Service&quot;) operated by us.</p>
        <p>Your access to and use of the Service is conditioned upon your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who wish to access or use the Service.</p>

        <h2>1. Accounts</h2>
        <p>When you create an account with us, you guarantee that you are above the age of 18, and that the information you provide us is accurate, complete, and current at all times. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</p>

        <h2>2. User Content</h2>
        <p>Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material (&quot;User Content&quot;). You are responsible for the User Content that you post on or through the Service, including its legality, reliability, and appropriateness.</p>
        <p>You retain any and all of your rights to any User Content you submit, post or display on or through the Service and you are responsible for protecting those rights. We take no responsibility and assume no liability for User Content you or any third party posts on or through the Service.</p>

        <h2>3. Acceptable Use</h2>
        <p>You agree not to use the Service for any unlawful purpose or any purpose prohibited under this clause. You agree not to use the Service in any way that could damage the Service, the services, or the general business of KW Hub.</p>
        <ul>
            <li>You further agree not to use the Service to:</li>
            <li>Harass, abuse, or threaten others or otherwise violate any person&apos;s legal rights.</li>
            <li>Violate any intellectual property rights of us or any third party.</li>
            <li>Upload or otherwise disseminate any computer viruses or other software that may damage the property of another.</li>
            <li>Engage in any form of fraudulent activity.</li>
        </ul>

        <h2>4. Termination</h2>
        <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.</p>

        <h2>5. Disclaimer and Limitation of Liability</h2>
        <p>The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. The Service is provided without warranties of any kind, whether express or implied. In no event shall KW Hub, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>

        <h2>6. Changes</h2>
        <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

        <h2>7. Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us at: support@kwhub.app</p>
      </div>
    </div>
  );
};

export default TermsOfServiceView;
