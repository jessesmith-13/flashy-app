import { useNavigation } from '../../../hooks/useNavigation'
import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { ArrowLeft } from 'lucide-react'

export function TermsScreen() {
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
            <h1 className="text-3xl text-gray-900 dark:text-gray-100">Terms of Use</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Last updated: November 5, 2025</p>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
            <div className="prose prose-emerald dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
              <h2>Agreement to Terms</h2>
              <p>
                By accessing or using Flashy, you agree to be bound by these Terms of Use and
                all applicable laws and regulations. If you do not agree with any of these
                terms, you are prohibited from using this application.
              </p>

              <h2>Use License</h2>
              <p>
                Permission is granted to temporarily use Flashy for personal, non-commercial
                learning purposes. This is the grant of a license, not a transfer of title,
                and under this license you may not:
              </p>
              <ul>
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose</li>
                <li>Attempt to reverse engineer any software contained in Flashy</li>
                <li>Remove any copyright or proprietary notations from the materials</li>
                <li>Transfer the materials to another person</li>
              </ul>

              <h2>User Accounts</h2>
              <p>
                When you create an account with us, you must provide information that is
                accurate, complete, and current at all times. Failure to do so constitutes a
                breach of the Terms, which may result in immediate termination of your account.
              </p>
              <p>
                You are responsible for safeguarding the password that you use to access the
                service and for any activities or actions under your password.
              </p>

              <h2>User Content</h2>
              <p>
                You retain all rights to the flashcard content you create. By publishing decks
                to the community, you grant us a license to display and distribute that
                content within the app.
              </p>
              <p>
                You are responsible for the content you create and must ensure it does not:
              </p>
              <ul>
                <li>Violate any intellectual property rights</li>
                <li>Contain offensive, inappropriate, or illegal material</li>
                <li>Harass, threaten, or defame others</li>
                <li>Contain spam or malicious content</li>
              </ul>

              <h2>Subscription and Payments</h2>
              <p>
                Some parts of the service are provided on a subscription basis. You will be
                billed in advance on a recurring basis according to your chosen plan (monthly,
                annual, or lifetime).
              </p>
              <p>
                Subscriptions automatically renew unless canceled before the renewal date.
                Refunds are handled on a case-by-case basis.
              </p>

              <h2>Prohibited Uses</h2>
              <p>You may not use Flashy:</p>
              <ul>
                <li>In any way that violates any applicable law or regulation</li>
                <li>To exploit, harm, or attempt to exploit or harm minors</li>
                <li>To transmit any advertising or promotional material</li>
                <li>To impersonate or attempt to impersonate the company or another user</li>
                <li>To engage in any automated use of the system</li>
              </ul>

              <h2>Intellectual Property</h2>
              <p>
                The service and its original content (excluding user-generated content),
                features, and functionality are and will remain the exclusive property of
                Flashy and its licensors. The service is protected by copyright, trademark,
                and other laws.
              </p>

              <h2>Termination</h2>
              <p>
                We may terminate or suspend your account immediately, without prior notice or
                liability, for any reason whatsoever, including without limitation if you
                breach the Terms. Upon termination, your right to use the service will
                immediately cease.
              </p>

              <h2>Limitation of Liability</h2>
              <p>
                In no event shall Flashy, nor its directors, employees, partners, agents,
                suppliers, or affiliates, be liable for any indirect, incidental, special,
                consequential or punitive damages, including without limitation, loss of
                profits, data, use, goodwill, or other intangible losses.
              </p>

              <h2>Disclaimer</h2>
              <p>
                The service is provided on an "AS IS" and "AS AVAILABLE" basis. The service is
                provided without warranties of any kind, whether express or implied.
              </p>

              <h2>Changes to Terms</h2>
              <p>
                We reserve the right to modify or replace these Terms at any time. If a
                revision is material, we will provide at least 30 days' notice prior to any
                new terms taking effect.
              </p>

              <h2>Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us through the
                Contact Us page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}