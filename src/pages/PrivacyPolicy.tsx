import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 11, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground">
              Welcome to Mallige Manager ("we", "our", "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
            <p className="text-muted-foreground">We collect the following types of information:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Account Information:</strong> Name, email address, and password when you create an account.</li>
              <li><strong>Business Data:</strong> Jasmine (mallige) entries, quantities, rates, earnings, and payment records that you voluntarily enter.</li>
              <li><strong>Usage Data:</strong> How you interact with our app, including pages visited and features used.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>To provide and maintain our service</li>
              <li>To track your jasmine business entries and calculate earnings</li>
              <li>To provide AI-powered assistance and insights about your data</li>
              <li>To send important notifications about your account</li>
              <li>To improve our application and user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
            <p className="text-muted-foreground">
              Your data is encrypted and stored securely. We use industry-standard security measures including encrypted connections (HTTPS), secure authentication, and row-level security policies to ensure your data is only accessible to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell, trade, or rent your personal information to third parties. Your business data (entries, rates, earnings) is private and visible only to you. We may share anonymized, aggregated data for analytical purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Cookies & Analytics</h2>
            <p className="text-muted-foreground">
              We use essential cookies to maintain your session and preferences. We may use analytics tools to understand how users interact with our app. These tools collect anonymized usage data only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Access and download your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us through the AI Assistant within the app or email us at support@malligemanager.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
