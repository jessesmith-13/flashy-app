import { useState, useEffect } from 'react'

const logoLight = '/logoLight.png'
const logoDark = '/logoDark.png'
interface AuthHeaderProps {
  onBackToHome?: () => void
  subtitle?: string
}

export function AuthHeader({ onBackToHome, subtitle = "Welcome back!" }: AuthHeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)

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

  return (
    <div className="text-center mb-8">
      {onBackToHome && (
        <button 
          onClick={onBackToHome}
          className="mb-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1 mx-auto"
        >
          ← Back to home
        </button>
      )}
      <div className="flex justify-center items-center gap-3 mb-4">
        <img 
          src={isDarkMode ? logoDark : logoLight} 
          alt="Flashy Logo" 
          className="h-16 w-auto"
        />
        <h1 className="text-4xl dark:text-gray-100">Flashy</h1>
      </div>
      <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>
    </div>
  )
}
