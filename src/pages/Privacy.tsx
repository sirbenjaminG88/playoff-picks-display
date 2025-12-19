import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Link 
            to="/support" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Support
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Emma Playoff Picks ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, and safeguard your information when you use our mobile application and services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Information We Collect</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p><strong className="text-foreground">Account Information:</strong> When you create an account, we collect your email address and display name.</p>
              <p><strong className="text-foreground">Usage Data:</strong> We collect information about how you use the app, including your player picks, league participation, and feature interactions.</p>
              <p><strong className="text-foreground">Device Information:</strong> We may collect device type, operating system version, and app version for troubleshooting and analytics purposes.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">How We Use Your Information</h2>
            <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
              <li>To provide and maintain the Emma Playoff Picks service</li>
              <li>To manage your account and league memberships</li>
              <li>To calculate and display fantasy scores and leaderboards</li>
              <li>To send important updates about the app or your leagues</li>
              <li>To improve our services and user experience</li>
              <li>To respond to your support requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Data Sharing</h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>We do not sell your personal information to third parties.</p>
              <p>
                <strong className="text-foreground">League Members:</strong> Your display name, picks (after lock), and scores are visible to other members of your leagues.
              </p>
              <p>
                <strong className="text-foreground">Service Providers:</strong> We use trusted third-party services (such as cloud hosting and authentication providers) to operate our app. These providers only access your data as necessary to perform their services.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your information, including encryption in transit and at rest. 
              However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account information and game data for as long as your account is active. You may request deletion of 
              your account and associated data by contacting us at support@emmaplayoffpicks.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Your Rights</h2>
            <ul className="text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
              <li>Access and download your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account</li>
              <li>Opt out of promotional communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Emma Playoff Picks is not intended for children under 13 years of age. We do not knowingly collect 
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
              Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:support@emmaplayoffpicks.com" className="text-primary hover:underline">
                support@emmaplayoffpicks.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="pt-8 mt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Emma Playoff Picks. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Privacy;
