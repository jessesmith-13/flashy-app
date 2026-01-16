import { useNavigation } from "../../../hooks/useNavigation";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/ui/button";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/shared/state/useStore";

export function TermsScreen() {
  const { navigateTo } = useNavigation();
  const { user } = useStore();

  const handleBack = () => {
    // Check if user came from signup (stored in sessionStorage)
    const fromSignup = sessionStorage.getItem("viewingPolicyFromSignup");

    if (fromSignup === "true") {
      sessionStorage.removeItem("viewingPolicyFromSignup");
      navigateTo("signup");
    } else if (user) {
      // User is logged in, go back to decks
      navigateTo("decks");
    } else {
      // Not logged in and didn't come from signup, go to landing
      navigateTo("landing");
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        <div className="max-w-3xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" onClick={handleBack} className="mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl text-gray-900 dark:text-gray-100">
              📜 Terms of Use (DRAFT)
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Effective Date: TBD
              <br />
              Last Updated: TBD
            </p>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
            <div className="space-y-8 text-gray-900 dark:text-gray-100">
              <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                <p className="text-base leading-relaxed">
                  Welcome to Flashy, a study and flashcard application
                  ("Service", "we", "us", "our"). By accessing or using Flashy,
                  you agree to be bound by these Terms of Use.
                </p>
                <p className="text-base leading-relaxed mt-3">
                  <strong>
                    If you do not agree, you may not use the Service.
                  </strong>
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  1. Eligibility
                </h2>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>
                    You must be at least 13 years old (or 16+ where required by
                    law) to use Flashy.
                  </li>
                  <li>
                    By using the Service, you represent that you are legally
                    permitted to do so.
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  2. Account Registration
                </h2>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>
                    You must provide accurate information during registration.
                  </li>
                  <li>
                    You are responsible for maintaining your password and
                    account access.
                  </li>
                  <li>
                    We are not liable for unauthorized access to your account.
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  3. Subscriptions & Billing
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Flashy offers:
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>Free tier</li>
                  <li>Monthly subscription</li>
                  <li>Annual subscription</li>
                  <li>Lifetime purchase</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3">
                  By purchasing a subscription, you authorize us or our payment
                  processor (e.g., Stripe, App Store) to charge your payment
                  method.
                </p>
                <div className="mt-4 pl-4 border-l-4 border-emerald-500 dark:border-emerald-600 space-y-2">
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-gray-100">
                      Auto-renewal:
                    </strong>
                    <br />
                    Monthly and annual plans renew automatically unless
                    canceled.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-gray-100">
                      Refunds:
                    </strong>
                    <br />
                    Except where required by law, all payments are
                    non-refundable.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  4. User Content
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  You may upload or create:
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>decks</li>
                  <li>cards</li>
                  <li>comments</li>
                  <li>images</li>
                  <li>profile information</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3">
                  By creating content, you grant us a non-exclusive, worldwide
                  license to host, display, and distribute your content within
                  the Service.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-4">
                  <strong className="text-gray-900 dark:text-gray-100">
                    You agree NOT to post:
                  </strong>
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>illegal content</li>
                  <li>hate speech</li>
                  <li>harassment</li>
                  <li>misinformation</li>
                  <li>copyrighted content you do not own</li>
                  <li>explicit material</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3 italic">
                  We may remove or moderate content at our discretion.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  5. AI-Generated Content
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Flashy uses AI to generate study materials. You understand and
                  agree:
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>AI output may be inaccurate</li>
                  <li>AI content does not constitute professional advice</li>
                  <li>You are responsible for verifying all information</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  6. Prohibited Conduct
                </h2>
                <p className="text-gray-700 dark:text-gray-300">You may not:</p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>misuse or disrupt the Service</li>
                  <li>upload malicious code</li>
                  <li>attempt to break security</li>
                  <li>reverse engineer any part of Flashy</li>
                  <li>scrape or mass-download community content</li>
                  <li>impersonate another user</li>
                  <li>use Flashy for commercial cheating services</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3 italic">
                  Violation may result in termination.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  7. Friends & Notifications
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  If you use the friends system, you agree not to:
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>spam friend requests</li>
                  <li>harass users</li>
                  <li>misuse notifications</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3 italic">
                  We reserve the right to limit or remove access.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  8. Termination
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We may suspend or remove your account at any time for:
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>misconduct</li>
                  <li>violating these Terms</li>
                  <li>fraudulent activity</li>
                  <li>harmful behavior</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3">
                  You may delete your account at any time within the app or by
                  contacting support.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  9. Intellectual Property
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Flashy, its branding, design, user interface, codebase, and
                  proprietary systems are the property of Flashy LLC (or your
                  business name).
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-3">
                  You may not use our trademarks or IP without permission.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  10. Limitation of Liability
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Flashy is provided "as is", without warranties. We are not
                  liable for:
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>data loss</li>
                  <li>downtime</li>
                  <li>inaccurate AI outputs</li>
                  <li>user-generated content</li>
                  <li>third-party service interruptions</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3">
                  To the maximum extent permitted by law, our liability is
                  limited to the amount you paid us in the past 12 months.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  11. Dispute Resolution
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  These Terms are governed by the laws of Washington State
                  (USA).
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                  Any disputes will be resolved via binding arbitration.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  12. Changes to the Terms
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We may update these Terms occasionally. Continued use of the
                  Service means you accept the changes.
                </p>
              </div>

              <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">
                  13. Contact
                </h2>
                <p className="text-gray-700 dark:text-gray-300">
                  If you have questions:
                  <br />
                  <strong className="text-gray-900 dark:text-gray-100">
                    Email:
                  </strong>{" "}
                  info@flashy.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
