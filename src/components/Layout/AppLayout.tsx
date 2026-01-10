import { ReactNode, useState, useEffect } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigation } from '../../../hooks/useNavigation'
import { useLocation } from 'react-router-dom'
import { signOut } from '../../../utils/api/auth'
import { Button } from '../../ui/button'
import { Home, Users, User, LogOut, Crown, Layers, Settings, Shield, FileText, Mail, Menu, ShieldAlert } from 'lucide-react'
import { NotificationCenter } from '../Notifications/NotificationCenter'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '../../ui/sheet'
import { useIsSuperuser, useIsModerator } from '../../../utils/userUtils'
const logoLight = '/logoLight.png'
const logoDark = '/logoDark.png'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, currentSection, setCurrentSection, logout } = useStore()
  const { navigateTo } = useNavigation()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const isSuperuser = useIsSuperuser()
  const isModerator = useIsModerator()

    // 🔍 DEBUG - What's actually in the store?
  console.log('🔍 AppLayout - Full user object:', user)
  console.log('🔍 subscriptionTier:', user?.subscriptionTier)
  console.log('🔍 All user keys:', user ? Object.keys(user) : 'no user')
  
  // Determine current view from URL path
  const currentView = location.pathname.split('/')[1] || 'landing'

  useEffect(() => {
    // Check if dark mode is enabled
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    // Watch for changes to dark mode
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
      logout()
      // Navigate to landing page after logout
      navigateTo('landing')
    } catch (error) {
      console.error('Failed to logout:', error)
    }
  }

  const handleSectionChange = (section: 'flashcards' | 'community' | 'profile') => {
    // Clear shared deck hash if present
    if (window.location.hash.includes('/shared/')) {
      window.location.hash = ''
    }
    
    setCurrentSection(section)
    if (section === 'flashcards') {
      navigateTo('decks')
    } else if (section === 'community') {
      navigateTo('community')
    } else if (section === 'profile') {
      navigateTo('profile')
    }
  }

  const handleMobileMenuItemClick = (view: string) => {
    // Clear shared deck hash if present
    if (window.location.hash.includes('/shared/')) {
      window.location.hash = ''
    }
    
    navigateTo(view as any)
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar - Only show when logged in */}
      {user && (
        <aside className="hidden lg:flex lg:flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 fixed h-full">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <img 
                src={isDarkMode ? logoDark : logoLight} 
                alt="Flashy Logo" 
                className="w-10 h-10"
              />
              <div className="flex-1">
                <h1 className="text-xl text-gray-900 dark:text-gray-100">Flashy</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Learn anything, fast</p>
              </div>
              <NotificationCenter />
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Main Sections */}
            <button
              onClick={() => handleSectionChange('flashcards')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentSection === 'flashcards' && ['decks', 'deck-detail', 'study', 'study-options', 'ai-generate'].includes(currentView)
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>My Flashcards</span>
            </button>

            <button
              onClick={() => handleSectionChange('community')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentSection === 'community' && currentView === 'community'
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Community</span>
            </button>

            <button
              onClick={() => handleSectionChange('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentSection === 'profile' && currentView === 'profile'
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

            {/* Additional Options */}
            {(!user?.subscriptionTier || user?.subscriptionTier === 'free') && (
              <button
                onClick={() => {
                  // Clear shared deck hash if present
                  if (window.location.hash.includes('/shared/')) {
                    window.location.hash = ''
                  }
                  setCurrentSection('flashcards') // Clear section highlight
                  navigateTo('upgrade')
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === 'upgrade'
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                }`}
              >
                <Crown className="w-5 h-5" />
                <span>Upgrade</span>
              </button>
            )}

            <button
              onClick={() => {
                // Clear shared deck hash if present
                if (window.location.hash.includes('/shared/')) {
                  window.location.hash = ''
                }
                setCurrentSection('flashcards') // Clear section highlight
                navigateTo('all-cards')
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'all-cards'
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Layers className="w-5 h-5" />
              <span>All Cards</span>
            </button>

            <button
              onClick={() => {
                // Clear shared deck hash if present
                if (window.location.hash.includes('/shared/')) {
                  window.location.hash = ''
                }
                setCurrentSection('flashcards') // Clear section highlight
                navigateTo('settings')
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'settings'
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>

            {/* Superuser Tools - Only visible to superusers */}
            {isSuperuser && (
              <button
                onClick={() => {
                  // Clear shared deck hash if present
                  if (window.location.hash.includes('/shared/')) {
                    window.location.hash = ''
                  }
                  setCurrentSection('flashcards') // Clear section highlight
                  navigateTo('superuser')
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === 'superuser'
                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700'
                    : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-purple-200 dark:border-purple-700'
                }`}
              >
                <ShieldAlert className="w-5 h-5" />
                <span>Superuser Tools</span>
              </button>
            )}

            {/* Moderator Tools - Only visible to moderators */}
            {isModerator && (
              <button
                onClick={() => {
                  // Clear shared deck hash if present
                  if (window.location.hash.includes('/shared/')) {
                    window.location.hash = ''
                  }
                  setCurrentSection('flashcards') // Clear section highlight
                  navigateTo('moderator')
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === 'moderator'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700'
                    : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                }`}
              >
                <Shield className="w-5 h-5" />
                <span>Moderator Tools</span>
              </button>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

            {/* Legal & Support */}
            <button
              onClick={() => {
                // Clear shared deck hash if present
                if (window.location.hash.includes('/shared/')) {
                  window.location.hash = ''
                }
                setCurrentSection('flashcards') // Clear section highlight
                navigateTo('privacy')
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'privacy'
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-sm">Privacy Policy</span>
            </button>

            <button
              onClick={() => {
                // Clear shared deck hash if present
                if (window.location.hash.includes('/shared/')) {
                  window.location.hash = ''
                }
                setCurrentSection('flashcards') // Clear section highlight
                navigateTo('terms')
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'terms'
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-sm">Terms of Use</span>
            </button>

            <button
              onClick={() => {
                // Clear shared deck hash if present
                if (window.location.hash.includes('/shared/')) {
                  window.location.hash = ''
                }
                setCurrentSection('flashcards') // Clear section highlight
                navigateTo('contact')
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'contact'
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Mail className="w-5 h-5" />
              <span className="text-sm">Contact Us</span>
            </button>
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate text-gray-900 dark:text-gray-100">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </aside>
      )}

      {/* Mobile Header - Only show when logged in */}
      {user && (
        <div className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <img 
                src={isDarkMode ? logoDark : logoLight} 
                alt="Flashy Logo" 
                className="w-7 h-7"
              />
              <span className="text-lg text-gray-900 dark:text-gray-100">Flashy</span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Mobile Navigation */}
          <div className="flex border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleSectionChange('flashcards')}
              className={`flex-1 flex flex-col items-center gap-1 py-2 ${
                currentSection === 'flashcards'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Flashcards</span>
            </button>
            <button
              onClick={() => handleSectionChange('community')}
              className={`flex-1 flex flex-col items-center gap-1 py-2 ${
                currentSection === 'community'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-xs">Community</span>
            </button>
            <button
              onClick={() => handleSectionChange('profile')}
              className={`flex-1 flex flex-col items-center gap-1 py-2 ${
                currentSection === 'profile'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-xs">Profile</span>
            </button>
            
            {/* More Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className={`flex-1 flex flex-col items-center gap-1 py-2 ${
                    mobileMenuOpen
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Menu className="w-5 h-5" />
                  <span className="text-xs">More</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Navigation menu with access to all app features
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  {/* Upgrade (only show for free users) */}
                  {(!user?.subscriptionTier || user?.subscriptionTier === 'free') && (
                    <button
                      onClick={() => handleMobileMenuItemClick('upgrade')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        currentView === 'upgrade'
                          ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      <Crown className="w-5 h-5" />
                      <span>Upgrade to Premium</span>
                    </button>
                  )}

                  {/* All Cards */}
                  <button
                    onClick={() => handleMobileMenuItemClick('all-cards')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      currentView === 'all-cards'
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                    <span>All Cards</span>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => handleMobileMenuItemClick('settings')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      currentView === 'settings'
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </button>

                  {/* Superuser Tools - Only visible to superusers */}
                  {isSuperuser && (
                    <button
                      onClick={() => handleMobileMenuItemClick('superuser')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        currentView === 'superuser'
                          ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700'
                          : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-purple-200 dark:border-purple-700'
                      }`}
                    >
                      <ShieldAlert className="w-5 h-5" />
                      <span>Superuser Tools</span>
                    </button>
                  )}

                  {/* Moderator Tools - Only visible to moderators */}
                  {isModerator && (
                    <button
                      onClick={() => handleMobileMenuItemClick('moderator')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        currentView === 'moderator'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700'
                          : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                      <span>Moderator Tools</span>
                    </button>
                  )}

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                  {/* Privacy Policy */}
                  <button
                    onClick={() => handleMobileMenuItemClick('privacy')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      currentView === 'privacy'
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Shield className="w-5 h-5" />
                    <span>Privacy Policy</span>
                  </button>

                  {/* Terms of Use */}
                  <button
                    onClick={() => handleMobileMenuItemClick('terms')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      currentView === 'terms'
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span>Terms of Use</span>
                  </button>

                  {/* Contact Us */}
                  <button
                    onClick={() => handleMobileMenuItemClick('contact')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      currentView === 'contact'
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Mail className="w-5 h-5" />
                    <span>Contact Us</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${user ? 'lg:ml-64 pt-[120px] lg:pt-0' : ''} overflow-x-hidden`}>
        {children}
      </main>
    </div>
  )
}