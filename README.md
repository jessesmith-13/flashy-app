# 📚 Flashy - Smart Flashcard Learning Platform

<div align="center">
  <img src="/public/logoLight.png" alt="Flashy Logo" width="120" />
  
  **Learn anything, fast.**
  
  A modern, full-featured flashcard app with AI-powered learning, community sharing, and advanced study modes.

  [Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started)

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
</div>

---

## ✨ Features

### 🎯 Core Learning
- **Multiple Card Types**
  - Classic flip cards with confidence ratings
  - Multiple choice questions with multiple correct answers
  - Type-to-answer with alternative spelling support
- **Smart Study Modes**
  - Spaced repetition algorithm
  - Confidence-based card filtering
  - Progress tracking and statistics
- **Rich Media Support**
  - Image uploads for questions and answers
  - Audio recording for pronunciation practice
  - Multi-language support with translation

### 👥 Social & Community
- **Community Deck Library**
  - Browse 1000+ decks across 50+ categories
  - Download and study decks from other learners
  - Rate and review community content
- **Deck Publishing**
  - Share your decks with the world
  - Track downloads and ratings
  - Update published decks seamlessly
- **Friends System**
  - Connect with other learners
  - Share private decks with friends
  - View friends' public profiles

### 🏆 Gamification
- **Achievement System**
  - 30+ achievements to unlock
  - Study streaks and milestones
  - Progress badges
- **User Profiles**
  - Public profile pages
  - Deck showcase
  - Achievement display

### 💎 Premium Features
- **AI-Powered Tools** (Premium)
  - Auto-generate flashcards from text
  - Translate cards between languages
  - Smart card suggestions
- **Enhanced Content** (Premium)
  - Unlimited decks and cards
  - Image and audio uploads
  - Community publishing
  - Priority support

### 🛡️ Moderation & Safety
- **Content Moderation**
  - Flag inappropriate content
  - Moderator dashboard
  - Ticket management system
- **User Safety**
  - Report system for users, decks, cards, and comments
  - Automated and manual review workflows
  - Community guidelines enforcement

### 📧 Email Notifications
- **Account Management**
  - Welcome emails
  - Password reset
  - Security alerts
- **Subscription Updates**
  - Payment confirmations
  - Renewal reminders
  - Upgrade notifications
- **Social Notifications**
  - Friend requests
  - Deck comments and replies
  - Like notifications

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Styling
- **Zustand** - State management
- **React Router** - Navigation
- **Lucide React** - Icons
- **Recharts** - Data visualization

### Backend
- **Supabase** - Backend infrastructure
  - PostgreSQL database
  - Row Level Security (RLS)
  - Storage for images/audio
  - Edge Functions (Deno)
- **Hono** - Edge function web framework
- **Stripe** - Payment processing
- **Resend** - Transactional emails

### DevOps
- **GitHub** - Version control
- **Supabase CLI** - Database migrations
- **TypeScript** - Type checking

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Supabase CLI** ([Install](https://supabase.com/docs/guides/cli))
- **Stripe Account** ([Sign up](https://stripe.com))
- **Resend Account** ([Sign up](https://resend.com))

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jesse-smith13/flashy.git
   cd flashy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   ```bash
   # Start local Supabase instance
   supabase start
   
   # Get your local credentials
   supabase status
   ```

4. **Configure environment variables**
   
   Create a `.env.local` file:
   ```env
   # Supabase
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   
   # Feature flags (optional)
   VITE_ENABLE_AI_FEATURES=true
   ```

5. **Configure Supabase Edge Function secrets**
   
   You'll need to set these in your Supabase project:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   supabase secrets set STRIPE_PRICE_ID_MONTHLY=price_...
   supabase secrets set STRIPE_PRICE_ID_ANNUAL=price_...
   supabase secrets set STRIPE_PRICE_ID_LIFETIME=price_...
   supabase secrets set RESEND_API_KEY=re_...
   supabase secrets set TEST_EMAIL_OVERRIDE=your.email@example.com
   supabase secrets set OPENAI_API_KEY=sk-... (optional, for AI features)
   
   ```

6. **Run database migrations**
   ```bash
   supabase db push
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

8. **Access the app**
   
   Open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
📁 Project Structure
flashy/
├── hooks/                   # Custom React hooks
├── src/
│   ├── components/          # React components
│   ├── types/               # Typescript Types
│   ├── ui/                  # Reusable UI components
│   ├── store/               # Zustand state management
│   ├── utils/               # Utility functions
│   │   ├── api/             # API client functions
│   │   └── subscription.ts  # Subscription tier logic
│   ├── types/               # TypeScript type definitions
│   └── styles/              # Global styles
├── supabase/
│   ├── functions/           # Edge Functions
│   │   └── server/          # Hono backend server
│   │       ├── routes/      # API routes
│   │       └── lib/         # Backend utilities
│   │   └── stripe/          # Stripe backend server
│   │   └── ai/              # AI backend server
│   └── migrations/          # Database migrations
├── public/                  # Static assets
└── index.html               # Entry HTML file
```

---

## 🔧 Development

### Available Scripts

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Lint code
npm run lint
```

### Working with Supabase

```bash
# Generate TypeScript types from database
supabase gen types typescript --local > src/types/database.types.ts

# Create a new migration
supabase migration new your_migration_name

# Run migrations
supabase db push

# Reset local database
supabase db reset

# Deploy edge functions
supabase functions deploy server
```

### Testing Stripe Integration

Use Stripe test mode with test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`

Use any future expiry date and any 3-digit CVC.

### Testing Email Integration

Emails in test mode will be sent to `TEST_EMAIL_OVERRIDE` address set in your environment variables.

---

## 🎨 Customization

### Theming

Edit `/src/styles/globals.css` to customize colors:

```css
:root {
  --primary: #10B981;        /* Emerald green */
  --secondary: #3B82F6;      /* Blue */
  --destructive: #EF4444;    /* Red */
  /* ... more theme variables */
}
```

### Adding Categories

Edit `/src/utils/categories.ts`:

```typescript
export const DECK_CATEGORIES = [
  {
    category: 'Your Category',
    subtopics: ['Subtopic 1', 'Subtopic 2']
  }
]
```

---

## 📝 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |

### Edge Function Secrets (Supabase)

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Auto-provided by Supabase | ✅ |
| `SUPABASE_ANON_KEY` | Auto-provided by Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided by Supabase | ✅ |
| `STRIPE_SECRET_KEY` | Stripe API key | ✅ |
| `STRIPE_PRICE_ID_MONTHLY` | Monthly subscription price ID | ✅ |
| `STRIPE_PRICE_ID_ANNUAL` | Annual subscription price ID | ✅ |
| `STRIPE_PRICE_ID_LIFETIME` | Lifetime subscription price ID | ✅ |
| `RESEND_API_KEY` | Resend email API key | ✅ |
| `TEST_EMAIL_OVERRIDE` | Test mode email recipient | ⚠️ (dev only) |
| `FROM_EMAIL` | Production sender email | ⚠️ (prod only) |
| `OPENAI_API_KEY` | OpenAI API for AI features | ❌ (optional) |

---

## 🤝 Contributions

**This project is not currently accepting contributions**, as it's being actively developed as a personal project. However:

- 🐛 **Bug reports** are always welcome via [GitHub Issues](https://github.com/jesse-smith13/flashy/issues)
- 💡 **Feature suggestions** can be submitted as issues
- 🍴 **Forking** for personal learning is encouraged!

If you're interested in collaborating, feel free to reach out via the [contact form on my website](https://jessesmith.tech/#contact).

---

## 🐛 Known Issues & Limitations

- **Mobile Safari**: Emoji picker may require scrolling adjustment on very small screens
- **AI Features**: Require OpenAI API key and premium subscription
- **Email Delivery**: Requires domain verification for production use with Resend

---

## 🙏 Acknowledgments

- **Icons**: [Lucide Icons](https://lucide.dev/)
- **UI Components**: Inspired by [shadcn/ui](https://ui.shadcn.com/)
- **Backend**: Powered by [Supabase](https://supabase.com/)
- **Payments**: [Stripe](https://stripe.com/)
- **Emails**: [Resend](https://resend.com/)

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/jesse-smith13/flashy/issues)
- **Contact**: [jessesmith.tech](https://jessesmith.tech/#contact)

---

<div align="center">
  
Made with ❤️ by Jesse Smith

[Website](https://jessesmith.tech) • [GitHub](https://github.com/jesse-smith13)

</div>