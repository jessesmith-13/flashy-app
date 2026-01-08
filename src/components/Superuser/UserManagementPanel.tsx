import { useState, useEffect } from 'react'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Input } from '../../ui/input'
import { ScrollArea } from '../../ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { 
  Users, 
  Shield, 
  Ban, 
  Search, 
  Crown,
  Calendar,
  UserX,
  UserCheck,
  ShieldCheck,
  ShieldOff,
  Mail,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { getAllUsers, toggleModeratorStatus, banUser, grantPremium, demotePremium } from '../../../utils/api/admin'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog'
import { Textarea } from '../../ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { Label } from '../../ui/label'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'

interface User {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  isSuperuser: boolean
  isModerator: boolean
  subscriptionTier: string
  subscriptionExpiry: string | null
  subscriptionCancelledAtPeriodEnd: boolean
  isBanned: boolean
  bannedReason: string | null
  bannedAt: string | null
  bannedBy: string | null
  createdAt: string
  lastSignInAt: string
}

interface UserManagementPanelProps {
  accessToken: string
}

export function UserManagementPanel({ accessToken }: UserManagementPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('all')
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<'ban' | 'unban' | 'makeMod' | 'removeMod' | 'grantPremium' | 'demotePremium' | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [banReason, setBanReason] = useState('')
  const [premiumReason, setPremiumReason] = useState('')
  const [customPremiumReason, setCustomPremiumReason] = useState('')
  const [premiumTier, setPremiumTier] = useState('annual')

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, selectedTab])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const allUsers = await getAllUsers(accessToken)
      
      // Debug: Log the first few users to see the subscription tier data
      console.log('🔍 User data sample:', allUsers.slice(0, 3).map(u => ({
        id: u.id,
        email: u.email,
        subscriptionTier: u.subscriptionTier,
        subscriptionExpiry: u.subscriptionExpiry
      })))
      
      setUsers(allUsers)
    } catch (error: any) {
      console.error('Failed to load users:', error)
      toast.error(error.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Filter by tab
    if (selectedTab === 'moderators') {
      filtered = filtered.filter(u => u.isModerator && !u.isSuperuser)
    } else if (selectedTab === 'banned') {
      filtered = filtered.filter(u => u.isBanned)
    } else {
      // 'all' tab - show everyone except superusers (we don't manage them here)
      // You can change this logic if you want to show superusers too
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(u => 
        (u.displayName || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query) ||
        (u.id || '').toLowerCase().includes(query)
      )
    }

    setFilteredUsers(filtered)
  }

  const handleAction = (user: User, action: 'ban' | 'unban' | 'makeMod' | 'removeMod' | 'grantPremium' | 'demotePremium') => {
    setSelectedUser(user)
    setDialogAction(action)
    setBanReason('')
    setDialogOpen(true)
  }

  const confirmAction = async () => {
    if (!selectedUser || !dialogAction) return

    try {
      setActionInProgress(selectedUser.id)

      if (dialogAction === 'ban') {
        if (!banReason.trim()) {
          toast.error('Please provide a ban reason')
          return
        }
        await banUser(accessToken, selectedUser.id, true, banReason)
        toast.success(`${selectedUser.displayName} has been banned`)
      } else if (dialogAction === 'unban') {
        await banUser(accessToken, selectedUser.id, false)
        toast.success(`${selectedUser.displayName} has been unbanned`)
      } else if (dialogAction === 'makeMod') {
        await toggleModeratorStatus(accessToken, selectedUser.id, true)
        toast.success(`${selectedUser.displayName} is now a moderator`)
      } else if (dialogAction === 'removeMod') {
        await toggleModeratorStatus(accessToken, selectedUser.id, false)
        toast.success(`${selectedUser.displayName} is no longer a moderator`)
      } else if (dialogAction === 'grantPremium') {
        if (!premiumReason.trim()) {
          toast.error('Please select a reason')
          return
        }
        if (!premiumTier) {
          toast.error('Please select a tier')
          return
        }
        await grantPremium(accessToken, selectedUser.id, premiumReason, premiumTier, customPremiumReason || undefined)
        const tierName = premiumTier === 'monthly' ? 'monthly' : premiumTier === 'annual' ? 'annual' : 'lifetime'
        toast.success(`${selectedUser.displayName} has been granted ${tierName} premium`)
      } else if (dialogAction === 'demotePremium') {
        await demotePremium(accessToken, selectedUser.id)
        toast.success(`${selectedUser.displayName} has been demoted from premium`)
      }

      // Reload users
      await loadUsers()
      setDialogOpen(false)
      setSelectedUser(null)
      setDialogAction(null)
    } catch (error: any) {
      console.error('Action failed:', error)
      toast.error(error.message || 'Action failed')
    } finally {
      setActionInProgress(null)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSubscriptionBadgeColor = (tier: string) => {
    switch (tier) {
      case 'lifetime':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'annual':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'monthly':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const moderatorCount = users.filter(u => u.isModerator && !u.isSuperuser).length
  const bannedCount = users.filter(u => u.isBanned).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-1">
            User Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {users.length} total users
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadUsers}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by name, email, or user ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">All Users</span>
            <span className="sm:hidden">All</span>
            <span className="text-xs">({users.length})</span>
          </TabsTrigger>
          <TabsTrigger value="moderators" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Moderators</span>
            <span className="sm:hidden">Mods</span>
            <span className="text-xs">({moderatorCount})</span>
          </TabsTrigger>
          <TabsTrigger value="banned" className="flex items-center gap-2">
            <Ban className="w-4 h-4" />
            <span className="hidden sm:inline">Banned</span>
            <span className="sm:hidden">Ban</span>
            <span className="text-xs">({bannedCount})</span>
          </TabsTrigger>
        </TabsList>

        {/* All Users Tab */}
        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-[600px] rounded-xl border border-gray-200 dark:border-gray-700">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No users found' : 'No users'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {filteredUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onAction={handleAction}
                    actionInProgress={actionInProgress}
                    formatDate={formatDate}
                    getSubscriptionBadgeColor={getSubscriptionBadgeColor}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Moderators Tab */}
        <TabsContent value="moderators" className="mt-4">
          <ScrollArea className="h-[600px] rounded-xl border border-gray-200 dark:border-gray-700">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No moderators found' : 'No moderators'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {filteredUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onAction={handleAction}
                    actionInProgress={actionInProgress}
                    formatDate={formatDate}
                    getSubscriptionBadgeColor={getSubscriptionBadgeColor}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Banned Users Tab */}
        <TabsContent value="banned" className="mt-4">
          <ScrollArea className="h-[600px] rounded-xl border border-gray-200 dark:border-gray-700">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Ban className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No banned users found' : 'No banned users'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {filteredUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onAction={handleAction}
                    actionInProgress={actionInProgress}
                    formatDate={formatDate}
                    getSubscriptionBadgeColor={getSubscriptionBadgeColor}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === 'ban' && 'Ban User'}
              {dialogAction === 'unban' && 'Unban User'}
              {dialogAction === 'makeMod' && 'Make Moderator'}
              {dialogAction === 'removeMod' && 'Remove Moderator'}
              {dialogAction === 'grantPremium' && 'Grant Premium'}
              {dialogAction === 'demotePremium' && 'Demote Premium'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'ban' && (
                <>
                  Are you sure you want to ban {selectedUser?.displayName}? They will be notified and lose access to their account.
                  <Textarea
                    placeholder="Reason for ban (required)..."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="mt-4"
                    rows={3}
                  />
                </>
              )}
              {dialogAction === 'unban' && (
                `Are you sure you want to unban ${selectedUser?.displayName}? They will regain access to their account.`
              )}
              {dialogAction === 'makeMod' && (
                `Are you sure you want to make ${selectedUser?.displayName} a moderator? They will gain moderation privileges.`
              )}
              {dialogAction === 'removeMod' && (
                `Are you sure you want to remove ${selectedUser?.displayName} from moderators? They will lose moderation privileges.`
              )}
              {dialogAction === 'grantPremium' && (
                `Grant ${selectedUser?.displayName} premium access with a specific tier and reason.`
              )}
              {dialogAction === 'demotePremium' && (
                `Are you sure you want to demote ${selectedUser?.displayName} from premium? They will lose premium access.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Grant Premium Form (outside AlertDialogDescription to avoid nesting issues) */}
          {dialogAction === 'grantPremium' && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Grant {selectedUser?.displayName} premium access.
              </p>
              
              <div>
                <Label htmlFor="premium-tier">Tier</Label>
                <Select
                  value={premiumTier}
                  onValueChange={setPremiumTier}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                    <SelectItem value="annual">Annual (1 year)</SelectItem>
                    <SelectItem value="lifetime">Lifetime (forever)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="premium-reason">Reason</Label>
                <Select
                  value={premiumReason}
                  onValueChange={setPremiumReason}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="—" disabled className="text-xs">
                      Support & Customer Service
                    </SelectItem>
                    <SelectItem value="Billing Issue / Refund Adjustment">
                      Billing Issue / Refund Adjustment
                    </SelectItem>
                    <SelectItem value="Technical Problem Compensation">
                      Technical Problem Compensation
                    </SelectItem>
                    <SelectItem value="Account Recovery Assistance">
                      Account Recovery Assistance
                    </SelectItem>
                    
                    <SelectItem value="—" disabled className="text-xs">
                      Marketing & Growth
                    </SelectItem>
                    <SelectItem value="Promotional Access / Discount Event">
                      Promotional Access / Discount Event
                    </SelectItem>
                    <SelectItem value="Beta Tester Reward">
                      Beta Tester Reward
                    </SelectItem>
                    <SelectItem value="Influencer / Content Creator Support">
                      Influencer / Content Creator Support
                    </SelectItem>
                    <SelectItem value="Referral Reward">
                      Referral Reward
                    </SelectItem>
                    
                    <SelectItem value="—" disabled className="text-xs">
                      Community & Contribution
                    </SelectItem>
                    <SelectItem value="High-Value Community Contributor">
                      High-Value Community Contributor
                    </SelectItem>
                    <SelectItem value="Official Flashy Deck Creator Program">
                      Official Flashy Deck Creator Program
                    </SelectItem>
                    
                    <SelectItem value="—" disabled className="text-xs">
                      Administrative
                    </SelectItem>
                    <SelectItem value="Internal Testing / QA">
                      Internal Testing / QA
                    </SelectItem>
                    <SelectItem value="Manual Upgrade / Admin Decision">
                      Manual Upgrade / Admin Decision
                    </SelectItem>
                    <SelectItem value="Lifetime Premium Grant">
                      Lifetime Premium Grant
                    </SelectItem>
                    
                    <SelectItem value="—" disabled className="text-xs">
                      User Retention
                    </SelectItem>
                    <SelectItem value="Retention Save / Churn Prevention">
                      Retention Save / Churn Prevention
                    </SelectItem>
                    <SelectItem value="Goodwill Gesture">
                      Goodwill Gesture
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="custom-reason">Additional Notes (Optional)</Label>
                <Textarea
                  id="custom-reason"
                  placeholder="Add any additional context..."
                  value={customPremiumReason}
                  onChange={(e) => setCustomPremiumReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionInProgress !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={actionInProgress !== null}
              className={
                dialogAction === 'ban' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : dialogAction === 'unban'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }
            >
              {actionInProgress ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>Confirm</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// User Card Component
interface UserCardProps {
  user: User
  onAction: (user: User, action: 'ban' | 'unban' | 'makeMod' | 'removeMod' | 'grantPremium' | 'demotePremium') => void
  actionInProgress: string | null
  formatDate: (date: string) => string
  getSubscriptionBadgeColor: (tier: string) => string
}

function UserCard({ user, onAction, actionInProgress, formatDate, getSubscriptionBadgeColor }: UserCardProps) {
  const isProcessing = actionInProgress === user.id
  const { setViewingUserId, setUserProfileReturnView } = useStore()
  const { navigateTo } = useNavigation()

  const handleViewProfile = () => {
    // Set the user to view and where to return to
    setUserProfileReturnView('superuser')
    setViewingUserId(user.id)
    // Navigate to community which will show the user profile
    navigateTo('community')
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-emerald-500 dark:hover:border-emerald-500 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* User Info */}
        <div 
          className="flex-1 min-w-0 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/10 -m-4 p-4 rounded-lg transition-all group"
          onClick={handleViewProfile}
        >
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {user.displayName}
            </h3>
            
            {/* Role Badges */}
            {user.isSuperuser && (
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 shrink-0">
                <Crown className="w-3 h-3 mr-1" />
                Flashy
              </Badge>
            )}
            {user.isModerator && !user.isSuperuser && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 shrink-0">
                <Shield className="w-3 h-3 mr-1" />
                Moderator
              </Badge>
            )}
            {user.isBanned && (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 shrink-0">
                <Ban className="w-3 h-3 mr-1" />
                Banned
              </Badge>
            )}
          </div>

          {/* Email */}
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>

          {/* Subscription Tier - FIXED HERE */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={getSubscriptionBadgeColor(user.subscriptionTier || 'free')}>
              {user.subscriptionTier ? user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1) : 'Free'}
            </Badge>
            
            {/* Subscription Expiry */}
            {user.subscriptionExpiry && user.subscriptionTier !== 'lifetime' && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {user.subscriptionCancelledAtPeriodEnd ? 'Ends' : 'Renews'} {new Date(user.subscriptionExpiry).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Ban Info */}
          {user.isBanned && user.bannedReason && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-800 dark:text-red-300">
                <span className="font-medium">Ban Reason:</span> {user.bannedReason}
              </p>
              {user.bannedBy && (
                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                  Banned by {user.bannedBy} on {formatDate(user.bannedAt!)}
                </p>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mt-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>Joined {formatDate(user.createdAt)}</span>
            </div>
            {user.lastSignInAt && (
              <div className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 shrink-0" />
                <span>Last seen {formatDate(user.lastSignInAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!user.isSuperuser && (
          <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto shrink-0">
            {/* Moderator Toggle */}
            {!user.isBanned && (
              user.isModerator ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(user, 'removeMod')}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none min-h-[44px]"
                >
                  <ShieldOff className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Remove Mod</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(user, 'makeMod')}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-none min-h-[44px]"
                >
                  <ShieldCheck className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Make Mod</span>
                </Button>
              )
            )}

            {/* Ban/Unban */}
            {user.isBanned ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction(user, 'unban')}
                disabled={isProcessing}
                className="text-green-600 hover:text-green-700 flex-1 sm:flex-none min-h-[44px]"
              >
                <UserCheck className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Unban</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction(user, 'ban')}
                disabled={isProcessing}
                className="text-red-600 hover:text-red-700 flex-1 sm:flex-none min-h-[44px]"
              >
                <UserX className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Ban</span>
              </Button>
            )}

            {/* Grant Premium / Demote Premium */}
            {!user.isBanned && (
              user.subscriptionTier !== 'free' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(user, 'demotePremium')}
                  disabled={isProcessing}
                  className="text-orange-600 hover:text-orange-700 flex-1 sm:flex-none min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Demote to Free</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAction(user, 'grantPremium')}
                  disabled={isProcessing}
                  className="text-blue-600 hover:text-blue-700 flex-1 sm:flex-none min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Grant Premium</span>
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}