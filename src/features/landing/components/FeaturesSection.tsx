import { Brain, Trophy, Users, Zap } from "lucide-react";

export function FeaturesSection() {
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

  return (
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
  );
}
