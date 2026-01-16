import { useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";

export function BenefitsFlipCardSection() {
  const [isFlipped, setIsFlipped] = useState(false);

  const benefits = [
    "Create unlimited flashcard decks",
    "Study anywhere with mobile-responsive design",
    "Track your progress with detailed analytics",
    "Connect with friends and share decks",
    "Dark mode for comfortable studying",
    "Export and share decks with QR codes",
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Click to flip the card and see why thousands choose Flashy
          </p>
        </div>

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
            {/* Front */}
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

            {/* Back */}
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
                        <Check className="w-4 h-4 sm:w-5 h-5 text-white" />
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
  );
}
