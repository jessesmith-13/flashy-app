import { useNavigation } from '../../../hooks/useNavigation'
import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { ArrowLeft } from 'lucide-react'

export function PrivacyPolicyScreen() {
  const { navigateTo } = useNavigation()

  return (
    <AppLayout>
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        <div className="max-w-3xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigateTo('decks')}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl text-gray-900 dark:text-gray-100">🔒 Privacy Policy (DRAFT)</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Effective Date: TBD<br />
              Last Updated: TBD
            </p>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
            <div className="space-y-8 text-gray-900 dark:text-gray-100">
              <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
                <p className="text-base leading-relaxed">
                  Flashy ("we", "us", "our") respects your privacy.
                  This Privacy Policy explains what data we collect, why, and how we use it.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">1. Information We Collect</h2>
                
                <div className="space-y-3">
                  <h3 className="text-lg text-gray-900 dark:text-gray-100">Information you provide:</h3>
                  <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                    <li>Email, password, and display name</li>
                    <li>Profile picture (optional)</li>
                    <li>Decks and flashcards you create</li>
                    <li>Study progress & performance</li>
                    <li>Friend relationships</li>
                    <li>Comments and community interactions</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg text-gray-900 dark:text-gray-100">Automatic Data:</h3>
                  <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                    <li>Device information</li>
                    <li>App usage data</li>
                    <li>IP address</li>
                    <li>Cookies (on web)</li>
                    <li>Crash logs</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg text-gray-900 dark:text-gray-100">AI Data:</h3>
                  <p className="text-gray-700 dark:text-gray-300">When generating cards using AI:</p>
                  <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                    <li>Prompt text</li>
                    <li>Input language</li>
                    <li>Associated deck metadata</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">2. How We Use Your Data</h2>
                <p className="text-gray-700 dark:text-gray-300">We use your information to:</p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>Operate and maintain Flashy</li>
                  <li>Sync decks and progress across devices</li>
                  <li>Generate AI-powered cards</li>
                  <li>Send notifications</li>
                  <li>Improve app performance</li>
                  <li>Provide customer support</li>
                  <li>Detect fraud or abuse</li>
                </ul>
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <p className="text-gray-900 dark:text-gray-100">
                    <strong>We do not sell your personal data.</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">3. How We Share Information</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We share data only with trusted service providers:
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li><strong className="text-gray-900 dark:text-gray-100">Supabase</strong> (database, authentication, storage)</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">OpenAI</strong> (for AI-generated flashcards)</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Stripe or App Store / Google Play</strong> (payment processing)</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Analytics providers</strong> (optional)</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3 italic">
                  These partners only receive the minimum data necessary.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">4. Data Retention</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We retain user data for as long as your account is active.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                  You may request deletion at any time.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">5. User Rights</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Depending on your location, you may have the right to:
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>Access your data</li>
                  <li>Correct your data</li>
                  <li>Delete your data</li>
                  <li>Export your data</li>
                  <li>Opt out of analytics</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3">
                  Submit requests via email.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">6. Cookies and Tracking</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Our web version may use cookies to:
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>keep you logged in</li>
                  <li>remember preferences</li>
                  <li>perform analytics</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3 italic">
                  You can disable cookies but some features may break.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">7. Children's Privacy</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  Flashy is not directed to children under 13.<br />
                  We do not knowingly collect data from minors.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-3">
                  If you believe a minor is using the Service, contact us immediately.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">8. Data Security</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We use industry-standard security practices:
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>TLS encryption</li>
                  <li>Secure tokens</li>
                  <li>Supabase managed security</li>
                  <li>Restricted access controls</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 mt-3 italic">
                  However, no system is 100% secure.
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">9. International Users</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  If you live outside the United States:
                </p>
                <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  <li>Your data may be transferred to the US</li>
                  <li>We comply with GDPR and similar regulations where required</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">10. Changes to This Policy</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  We may update this Privacy Policy occasionally.<br />
                  We will notify users of major changes.
                </p>
              </div>

              <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-xl text-gray-900 dark:text-gray-100">11. Contact</h2>
                <p className="text-gray-700 dark:text-gray-300">
                  For privacy questions or requests:<br />
                  <strong className="text-gray-900 dark:text-gray-100">Email:</strong> info@flashy.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
