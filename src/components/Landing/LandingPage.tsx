import { Button } from '../../ui/button'
import { useStore } from '../../../store/useStore'
import { Zap, Brain, Users, Trophy, Sparkles, ArrowRight, Check, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function LandingPage() {
  const { setCurrentView, darkMode, toggleDarkMode } = useStore()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const logoLight="../../public/logoLight.png"
  const logoDark="../../public/logoDark.png"

  useEffect(() => {
    setIsDarkMode(darkMode)
  }, [darkMode])

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Learning',
      description: 'Generate flashcards instantly using advanced AI. Just provide a topic and let our AI create comprehensive study materials.'
    },
    {
      icon: Zap,
      title: 'Multiple Study Modes',
      description: 'Master your content with classic flashcards, multiple choice, matching games, timed challenges, and marathon sessions.'
    },
    {
      icon: Users,
      title: 'Community Decks',
      description: 'Access thousands of shared decks created by learners worldwide. Publish your own and help others succeed.'
    },
    {
      icon: Trophy,
      title: 'Achievement System',
      description: 'Stay motivated with achievements, streaks, and detailed progress tracking. Watch your knowledge grow over time.'
    }
  ]

  const benefits = [
    'Create unlimited flashcard decks',
    'Study anywhere with mobile-responsive design',
    'Track your progress with detailed analytics',
    'Connect with friends and share decks',
    'Dark mode for comfortable studying',
    'Export and share decks with QR codes'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img 
                src={isDarkMode ? logoDark : logoLight} 
                alt="Flashy Logo" 
                className="w-8 h-8"
              />
              <span className="text-xl text-gray-900 dark:text-gray-100">Flashy</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="text-gray-700 dark:text-gray-300"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCurrentView('login')}
                className="text-gray-700 dark:text-gray-300"
              >
                Sign In
              </Button>
              <Button
                onClick={() => setCurrentView('signup')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">AI-Powered Flashcard Learning</span>
              </div>
              <h1 className="text-5xl lg:text-6xl mb-6 text-gray-900 dark:text-gray-100">
                Learn Anything,{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  Fast
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                The most powerful flashcard app for students, professionals, and lifelong learners. 
                Create, study, and master any subject with AI assistance and proven learning techniques.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => setCurrentView('signup')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-8 py-6"
                >
                  Start Learning Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setCurrentView('login')}
                  className="text-lg px-8 py-6 border-gray-300 dark:border-gray-600"
                >
                  Sign In
                </Button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
                No credit card required • Free forever plan available
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-3xl blur-3xl opacity-20"></div>
              <img
                src="https://images.unsplash.com/photo-1752920299211-28be8c9b0121?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwc3R1ZHlpbmclMjBsZWFybmluZ3xlbnwxfHx8fDE3NjI4MDU0NTd8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Student learning"
                className="relative rounded-3xl shadow-2xl w-full h-[500px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl mb-4 text-gray-900 dark:text-gray-100">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful features designed to help you learn faster and retain more
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl mb-2 text-gray-900 dark:text-gray-100">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src="https://images.unsplash.com/photo-1759159482847-78aadfcbeb85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmFpbiUyMGtub3dsZWRnZSUyMGVkdWNhdGlvbnxlbnwxfHx8fDE3NjI4MDU0NTd8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Brain and learning"
                className="rounded-3xl shadow-2xl w-full h-[400px] object-cover"
              />
            </div>
            <div>
              <h2 className="text-4xl mb-6 text-gray-900 dark:text-gray-100">
                Why Choose Flashy?
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Join thousands of learners who are mastering new subjects every day with our comprehensive platform.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-emerald-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl mb-6 text-white">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-emerald-50 mb-8">
            Join Flashy today and start mastering new skills faster than ever before.
          </p>
          <Button
            size="lg"
            onClick={() => setCurrentView('signup')}
            className="bg-white text-emerald-600 hover:bg-gray-100 text-lg px-8 py-6"
          >
            Get Started for Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src={isDarkMode ? logoDark : logoLight} 
                  alt="Flashy Logo" 
                  className="w-8 h-8"
                />
                <span className="text-lg text-gray-900 dark:text-gray-100">Flashy</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Learn anything, fast. The most powerful flashcard app for modern learners.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-gray-900 dark:text-gray-100">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><button onClick={() => setCurrentView('signup')} className="hover:text-emerald-600 dark:hover:text-emerald-400">Features</button></li>
                <li><button onClick={() => setCurrentView('signup')} className="hover:text-emerald-600 dark:hover:text-emerald-400">Pricing</button></li>
                <li><button onClick={() => setCurrentView('signup')} className="hover:text-emerald-600 dark:hover:text-emerald-400">AI Generation</button></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-gray-900 dark:text-gray-100">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><button onClick={() => setCurrentView('login')} className="hover:text-emerald-600 dark:hover:text-emerald-400">About</button></li>
                <li><button onClick={() => setCurrentView('login')} className="hover:text-emerald-600 dark:hover:text-emerald-400">Blog</button></li>
                <li><button onClick={() => setCurrentView('login')} className="hover:text-emerald-600 dark:hover:text-emerald-400">Careers</button></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-gray-900 dark:text-gray-100">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><button onClick={() => setCurrentView('login')} className="hover:text-emerald-600 dark:hover:text-emerald-400">Privacy</button></li>
                <li><button onClick={() => setCurrentView('login')} className="hover:text-emerald-600 dark:hover:text-emerald-400">Terms</button></li>
                <li><button onClick={() => setCurrentView('login')} className="hover:text-emerald-600 dark:hover:text-emerald-400">Contact</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>© 2025 Flashy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
