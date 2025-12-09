import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { ScrollArea } from '@/components/ui/scroll-area';

const TermsPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Terms of Service & Privacy Policy</h1>
        
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6 pr-4">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                Welcome to PotatoGram. By using this application, you agree to be bound by these Terms of Service. 
                Please read them carefully before using the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Administrator Access</h2>
              <p className="text-muted-foreground mb-2">
                <strong className="text-foreground">Important Notice:</strong> PotatoGram administrators have special access privileges 
                to ensure platform safety and compliance. These privileges include:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>The ability to view all messages sent between users on the platform</li>
                <li>The ability to access any user account without requiring a password for moderation purposes</li>
                <li>The ability to assign verification badges to users</li>
                <li>The ability to view all user data and activity</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                By using PotatoGram, you acknowledge and consent to these administrative capabilities. 
                Administrators are bound by strict confidentiality requirements and these powers are only 
                used for platform moderation, safety enforcement, and user support.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Verification Badges</h2>
              <p className="text-muted-foreground mb-2">
                PotatoGram offers three types of verification badges:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li><span className="text-primary">Blue Badge</span> - Reserved for developers and administrators</li>
                <li><span className="text-destructive">Red Badge</span> - Awarded for various achievements or recognition</li>
                <li><span className="text-yellow-500">Gold Badge</span> - Designated for test accounts</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Badges are assigned at the sole discretion of administrators and cannot be requested or purchased.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Privacy & Data</h2>
              <p className="text-muted-foreground">
                Your messages and data are stored securely. However, as noted above, administrators have access 
                to all data for moderation purposes. We recommend not sharing sensitive personal information 
                such as financial details, passwords to other services, or other confidential data through 
                the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. User Conduct</h2>
              <p className="text-muted-foreground">
                Users are expected to behave respectfully and lawfully. Harassment, spam, illegal content, 
                and abuse of the platform will result in account suspension or termination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Private Accounts</h2>
              <p className="text-muted-foreground">
                Users can make their accounts private. When an account is private, only approved followers 
                can see posts, stories, and notes. However, administrators retain full access regardless 
                of privacy settings for moderation purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use of the service 
                after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these terms, please contact the administrator through the app.
              </p>
            </section>

            <div className="text-center text-sm text-muted-foreground pt-6 border-t border-border">
              <p>Last updated: December 9, 2025</p>
              <p>Version 3.0</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  );
};

export default TermsPage;