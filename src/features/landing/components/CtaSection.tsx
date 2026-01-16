import { Button } from "@/shared/ui/button";
import { useNavigation } from "@/shared/hooks/useNavigation";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  const { navigateTo } = useNavigation();

  return (
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
  );
}
