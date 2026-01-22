import type { Hono } from "npm:hono@4";
import { supabase } from "./lib/supabase.ts";
import type { GeneratedCard } from "./types/ai.ts";
import {
  searchUnsplashImageWithAttribution,
  shouldAddImage,
  type UnsplashImageResult,
} from "./lib/unsplash-production.ts";
import {
  MUSIC_CHORD_INSTRUCTION_CLASSIC_FLIP,
  MUSIC_CHORD_INSTRUCTION_TYPE_ANSWER,
  MUSIC_CHORD_INSTRUCTION_MULTIPLE_CHOICE,
} from "./lib/musicChordInstructions.ts";

type CardType = "classic-flip" | "multiple-choice" | "type-answer";
type DifficultyLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | "mixed";

interface RequestBody {
  topic: string;
  numCards: string;
  cardTypes?: {
    classicFlip?: boolean;
    multipleChoice?: boolean;
    typeAnswer?: boolean;
  };
  includeImages?: boolean; // 📸 NEW: Whether to add Unsplash images
  difficulty?: DifficultyLevel;
  frontLanguage?: string;
  backLanguage?: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ParsedOpenAIContent {
  cards?: GeneratedCard[];
  flashcards?: GeneratedCard[];
}

// Helper type for unknown card objects during validation
interface UnknownCard {
  front?: unknown;
  back?: unknown;
  cardType?: unknown;
  correctAnswers?: unknown;
  incorrectAnswers?: unknown;
  acceptedAnswers?: unknown;
  [key: string]: unknown;
}

export function registerAIChatRoutes(app: Hono) {
  // AI Generate - Chat (Topic-based generation)

  app.post("/ai/generate/chat", async (c) => {
    try {
      const accessToken = c.req.header("Authorization")?.split(" ")[1];

      if (!accessToken) {
        console.log("❌ Missing access token for AI generation");
        return c.json({ error: "Missing access token" }, 401);
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        console.log(`❌ Auth error in AI generate chat: ${authError?.message}`);
        return c.json({ error: "Unauthorized" }, 401);
      }

      // ✅ Check subscription tier from DATABASE (not metadata)
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();

      if (profileError || !userProfile) {
        console.log(
          `❌ Failed to fetch user profile for AI generation: ${profileError?.message}`
        );
        return c.json({ error: "Failed to verify subscription status" }, 500);
      }

      const subscriptionTier = userProfile.subscription_tier || "free";

      if (subscriptionTier === "free") {
        console.log(
          `❌ Free user ${user.id} attempted AI generation - blocked`
        );
        return c.json(
          { error: "AI generation requires a Premium or Pro subscription" },
          403
        );
      }

      console.log(
        `✅ User ${user.id} subscription verified: ${subscriptionTier}`
      );

      const {
        topic,
        numCards,
        cardTypes,
        includeImages,
        difficulty,
        frontLanguage,
        backLanguage,
      } = (await c.req.json()) as RequestBody;

      if (!topic || !numCards) {
        console.log("❌ Missing topic or numCards");
        return c.json({ error: "Topic and number of cards are required" }, 400);
      }

      const cardCount = parseInt(numCards);
      if (isNaN(cardCount) || cardCount < 1 || cardCount > 100) {
        console.log(`❌ Invalid card count: ${cardCount}`);
        return c.json(
          { error: "Number of cards must be between 1 and 100" },
          400
        );
      }

      console.log(
        `🤖 AI Generate Chat - User: ${
          user.id
        }, Topic: "${topic}", Cards: ${cardCount}, Images: ${
          includeImages ? "YES" : "NO"
        }, Difficulty: ${difficulty || "mixed"}, Front Language: ${
          frontLanguage || "not specified"
        }, Back Language: ${backLanguage || "not specified"}`
      );

      // Get OpenAI API key
      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiApiKey) {
        console.log("❌ OpenAI API key not configured");
        return c.json(
          {
            error: "AI service not configured. Please add your OpenAI API key.",
          },
          500
        );
      }

      // Build difficulty instruction with MUCH more explicit guidance
      const difficultyInstructions = {
        beginner: `DIFFICULTY LEVEL: BEGINNER (Elementary/Introductory)
Create flashcards covering the MOST BASIC, FOUNDATIONAL content for complete beginners:
- Select the SIMPLEST, MOST COMMON items from the topic (e.g., for verbs: "to be", "to have", "to go")
- Use straightforward, everyday language
- Focus on basic definitions, essential facts, and fundamental concepts
- Questions should test RECALL of simple, common knowledge
- Example for Spanish verbs: "ser" (to be), "tener" (to have), "ir" (to go), "hacer" (to do)
- Example card: "What does 'ser' mean in English?" → "to be"`,

        intermediate: `DIFFICULTY LEVEL: INTERMEDIATE (College/Professional)
Create flashcards covering MODERATELY COMPLEX content for learners with some background:
- Select COMMON but more specific items from the topic (e.g., regular verbs in all tenses)
- Include some technical terminology and concepts
- Mix basic and moderately complex content
- Questions test understanding and application, not just memorization
- Example for Spanish verbs: regular -ar/-er/-ir verbs, common irregular verbs, present/preterite tenses
- Example card: "Conjugate 'hablar' in present tense (yo)" → "hablo"`,

        advanced: `DIFFICULTY LEVEL: ADVANCED (Graduate/Specialist)
Create flashcards covering SOPHISTICATED, SPECIALIZED content for advanced learners:
- Select LESS COMMON, MORE SPECIALIZED items from the topic (e.g., subjunctive mood, rare verbs)
- Use field-specific terminology and complex concepts
- Focus on nuanced distinctions and advanced applications
- Questions require deeper analysis and synthesis
- Example for Spanish verbs: subjunctive conjugations, irregular stems, advanced tenses (pluperfect, conditional perfect)
- Example card: "Conjugate 'hacer' in imperfect subjunctive (él)" → "hiciera" or "hiciese"`,

        expert: `DIFFICULTY LEVEL: EXPERT (Research/Mastery)
Create flashcards covering RARE, SPECIALIZED, or HIGHLY COMPLEX content for domain experts:
- Select the MOST OBSCURE, SPECIALIZED, or CHALLENGING items from the topic (e.g., archaic verbs, rare forms)
- Use advanced technical language and expect deep expertise
- Focus on edge cases, rare forms, or research-level knowledge
- Questions require expert-level precision and comprehensive understanding
- Example for Spanish verbs: archaic verb forms, rare regional variations, literary verb usage, voseo conjugations
- Example card: "What is the vosotros imperative form of 'poner'?" → "poned"`,

        mixed: `DIFFICULTY LEVEL: MIXED (Progressive Difficulty)
Create a balanced distribution of content across difficulty levels:
- 20% BEGINNER: Simple, foundational items (e.g., basic vocabulary, common verbs)
- 40% INTERMEDIATE: Common but moderately complex items (e.g., regular conjugations, common irregulars)
- 30% ADVANCED: Specialized or sophisticated items (e.g., subjunctive, complex tenses)
- 10% EXPERT: Rare, obscure, or highly specialized items (e.g., archaic forms, literary usage)

IMPORTANT: Vary the CONTENT difficulty, not just the question complexity. Choose progressively more obscure/complex/specialized TOPICS.`,
      };
      const difficultyInstruction =
        difficultyInstructions[difficulty || "mixed"] ||
        difficultyInstructions["mixed"];
      console.log(`\n=== DIFFICULTY CONFIGURATION ===`);
      console.log(`Selected difficulty: ${difficulty || "mixed"}`);
      console.log(`Full instruction:\n${difficultyInstruction}`);
      console.log(`================================\n`);

      // Determine which card types to generate
      const enabledTypes: CardType[] = [];
      if (cardTypes?.classicFlip) enabledTypes.push("classic-flip");
      if (cardTypes?.multipleChoice) enabledTypes.push("multiple-choice");
      if (cardTypes?.typeAnswer) enabledTypes.push("type-answer");

      // If no types selected, default to classic flip
      if (enabledTypes.length === 0) {
        enabledTypes.push("classic-flip");
      }

      const mixedCardTypes = enabledTypes.length > 1;
      console.log(`Card types enabled: ${enabledTypes.join(", ")}`);

      // Calculate distribution for mixed card types
      const cardsPerType: Record<string, number> = {};
      if (mixedCardTypes) {
        const baseCount = Math.floor(cardCount / enabledTypes.length);
        const remainder = cardCount % enabledTypes.length;

        enabledTypes.forEach((type, index) => {
          cardsPerType[type] = baseCount + (index < remainder ? 1 : 0);
        });

        console.log(`Card distribution:`, cardsPerType);
      }

      // Request significantly more cards than needed to account for potential filtering/loss
      // Add 50% padding, minimum of 15 extra cards to account for:
      // 1. Invalid cards that get filtered out
      // 2. Token limit cutoffs during generation
      // 3. JSON parsing issues
      // Cap based on token limits: 16384 max tokens / ~120 tokens per card = ~136 max cards
      const idealPaddedCount = Math.ceil(cardCount * 1.5) + 15;
      const maxCardsInTokenLimit = Math.floor(16384 / 120); // ~136 cards max with tighter token estimate
      const paddedCardCount = Math.min(idealPaddedCount, maxCardsInTokenLimit);
      console.log(
        `Requesting ${paddedCardCount} cards (ideal: ${idealPaddedCount}, will trim to ${cardCount})`
      );

      // JSON formatting instruction to append to all prompts
      const jsonFormattingNote = `\n\nIMPORTANT JSON FORMATTING: Ensure all strings are properly escaped. Replace newlines with \\n, escape quotes with \\", and ensure valid JSON.`;

      // Adjust temperature based on difficulty for better results
      const temperatureMap = {
        beginner: 0.6, // Lower temp for more consistent, straightforward cards
        intermediate: 0.7, // Moderate creativity
        advanced: 0.8, // Higher creativity for complex concepts
        expert: 0.9, // Highest creativity for nuanced, sophisticated content
        mixed: 0.8, // Balanced
      };
      const temperature = temperatureMap[difficulty || "mixed"] || 0.8;

      console.log(
        `Using temperature: ${temperature} for difficulty: ${
          difficulty || "mixed"
        }`
      );

      // Build language instruction that will be injected into prompts - MUCH MORE AGGRESSIVE
      const languageInstruction =
        frontLanguage && backLanguage
          ? `

🚨🚨🚨 CRITICAL LANGUAGE REQUIREMENT - READ THIS FIRST 🚨🚨🚨

This is a CROSS-LANGUAGE / TRANSLATION flashcard set. You MUST follow these rules:

FIELD-BY-FIELD LANGUAGE MAPPING:
✅ "front" field (question/prompt) → MUST be in ${frontLanguage}
✅ "back" field (answer) → MUST be in ${backLanguage}
✅ "correctAnswers" array → MUST be in ${backLanguage}
✅ "incorrectAnswers" array → MUST be in ${backLanguage}
✅ "acceptedAnswers" array → MUST be in ${backLanguage}

🚫 DO NOT PUT BOTH LANGUAGES IN THE SAME FIELD
🚫 DO NOT PUT ${backLanguage} IN THE FRONT FIELD
🚫 DO NOT PUT ${frontLanguage} IN THE BACK/ANSWER FIELDS

=== CONCRETE EXAMPLES FOR THIS EXACT USE CASE ===

FOR CLASSIC-FLIP CARDS (${frontLanguage} grammar → ${backLanguage} translation):
✅ CORRECT: { "cardType": "classic-flip", "front": "Conjuguez 'avoir' au présent (nous)", "back": "we have" }
❌ WRONG: { "cardType": "classic-flip", "front": "Conjugate 'avoir' present tense (nous)", "back": "nous avons" }

FOR MULTIPLE-CHOICE CARDS (${frontLanguage} question → ${backLanguage} answers):
✅ CORRECT: { 
  "cardType": "multiple-choice", 
  "front": "Quelle est la conjugaison correcte de 'faire' au présent (il)?", 
  "correctAnswers": ["he does", "he makes"], 
  "incorrectAnswers": ["he did", "he will do", "he would do"] 
}
❌ WRONG: { 
  "cardType": "multiple-choice", 
  "front": "Quelle est la conjugaison correcte de 'faire' au présent (il)?", 
  "correctAnswers": ["il fait"],  ← WRONG! This is ${frontLanguage}!
  "incorrectAnswers": ["il fais", "il faisait", "il ferait"] 
}

✅ CORRECT: { 
  "cardType": "multiple-choice", 
  "front": "Quel verbe est irrégulier?", 
  "correctAnswers": ["to be", "to have"], 
  "incorrectAnswers": ["to walk", "to talk", "to sing"] 
}
❌ WRONG: { 
  "cardType": "multiple-choice", 
  "front": "Quel verbe est irrégulier?", 
  "correctAnswers": ["être", "avoir"],  ← WRONG! This is ${frontLanguage}!
  "incorrectAnswers": ["marcher", "parler", "chanter"] 
}

✅ CORRECT: { 
  "cardType": "multiple-choice", 
  "front": "Quel verbe a le même radical que 'prendre'?", 
  "correctAnswers": ["to learn", "to understand"], 
  "incorrectAnswers": ["to see", "to do", "to say"] 
}
❌ WRONG: { 
  "cardType": "multiple-choice", 
  "front": "Quel verbe a le même radical que 'prendre'?", 
  "correctAnswers": ["apprendre", "comprendre"],  ← WRONG! These are ${frontLanguage} infinitives!
  "incorrectAnswers": ["voir", "faire", "dire"] 
}

FOR TYPE-ANSWER CARDS (${frontLanguage} question → ${backLanguage} answer):
✅ CORRECT: { "cardType": "type-answer", "front": "Quel est le participe passé de 'voir'?", "back": "seen", "acceptedAnswers": ["seen"] }
❌ WRONG: { "cardType": "type-answer", "front": "What is the past participle of 'voir'?", "back": "vu", "acceptedAnswers": ["vu"] }

✅ CORRECT: { "cardType": "type-answer", "front": "Traduisez 'nous pouvons'", "back": "we can", "acceptedAnswers": ["we can", "we are able to"] }
❌ WRONG: { "cardType": "type-answer", "front": "What is the English translation of 'nous pouvons'?", "back": "we can", "acceptedAnswers": ["we can"] }

🚫 DO NOT write questions in ${backLanguage}
🚫 DO NOT write answers in ${frontLanguage}
🚫 Every "front" field MUST be in ${frontLanguage}
🚫 Every answer field MUST be in ${backLanguage}
🚫 When asking about verbs, translate verb infinitives to ${backLanguage} (e.g., "être" → "to be", not "être")

IF THE TOPIC IS "${frontLanguage} verbs/grammar":
- Write questions about ${frontLanguage} IN ${frontLanguage}
- Provide answers/translations IN ${backLanguage}
- This is a ${frontLanguage}-to-${backLanguage} translation exercise`
          : frontLanguage
          ? `\n\nLANGUAGE REQUIREMENT: All content MUST be in ${frontLanguage}.`
          : backLanguage
          ? `\n\nLANGUAGE REQUIREMENT: All content MUST be in ${backLanguage}.`
          : "";

      // Build final reminder that goes at the end of each prompt
      const finalLanguageReminder =
        frontLanguage && backLanguage
          ? `

=== FINAL CRITICAL REMINDER ===

⚠️ COMMON MISTAKE TO AVOID ⚠️

When asking "Quelle est la conjugaison correcte de [verb]?" in ${frontLanguage}:
- The ANSWER must be the ${backLanguage} translation
- Example: "Quelle est la conjugaison correcte de 'avoir' (nous)?" → Answer: "we have" (NOT "nous avons")
- Example: "Quel verbe a le même radical?" → Answer: "to have" (NOT "avoir")
- Example: "Quel est le participe passé de 'voir'?" → Answer: "seen" (NOT "vu")
- Example: "Quel verbe est irrégulier?" → Answer: "to be" (NOT "être")
- Example: "Quel verbe a le même radical que 'prendre'?" → Answer: "to learn" (NOT "apprendre")

Even when the question asks for a conjugation form, verb name, verb infinitive, or grammatical element:
- If the QUESTION is in ${frontLanguage}
- The ANSWER must be translated to ${backLanguage}

DO NOT provide ${frontLanguage} text in correctAnswers, incorrectAnswers, back, or acceptedAnswers fields.
EVERY answer field MUST be in ${backLanguage} ONLY.
VERB INFINITIVES must be translated: "avoir" → "to have", "être" → "to be", "prendre" → "to take"

`
          : "";

      // Build system prompt based on selected card types
      let systemPrompt = "";

      if (mixedCardTypes) {
        // Multiple card types selected - distribute evenly
        const cardTypeList = enabledTypes
          .map((type) => {
            if (type === "classic-flip")
              return '- "classic-flip": Traditional flashcard with question and answer';
            if (type === "multiple-choice")
              return '- "multiple-choice": Question with 4 options where 1 is correct';
            if (type === "type-answer")
              return '- "type-answer": Question requiring exact typed answer';
            return "";
          })
          .filter(Boolean)
          .join("\n");

        // Build image instruction if images are requested
        const imageInstruction = includeImages
          ? `\n\n📸 IMAGE SEARCH OPTIMIZATION:\nFor each card, generate a "unsplashQuery" field containing optimized keywords for finding relevant stock photos.\n\n🚨 CRITICAL: When images are requested, EVERY card MUST include an "unsplashQuery" field. This is REQUIRED, not optional.\n\nRULES FOR unsplashQuery:\n- Use 2-4 specific, descriptive keywords (e.g., "golden retriever dog", "eiffel tower paris")\n- Fix any typos or spelling errors\n- Use common English terms for best image results\n- Be SPECIFIC - use the exact species/object/thing that should appear in the image\n\nIMAGE PLACEMENT LOGIC:\n- For classic-flip cards: \n  * If the user wants to IDENTIFY something from an image (e.g., "show bird image, guess the species"), put the image on the FRONT and use a short descriptive prompt like "Identify this bird"\n  * Base unsplashQuery on what should be SHOWN in the image (the thing to identify)\n  * Example: Front: "Identify this bird" + unsplashQuery: "bald eagle bird" → Back: "Bald Eagle"\n  * Example: Front: "Identify this bird" + unsplashQuery: "african grey parrot bird" → Back: "African Grey Parrot"\n  * Otherwise, put the image on the BACK (for learning/memorization)\n- For multiple-choice/type-answer: base the query on the QUESTION topic and put image on FRONT\n- Only skip unsplashQuery for purely text-based content (math equations, grammar rules, etc.)\n\nEXAMPLES:\n- Bird identification: \n  { "front": "Identify this bird", "back": "Great Blue Heron", "unsplashQuery": "great blue heron bird" }\n  { "front": "Identify this bird", "back": "Bald Eagle", "unsplashQuery": "bald eagle bird" }\n- Dog breeds: \n  { "front": "What breed is this?", "back": "Golden Retriever", "unsplashQuery": "golden retriever dog" }\n- Countries: \n  { "front": "What country is this?", "back": "France", "unsplashQuery": "eiffel tower paris france" }\n- Historical learning: \n  { "front": "Who was the 16th US president?", "back": "Abraham Lincoln", "unsplashQuery": "abraham lincoln portrait" }\n\n🚨 REMEMBER: When images are enabled, ALWAYS include "unsplashQuery" for visual content!`
          : "";

        // Build the explicit distribution requirement
        // CRITICAL: Reorder types so type-answer comes FIRST (AI tends to skip what comes last)
        const reorderedTypes = [...enabledTypes].sort((a, b) => {
          if (a === "type-answer") return -1;
          if (b === "type-answer") return 1;
          return 0;
        });

        const distributionBreakdown = reorderedTypes
          .map(
            (type) => `- ${cardsPerType[type]} cards with cardType: "${type}"`
          )
          .join("\n");

        // Build card-by-card explicit mapping
        let cardByCardMapping =
          "\n\n📋 EXACT CARD ORDER (follow this PRECISELY):\n";
        let currentIndex = 1;
        for (const type of reorderedTypes) {
          const count = cardsPerType[type];
          const endIndex = currentIndex + count - 1;
          if (count === 1) {
            cardByCardMapping += `Card ${currentIndex}: MUST be cardType "${type}"\n`;
          } else {
            cardByCardMapping += `Cards ${currentIndex}-${endIndex}: MUST be cardType "${type}"\n`;
          }
          currentIndex = endIndex + 1;
        }

        // Add concrete examples
        const concreteExamples = `\n\n📚 REQUIRED EXAMPLES FOR EACH TYPE:\n\n${
          reorderedTypes.includes("type-answer")
            ? `🔴 TYPE-ANSWER (you MUST make ${cardsPerType["type-answer"]} of these):\n{\n  "cardType": "type-answer",\n  "front": "What year was the Declaration of Independence signed?",\n  "back": "1776",\n  "acceptedAnswers": ["1776", "seventeen seventy-six"]\n}\n\n`
            : ""
        }${
          reorderedTypes.includes("classic-flip")
            ? `🟢 CLASSIC-FLIP (you MUST make ${
                cardsPerType["classic-flip"] || 0
              } of these):\n{\n  "cardType": "classic-flip",\n  "front": "Who was the first President?",\n  "back": "George Washington"\n}\n\n`
            : ""
        }${
          reorderedTypes.includes("multiple-choice")
            ? `🔵 MULTIPLE-CHOICE (you MUST make ${
                cardsPerType["multiple-choice"] || 0
              } of these):\n{\n  "cardType": "multiple-choice",\n  "front": "Which war was between North and South?",\n  "correctAnswers": ["The Civil War"],\n  "incorrectAnswers": ["WWI", "Revolutionary War", "War of 1812"]\n}\n\n`
            : ""
        }`;

        systemPrompt = `${languageInstruction}\n\nYou are an expert educational content creator. Generate EXACTLY ${paddedCardCount} high-quality flashcards for studying the given topic.\n\nCRITICAL: You MUST generate EXACTLY ${paddedCardCount} cards. Do not generate more or fewer.\n\n${difficultyInstruction}\n\n🚨🚨🚨 CRITICAL CARD TYPE DISTRIBUTION REQUIREMENT 🚨🚨🚨\n\nYou MUST create cards with this EXACT distribution:\n${distributionBreakdown}${cardByCardMapping}${concreteExamples}\n⚠️ BEFORE YOU RESPOND - VALIDATION CHECKLIST:\n✓ Count how many cards have cardType: "type-answer" → should be ${
          cardsPerType["type-answer"] || 0
        }\n✓ Count how many cards have cardType: "multiple-choice" → should be ${
          cardsPerType["multiple-choice"] || 0
        }\n✓ Count how many cards have cardType: "classic-flip" → should be ${
          cardsPerType["classic-flip"] || 0
        }\n✓ If counts don't match, FIX IT NOW before responding\n\n${
          enabledTypes.includes("type-answer")
            ? `🔴🔴🔴 CRITICAL: TYPE-ANSWER CARDS ARE MANDATORY 🔴🔴🔴\n- ${cardsPerType["type-answer"]} cards MUST have "cardType": "type-answer"\n- type-answer cards MUST have: front, back, cardType, acceptedAnswers\n- Do NOT skip type-answer\n- Do NOT replace with classic-flip\n- GENERATE TYPE-ANSWER CARDS FIRST\n\n`
            : ""
        }\nCreate a mix of these card types:\n${cardTypeList}\n\nREQUIRED FORMAT - Each card MUST have ALL of these properties:\n- "cardType": REQUIRED - must be one of ${enabledTypes
          .map((t) => `"${t}"`)
          .join(
            ", "
          )}\n- "front": REQUIRED - the question or prompt (never empty)\n- "back": REQUIRED ONLY for classic-flip and type-answer cards - the answer\n- "correctAnswers": REQUIRED for multiple-choice cards - array of ALL correct answers (can be 1 or more)\n- "incorrectAnswers": REQUIRED for multiple-choice cards - array of exactly 3 INCORRECT options\n- "acceptedAnswers": REQUIRED for type-answer cards - array of alternative acceptable answers (include case variations)${
          includeImages
            ? '\n- "unsplashQuery": OPTIONAL - optimized keywords for stock photo search (2-4 words)'
            : ""
        }\n\nCRITICAL: Do NOT include any other fields like "note", "notes", "explanation", "additionalInfo", "hint", "options", or any other extra fields. ONLY include the fields listed above.${imageInstruction}\n\n${finalLanguageReminder}Format your response as a JSON object with a "cards" array containing exactly ${paddedCardCount} cards. Make the cards progressively more challenging.${jsonFormattingNote}`;
      } else {
        // Single card type selected
        const singleType = enabledTypes[0];

        // Build image instruction if images are requested
        const imageInstruction = includeImages
          ? `\n\n📸 IMAGE SEARCH OPTIMIZATION:\nFor each card, generate a "unsplashQuery" field containing optimized keywords for finding relevant stock photos.\n\n🚨 CRITICAL: When images are requested, EVERY card MUST include an "unsplashQuery" field. This is REQUIRED, not optional.\n\nRULES FOR unsplashQuery:\n- Use 2-4 specific, descriptive keywords (e.g., "golden retriever dog", "eiffel tower paris")\n- Fix any typos or spelling errors\n- Use common English terms for best image results\n- Be SPECIFIC - use the exact species/object/thing that should appear in the image\n\nIMAGE PLACEMENT LOGIC:\n- For classic-flip cards: \n  * If the user wants to IDENTIFY something from an image (e.g., "show bird image, guess the species"), put the image on the FRONT and use a short descriptive prompt like "Identify this bird"\n  * Base unsplashQuery on what should be SHOWN in the image (the thing to identify)\n  * Example: Front: "Identify this bird" + unsplashQuery: "bald eagle bird" → Back: "Bald Eagle"\n  * Example: Front: "Identify this bird" + unsplashQuery: "african grey parrot bird" → Back: "African Grey Parrot"\n  * Otherwise, put the image on the BACK (for learning/memorization)\n- For multiple-choice/type-answer: base the query on the QUESTION topic and put image on FRONT\n- Only skip unsplashQuery for purely text-based content (math equations, grammar rules, etc.)\n\nEXAMPLES:\n- Bird identification: \n  { "front": "Identify this bird", "back": "Great Blue Heron", "unsplashQuery": "great blue heron bird" }\n  { "front": "Identify this bird", "back": "Bald Eagle", "unsplashQuery": "bald eagle bird" }\n- Dog breeds: \n  { "front": "What breed is this?", "back": "Golden Retriever", "unsplashQuery": "golden retriever dog" }\n- Countries: \n  { "front": "What country is this?", "back": "France", "unsplashQuery": "eiffel tower paris france" }\n- Historical learning: \n  { "front": "Who was the 16th US president?", "back": "Abraham Lincoln", "unsplashQuery": "abraham lincoln portrait" }\n\n🚨 REMEMBER: When images are enabled, ALWAYS include "unsplashQuery" for visual content!`
          : "";

        if (singleType === "classic-flip") {
          systemPrompt = `${languageInstruction}\n\nYou are an expert educational content creator. Generate EXACTLY ${paddedCardCount} high-quality flashcards for studying the given topic.\n\nCRITICAL: You MUST generate EXACTLY ${paddedCardCount} cards. Do not generate more or fewer.\n\n${difficultyInstruction}\n\nEach flashcard MUST have these properties:\n- "cardType": "classic-flip"\n- "front": the question or prompt (never empty)\n- "back": the answer/explanation (never empty)${
            includeImages
              ? '\n- "unsplashQuery": OPTIONAL - optimized keywords for stock photo search (2-4 words)'
              : ""
          }\n\nCRITICAL: Do NOT include any other fields like "note", "notes", "explanation", "additionalInfo", "hint", or any other extra fields. ONLY include the fields listed above.${imageInstruction}${MUSIC_CHORD_INSTRUCTION_CLASSIC_FLIP}\n\n${finalLanguageReminder}Format your response as a JSON object with a "cards" array containing exactly ${paddedCardCount} cards. Make the cards progressively more challenging.${jsonFormattingNote}`;
        } else if (singleType === "multiple-choice") {
          systemPrompt = `${languageInstruction}\n\nYou are an expert educational content creator. Generate EXACTLY ${paddedCardCount} high-quality multiple-choice flashcards for studying the given topic.\n\nCRITICAL: You MUST generate EXACTLY ${paddedCardCount} cards. Do not generate more or fewer.\n\n${difficultyInstruction}\n\nEach flashcard MUST have these properties:\n- "cardType": "multiple-choice"\n- "front": the question or prompt (never empty)\n- "correctAnswers": array of ALL correct answers (can be 1 or more) - CRITICAL: MUST ALWAYS have at least 1 correct answer\n- "incorrectAnswers": array of exactly 3 INCORRECT options\n\nCRITICAL: Do NOT include "back" field for multiple-choice cards. Do NOT include any other fields like "note", "notes", "explanation", "additionalInfo", "hint", or any other extra fields. ONLY include the fields listed above.\n\nMULTIPLE CORRECT ANSWERS: About 20-30% of your cards should have multiple correct answers when appropriate. Use "correctAnswers" array containing ALL correct answers.\n\nExamples:\n- Single correct: { "cardType": "multiple-choice", "front": "What is 2+2?", "correctAnswers": ["4"], "incorrectAnswers": ["3", "5", "6"] }\n- Multiple correct: { "cardType": "multiple-choice", "front": "Which are primary colors?", "correctAnswers": ["Red", "Blue", "Yellow"], "incorrectAnswers": ["Green", "Purple", "Orange"] }${MUSIC_CHORD_INSTRUCTION_MULTIPLE_CHOICE}\n\n${finalLanguageReminder}Format your response as a JSON object with a "cards" array containing exactly ${paddedCardCount} cards.${jsonFormattingNote}`;
        } else if (singleType === "type-answer") {
          systemPrompt = `${languageInstruction}\n\nYou are an expert educational content creator. Generate EXACTLY ${paddedCardCount} high-quality type-answer flashcards for studying the given topic.\n\nCRITICAL: You MUST generate EXACTLY ${paddedCardCount} cards. Do not generate more or fewer.\n\n${difficultyInstruction}\n\nEach flashcard MUST have these properties:\n- "cardType": "type-answer"\n- "front": the question or prompt (never empty)\n- "back": the exact answer expected (never empty)\n- "acceptedAnswers": array of alternative acceptable answers (include case variations)\n\nCRITICAL: Do NOT include any other fields like "note", "notes", "explanation", "additionalInfo", "hint", or any other extra fields. ONLY include the fields listed above.${MUSIC_CHORD_INSTRUCTION_TYPE_ANSWER}\n\n${finalLanguageReminder}Format your response as a JSON object with a "cards" array containing exactly ${paddedCardCount} cards.${jsonFormattingNote}`;
        }
      }

      console.log(
        `System prompt preview:\n${systemPrompt.substring(0, 500)}...\n`
      );

      // Build user message with explicit distribution for mixed card types
      let userMessage = "";
      if (mixedCardTypes) {
        const distributionDetails = enabledTypes
          .map((type) => `- ${cardsPerType[type]} ${type} cards`)
          .join("\n");

        // Detect if topic is about music chords and add explicit instruction
        const topicLower = topic.toLowerCase();
        const isMusicChords =
          topicLower.includes("chord") || topicLower.includes("music theory");
        const is4NoteChords =
          topicLower.includes("4-note") ||
          topicLower.includes("four-note") ||
          topicLower.includes("7th") ||
          topicLower.includes("seventh") ||
          topicLower.includes("extended");
        const is9thChords =
          topicLower.includes("9th") ||
          topicLower.includes("ninth") ||
          topicLower.includes("complex chord");
        const wantsGenericQuestion =
          topicLower.includes("what kind") ||
          topicLower.includes("what type") ||
          topicLower.includes("identify");

        let chordTypeInstruction = "";
        if (isMusicChords) {
          const formatNote = wantsGenericQuestion
            ? `\n\n📋 QUESTION FORMAT: Use [CHORD_AUDIO:notation] format!\n- Front: "[CHORD_AUDIO:Cmaj7] What kind of chord is this?"\n- NOT: "What kind of chord is this? Cmaj7"\n- NOT: "Cmaj7 chord"\nThe [CHORD_AUDIO:...] prefix is required for audio generation.`
            : "";

          if (is9thChords) {
            chordTypeInstruction = `\n\n🎵 MUSIC CHORD TYPE DETECTED 🎵\nThe topic is about 9TH/COMPLEX CHORDS. You MUST generate ONLY 5-note chord cards:\n- Front: "${
              wantsGenericQuestion ? "[CHORD_AUDIO:Cmaj9]" : "Cmaj9 chord"
            }"\n- Back: "Major 9th" (NOT "Major triad")\nDo NOT generate 3-note triads. Generate ONLY 9th chords.${formatNote}\n`;
          } else if (is4NoteChords) {
            chordTypeInstruction = `\n\n🎵 MUSIC CHORD TYPE DETECTED 🎵\nThe topic is about 4-NOTE/7TH CHORDS. You MUST generate ONLY 4-note chord cards:\n- Use FORMAT 2 with [CHORD_AUDIO:notation] prefix${formatNote}\n- Examples:\n  * "[CHORD_AUDIO:Cmaj7] What kind of chord is this?" → "Major 7th"\n  * "[CHORD_AUDIO:Dm7] What kind of chord is this?" → "Minor 7th"\n  * "[CHORD_AUDIO:G7] What kind of chord is this?" → "Dominant 7th"\n  * "[CHORD_AUDIO:Bm7b5] What kind of chord is this?" → "Half Diminished 7th"\nDo NOT generate 3-note triads. Generate ONLY 7th chords (maj7, m7, 7, dim7, m7b5, etc.).\n`;
          } else {
            chordTypeInstruction = `\n\n🎵 MUSIC CHORD TYPE DETECTED 🎵\nThe topic is about BASIC TRIADS. Generate 3-note chord cards:\n- Front: "${
              wantsGenericQuestion ? "[CHORD_AUDIO:C]" : "C major chord"
            }"\n- Back: "Major triad"${formatNote}\n`;
          }
        }

        userMessage = `Create ${paddedCardCount} flashcards about: ${topic}. Follow the difficulty level instructions precisely.${chordTypeInstruction}

CRITICAL DISTRIBUTION REQUIREMENT:
You MUST create EXACTLY this distribution of card types:
${distributionDetails}

This means:
${enabledTypes
  .map((type) => {
    if (type === "classic-flip")
      return `${cardsPerType[type]} cards must have cardType: "classic-flip"`;
    if (type === "multiple-choice")
      return `${cardsPerType[type]} cards must have cardType: "multiple-choice"`;
    if (type === "type-answer")
      return `${cardsPerType[type]} cards must have cardType: "type-answer"`;
    return "";
  })
  .join("\n")}

Do NOT create more of one type than specified above.${
          enabledTypes.includes("type-answer")
            ? `\n\n🚨🚨🚨 FINAL CRITICAL WARNING 🚨🚨🚨\nYou MUST include ${cardsPerType["type-answer"]} TYPE-ANSWER cards!\nDo NOT skip type-answer!\nDo NOT only make classic-flip and multiple-choice!\nINCLUDE ALL THREE TYPES AS SPECIFIED ABOVE!`
            : ""
        }${
          frontLanguage && backLanguage
            ? `\n\n🚨 CRITICAL REMINDER 🚨\nQuestions ("front") in ${frontLanguage}\nAnswers ("back", "correctAnswers", "incorrectAnswers") in ${backLanguage}\nDo NOT mix languages!\nDo NOT put ${frontLanguage} in answer fields!\nTranslate ALL verb infinitives to ${backLanguage}!`
            : frontLanguage
            ? ` All content in ${frontLanguage}.`
            : backLanguage
            ? ` All content in ${backLanguage}.`
            : ""
        }`;
      } else {
        // Detect if topic is about music chords and add explicit instruction
        const topicLower = topic.toLowerCase();
        const isMusicChords =
          topicLower.includes("chord") || topicLower.includes("music theory");
        const is4NoteChords =
          topicLower.includes("4-note") ||
          topicLower.includes("four-note") ||
          topicLower.includes("7th") ||
          topicLower.includes("seventh") ||
          topicLower.includes("extended");
        const is9thChords =
          topicLower.includes("9th") ||
          topicLower.includes("ninth") ||
          topicLower.includes("complex chord");
        const wantsGenericQuestion =
          topicLower.includes("what kind") ||
          topicLower.includes("what type") ||
          topicLower.includes("identify");

        let chordTypeInstruction = "";
        if (isMusicChords) {
          const formatNote = wantsGenericQuestion
            ? `\n\n📋 QUESTION FORMAT: Use [CHORD_AUDIO:notation] format!\n- Front: "[CHORD_AUDIO:Cmaj7] What kind of chord is this?"\n- NOT: "What kind of chord is this? Cmaj7"\n- NOT: "Cmaj7 chord"\nThe [CHORD_AUDIO:...] prefix is required for audio generation.`
            : "";

          if (is9thChords) {
            chordTypeInstruction = `\n\n🎵 MUSIC CHORD TYPE DETECTED 🎵\nThe topic is about 9TH/COMPLEX CHORDS. You MUST generate ONLY 5-note chord cards:\n- Front: "${
              wantsGenericQuestion ? "[CHORD_AUDIO:Cmaj9]" : "Cmaj9 chord"
            }"\n- Back: "Major 9th" (NOT "Major triad")\nDo NOT generate 3-note triads. Generate ONLY 9th chords.${formatNote}`;
          } else if (is4NoteChords) {
            chordTypeInstruction = `\n\n🎵 MUSIC CHORD TYPE DETECTED 🎵\nThe topic is about 4-NOTE/7TH CHORDS. You MUST generate ONLY 4-note chord cards:\n- Use FORMAT 2 with [CHORD_AUDIO:notation] prefix${formatNote}\n- Examples:\n  * "[CHORD_AUDIO:Cmaj7] What kind of chord is this?" → "Major 7th"\n  * "[CHORD_AUDIO:Dm7] What kind of chord is this?" → "Minor 7th"\n  * "[CHORD_AUDIO:G7] What kind of chord is this?" → "Dominant 7th"\n  * "[CHORD_AUDIO:Bm7b5] What kind of chord is this?" → "Half Diminished 7th"\nDo NOT generate 3-note triads. Generate ONLY 7th chords (maj7, m7, 7, dim7, m7b5, etc.).`;
          } else {
            chordTypeInstruction = `\n\n🎵 MUSIC CHORD TYPE DETECTED 🎵\nThe topic is about BASIC TRIADS. Generate 3-note chord cards:\n- Front: "${
              wantsGenericQuestion ? "[CHORD_AUDIO:C]" : "C major chord"
            }"\n- Back: "Major triad"${formatNote}`;
          }
        }

        userMessage = `Create ${paddedCardCount} flashcards about: ${topic}. Follow the difficulty level instructions precisely.${chordTypeInstruction}${
          frontLanguage && backLanguage
            ? `\n\n🚨 CRITICAL REMINDER 🚨\nQuestions ("front") in ${frontLanguage}\nAnswers ("back", "correctAnswers", "incorrectAnswers") in ${backLanguage}\nDo NOT mix languages!\nDo NOT put ${frontLanguage} in answer fields!\nTranslate ALL verb infinitives to ${backLanguage}!`
            : frontLanguage
            ? ` All content in ${frontLanguage}.`
            : backLanguage
            ? ` All content in ${backLanguage}.`
            : ""
        }`;
      }

      // Call OpenAI API
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: cardCount > 50 ? "gpt-4o" : "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: userMessage,
              },
            ],
            response_format: { type: "json_object" },
            temperature: temperature,
            max_tokens: Math.min(16384, paddedCardCount * 120), // ~120 tokens per card, capped at max
          }),
        }
      );

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.log(
          `❌ OpenAI API error: ${openaiResponse.status} - ${errorText}`
        );

        // Handle specific error codes
        if (openaiResponse.status === 429) {
          return c.json(
            {
              error:
                "OpenAI API rate limit reached. Please try again in a few moments or check your API usage at platform.openai.com",
            },
            429
          );
        } else if (openaiResponse.status === 401) {
          return c.json(
            {
              error:
                "Invalid OpenAI API key. Please check your API key configuration.",
            },
            500
          );
        } else if (openaiResponse.status === 402) {
          return c.json(
            {
              error:
                "OpenAI API quota exceeded. Please add credits to your OpenAI account at platform.openai.com/account/billing",
            },
            402
          );
        } else if (openaiResponse.status === 400) {
          // Bad Request - likely schema or model compatibility issue
          console.error("❌ Chat Generation - Bad Request details:", errorText);
          return c.json(
            {
              error: `AI generation failed with invalid request. This may be due to model compatibility. Details: ${errorText}`,
            },
            400
          );
        }

        return c.json(
          {
            error: `AI generation failed: ${openaiResponse.statusText}. Details: ${errorText}`,
          },
          500
        );
      }

      const openaiData = (await openaiResponse.json()) as OpenAIResponse;
      console.log("✅ OpenAI response received");

      // Parse the response
      let cards: GeneratedCard[];
      try {
        const rawContent = openaiData.choices[0].message.content;
        console.log("Raw OpenAI response length:", rawContent.length);

        let content: ParsedOpenAIContent;
        // Try to parse as-is first
        try {
          content = JSON.parse(rawContent) as ParsedOpenAIContent;
        } catch (firstError) {
          console.log(
            "First parse failed, attempting to repair JSON...",
            firstError instanceof Error
              ? firstError.message
              : String(firstError)
          );

          // Strategy 1: Remove trailing content after last }
          let repairedContent = rawContent;
          const lastBrace = repairedContent.lastIndexOf("}");
          if (lastBrace !== -1 && lastBrace < repairedContent.length - 1) {
            repairedContent = repairedContent.substring(0, lastBrace + 1);
            console.log("Strategy 1: Trimmed content after last brace");
          }

          try {
            content = JSON.parse(repairedContent) as ParsedOpenAIContent;
            console.log("Successfully parsed after Strategy 1");
          } catch (secondError) {
            console.log(
              "Strategy 2: Extracting cards array...",
              secondError instanceof Error
                ? secondError.message
                : String(secondError)
            );

            // Strategy 2: Find and extract just the cards array, removing incomplete cards
            const cardsMatch = repairedContent.match(
              /"cards"\s*:\s*\[([\s\S]*)\]/
            );
            if (cardsMatch) {
              let cardsArrayContent = cardsMatch[1];

              // Remove any incomplete card at the end
              const lastCompleteObj = cardsArrayContent.lastIndexOf("}");
              if (lastCompleteObj !== -1) {
                cardsArrayContent = cardsArrayContent.substring(
                  0,
                  lastCompleteObj + 1
                );
              }

              // Reconstruct the JSON
              repairedContent = `{"cards":[${cardsArrayContent}]}`;
              console.log(
                "Strategy 2: Extracted and reconstructed cards array"
              );

              try {
                content = JSON.parse(repairedContent) as ParsedOpenAIContent;
                console.log("Successfully parsed after Strategy 2");
              } catch (thirdError) {
                console.log(
                  "All strategies failed",
                  thirdError instanceof Error
                    ? thirdError.message
                    : String(thirdError)
                );
                throw thirdError;
              }
            } else {
              throw secondError;
            }
          }
        }

        // Handle different possible response formats
        cards = content.cards || content.flashcards || [];

        // Ensure we have an array
        if (!Array.isArray(cards)) {
          throw new Error("Invalid response format from AI");
        }

        console.log(
          `AI generated ${cards.length} cards (requested: ${paddedCardCount}, target: ${cardCount})`
        );

        // Log the RAW cards to see what AI actually generated
        console.log("\n=== RAW AI GENERATED CARDS (first 3) ===");
        cards.slice(0, 3).forEach((card: GeneratedCard, i: number) => {
          console.log(`Card ${i}:`, JSON.stringify(card, null, 2));
        });
        console.log("=== END RAW CARDS ===\n");

        // Log ALL multiple-choice cards specifically
        const rawMultipleChoiceCards = cards.filter(
          (card: GeneratedCard) => card.cardType === "multiple-choice"
        );
        if (rawMultipleChoiceCards.length > 0) {
          console.log("\n=== RAW MULTIPLE-CHOICE CARDS ===");
          rawMultipleChoiceCards.forEach((card: GeneratedCard, i: number) => {
            console.log(`MC Card ${i}:`, JSON.stringify(card, null, 2));
          });
          console.log("=== END RAW MULTIPLE-CHOICE CARDS ===\n");
        }

        // Log any invalid cards
        const invalidCards = cards.filter((card: unknown) => {
          if (typeof card === "object" && card !== null && "front" in card) {
            // Multiple-choice doesn't need "back", but needs correctAnswers
            if ("cardType" in card && card.cardType === "multiple-choice") {
              return !card.front || !("correctAnswers" in card);
            }
            // Other types need both front and back
            return !card.front || !("back" in card) || !card.back;
          }
          return true;
        });
        if (invalidCards.length > 0) {
          console.log(
            `⚠️ WARNING: Filtering out ${invalidCards.length} invalid cards:`,
            JSON.stringify(invalidCards)
          );
        }

        // Validate card structure and filter
        const validCards = cards.filter(
          (card: unknown): card is GeneratedCard => {
            if (typeof card === "object" && card !== null && "front" in card) {
              const c = card as UnknownCard;
              // Multiple-choice: needs front and correctAnswers with at least 1 answer
              if ("cardType" in c && c.cardType === "multiple-choice") {
                return (
                  !!c.front &&
                  "correctAnswers" in c &&
                  Array.isArray(c.correctAnswers) &&
                  c.correctAnswers.length > 0 &&
                  "incorrectAnswers" in c &&
                  Array.isArray(c.incorrectAnswers) &&
                  c.incorrectAnswers.length > 0
                );
              }
              // Other types: need front and back
              return !!c.front && "back" in c && !!c.back;
            }
            return false;
          }
        );
        console.log(
          `After filtering: ${validCards.length} valid cards (need: ${cardCount})`
        );

        // Check if we have enough cards
        if (validCards.length < cardCount) {
          console.log(
            `⚠️ WARNING: Only got ${
              validCards.length
            } valid cards, need ${cardCount}. Shortfall: ${
              cardCount - validCards.length
            }`
          );
        }

        // Take only what we need (or all if we have less)
        cards = validCards.slice(0, cardCount);

        // Ensure each card has a cardType (default to classic-flip)
        // Only include allowed fields to prevent OpenAI from adding unwanted fields like "note"
        cards = cards.map((card: UnknownCard, index: number): GeneratedCard => {
          // Handle card type-specific fields
          if (card.cardType === "multiple-choice") {
            // Multiple-choice: front + correctAnswers + incorrectAnswers (NO back field)
            const mcCard: GeneratedCard = {
              front: String(card.front || ""),
              cardType: "multiple-choice" as CardType,
              correctAnswers: Array.isArray(card.correctAnswers)
                ? card.correctAnswers.map(String)
                : [],
              incorrectAnswers: Array.isArray(card.incorrectAnswers)
                ? card.incorrectAnswers.map(String)
                : [],
            };

            // CRITICAL VALIDATION: Ensure we have at least 1 correct answer
            if (mcCard.correctAnswers?.length === 0) {
              console.error(
                `❌ CRITICAL ERROR: Card ${index} is missing correctAnswers!`,
                JSON.stringify(card)
              );
              // Add a default to prevent breaking
              mcCard.correctAnswers = ["Answer not generated"];
            }

            if (mcCard.incorrectAnswers?.length === 0) {
              console.error(
                `❌ CRITICAL ERROR: Card ${index} is missing incorrectAnswers!`,
                JSON.stringify(card)
              );
            }

            // Preserve unsplashQuery if present
            if (card.unsplashQuery && typeof card.unsplashQuery === "string") {
              mcCard.unsplashQuery = card.unsplashQuery;
            }

            return mcCard;
          } else if (card.cardType === "type-answer") {
            // Type-answer: front/back + acceptedAnswers
            const taCard: GeneratedCard = {
              front: String(card.front || ""),
              back: String(card.back || ""),
              cardType: "type-answer" as CardType,
              acceptedAnswers: Array.isArray(card.acceptedAnswers)
                ? card.acceptedAnswers.map(String)
                : [],
            };

            // Ensure we have acceptedAnswers with case variations
            if (taCard.acceptedAnswers?.length === 0 && taCard.back) {
              console.warn(
                `⚠️ WARNING: Card ${index} is missing acceptedAnswers, generating from back field`
              );
              const backStr = String(taCard.back);
              taCard.acceptedAnswers = [
                backStr.toLowerCase(),
                backStr.toUpperCase(),
                backStr.charAt(0).toUpperCase() +
                  backStr.slice(1).toLowerCase(),
              ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
            }

            // Preserve unsplashQuery if present
            if (card.unsplashQuery && typeof card.unsplashQuery === "string") {
              taCard.unsplashQuery = card.unsplashQuery;
            }

            return taCard;
          } else {
            // Classic-flip: just front/back/cardType + unsplashQuery
            const cfCard: GeneratedCard = {
              front: String(card.front || ""),
              back: String(card.back || ""),
              cardType: (card.cardType as CardType) || "classic-flip",
            };

            // Preserve unsplashQuery if present
            if (card.unsplashQuery && typeof card.unsplashQuery === "string") {
              cfCard.unsplashQuery = card.unsplashQuery;
            }

            return cfCard;
          }
        });

        if (cards.length === 0) {
          throw new Error("No valid cards generated");
        }

        console.log(
          `✅ Successfully generated ${cards.length} cards (requested: ${cardCount})`
        );
        console.log(
          `Card types distribution:`,
          cards.map((c) => c.cardType)
        );

        // FINAL LOGGING: Show what we're actually returning to the frontend
        console.log("\n=== FINAL CARDS BEING RETURNED (first 3) ===");
        cards.slice(0, 3).forEach((card: GeneratedCard, i: number) => {
          console.log(`Final Card ${i}:`, JSON.stringify(card, null, 2));
        });
        console.log("=== END FINAL CARDS ===\n");

        // Log ALL final multiple-choice cards
        const finalMultipleChoiceCards = cards.filter(
          (card: GeneratedCard) => card.cardType === "multiple-choice"
        );
        if (finalMultipleChoiceCards.length > 0) {
          console.log("\n=== FINAL MULTIPLE-CHOICE CARDS BEING RETURNED ===");
          finalMultipleChoiceCards.forEach((card: GeneratedCard, i: number) => {
            console.log(`Final MC Card ${i}:`, JSON.stringify(card, null, 2));
          });
          console.log("=== END FINAL MULTIPLE-CHOICE CARDS ===\n");
        }
      } catch (parseError) {
        console.error("❌ JSON parsing error:", parseError);
        console.error(
          "Failed to parse OpenAI response. This usually happens when the AI includes unescaped quotes or special characters."
        );

        const rawContent = openaiData.choices[0].message.content;
        console.log(
          "Raw response preview (first 500 chars):",
          rawContent.substring(0, 500)
        );
        console.log(
          "Raw response preview (last 500 chars):",
          rawContent.substring(rawContent.length - 500)
        );

        return c.json(
          {
            error:
              "Failed to parse AI response: AI generated malformed JSON. This can happen with complex formatting. Please try again or simplify your request.",
            details:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
          },
          500
        );
      }

      // 🖼️ ADD IMAGES TO CARDS IF REQUESTED
      if (includeImages && cards.length > 0) {
        console.log(`\n🖼️ Adding images to ${cards.length} cards...`);

        const cardsWithImages = await Promise.all(
          cards.map(async (card: any) => {
            try {
              const back = card.back || "";

              // Skip if card shouldn't get images
              if (!shouldAddImage(card.front, back)) {
                console.log(
                  `⏭️ Skipping images for: "${card.front.substring(0, 50)}..."`
                );
                return card;
              }

              // Check if AI provided an optimized unsplashQuery
              const unsplashQuery = card.unsplashQuery;

              if (!unsplashQuery) {
                console.log(
                  `ℹ️ No unsplashQuery for card: "${card.front.substring(
                    0,
                    50
                  )}..."`
                );
                return card;
              }

              let frontImageUrl: string | null = null;
              let backImageUrl: string | null = null;
              let frontImageAttribution: any = null;
              let backImageAttribution: any = null;

              // 🧠 SMART IMAGE PLACEMENT LOGIC
              // For classic-flip: Detect if this is an identification/recognition task
              if (card.cardType === "classic-flip") {
                // Check if front text suggests image should be on FRONT (identification task)
                const frontText = card.front.toLowerCase();
                const isIdentificationTask =
                  frontText.includes("identify") ||
                  frontText.includes("what is this") ||
                  frontText.includes("what kind") ||
                  frontText.includes("what type") ||
                  frontText.includes("what breed") ||
                  frontText.includes("what species") ||
                  frontText.includes("name this") ||
                  frontText.includes("recognize") ||
                  frontText.length < 30; // Very short front text = likely visual identification

                if (isIdentificationTask) {
                  // Image goes on FRONT for identification
                  console.log(
                    `🔍 Identification task detected - searching for FRONT image: "${unsplashQuery}"`
                  );
                  const imageResult: UnsplashImageResult | null =
                    await searchUnsplashImageWithAttribution(unsplashQuery);

                  if (imageResult) {
                    frontImageUrl = imageResult.imageUrl;
                    frontImageAttribution = imageResult.attribution;
                    console.log(
                      `✅ Added FRONT image for identification: "${card.front.substring(
                        0,
                        50
                      )}..."`
                    );
                  }
                } else {
                  // Traditional learning - image goes on BACK
                  console.log(
                    `🔍 Learning task detected - searching for BACK image: "${unsplashQuery}"`
                  );
                  const imageResult: UnsplashImageResult | null =
                    await searchUnsplashImageWithAttribution(unsplashQuery);

                  if (imageResult) {
                    backImageUrl = imageResult.imageUrl;
                    backImageAttribution = imageResult.attribution;
                    console.log(
                      `✅ Added BACK image for learning: "${card.back?.substring(
                        0,
                        50
                      )}..."`
                    );
                  }
                }
              }

              // For multiple-choice and type-answer: Add image to the FRONT (the question)
              if (
                card.cardType === "multiple-choice" ||
                card.cardType === "type-answer"
              ) {
                console.log(`🔍 Searching for front image: "${unsplashQuery}"`);
                const imageResult: UnsplashImageResult | null =
                  await searchUnsplashImageWithAttribution(unsplashQuery);

                if (imageResult) {
                  frontImageUrl = imageResult.imageUrl;
                  frontImageAttribution = imageResult.attribution;
                  console.log(
                    `✅ Added front image for: "${card.front.substring(
                      0,
                      50
                    )}..."`
                  );
                }
              }

              // Return card with appropriate image fields AND attribution data (exclude unsplashQuery from final output)
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { unsplashQuery: _, ...cardWithoutQuery } = card;
              return {
                ...cardWithoutQuery,
                ...(frontImageUrl && { frontImageUrl }),
                ...(backImageUrl && { backImageUrl }),
                ...(frontImageAttribution && { frontImageAttribution }),
                ...(backImageAttribution && { backImageAttribution }),
              };
            } catch (error) {
              console.error(`❌ Error adding images to card:`, error);
              // Remove unsplashQuery from output even on error
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { unsplashQuery: _, ...cardWithoutQuery } = card;
              return cardWithoutQuery;
            }
          })
        );

        const frontImagesAdded = cardsWithImages.filter(
          (c) => "frontImageUrl" in c && c.frontImageUrl
        ).length;
        const backImagesAdded = cardsWithImages.filter(
          (c) => "backImageUrl" in c && c.backImageUrl
        ).length;
        console.log(
          `✅ Successfully added ${frontImagesAdded} front images and ${backImagesAdded} back images\n`
        );

        return c.json({ cards: cardsWithImages });
      }

      return c.json({ cards });
    } catch (error) {
      console.log(`❌ AI generate chat exception: ${error}`);
      return c.json({ error: "Failed to generate flashcards with AI" }, 500);
    }
  });
}
