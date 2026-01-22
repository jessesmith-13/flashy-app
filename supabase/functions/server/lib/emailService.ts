/**
 * Email Service using Resend
 *
 * AUTOMATIC MODE DETECTION:
 * - TEST MODE: If FROM_EMAIL not set or uses resend.dev → sends all emails to TEST_EMAIL_OVERRIDE
 * - PRODUCTION MODE: If FROM_EMAIL uses verified domain → sends to actual recipients
 *
 * SETUP FOR TESTING (NOW):
 * 1. Set RESEND_API_KEY=re_xxxxx
 * 2. Set TEST_EMAIL_OVERRIDE=your.email@example.com (the email you used to sign up for Resend)
 * 3. Done! All emails go to your test email.
 *
 * SETUP FOR PRODUCTION (LATER):
 * 1. Verify your domain at https://resend.com/domains
 * 2. Set FROM_EMAIL=Flashy <noreply@flashy.app>
 * 3. Done! Emails now go to real recipients automatically.
 *
 * NO CODE CHANGES NEEDED!
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL =
  Deno.env.get("FROM_EMAIL") || "Flashy <onboarding@resend.dev>";
const APP_NAME = "Flashy";
const APP_URL = Deno.env.get("SUPABASE_URL") || "https://flashy.app";

// Auto-detect test vs production mode
const IS_TEST_MODE =
  !Deno.env.get("FROM_EMAIL") || FROM_EMAIL.includes("resend.dev");
const TEST_EMAIL_OVERRIDE =
  Deno.env.get("TEST_EMAIL_OVERRIDE") || "flashyflashcards2@gmail.com";

if (IS_TEST_MODE) {
  console.log(
    `📧 Email Service: TEST MODE - All emails will be sent to ${TEST_EMAIL_OVERRIDE}`
  );
  console.log(
    `💡 To enable production mode: Set FROM_EMAIL to your verified domain (e.g., "Flashy <noreply@flashy.app>")`
  );
} else {
  console.log(
    `📧 Email Service: PRODUCTION MODE - Emails will be sent to actual recipients from ${FROM_EMAIL}`
  );
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send an email using Resend
 * Automatically handles test vs production mode
 */
async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log("⚠️ RESEND_API_KEY not configured. Email not sent.");
    console.log(`Would have sent email to ${to}: ${subject}`);
    return false;
  }

  // In test mode, override recipient email
  const actualRecipient = IS_TEST_MODE ? TEST_EMAIL_OVERRIDE : to;
  const actualSubject = IS_TEST_MODE ? `[TEST for: ${to}] ${subject}` : subject;

  if (IS_TEST_MODE && actualRecipient !== to) {
    console.log(
      `🧪 TEST MODE: Redirecting email from ${to} → ${actualRecipient}`
    );
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [actualRecipient],
        subject: actualSubject,
        html,
        reply_to: replyTo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Failed to send email: ${response.status} - ${errorData}`);

      if (errorData.includes("domain is not verified")) {
        console.error(
          "💡 SOLUTION: Either use TEST MODE or verify your domain:"
        );
        console.error(
          "   TEST MODE: Remove FROM_EMAIL env variable (uses onboarding@resend.dev)"
        );
        console.error(
          "   PRODUCTION: Verify domain at https://resend.com/domains then set FROM_EMAIL"
        );
      }

      return false;
    }

    const data = await response.json();
    console.log(`✅ Email sent to ${actualRecipient}: ${data.id}`);
    return true;
  } catch (error) {
    console.error(`Error sending email: ${error}`);
    return false;
  }
}

/**
 * Common email template wrapper
 */
function emailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">
                📚 ${APP_NAME}
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
              <p style="margin: 0;">
                <a href="${APP_URL}" style="color: #10b981; text-decoration: none;">Visit ${APP_NAME}</a> • 
                <a href="${APP_URL}/help" style="color: #10b981; text-decoration: none;">Help Center</a> • 
                <a href="${APP_URL}/settings" style="color: #10b981; text-decoration: none;">Email Preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Button component for emails
 */
function emailButton(
  text: string,
  url: string,
  color: string = "#10b981"
): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: ${color}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// ============================================================================
// (A) SECURITY & ACCOUNT EMAILS
// ============================================================================

export async function sendWelcomeEmail(
  email: string,
  displayName: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      Welcome to ${APP_NAME}, ${displayName}! 🎉
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      We're thrilled to have you join our community of learners! ${APP_NAME} makes studying with flashcards fun, effective, and social.
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Here's what you can do to get started:
    </p>
    <ul style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.8; padding-left: 20px;">
      <li>Create your first flashcard deck</li>
      <li>Explore decks shared by the community</li>
      <li>Study with multiple modes (Flip Cards, Multiple Choice, Typing)</li>
      <li>Track your progress and earn achievements</li>
      <li>Connect with friends and share decks</li>
    </ul>
    ${emailButton("Start Learning", `${APP_URL}/decks`)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Need help? Check out our <a href="${APP_URL}/help" style="color: #10b981;">Help Center</a> or reply to this email.
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: `Welcome to ${APP_NAME}! Let's get started 🚀`,
    html: emailTemplate(content),
  });
}

export async function sendVerificationEmail(
  email: string,
  verificationLink: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      Verify Your Email Address
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Thanks for signing up! Please verify your email address to activate your account.
    </p>
    ${emailButton("Verify Email", verificationLink)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
    <p style="margin: 10px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Or copy and paste this link: <br>
      <span style="color: #10b981; word-break: break-all;">${verificationLink}</span>
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: "Verify your email address",
    html: emailTemplate(content),
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      Reset Your Password
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    ${emailButton("Reset Password", resetLink)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
    <p style="margin: 10px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Or copy and paste this link: <br>
      <span style="color: #10b981; word-break: break-all;">${resetLink}</span>
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: "Reset your password",
    html: emailTemplate(content),
  });
}

export async function sendSuspiciousLoginAlert(
  email: string,
  displayName: string,
  location: string,
  device: string,
  timestamp: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #dc2626; font-size: 24px;">
      ⚠️ Suspicious Login Detected
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      We detected a login to your account from a new device or location:
    </p>
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px; color: #374151;"><strong>Location:</strong> ${location}</p>
      <p style="margin: 0 0 8px; color: #374151;"><strong>Device:</strong> ${device}</p>
      <p style="margin: 0; color: #374151;"><strong>Time:</strong> ${timestamp}</p>
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      <strong>Was this you?</strong> If yes, you can safely ignore this email.
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      <strong>If this wasn't you</strong>, please reset your password immediately to secure your account.
    </p>
    ${emailButton("Reset Password", `${APP_URL}/reset-password`, "#dc2626")}
  `;

  return await sendEmail({
    to: email,
    subject: "⚠️ Suspicious login detected on your account",
    html: emailTemplate(content),
  });
}

export async function sendAccountDeactivationEmail(
  email: string,
  displayName: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      Account Deactivated
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Your ${APP_NAME} account has been deactivated as requested.
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      You can reactivate your account at any time within the next 30 days by logging in. After 30 days, your account and all data will be permanently deleted.
    </p>
    ${emailButton("Reactivate Account", `${APP_URL}/login`, "#10b981")}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      If you didn't deactivate your account, please contact support immediately.
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: "Your account has been deactivated",
    html: emailTemplate(content),
  });
}

export async function sendAccountReactivationEmail(
  email: string,
  displayName: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      Welcome Back! 🎉
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Your ${APP_NAME} account has been successfully reactivated! We're glad to have you back.
    </p>
    ${emailButton("Continue Learning", `${APP_URL}/decks`)}
  `;

  return await sendEmail({
    to: email,
    subject: `Welcome back to ${APP_NAME}!`,
    html: emailTemplate(content),
  });
}

// ============================================================================
// (B) BILLING & SUBSCRIPTION EMAILS
// ============================================================================

export async function sendSubscriptionChangeEmail(
  email: string,
  displayName: string,
  oldTier: string,
  newTier: string,
  effectiveDate: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      Subscription Updated
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Your subscription has been updated:
    </p>
    <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px; color: #374151;"><strong>Previous Plan:</strong> ${oldTier}</p>
      <p style="margin: 0 0 8px; color: #374151;"><strong>New Plan:</strong> ${newTier}</p>
      <p style="margin: 0; color: #374151;"><strong>Effective Date:</strong> ${effectiveDate}</p>
    </div>
    ${emailButton("View Subscription", `${APP_URL}/settings`)}
  `;

  return await sendEmail({
    to: email,
    subject: "Your subscription has been updated",
    html: emailTemplate(content),
  });
}

export async function sendBillingReceiptEmail(
  email: string,
  displayName: string,
  amount: string,
  plan: string,
  invoiceNumber: string,
  date: string,
  invoiceUrl?: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      Payment Receipt
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Thank you for your payment! Here's your receipt:
    </p>
    <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px; color: #374151;"><strong>Invoice #:</strong> ${invoiceNumber}</p>
      <p style="margin: 0 0 8px; color: #374151;"><strong>Date:</strong> ${date}</p>
      <p style="margin: 0 0 8px; color: #374151;"><strong>Plan:</strong> ${plan}</p>
      <p style="margin: 0; color: #374151; font-size: 20px;"><strong>Amount:</strong> ${amount}</p>
    </div>
    ${invoiceUrl ? emailButton("Download Invoice", invoiceUrl) : ""}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Questions about your bill? Contact us at support@flashy.app
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: `Receipt from ${APP_NAME} - ${invoiceNumber}`,
    html: emailTemplate(content),
  });
}

export async function sendFailedPaymentEmail(
  email: string,
  displayName: string,
  amount: string,
  retryDate: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #dc2626; font-size: 24px;">
      Payment Failed
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      We were unable to process your payment of <strong>${amount}</strong>.
    </p>
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #374151;">
        <strong>Action Required:</strong> Please update your payment method to continue enjoying premium features.
      </p>
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      We'll automatically retry on <strong>${retryDate}</strong>. If the payment fails again, your subscription may be downgraded.
    </p>
    ${emailButton("Update Payment Method", `${APP_URL}/settings`, "#dc2626")}
  `;

  return await sendEmail({
    to: email,
    subject: "⚠️ Payment failed - Action required",
    html: emailTemplate(content),
  });
}

// ============================================================================
// SUBSCRIPTION-SPECIFIC EMAILS (Add these after your existing billing emails)
// ============================================================================

export async function sendSubscriptionActivatedEmail(
  email: string,
  displayName: string,
  plan: "monthly" | "annual" | "lifetime",
  features: string[]
): Promise<boolean> {
  const planNames = {
    monthly: "Premium Monthly",
    annual: "Premium Annual",
    lifetime: "Premium Lifetime",
  };

  const planEmojis = {
    monthly: "⭐",
    annual: "🎯",
    lifetime: "👑",
  };

  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      ${planEmojis[plan]} Welcome to ${planNames[plan]}!
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Your <strong>${planNames[plan]}</strong> subscription is now active! 🎉
    </p>
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 12px; color: #065f46; font-size: 18px; font-weight: 600;">
        You now have access to:
      </p>
      <ul style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.8; padding-left: 20px;">
        ${features.map((f) => `<li>${f}</li>`).join("")}
      </ul>
    </div>
    ${emailButton("Start Creating", `${APP_URL}/decks`)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Thank you for supporting ${APP_NAME}! If you have any questions, we're here to help.
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: `🎉 Welcome to ${planNames[plan]}!`,
    html: emailTemplate(content),
  });
}

export async function sendSubscriptionUpgradedEmail(
  email: string,
  displayName: string,
  oldPlan: string,
  newPlan: string,
  savings?: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      🎉 Subscription Upgraded!
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Great choice! You've upgraded your subscription:
    </p>
    <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px; color: #6b7280;"><strong>Previous:</strong> ${oldPlan}</p>
      <p style="margin: 0 0 8px; color: #10b981; font-size: 18px;"><strong>New Plan:</strong> ${newPlan} ✨</p>
      ${
        savings
          ? `<p style="margin: 0; color: #059669; font-weight: 600;">💰 You're saving ${savings}!</p>`
          : ""
      }
    </div>
    ${emailButton("View Subscription", `${APP_URL}/settings`)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Your new plan is active immediately. Enjoy your enhanced features!
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: "🎉 Subscription upgraded successfully!",
    html: emailTemplate(content),
  });
}

export async function sendSubscriptionDowngradedEmail(
  email: string,
  displayName: string,
  oldPlan: string,
  newPlan: string,
  effectiveDate: string,
  featuresLost: string[]
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      Subscription Changed
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Your subscription has been updated:
    </p>
    <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px; color: #374151;"><strong>Previous:</strong> ${oldPlan}</p>
      <p style="margin: 0 0 8px; color: #374151;"><strong>New Plan:</strong> ${newPlan}</p>
      <p style="margin: 0; color: #6b7280;"><strong>Effective:</strong> ${effectiveDate}</p>
    </div>
    ${
      featuresLost.length > 0
        ? `
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px; color: #92400e; font-weight: 600;">
        Features you'll lose on ${effectiveDate}:
      </p>
      <ul style="margin: 0; color: #78716c; font-size: 14px; line-height: 1.6; padding-left: 20px;">
        ${featuresLost.map((f) => `<li>${f}</li>`).join("")}
      </ul>
    </div>
    `
        : ""
    }
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Changed your mind? You can upgrade anytime to regain access to premium features.
    </p>
    ${emailButton("Upgrade Again", `${APP_URL}/upgrade`, "#10b981")}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      We'd love your feedback: <a href="mailto:feedback@flashy.app" style="color: #10b981;">Why did you downgrade?</a>
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: "Subscription updated",
    html: emailTemplate(content),
  });
}

export async function sendSubscriptionRenewedEmail(
  email: string,
  displayName: string,
  plan: string,
  amount: string,
  nextRenewalDate: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      ✅ Subscription Renewed Successfully
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Your <strong>${plan}</strong> subscription has been renewed! Thank you for continuing with ${APP_NAME}.
    </p>
    <div style="background-color: #ecfdf5; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px; color: #065f46;"><strong>Plan:</strong> ${plan}</p>
      <p style="margin: 0 0 8px; color: #065f46;"><strong>Amount Charged:</strong> ${amount}</p>
      <p style="margin: 0; color: #065f46;"><strong>Next Renewal:</strong> ${nextRenewalDate}</p>
    </div>
    ${emailButton("View Receipt", `${APP_URL}/settings`)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Continue enjoying all premium features without interruption!
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: `✅ Your ${plan} subscription has been renewed`,
    html: emailTemplate(content),
  });
}

export async function sendTrialStartedEmail(
  email: string,
  displayName: string,
  trialDays: number,
  trialEndDate: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      🎉 Your Premium Trial Has Started!
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Welcome to your <strong>${trialDays}-day Premium trial</strong>! Enjoy full access to all premium features completely free.
    </p>
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 12px; color: #065f46; font-size: 18px; font-weight: 600;">
        What you can do during your trial:
      </p>
      <ul style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.8; padding-left: 20px;">
        <li>Create unlimited decks</li>
        <li>Use AI-powered features</li>
        <li>Publish to the community</li>
        <li>Access advanced study modes</li>
        <li>Get priority support</li>
      </ul>
    </div>
    <div style="background-color: #fffbeb; padding: 16px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0; color: #92400e;">
        <strong>Trial ends:</strong> ${trialEndDate}<br>
        <span style="font-size: 14px;">You won't be charged until your trial ends.</span>
      </p>
    </div>
    ${emailButton("Start Creating", `${APP_URL}/decks`)}
  `;

  return await sendEmail({
    to: email,
    subject: `🎉 Your ${trialDays}-day Premium trial has started!`,
    html: emailTemplate(content),
  });
}

export async function sendTrialEndingSoonEmail(
  email: string,
  displayName: string,
  daysLeft: number,
  plan: string,
  amount: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      ⏰ Your Trial Ends in ${daysLeft} Day${daysLeft > 1 ? "s" : ""}
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Your Premium trial is ending soon. We hope you've enjoyed exploring all the features!
    </p>
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px; color: #92400e;"><strong>Trial ends in:</strong> ${daysLeft} day${
    daysLeft > 1 ? "s" : ""
  }</p>
      <p style="margin: 0; color: #78716c;">After that, you'll be charged <strong>${amount}</strong> for <strong>${plan}</strong>.</p>
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      <strong>Want to continue?</strong> No action needed - your subscription will start automatically.
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      <strong>Want to cancel?</strong> You can do so anytime from your settings with no charge.
    </p>
    <div style="display: flex; gap: 10px; margin: 20px 0;">
      ${emailButton("Keep Premium", `${APP_URL}/decks`, "#10b981")}
    </div>
    ${emailButton("Cancel Trial", `${APP_URL}/settings`, "#6b7280")}
  `;

  return await sendEmail({
    to: email,
    subject: `⏰ Your Premium trial ends in ${daysLeft} day${
      daysLeft > 1 ? "s" : ""
    }`,
    html: emailTemplate(content),
  });
}

export async function sendUpcomingRenewalEmail(
  email: string,
  displayName: string,
  plan: string,
  amount: string,
  renewalDate: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      Subscription Renewal Reminder
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Your <strong>${plan}</strong> subscription will automatically renew on <strong>${renewalDate}</strong>.
    </p>
    <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px; color: #374151;"><strong>Plan:</strong> ${plan}</p>
      <p style="margin: 0 0 8px; color: #374151;"><strong>Renewal Date:</strong> ${renewalDate}</p>
      <p style="margin: 0; color: #374151; font-size: 20px;"><strong>Amount:</strong> ${amount}</p>
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      No action is needed - we'll automatically charge your payment method on file.
    </p>
    ${emailButton("Manage Subscription", `${APP_URL}/settings`)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Want to cancel? You can do so anytime before ${renewalDate} from your account settings.
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: `Your ${plan} subscription renews soon`,
    html: emailTemplate(content),
  });
}

export async function sendCancellationConfirmationEmail(
  email: string,
  displayName: string,
  plan: string,
  endDate: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      Subscription Cancelled
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      We've cancelled your <strong>${plan}</strong> subscription as requested.
    </p>
    <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px; color: #374151;"><strong>Plan:</strong> ${plan}</p>
      <p style="margin: 0; color: #374151;"><strong>Access Until:</strong> ${endDate}</p>
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      You'll continue to have access to premium features until <strong>${endDate}</strong>. After that, your account will revert to the free plan.
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      We're sad to see you go! If you change your mind, you can resubscribe anytime.
    </p>
    ${emailButton("Resubscribe", `${APP_URL}/upgrade`)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Have feedback? We'd love to hear why you cancelled: <a href="mailto:feedback@flashy.app" style="color: #10b981;">feedback@flashy.app</a>
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: "Subscription cancelled",
    html: emailTemplate(content),
  });
}

// ============================================================================
// (C) MODERATION & ADMIN EMAILS
// ============================================================================

export async function sendContentFlaggedEmail(
  id: string,
  email: string,
  displayName: string,
  contentType: "deck" | "card" | "comment" | "user",
  contentName: string,
  reason: string,
  reviewUrl: string
): Promise<boolean> {
  const contentTypeLabel =
    contentType.charAt(0).toUpperCase() + contentType.slice(1);

  const content = `
    <h2 style="margin: 0 0 20px; color: #f59e0b; font-size: 24px;">
      🚩 Your ${contentTypeLabel} Has Been Flagged
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Your ${contentType} <strong>"${contentName}"</strong> has been flagged by the community for review.
    </p>
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px; color: #374151;"><strong>Content Type:</strong> ${contentTypeLabel}</p>
      <p style="margin: 0 0 8px; color: #374151;"><strong>Content:</strong> ${contentName}</p>
      <p style="margin: 0; color: #374151;"><strong>Reason:</strong> ${reason}</p>
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Our moderation team will review this content. You may edit or remove it before the review is complete.
    </p>
    ${emailButton("Review Content", reviewUrl, "#f59e0b")}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Please review our <a href="${APP_URL}/community-guidelines" style="color: #10b981;">Community Guidelines</a> to ensure your content meets our standards.
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: `🚩 Your ${contentType} has been flagged for review`,
    html: emailTemplate(content),
  });
}

export async function sendModeratorWarningEmail(
  id: string,
  email: string,
  displayName: string,
  warning: string,
  actionRequired: string,
  deadline: string,
  reviewUrl: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #f59e0b; font-size: 24px;">
      ⚠️ Moderator Warning
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      You've received a warning from our moderation team:
    </p>
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 12px; color: #374151; font-size: 16px;"><strong>${warning}</strong></p>
      <p style="margin: 0; color: #78716c;"><strong>Action Required:</strong> ${actionRequired}</p>
    </div>
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #374151;">
        <strong>Deadline:</strong> ${deadline}
      </p>
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Please take action before the deadline to avoid further restrictions on your account.
    </p>
    ${emailButton("Take Action", reviewUrl, "#f59e0b")}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Questions? Contact our moderation team: <a href="mailto:moderation@flashy.app" style="color: #10b981;">moderation@flashy.app</a>
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: "⚠️ Moderator Warning - Action Required",
    html: emailTemplate(content),
  });
}

export async function sendModeratorActionEmail(
  email: string,
  displayName: string,
  actionType: "content_removed" | "temporary_restriction" | "account_warning",
  details: string,
  duration?: string,
  appealUrl?: string
): Promise<boolean> {
  const actionLabels = {
    content_removed: "Content Removed",
    temporary_restriction: "Temporary Restriction",
    account_warning: "Account Warning",
  };

  const content = `
    <h2 style="margin: 0 0 20px; color: #dc2626; font-size: 24px;">
      🛑 Moderator Action Taken
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Our moderation team has taken action on your account:
    </p>
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 12px; color: #374151; font-size: 18px;"><strong>${
        actionLabels[actionType]
      }</strong></p>
      <p style="margin: 0 0 8px; color: #374151;">${details}</p>
      ${
        duration
          ? `<p style="margin: 0; color: #374151;"><strong>Duration:</strong> ${duration}</p>`
          : ""
      }
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      This action was taken due to a violation of our Community Guidelines. Please review the guidelines to prevent future violations.
    </p>
    ${emailButton(
      "Read Community Guidelines",
      `${APP_URL}/community-guidelines`,
      "#dc2626"
    )}
    ${
      appealUrl
        ? `
    <p style="margin: 20px 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      If you believe this action was taken in error, you may submit an appeal:
    </p>
    ${emailButton("Submit Appeal", appealUrl, "#6b7280")}
    `
        : ""
    }
  `;

  return await sendEmail({
    to: email,
    subject: "🛑 Moderator action taken on your account",
    html: emailTemplate(content),
  });
}

export async function sendAdminActionEmail(
  email: string,
  displayName: string,
  action: string,
  reason: string,
  effectiveDate: string,
  supportUrl?: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #7c3aed; font-size: 24px;">
      👑 Admin Action on Your Account
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      An administrator has performed an action on your account:
    </p>
    <div style="background-color: #f5f3ff; border-left: 4px solid #7c3aed; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px; color: #374151;"><strong>Action:</strong> ${action}</p>
      <p style="margin: 0 0 8px; color: #374151;"><strong>Reason:</strong> ${reason}</p>
      <p style="margin: 0; color: #374151;"><strong>Effective:</strong> ${effectiveDate}</p>
    </div>
    ${supportUrl ? emailButton("Contact Support", supportUrl, "#7c3aed") : ""}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      If you have questions, please contact support: <a href="mailto:support@flashy.app" style="color: #10b981;">support@flashy.app</a>
    </p>
  `;

  return await sendEmail({
    to: email,
    subject: "👑 Admin action on your account",
    html: emailTemplate(content),
  });
}

// ============================================================================
// (D) SOCIAL & REFERRAL EMAILS
// ============================================================================

export async function sendFriendRequestEmail(
  id: string,
  toEmail: string,
  toDisplayName: string,
  fromDisplayName: string,
  fromAvatarUrl: string | null
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      👋 New Friend Request!
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${toDisplayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      <strong>${fromDisplayName}</strong> sent you a friend request on ${APP_NAME}!
    </p>
    <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
      ${
        fromAvatarUrl
          ? `<img src="${fromAvatarUrl}" alt="${fromDisplayName}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 12px;" />`
          : ""
      }
      <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">
        ${fromDisplayName}
      </p>
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Connect with ${fromDisplayName} to share decks, study together, and track each other's progress!
    </p>
    ${emailButton("View Friend Request", `${APP_URL}/#/friends`)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      You can accept or decline this request from your Friends page.
    </p>
  `;

  return await sendEmail({
    to: toEmail,
    subject: `${fromDisplayName} sent you a friend request on ${APP_NAME}`,
    html: emailTemplate(content),
  });
}

export async function sendCommentReplyEmail(
  id: string,
  toEmail: string,
  toDisplayName: string,
  fromDisplayName: string,
  deckName: string,
  commentText: string,
  replyText: string
): Promise<boolean> {
  const truncatedComment =
    commentText.length > 100
      ? commentText.substring(0, 100) + "..."
      : commentText;
  const truncatedReply =
    replyText.length > 150 ? replyText.substring(0, 150) + "..." : replyText;

  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      💬 New Reply to Your Comment!
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${toDisplayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      <strong>${fromDisplayName}</strong> replied to your comment on <strong>"${deckName}"</strong>:
    </p>
    <div style="background-color: #f9fafb; border-left: 4px solid #d1d5db; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
        <strong>Your comment:</strong>
      </p>
      <p style="margin: 0; color: #374151; font-size: 15px; font-style: italic;">
        "${truncatedComment}"
      </p>
    </div>
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px; color: #065f46; font-size: 14px;">
        <strong>${fromDisplayName}'s reply:</strong>
      </p>
      <p style="margin: 0; color: #065f46; font-size: 15px;">
        "${truncatedReply}"
      </p>
    </div>
    ${emailButton("View Reply", `${APP_URL}/#/community`)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Keep the conversation going! Reply back and engage with the community.
    </p>
  `;

  return await sendEmail({
    to: toEmail,
    subject: `${fromDisplayName} replied to your comment on ${deckName}`,
    html: emailTemplate(content),
  });
}

export async function sendDeckCommentEmail(
  deckOwnerId: string,
  deckOwnerEmail: string,
  deckOwnerName: string,
  commenterName: string,
  deckName: string,
  commentText: string
): Promise<boolean> {
  const truncatedComment =
    commentText.length > 200
      ? commentText.substring(0, 200) + "..."
      : commentText;

  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      💬 New Comment on Your Deck!
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${deckOwnerName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      <strong>${commenterName}</strong> commented on your deck <strong>"${deckName}"</strong>:
    </p>
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px; color: #065f46; font-size: 14px;">
        <strong>${commenterName}'s comment:</strong>
      </p>
      <p style="margin: 0; color: #065f46; font-size: 15px;">
        "${truncatedComment}"
      </p>
    </div>
    ${emailButton("View Comment", `${APP_URL}/#/community`)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Reply back and engage with your community!
    </p>
  `;

  return await sendEmail({
    to: deckOwnerEmail,
    subject: `${commenterName} commented on your deck: ${deckName}`,
    html: emailTemplate(content),
  });
}

export async function sendReferralInviteEmail(
  toEmail: string,
  fromName: string,
  referralLink: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      ${fromName} invited you to ${APP_NAME}! 🎉
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Your friend ${fromName} thinks you'd love ${APP_NAME} - the best way to study with flashcards!
    </p>
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #065f46; font-size: 16px;">
        <strong>🎁 Special Offer:</strong> Sign up now and get <strong>1 month of Premium free</strong>!
      </p>
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      With ${APP_NAME} Premium, you'll get:
    </p>
    <ul style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.8; padding-left: 20px;">
      <li>Unlimited flashcard decks</li>
      <li>AI-powered features</li>
      <li>Advanced study modes</li>
      <li>Priority support</li>
    </ul>
    ${emailButton("Accept Invitation", referralLink)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Not interested? You can safely ignore this email.
    </p>
  `;

  return await sendEmail({
    to: toEmail,
    subject: `${fromName} invited you to ${APP_NAME} - Get 1 month free! 🎁`,
    html: emailTemplate(content),
  });
}

export async function sendReferralRewardEmail(
  email: string,
  displayName: string,
  inviteeName: string,
  reward: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      Great News! Your Friend Joined ${APP_NAME} 🎉
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${displayName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      <strong>${inviteeName}</strong> just signed up using your referral link!
    </p>
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #065f46; font-size: 18px;">
        <strong>🎁 Your Reward:</strong> ${reward}
      </p>
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Keep sharing ${APP_NAME} with your friends to earn more rewards!
    </p>
    ${emailButton("Invite More Friends", `${APP_URL}/profile`)}
  `;

  return await sendEmail({
    to: email,
    subject: "🎁 Referral reward unlocked!",
    html: emailTemplate(content),
  });
}

// ============================================================================
// (E) CONTACT & SUPPORT EMAILS
// ============================================================================

export async function sendContactFormEmail(
  userEmail: string,
  userName: string,
  category: string,
  subject: string,
  message: string
): Promise<boolean> {
  const SUPPORT_EMAIL = "support@flashy.app";

  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      📧 New Contact Form Submission
    </h2>
    <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px; color: #374151;"><strong>From:</strong> ${userName} (${userEmail})</p>
      <p style="margin: 0 0 8px; color: #374151;"><strong>Category:</strong> ${category}</p>
      <p style="margin: 0; color: #374151;"><strong>Subject:</strong> ${subject}</p>
    </div>
    <div style="background-color: #ffffff; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;"><strong>Message:</strong></p>
      <p style="margin: 0; color: #111827; font-size: 15px; white-space: pre-wrap;">${message}</p>
    </div>
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Reply to this email to respond directly to ${userName}.
    </p>
  `;

  return await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[Contact Form] ${category}: ${subject}`,
    html: emailTemplate(content),
    replyTo: userEmail,
  });
}

export async function sendContactConfirmationEmail(
  userEmail: string,
  userName: string,
  subject: string
): Promise<boolean> {
  const content = `
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px;">
      ✅ We Received Your Message!
    </h2>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Hi ${userName},
    </p>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      Thanks for reaching out! We've received your message about <strong>"${subject}"</strong> and our support team will get back to you as soon as possible.
    </p>
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #065f46;">
        <strong>⏱️ Response Time:</strong> We typically respond within 24 hours during business days.
      </p>
    </div>
    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
      In the meantime, you might find answers to common questions in our Help Center.
    </p>
    ${emailButton("Visit Help Center", `${APP_URL}/help`)}
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      This is an automated confirmation. Please do not reply to this email.
    </p>
  `;

  return await sendEmail({
    to: userEmail,
    subject: `We received your message: ${subject}`,
    html: emailTemplate(content),
  });
}

export async function sendBetaFeedbackEmail(
  userEmail: string,
  userName: string,
  rating: number | null,
  message: string,
  workingTasks: Array<{
    taskId: string;
    taskName: string;
    category: string;
    status: "works";
    notes: string | null;
  }>,
  brokenTasks: Array<{
    taskId: string;
    taskName: string;
    category: string;
    status: "broken";
    notes: string | null;
  }>,
  notTestedTasks: Array<{
    taskId: string;
    taskName: string;
    category: string;
    status: "not_tested";
    notes: string | null;
  }>
): Promise<boolean> {
  const SUPPORT_EMAIL = "flashyflashcards2@gmail.com";

  const ratingStars = rating ? "⭐".repeat(rating) : "No rating";

  const workingCount = workingTasks.length;
  const brokenCount = brokenTasks.length;
  const notTestedCount = notTestedTasks.length;
  const totalTested = workingCount + brokenCount;

  // Combine all tasks for grouping by category
  const allTasks = [...workingTasks, ...brokenTasks, ...notTestedTasks];

  const tasksByCategory: Record<
    string,
    Array<{
      taskId: string;
      taskName: string;
      status: "works" | "broken" | "not_tested";
      notes: string | null;
    }>
  > = {};
  allTasks.forEach((task) => {
    if (!tasksByCategory[task.category]) {
      tasksByCategory[task.category] = [];
    }
    tasksByCategory[task.category].push(task);
  });

  // Generate task list HTML with status indicators AND notes
  const tasksHtml = Object.entries(tasksByCategory)
    .map(
      ([category, tasks]) => `
    <div style="margin-bottom: 16px;">
      <p style="margin: 0 0 8px; color: #10b981; font-weight: 600; text-transform: capitalize;">
        ${category.replace(/-/g, " ")} (${tasks.length})
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #374151; list-style: none;">
        ${tasks
          .map(
            (task) => `
            <li style="margin: 8px 0;">
              <div>
                ${
                  task.status === "works"
                    ? '<span style="color: #10b981; font-weight: bold;">✅</span>'
                    : task.status === "broken"
                    ? '<span style="color: #dc2626; font-weight: bold;">🚫</span>'
                    : '<span style="color: #9ca3af; font-weight: bold;">⬜</span>'
                }
                ${task.taskName}
                ${
                  task.status === "broken"
                    ? '<span style="color: #dc2626; font-size: 12px; font-weight: 600;"> (BROKEN)</span>'
                    : task.status === "not_tested"
                    ? '<span style="color: #9ca3af; font-size: 12px;"> (not tested)</span>'
                    : ""
                }
              </div>
              ${
                task.notes
                  ? `
                <div style="margin-top: 4px; padding: 8px 12px; background-color: ${
                  task.status === "broken" ? "#fef2f2" : "#f9fafb"
                }; border-left: 3px solid ${
                      task.status === "broken" ? "#dc2626" : "#d1d5db"
                    }; border-radius: 4px;">
                  <p style="margin: 0; color: #6b7280; font-size: 13px; font-style: italic;">
                    💬 "${task.notes}"
                  </p>
                </div>
              `
                  : ""
              }
            </li>
          `
          )
          .join("")}
      </ul>
    </div>
  `
    )
    .join("");

  const content = `
    <h2 style="margin: 0 0 20px; color: #7c3aed; font-size: 24px;">
      🧪 New Beta Testing Feedback
    </h2>
    
    <!-- User Info -->
    <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px; color: #374151;"><strong>From:</strong> ${userName} (${userEmail})</p>
      <p style="margin: 0; color: #374151;"><strong>Rating:</strong> ${ratingStars}</p>
    </div>
    
    <!-- Feedback Message -->
    <div style="background-color: #f5f3ff; border-left: 4px solid #7c3aed; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 8px; color: #5b21b6; font-size: 14px;"><strong>Feedback:</strong></p>
      <p style="margin: 0; color: #1f2937; font-size: 15px; white-space: pre-wrap;">${message}</p>
    </div>
    
    <!-- Testing Summary -->
    <div style="background-color: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #e5e7eb;">
      <p style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">
        📊 Testing Summary (${totalTested} tested, ${notTestedCount} untested)
      </p>
      <div style="display: flex; gap: 20px;">
        <div>
          <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: bold;">✅ ${workingCount}</p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Working</p>
        </div>
        <div>
          <p style="margin: 0; color: #dc2626; font-size: 24px; font-weight: bold;">🚫 ${brokenCount}</p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Broken</p>
        </div>
        <div>
          <p style="margin: 0; color: #9ca3af; font-size: 24px; font-weight: bold;">⬜ ${notTestedCount}</p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Not Tested</p>
        </div>
      </div>
    </div>
    
    <!-- All Tasks with Status AND NOTES! -->
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 16px; color: #065f46; font-size: 16px; font-weight: 600;">
        📝 Detailed Test Results
      </p>
      ${
        allTasks.length > 0
          ? tasksHtml
          : '<p style="margin: 0; color: #6b7280;">No tasks yet.</p>'
      }
    </div>
    
    ${
      brokenCount > 0
        ? `
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b; font-weight: 600;">
        ⚠️ ${brokenCount} bug${
            brokenCount > 1 ? "s" : ""
          } reported - Needs attention!
      </p>
    </div>
    `
        : ""
    }
    
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Reply to this email to respond directly to ${userName}.
    </p>
  `;

  return await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `🧪 Beta Feedback${rating ? ` (${ratingStars})` : ""}${
      brokenCount > 0
        ? ` - ${brokenCount} BUG${brokenCount > 1 ? "S" : ""} FOUND`
        : ""
    } - ${userName}`,
    html: emailTemplate(content),
    replyTo: userEmail,
  });
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // (A) SECURITY & ACCOUNT
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSuspiciousLoginAlert,
  sendAccountDeactivationEmail,
  sendAccountReactivationEmail,

  // (B) BILLING & SUBSCRIPTION
  sendSubscriptionChangeEmail,
  sendBillingReceiptEmail,
  sendFailedPaymentEmail,
  sendUpcomingRenewalEmail,
  sendCancellationConfirmationEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionUpgradedEmail,
  sendSubscriptionDowngradedEmail,
  sendSubscriptionRenewedEmail,
  sendTrialStartedEmail,
  sendTrialEndingSoonEmail,

  // (C) MODERATION & ADMIN
  sendContentFlaggedEmail,
  sendModeratorWarningEmail,
  sendModeratorActionEmail,
  sendAdminActionEmail,

  // (D) SOCIAL & REFERRAL
  sendFriendRequestEmail,
  sendCommentReplyEmail,
  sendDeckCommentEmail,
  sendReferralInviteEmail,
  sendReferralRewardEmail,

  // (E) CONTACT & SUPPORT
  sendContactFormEmail,
  sendContactConfirmationEmail,

  // (F) BETA TESTING
  sendBetaFeedbackEmail,
};
