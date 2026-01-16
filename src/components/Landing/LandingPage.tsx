import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "../../../hooks/useNavigation";
import {
  Zap,
  Brain,
  Users,
  Trophy,
  Sparkles,
  ArrowRight,
  Check,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";

export function LandingPage() {
  const { darkMode, toggleDarkMode } = useStore();
  const { navigateTo } = useNavigation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const logoLight = "/logoLight.png";
  const logoDark = "/logoDark.png";
  useEffect(() => {
    setIsDarkMode(darkMode);
  }, [darkMode]);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description:
        "Generate flashcards instantly using advanced AI. Just provide a topic and let our AI create comprehensive study materials.",
    },
    {
      icon: Zap,
      title: "Multiple Study Modes",
      description:
        "Master your content with classic flashcards, multiple choice, matching games, timed challenges, and marathon sessions.",
    },
    {
      icon: Users,
      title: "Community Decks",
      description:
        "Access thousands of shared decks created by learners worldwide. Publish your own and help others succeed.",
    },
    {
      icon: Trophy,
      title: "Achievement System",
      description:
        "Stay motivated with achievements, streaks, and detailed progress tracking. Watch your knowledge grow over time.",
    },
  ];

  const benefits = [
    "Create unlimited flashcard decks",
    "Study anywhere with mobile-responsive design",
    "Track your progress with detailed analytics",
    "Connect with friends and share decks",
    "Dark mode for comfortable studying",
    "Export and share decks with QR codes",
  ];

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
              <span className="text-xl text-gray-900 dark:text-gray-100">
                Flashy
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="text-gray-700 dark:text-gray-300"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigateTo("login")}
                className="text-gray-700 dark:text-gray-300"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigateTo("signup")}
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
                Learn Anything,{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  in a Flash
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                The most powerful flashcard app for students, professionals, and
                lifelong learners. Create, study, and master any subject with AI
                assistance and proven learning techniques.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigateTo("signup")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-8 py-6"
                >
                  Start Learning Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigateTo("login")}
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

              {/* App Screenshots Showcase */}
              <div className="relative grid grid-cols-2 gap-4">
                {/* Main large screenshot */}
                <div className="col-span-2 rounded-3xl shadow-2xl overflow-hidden bg-white dark:bg-gray-800 border-4 border-gray-200 dark:border-gray-700">
                  <div className="bg-gradient-to-br from-emerald-500 to-blue-600 p-8 text-white">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <Brain className="w-6 h-6" />
                      </div>
                      <span className="text-xl">Study Mode</span>
                    </div>
                    <div className="bg-white rounded-2xl p-8 text-gray-900 min-h-[200px] flex items-center justify-center shadow-xl">
                      <div className="text-center">
                        <h3 className="text-3xl mb-2">What is React?</h3>
                        <p className="text-gray-500">Click to reveal answer</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Two smaller screenshots side by side */}
                <div className="rounded-2xl shadow-xl overflow-hidden bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5" />
                      <span className="text-sm">Achievements</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                        🏆
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">Quick Learner</div>
                        <div className="text-xs text-gray-500">
                          Complete 10 cards
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-400 flex items-center justify-center">
                        ✨
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">Study Streak</div>
                        <div className="text-xs text-gray-500">
                          7 days in a row
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl shadow-xl overflow-hidden bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5" />
                      <span className="text-sm">AI Generate</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-500 mb-2">Topic</div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 mb-2 text-sm">
                      World History
                    </div>
                    <div className="bg-emerald-500 text-white rounded-lg p-2 text-center text-sm">
                      Generate Cards
                    </div>
                  </div>
                </div>
              </div>
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
              Powerful features designed to help you learn faster and retain
              more
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

      {/* Benefits Section - Interactive Flip Flashcard */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Click to flip the card and see why thousands choose Flashy
            </p>
          </div>

          {/* Flip Card Container */}
          <div
            className="cursor-pointer"
            style={{ perspective: "1000px" }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div
              className="relative w-full h-[500px] sm:h-[500px] transition-all duration-700"
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front of Card */}
              <div
                className="absolute inset-0 rounded-3xl shadow-2xl"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="h-full bg-white dark:bg-gray-800 border-4 border-emerald-500 dark:border-emerald-600 rounded-3xl p-6 sm:p-12 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-6 sm:mb-8">
                    <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                  </div>
                  <h2 className="text-3xl sm:text-5xl text-center text-gray-900 dark:text-gray-100 mb-4">
                    Why Choose Flashy?
                  </h2>
                  <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 text-center">
                    Tap to reveal
                  </p>
                  <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Back of Card */}
              <div
                className="absolute inset-0 rounded-3xl shadow-2xl"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="h-full bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border-4 border-emerald-500 dark:border-emerald-600 rounded-3xl p-6 sm:p-12 flex flex-col justify-center overflow-y-auto">
                  <h3 className="text-xl sm:text-3xl text-gray-900 dark:text-gray-100 mb-6 sm:mb-8 text-center">
                    Join thousands of learners who are mastering new subjects
                    every day
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {benefits.map((benefit, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 sm:gap-3"
                      >
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <span className="text-sm sm:text-lg text-gray-700 dark:text-gray-300">
                          {benefit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-white rotate-180 animate-pulse" />
                    </div>
                  </div>
                </div>
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
            Join Flashy today and start mastering new skills faster than ever
            before.
          </p>
          <Button
            size="lg"
            onClick={() => navigateTo("signup")}
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
                  src={
                    isDarkMode
                      ? "../../../public/logoDark.png"
                      : "../../../public/logoLight.png"
                  }
                  alt="Flashy Logo"
                  className="w-8 h-8"
                />
                <span className="text-lg text-gray-900 dark:text-gray-100">
                  Flashy
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Learn anything, fast. The most powerful flashcard app for modern
                learners.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-gray-900 dark:text-gray-100">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <button
                    onClick={() => navigateTo("signup")}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateTo("signup")}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateTo("signup")}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    AI Generation
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-gray-900 dark:text-gray-100">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <button
                    onClick={() => navigateTo("login")}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    About
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateTo("login")}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    Blog
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateTo("login")}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    Careers
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-gray-900 dark:text-gray-100">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  <button
                    onClick={() => navigateTo("login")}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    Privacy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateTo("login")}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    Terms
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateTo("login")}
                    className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>© 2025 Flashy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
