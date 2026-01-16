import { Button } from "@/shared/ui/button";
import { useNavigation } from "@/shared/hooks/useNavigation";
import { ArrowRight, Brain, Sparkles, Trophy } from "lucide-react";

export function HeroSection() {
  const { navigateTo } = useNavigation();

  return (
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

          {/* keep your “screenshots showcase” as-is, just moved here */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-3xl blur-3xl opacity-20" />

            <div className="relative grid grid-cols-2 gap-4">
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
  );
}
