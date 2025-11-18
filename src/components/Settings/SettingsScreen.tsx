import { useState } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import { AppLayout } from '../Layout/AppLayout'
import { Button } from '../../ui/button'
import { ArrowLeft, Crown } from 'lucide-react'
import { toast } from 'sonner'
import * as api from '../../../utils/api'
import { SubscriptionSection } from './SubscriptionSection'
import { NotificationsSection } from './NotificationsSection'
import { AppearanceSection } from './AppearanceSection'
import { DataPrivacySection } from './DataPrivacySection'
import { DangerZoneSection } from './DangerZoneSection'
import { CancelSubscriptionDialog } from './CancelSubscriptionDialog'
import { DeleteAccountDialog } from './DeleteAccountDialog'

export function SettingsScreen() {
  const { darkMode, setDarkMode, userAchievements, setUserAchievements, user, accessToken, updateUser } = useStore()
  const { navigateTo } = useNavigation()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [emailOffers, setEmailOffers] = useState(true)
  const [emailCommentReplies, setEmailCommentReplies] = useState(true)
  const [emailFriendRequests, setEmailFriendRequests] = useState(true)
  const [autoBackup, setAutoBackup] = useState(true)
  // Initialize from user data, default to true if undefined
  const [decksPublic, setDecksPublic] = useState(user?.decksPublic ?? true)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled)
    
    // Unlock dark mode achievement if studying in dark mode
    if (enabled && userAchievements && !userAchievements.studiedInDarkMode) {
      setUserAchievements({
        ...userAchievements,
        studiedInDarkMode: true
      })
    }
  }

  const handleDecksPublicToggle = async (enabled: boolean) => {
    if (!accessToken) return
    
    setDecksPublic(enabled)
    
    try {
      await api.updateProfile(accessToken, {
        decksPublic: enabled
      })
      
      // Update local state
      updateUser({
        decksPublic: enabled
      })
      
      toast.success(enabled ? 'Decks are now public' : 'Decks are now private')
    } catch (error) {
      console.error('Failed to update decks visibility:', error)
      toast.error('Failed to update decks visibility')
      // Revert the toggle on error
      setDecksPublic(!enabled)
    }
  }

  const handleExportData = () => {
    toast.success('Data export feature coming soon!')
  }

  const handleDeleteAccount = () => {
    toast.error('Please contact support to delete your account')
  }

  const getSubscriptionDisplay = () => {
    if (!user?.subscriptionTier) return { name: 'Free', color: 'gray', icon: Crown }
    
    switch (user.subscriptionTier) {
      case 'lifetime':
        return { name: 'Lifetime Premium', color: 'purple', icon: Crown }
      case 'annual':
        return { name: 'Annual Premium', color: 'emerald', icon: Crown }
      case 'monthly':
        return { name: 'Monthly Premium', color: 'blue', icon: Crown }
      default:
        return { name: 'Free', color: 'gray', icon: Crown }
    }
  }

  const handleCancelSubscription = async () => {
    if (!accessToken) return
    
    setCancelling(true)
    try {
      // Update subscription to free tier
      await api.updateProfile(accessToken, {
        subscriptionTier: 'free',
        subscriptionExpiry: undefined
      })
      
      // Update local state
      updateUser({
        subscriptionTier: 'free',
        subscriptionExpiry: undefined
      })
      
      toast.success('Subscription cancelled successfully')
      setShowCancelDialog(false)
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      toast.error('Failed to cancel subscription. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const isPremiumSubscription = user?.subscriptionTier && ['monthly', 'annual', 'lifetime'].includes(user.subscriptionTier)
  const canCancelSubscription = user?.subscriptionTier && ['monthly', 'annual'].includes(user.subscriptionTier)
  const subscriptionInfo = getSubscriptionDisplay()

  return (
    <AppLayout>
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto p-4 lg:p-8">
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
            <h1 className="text-3xl text-gray-900 dark:text-gray-100">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your app preferences</p>
          </div>

          {/* Settings Sections */}
          <div className="space-y-6">
            <SubscriptionSection
              user={user}
              isPremiumSubscription={isPremiumSubscription}
              canCancelSubscription={canCancelSubscription}
              subscriptionInfo={subscriptionInfo}
              onUpgrade={() => navigateTo('upgrade')}
              onCancelSubscription={() => setShowCancelDialog(true)}
            />

            <NotificationsSection
              userEmail={user?.email}
              emailNotifications={emailNotifications}
              emailOffers={emailOffers}
              emailCommentReplies={emailCommentReplies}
              emailFriendRequests={emailFriendRequests}
              onEmailNotificationsChange={setEmailNotifications}
              onEmailOffersChange={setEmailOffers}
              onEmailCommentRepliesChange={setEmailCommentReplies}
              onEmailFriendRequestsChange={setEmailFriendRequests}
            />

            <AppearanceSection
              darkMode={darkMode}
              onDarkModeChange={handleDarkModeToggle}
            />

            <DataPrivacySection
              autoBackup={autoBackup}
              decksPublic={decksPublic}
              onAutoBackupChange={setAutoBackup}
              onDecksPublicChange={handleDecksPublicToggle}
              onExportData={handleExportData}
            />

            <DangerZoneSection
              onDeleteAccount={() => setShowDeleteDialog(true)}
            />
          </div>
        </div>
      </div>

      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        subscriptionName={subscriptionInfo.name}
        cancelling={cancelling}
        onConfirm={handleCancelSubscription}
      />

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteAccount}
      />
    </AppLayout>
  )
}