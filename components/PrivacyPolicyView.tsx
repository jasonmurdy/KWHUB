import React from 'react';

const PrivacyPolicyView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-surface rounded-2xl shadow-m3-sm border border-outline/30">
      <h1 className="text-3xl font-bold text-on-surface mb-2">Privacy Policy</h1>
      <p className="text-on-surface-variant mb-6">Last Updated: October 26, 2023</p>

      <div className="prose prose-sm md:prose-base max-w-none text-on-surface-variant prose-headings:text-on-surface prose-strong:text-on-surface">
        <p>Welcome to KW Hub (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.</p>

        <h2>1. Information We Collect</h2>
        <p>We may collect information about you in a variety of ways. The information we may collect includes:</p>
        <ul>
          <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and profile picture, that you voluntarily give to us when you register with the application.</li>
          <li><strong>User Content:</strong> All data you create within the application, including but not limited to project details, tasks, comments, attachments, and templates.</li>
          <li><strong>Integration Data:</strong> If you choose to connect third-party services like Google Drive or Google Calendar, we may access and store data from those services as necessary to provide the integration features. This access is governed by the authorization procedures of the respective service.</li>
          <li><strong>Usage Data:</strong> Information our servers automatically collect when you access the app, such as your IP address, browser type, operating system, access times, and the pages you have viewed directly before and after accessing the app.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you to:</p>
        <ul>
          <li>Create and manage your account.</li>
          <li>Operate and maintain the KW Hub application.</li>
          <li>Enable collaboration between you and your team members.</li>
          <li>Monitor and analyze usage and trends to improve your experience.</li>
          <li>Notify you of updates and other important communications.</li>
          <li>Respond to your comments and questions and provide customer service.</li>
        </ul>

        <h2>3. Disclosure of Your Information</h2>
        <p>We do not share your information with third parties except in the circumstances described below:</p>
        <ul>
          <li><strong>With Your Team:</strong> Your User Content is shared with other members of the projects and teams you belong to, as this is a core function of the collaborative platform.</li>
          <li><strong>Third-Party Service Providers:</strong> We use Firebase (a Google service) for backend infrastructure, including database, authentication, and hosting. Your data is stored on Firebase servers.</li>
          <li><strong>By Law or to Protect Rights:</strong> We may disclose your information if required to do so by law or in the good faith belief that such action is necessary to (i) comply with a legal obligation, (ii) protect and defend our rights or property, or (iii) protect the personal safety of users or the public.</li>
        </ul>
        
        <h2>4. Security of Your Information</h2>
        <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>

        <h2>5. Your Rights and Choices</h2>
        <p>You may at any time review or change the information in your account or terminate your account. You can update your profile information from the settings page. If you terminate your account, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, and/or comply with legal requirements.</p>

        <h2>6. Contact Us</h2>
        <p>If you have questions or comments about this Privacy Policy, please contact us at: support@kwhub.app</p>
      </div>
    </div>
  );
};

export default PrivacyPolicyView;
