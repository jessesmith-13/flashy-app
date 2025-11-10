export const MOCK_COMMUNITY_DECKS = [
  {
    id: 'community-1',
    name: 'Spanish Basics',
    emoji: '🇪🇸',
    color: '#F59E0B',
    author: 'Maria Garcia',
    authorId: 'user-maria',
    downloads: 1234,
    rating: 4.8,
    category: 'Languages (Foreign)',
    subtopic: 'Spanish',
    publishedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Updated 7 days ago
    version: 2, // Updated version
    cards: [
      { front: 'Hello', back: 'Hola', cardType: 'classic-flip' },
      { 
        front: 'How do you say "Goodbye" in Spanish?', 
        back: 'Adiós', 
        cardType: 'type-answer',
        acceptedAnswers: ['Adiós', 'adios', 'Adios']
      },
      { 
        front: 'What does "Por favor" mean in English?', 
        back: 'Please', 
        cardType: 'multiple-choice',
        options: ['Thank you', 'Excuse me', 'Sorry']
      },
      { front: 'Thank you', back: 'Gracias', cardType: 'classic-flip' },
      { 
        front: 'How do you say "Yes" in Spanish?', 
        back: 'Sí', 
        cardType: 'type-answer',
        acceptedAnswers: ['Sí', 'Si', 'si', 'sí']
      },
      { front: 'No', back: 'No', cardType: 'classic-flip' },
      { 
        front: 'What does "Buenos días" mean?', 
        back: 'Good morning', 
        cardType: 'multiple-choice',
        options: ['Good night', 'Good afternoon', 'Good evening']
      },
      { front: 'Good night', back: 'Buenas noches', cardType: 'classic-flip' },
      { front: 'How are you?', back: '¿Cómo estás?', cardType: 'classic-flip' },
      { 
        front: 'How do you say "My name is..." in Spanish?', 
        back: 'Me llamo...', 
        cardType: 'type-answer',
        acceptedAnswers: ['Me llamo', 'me llamo', 'Me llamo...', 'me llamo...']
      },
    ]
  },
  {
    id: 'community-2',
    name: 'JavaScript Fundamentals',
    emoji: '💻',
    color: '#3B82F6',
    author: 'John Developer',
    authorId: 'user-john',
    downloads: 890,
    rating: 4.9,
    category: 'Computer Science',
    subtopic: 'Programming Languages',
    publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Same as published (not updated)
    cards: [
      { 
        front: 'What keyword declares a variable that cannot be reassigned?', 
        back: 'const', 
        cardType: 'type-answer',
        acceptedAnswers: ['const', 'CONST']
      },
      { 
        front: 'What does DOM stand for?', 
        back: 'Document Object Model', 
        cardType: 'multiple-choice',
        options: ['Data Object Model', 'Dynamic Object Management', 'Digital Operation Method']
      },
      { front: 'What method adds an element to the end of an array?', back: 'push()', cardType: 'classic-flip' },
      { 
        front: 'What keyword is used to define a function?', 
        back: 'function', 
        cardType: 'type-answer',
        acceptedAnswers: ['function', 'FUNCTION', 'func']
      },
      { 
        front: 'What is the result of typeof []?', 
        back: 'object', 
        cardType: 'multiple-choice',
        options: ['array', 'undefined', 'null']
      },
      { front: 'What method removes the last element from an array?', back: 'pop()', cardType: 'classic-flip' },
      { front: 'What does JSON stand for?', back: 'JavaScript Object Notation', cardType: 'classic-flip' },
      { front: 'What keyword creates a block-scoped variable?', back: 'let', cardType: 'classic-flip' },
    ]
  },
  {
    id: 'community-3',
    name: 'World Capitals',
    emoji: '🌍',
    color: '#10B981',
    author: 'Geography Pro',
    authorId: 'user-geo',
    downloads: 2341,
    rating: 4.7,
    category: 'Geography',
    subtopic: 'Countries & Capitals',
    publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // Updated 15 days ago
    cards: [
      { 
        front: 'What is the capital of France?', 
        back: 'Paris', 
        cardType: 'multiple-choice',
        options: ['Lyon', 'Marseille', 'Nice']
      },
      { 
        front: 'What is the capital of Japan?', 
        back: 'Tokyo', 
        cardType: 'type-answer',
        acceptedAnswers: ['Tokyo', 'tokyo', 'TOKYO']
      },
      { front: 'What is the capital of Australia?', back: 'Canberra', cardType: 'classic-flip' },
      { 
        front: 'What is the capital of Brazil?', 
        back: 'Brasília', 
        cardType: 'multiple-choice',
        options: ['São Paulo', 'Rio de Janeiro', 'Salvador']
      },
      { 
        front: 'What is the capital of Canada?', 
        back: 'Ottawa', 
        cardType: 'type-answer',
        acceptedAnswers: ['Ottawa', 'ottawa', 'OTTAWA']
      },
      { front: 'What is the capital of Egypt?', back: 'Cairo', cardType: 'classic-flip' },
      { 
        front: 'What is the capital of Germany?', 
        back: 'Berlin', 
        cardType: 'multiple-choice',
        options: ['Munich', 'Hamburg', 'Frankfurt']
      },
      { front: 'What is the capital of India?', back: 'New Delhi', cardType: 'classic-flip' },
      { 
        front: 'What is the capital of Italy?', 
        back: 'Rome', 
        cardType: 'type-answer',
        acceptedAnswers: ['Rome', 'rome', 'Roma', 'roma']
      },
      { front: 'What is the capital of South Korea?', back: 'Seoul', cardType: 'classic-flip' },
    ]
  },
  {
    id: 'community-4',
    name: 'Medical Terminology',
    emoji: '⚕️',
    color: '#EF4444',
    author: 'Dr. Smith',
    authorId: 'user-smith',
    downloads: 567,
    rating: 4.6,
    category: 'Medicine & Health',
    subtopic: 'Anatomy',
    publishedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // Same as published
    cards: [
      { 
        front: 'What does "cardio" refer to?', 
        back: 'Heart', 
        cardType: 'multiple-choice',
        options: ['Brain', 'Lung', 'Liver']
      },
      { 
        front: 'What does "derma" refer to?', 
        back: 'Skin', 
        cardType: 'type-answer',
        acceptedAnswers: ['skin', 'Skin', 'epidermis']
      },
      { front: 'What does "gastro" refer to?', back: 'Stomach', cardType: 'classic-flip' },
      { 
        front: 'What does "neuro" refer to?', 
        back: 'Nerve', 
        cardType: 'multiple-choice',
        options: ['Bone', 'Muscle', 'Blood']
      },
      { front: 'What does "osteo" refer to?', back: 'Bone', cardType: 'classic-flip' },
      { front: 'What does "pulmo" refer to?', back: 'Lung', cardType: 'classic-flip' },
      { 
        front: 'What does "hepato" refer to?', 
        back: 'Liver', 
        cardType: 'type-answer',
        acceptedAnswers: ['liver', 'Liver']
      },
      { front: 'What does "nephro" refer to?', back: 'Kidney', cardType: 'classic-flip' },
    ]
  },
  {
    id: 'community-5',
    name: 'Piano Chords',
    emoji: '🎹',
    color: '#8B5CF6',
    author: 'Music Teacher',
    authorId: 'user-music',
    downloads: 445,
    rating: 4.5,
    category: 'Music',
    subtopic: 'Instruments',
    publishedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Updated 3 days ago
    cards: [
      { 
        front: 'What notes make up a C major chord?', 
        back: 'C - E - G', 
        cardType: 'multiple-choice',
        options: ['C - D - G', 'C - F - G', 'C - E - A']
      },
      { 
        front: 'What notes make up a G major chord?', 
        back: 'G - B - D', 
        cardType: 'type-answer',
        acceptedAnswers: ['G - B - D', 'G B D', 'GBD', 'g-b-d']
      },
      { front: 'What notes make up an F major chord?', back: 'F - A - C', cardType: 'classic-flip' },
      { 
        front: 'What notes make up a D minor chord?', 
        back: 'D - F - A', 
        cardType: 'multiple-choice',
        options: ['D - F# - A', 'D - E - A', 'D - G - A']
      },
      { front: 'What notes make up an A minor chord?', back: 'A - C - E', cardType: 'classic-flip' },
      { 
        front: 'What notes make up an E minor chord?', 
        back: 'E - G - B', 
        cardType: 'type-answer',
        acceptedAnswers: ['E - G - B', 'E G B', 'EGB', 'e-g-b']
      },
    ]
  },
  {
    id: 'community-6',
    name: 'Chemistry Elements',
    emoji: '🧪',
    color: '#06B6D4',
    author: 'Science Enthusiast',
    authorId: 'user-science',
    downloads: 678,
    rating: 4.8,
    category: 'Science',
    subtopic: 'Chemistry',
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // Same as published
    cards: [
      { 
        front: 'What is the symbol for Hydrogen?', 
        back: 'H', 
        cardType: 'type-answer',
        acceptedAnswers: ['H', 'h']
      },
      { 
        front: 'What is the symbol for Oxygen?', 
        back: 'O', 
        cardType: 'multiple-choice',
        options: ['Ox', 'Og', 'Om']
      },
      { front: 'What is the symbol for Carbon?', back: 'C', cardType: 'classic-flip' },
      { 
        front: 'What is the symbol for Nitrogen?', 
        back: 'N', 
        cardType: 'type-answer',
        acceptedAnswers: ['N', 'n']
      },
      { 
        front: 'What is the symbol for Gold?', 
        back: 'Au', 
        cardType: 'multiple-choice',
        options: ['Go', 'Gd', 'Gl']
      },
      { front: 'What is the symbol for Silver?', back: 'Ag', cardType: 'classic-flip' },
      { 
        front: 'What is the symbol for Iron?', 
        back: 'Fe', 
        cardType: 'type-answer',
        acceptedAnswers: ['Fe', 'fe', 'FE']
      },
      { front: 'What is the symbol for Sodium?', back: 'Na', cardType: 'classic-flip' },
    ]
  },
  {
    id: 'community-7',
    name: 'SAT Vocabulary',
    emoji: '📚',
    color: '#EC4899',
    author: 'Test Prep Coach',
    authorId: 'user-testprep',
    downloads: 1567,
    rating: 4.9,
    category: 'Exam & Test Prep',
    subtopic: 'SAT',
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Updated 1 day ago
    cards: [
      { 
        front: 'What does "Aberration" mean?', 
        back: 'Something that differs from the norm', 
        cardType: 'multiple-choice',
        options: ['Something very common', 'A type of celebration', 'A mathematical formula']
      },
      { front: 'Abscond', back: 'To leave secretly and hide', cardType: 'classic-flip' },
      { 
        front: 'Define "Abstain"', 
        back: 'To voluntarily refrain from doing something', 
        cardType: 'type-answer',
        acceptedAnswers: ['To voluntarily refrain from doing something', 'to refrain', 'refrain from', 'avoid']
      },
      { 
        front: 'What does "Adversity" mean?', 
        back: 'Difficulty or misfortune', 
        cardType: 'multiple-choice',
        options: ['Great happiness', 'A type of advertisement', 'A warning sign']
      },
      { front: 'Aesthetic', back: 'Concerning beauty or the appreciation of beauty', cardType: 'classic-flip' },
      { 
        front: 'Define "Amicable"', 
        back: 'Friendly and agreeable', 
        cardType: 'type-answer',
        acceptedAnswers: ['Friendly and agreeable', 'friendly', 'agreeable', 'pleasant']
      },
      { front: 'Anachronistic', back: 'Out of proper time period', cardType: 'classic-flip' },
      { 
        front: 'What does "Anomaly" mean?', 
        back: 'Something that deviates from what is standard', 
        cardType: 'multiple-choice',
        options: ['Something very normal', 'A type of animal', 'A friendly greeting']
      },
    ]
  },
  {
    id: 'community-8',
    name: 'Python Basics',
    emoji: '🐍',
    color: '#14B8A6',
    author: 'Code Academy',
    authorId: 'user-codeacademy',
    downloads: 923,
    rating: 4.7,
    category: 'Computer Science',
    subtopic: 'Programming Languages',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Same as published
    cards: [
      { 
        front: 'How do you print to the console in Python?', 
        back: 'print()', 
        cardType: 'type-answer',
        acceptedAnswers: ['print()', 'print', 'PRINT()']
      },
      { 
        front: 'What data type is [1, 2, 3]?', 
        back: 'list', 
        cardType: 'multiple-choice',
        options: ['tuple', 'dict', 'set']
      },
      { 
        front: 'What keyword is used to define a function?', 
        back: 'def', 
        cardType: 'type-answer',
        acceptedAnswers: ['def', 'DEF']
      },
      { front: 'What symbol is used for comments?', back: '#', cardType: 'classic-flip' },
      { 
        front: 'What data type is immutable and ordered?', 
        back: 'tuple', 
        cardType: 'multiple-choice',
        options: ['list', 'dict', 'set']
      },
      { front: 'What keyword imports a module?', back: 'import', cardType: 'classic-flip' },
    ]
  },
  {
    id: 'community-9',
    name: 'U.S. Presidents',
    emoji: '🇺🇸',
    color: '#DC2626',
    author: 'History Buff',
    authorId: 'user-historybuff',
    downloads: 734,
    rating: 4.6,
    category: 'History',
    subtopic: 'U.S. History',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Same as published
    cards: [
      { 
        front: 'Who was the first U.S. President?', 
        back: 'George Washington', 
        cardType: 'multiple-choice',
        options: ['Thomas Jefferson', 'John Adams', 'Benjamin Franklin']
      },
      { 
        front: 'Who was the 16th U.S. President?', 
        back: 'Abraham Lincoln', 
        cardType: 'type-answer',
        acceptedAnswers: ['Abraham Lincoln', 'Lincoln', 'Abe Lincoln']
      },
      { front: 'Who was the only president to serve more than two terms?', back: 'Franklin D. Roosevelt', cardType: 'classic-flip' },
      { 
        front: 'Which president issued the Emancipation Proclamation?', 
        back: 'Abraham Lincoln', 
        cardType: 'multiple-choice',
        options: ['George Washington', 'Thomas Jefferson', 'Ulysses S. Grant']
      },
      { 
        front: 'Who was president during World War II?', 
        back: 'Franklin D. Roosevelt (and Harry Truman)', 
        cardType: 'type-answer',
        acceptedAnswers: ['Franklin D. Roosevelt', 'FDR', 'Roosevelt', 'Franklin Roosevelt', 'Franklin D. Roosevelt and Harry Truman']
      },
    ]
  },
  {
    id: 'community-10',
    name: 'Calculus Basics',
    emoji: '📐',
    color: '#7C3AED',
    author: 'Math Master',
    authorId: 'user-mathmaster',
    downloads: 1102,
    rating: 4.8,
    category: 'Mathematics',
    subtopic: 'Calculus',
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Same as published
    cards: [
      { 
        front: 'What is the derivative of x²?', 
        back: '2x', 
        cardType: 'type-answer',
        acceptedAnswers: ['2x', '2X', 'two x', '2*x']
      },
      { 
        front: 'What is the derivative of a constant?', 
        back: '0', 
        cardType: 'multiple-choice',
        options: ['1', 'x', 'undefined']
      },
      { front: 'What is the integral of 1 dx?', back: 'x + C', cardType: 'classic-flip' },
      { 
        front: 'What does the derivative measure?', 
        back: 'Rate of change or slope', 
        cardType: 'multiple-choice',
        options: ['Area under curve', 'Maximum value', 'Distance traveled']
      },
      { front: 'What does the integral measure?', back: 'Area under a curve', cardType: 'classic-flip' },
      { 
        front: 'What is the derivative of sin(x)?', 
        back: 'cos(x)', 
        cardType: 'type-answer',
        acceptedAnswers: ['cos(x)', 'cosx', 'cos x', 'COS(X)']
      },
    ]
  }
]

// Mock user achievements
export const MOCK_USER_ACHIEVEMENTS: Record<string, string[]> = {
  'user-maria': ['first-deck', 'first-session', 'streak-3', 'cards-25', 'perfect-score'],
  'user-john': ['first-deck', 'first-session', 'streak-7', 'cards-100', 'sessions-10', 'perfect-score', 'speed-demon'],
  'user-geo': ['first-deck', 'first-session', 'streak-30', 'cards-500', 'sessions-50', 'perfect-score', 'early-bird'],
  'user-smith': ['first-deck', 'first-session', 'cards-50', 'sessions-5'],
  'user-music': ['first-deck', 'first-session', 'streak-7', 'cards-100', 'perfect-score'],
  'user-science': ['first-deck', 'first-session', 'streak-14', 'cards-250', 'sessions-25', 'perfect-score'],
  'user-testprep': ['first-deck', 'first-session', 'streak-60', 'cards-1000', 'sessions-100', 'perfect-score', 'night-owl'],
  'user-codeacademy': ['first-deck', 'first-session', 'cards-200', 'sessions-30', 'perfect-score'],
  'user-historybuff': ['first-deck', 'first-session', 'streak-21', 'cards-150', 'sessions-20'],
  'user-mathmaster': ['first-deck', 'first-session', 'streak-45', 'cards-750', 'sessions-75', 'perfect-score', 'speed-demon'],
}

// Mock user decks - these reference the actual community deck IDs
export const MOCK_USER_DECKS: Record<string, any[]> = {
  'user-maria': [
    { id: 'community-1', name: 'Spanish Basics', emoji: '🇪🇸', color: '#F59E0B', cardCount: 10 },
    { id: 'deck-maria-2', name: 'French Phrases', emoji: '🇫🇷', color: '#3B82F6', cardCount: 15 },
  ],
  'user-john': [
    { id: 'community-2', name: 'JavaScript Fundamentals', emoji: '💻', color: '#3B82F6', cardCount: 8 },
    { id: 'deck-john-2', name: 'React Hooks', emoji: '⚛️', color: '#06B6D4', cardCount: 12 },
    { id: 'deck-john-3', name: 'TypeScript Basics', emoji: '📘', color: '#3B82F6', cardCount: 20 },
  ],
  'user-geo': [
    { id: 'community-3', name: 'World Capitals', emoji: '🌍', color: '#10B981', cardCount: 10 },
    { id: 'deck-geo-2', name: 'U.S. States', emoji: '🗺️', color: '#8B5CF6', cardCount: 50 },
    { id: 'deck-geo-3', name: 'Mountain Ranges', emoji: '⛰️', color: '#6B7280', cardCount: 25 },
  ],
  'user-smith': [
    { id: 'community-4', name: 'Medical Terminology', emoji: '⚕️', color: '#EF4444', cardCount: 8 },
    { id: 'deck-smith-2', name: 'Pharmacology', emoji: '💊', color: '#EC4899', cardCount: 30 },
  ],
  'user-music': [
    { id: 'community-5', name: 'Piano Chords', emoji: '🎹', color: '#8B5CF6', cardCount: 6 },
    { id: 'deck-music-2', name: 'Music Theory', emoji: '🎵', color: '#7C3AED', cardCount: 18 },
  ],
  'user-science': [
    { id: 'community-6', name: 'Chemistry Elements', emoji: '🧪', color: '#06B6D4', cardCount: 8 },
    { id: 'deck-science-2', name: 'Physics Formulas', emoji: '⚡', color: '#F59E0B', cardCount: 22 },
    { id: 'deck-science-3', name: 'Biology Terms', emoji: '🧬', color: '#10B981', cardCount: 35 },
  ],
  'user-testprep': [
    { id: 'community-7', name: 'SAT Vocabulary', emoji: '📚', color: '#EC4899', cardCount: 8 },
    { id: 'deck-testprep-2', name: 'SAT Math', emoji: '🔢', color: '#7C3AED', cardCount: 40 },
    { id: 'deck-testprep-3', name: 'ACT Science', emoji: '🔬', color: '#06B6D4', cardCount: 28 },
  ],
  'user-codeacademy': [
    { id: 'community-8', name: 'Python Basics', emoji: '🐍', color: '#14B8A6', cardCount: 6 },
    { id: 'deck-code-2', name: 'Data Structures', emoji: '📊', color: '#8B5CF6', cardCount: 25 },
  ],
  'user-historybuff': [
    { id: 'community-9', name: 'U.S. Presidents', emoji: '🇺🇸', color: '#DC2626', cardCount: 5 },
    { id: 'deck-history-2', name: 'World War II', emoji: '🎖️', color: '#6B7280', cardCount: 32 },
  ],
  'user-mathmaster': [
    { id: 'community-10', name: 'Calculus Basics', emoji: '📐', color: '#7C3AED', cardCount: 6 },
    { id: 'deck-math-2', name: 'Linear Algebra', emoji: '🔢', color: '#3B82F6', cardCount: 28 },
    { id: 'deck-math-3', name: 'Statistics', emoji: '📈', color: '#10B981', cardCount: 20 },
  ],
}

export const MOCK_USERS = [
  {
    id: 'user-maria',
    name: 'Maria Garcia',
    displayName: 'Maria Garcia',
    email: 'maria@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
    decksPublic: true,
  },
  {
    id: 'user-john',
    name: 'John Developer',
    displayName: 'John Developer',
    email: 'john@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    decksPublic: true,
  },
  {
    id: 'user-geo',
    name: 'Geography Pro',
    displayName: 'Geography Pro',
    email: 'geo@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Geo',
    decksPublic: true,
  },
  {
    id: 'user-smith',
    name: 'Dr. Smith',
    displayName: 'Dr. Smith',
    email: 'smith@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Smith',
    decksPublic: false,
  },
  {
    id: 'user-music',
    name: 'Music Teacher',
    displayName: 'Music Teacher',
    email: 'music@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Music',
    decksPublic: true,
  },
  {
    id: 'user-science',
    name: 'Science Enthusiast',
    displayName: 'Science Enthusiast',
    email: 'science@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Science',
    decksPublic: true,
  },
  {
    id: 'user-testprep',
    name: 'Test Prep Coach',
    displayName: 'Test Prep Coach',
    email: 'testprep@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestPrep',
    decksPublic: true,
  },
  {
    id: 'user-codeacademy',
    name: 'Code Academy',
    displayName: 'Code Academy',
    email: 'code@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Code',
    decksPublic: true,
  },
  {
    id: 'user-historybuff',
    name: 'History Buff',
    displayName: 'History Buff',
    email: 'history@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=History',
    decksPublic: true,
  },
  {
    id: 'user-mathmaster',
    name: 'Math Master',
    displayName: 'Math Master',
    email: 'math@example.com',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Math',
    decksPublic: true,
  },
]
