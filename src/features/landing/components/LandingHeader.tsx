import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "@/shared/hooks/useNavigation";
import { Moon, Sun } from "lucide-react";

export function LandingHeader() {
  const { darkMode, toggleDarkMode } = useStore();
  const { navigateTo } = useNavigation();

  const logoLight = "/logoLight.png";
  const logoDark = "/logoDark.png";

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <img
              src={darkMode ? logoDark : logoLight}
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
              {darkMode ? (
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
  );
}
