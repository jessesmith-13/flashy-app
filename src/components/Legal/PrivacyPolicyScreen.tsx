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
            <h1 className="text-3xl text-gray-900 dark:text-gray-100">Privacy Policy</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Last updated: November 5, 2025</p>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
            <div className="prose prose-emerald dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
              <h2>Introduction</h2>
              <p>
                At Flashy, we take your privacy seriously. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your information when you use our
                flashcard learning application.
              </p>

              <h2>Information We Collect</h2>
              <h3>Personal Information</h3>
              <p>
                When you create an account, we collect information such as your name, email
                address, and profile information. We use this information to provide and
                improve our services.
              </p>

              <h3>Usage Data</h3>
              <p>
                We automatically collect information about how you interact with our app,
                including study sessions, card creation, and deck management. This helps us
                understand how our app is used and improve the user experience.
              </p>

              <h3>Flashcard Content</h3>
              <p>
                The flashcards you create are stored securely in our database. Only you can
                access your private decks unless you choose to publish them to the community.
              </p>

              <h2>How We Use Your Information</h2>
              <ul>
                <li>To provide and maintain our service</li>
                <li>To notify you about changes to our service</li>
                <li>To provide customer support</li>
                <li>To gather analysis or valuable information to improve our service</li>
                <li>To monitor the usage of our service</li>
                <li>To detect, prevent and address technical issues</li>
              </ul>

              <h2>Data Security</h2>
              <p>
                We use industry-standard security measures to protect your personal
                information. However, no method of transmission over the Internet or
                electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>

              <h2>Third-Party Services</h2>
              <p>
                We may use third-party services that collect, monitor and analyze data to
                help us improve our service. These third parties have access to your personal
                information only to perform specific tasks on our behalf and are obligated
                not to disclose or use it for any other purpose.
              </p>

              <h2>Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Request transfer of your data</li>
              </ul>

              <h2>Children's Privacy</h2>
              <p>
                Our service is not intended for children under 13. We do not knowingly
                collect personal information from children under 13. If you are a parent or
                guardian and believe your child has provided us with personal information,
                please contact us.
              </p>

              <h2>Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any
                changes by posting the new Privacy Policy on this page and updating the "Last
                updated" date.
              </p>

              <h2>Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us through
                the Contact Us page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}