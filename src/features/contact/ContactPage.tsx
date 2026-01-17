import { useState } from "react";
import { useStore } from "@/shared/state/useStore";
import { useNavigation } from "../../shared/hooks/useNavigation";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, Mail, MessageSquare, Send } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { toast } from "sonner";
import { submitContactMessage } from "@/shared/api/support";
import type { SupportContactCategory } from "@/shared/api/support/types";

export function ContactPage() {
  const { user, accessToken } = useStore();
  const { navigate } = useNavigation();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportContactCategory | "">("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleCategoryChange = (value: string) => {
    setCategory(value as SupportContactCategory);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken) {
      toast.error("You must be logged in to submit the contact form");
      return;
    }

    if (!category || !subject || !message) {
      toast.error("Please fill out all fields");
      return;
    }

    setSending(true);

    try {
      await submitContactMessage(accessToken, {
        category: category as SupportContactCategory, // safe because you validate it’s non-empty
        subject,
        message,
      });

      toast.success("Message sent successfully! We'll get back to you soon.");

      setSubject("");
      setCategory("");
      setMessage("");
    } catch (error) {
      console.error("Failed to submit contact form:", error);

      const msg =
        error instanceof Error
          ? error.message
          : "Failed to send message. Please try again.";

      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl text-gray-900 dark:text-gray-100">
              Contact Us
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              We'd love to hear from you! Send us a message and we'll respond as
              soon as possible.
            </p>
          </div>

          {/* Contact Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-emerald-200 dark:border-emerald-800">
              <Mail className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-3" />
              <h3 className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                Email Support
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                support@flashy.app
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
              <h3 className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                Response Time
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Usually within 24 hours
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 lg:p-8 border border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category}
                  onValueChange={handleCategoryChange}
                  required
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="billing">
                      Billing & Subscription
                    </SelectItem>
                    <SelectItem value="account">Account Issues</SelectItem>
                    <SelectItem value="feedback">General Feedback</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="Brief description of your inquiry"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Please provide as much detail as possible..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="mt-1 min-h-[150px]"
                />
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* FAQ Section */}
          <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg text-gray-900 dark:text-gray-100 mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                  How do I upgrade my subscription?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click the "Upgrade" button in the sidebar or top navigation to
                  view subscription options.
                </p>
              </div>
              <div>
                <h3 className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                  Can I export my flashcards?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Yes! Go to Settings and click "Export My Data" to download all
                  your flashcards.
                </p>
              </div>
              <div>
                <h3 className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                  How do I delete my account?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Visit Settings and scroll to the Danger Zone. Note that this
                  action is permanent and cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
