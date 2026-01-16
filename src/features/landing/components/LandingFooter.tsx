import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "@/shared/hooks/useNavigation";

export function LandingFooter() {
  const { darkMode } = useStore();
  const { navigateTo } = useNavigation();

  const logoLight = "/logoLight.png";
  const logoDark = "/logoDark.png";

  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img
                src={darkMode ? logoDark : logoLight}
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
                  onClick={() => navigateTo("privacy")}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Privacy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo("terms")}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  Terms
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo("contact")}
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
  );
}
