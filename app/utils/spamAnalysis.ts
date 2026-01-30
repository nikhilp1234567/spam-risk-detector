// app/utils/spamAnalysis.ts

interface AnalysisInput {
  platform: "reddit" | "facebook" | "email";
  title?: string;
  content: string;
  fromEmail?: string;
}

export interface AnalysisResult {
  score: number; // 0-100 (Higher is riskier)
  riskLevel: "Low" | "Medium" | "High";
  reasons: string[];
}

// ==========================================
// 1. THE "SHILL" DICTIONARY (Expanded)
// ==========================================

const urgencyKeywords = [
  "act now", "action required", "apply now", "call now", "click below", 
  "click here", "deal ending", "do it today", "don't delay", "don't miss out", 
  "ending soon", "exclusive deal", "expires", "final call", "get it now", 
  "hurry", "immediate", "instant access", "last chance", "limited offer", 
  "limited time", "now or never", "offer expires", "once in a lifetime", 
  "only a few left", "order now", "rush", "special promotion", "take action", 
  "urgent", "while supplies last", "won't last long"
];

const financialKeywords = [
  "$$$", "100% free", "100x", "additional income", "airdrop", "be your own boss", 
  "best price", "big bucks", "bitcoin", "cash", "cash bonus", "cheap", 
  "crypto", "discount", "doge", "double your", "earn money", "easy money", 
  "eth", "ethereum", "extra cash", "fast cash", "financial freedom", 
  "free access", "free gift", "free money", "gem", "get paid", "guaranteed return", 
  "high yield", "income", "investment", "lowest price", "make money", 
  "moon", "nft", "passive income", "pennies a day", "presale", "profit", 
  "pump", "refinance", "risk-free", "save big", "shib", "side hustle", 
  "staking", "token", "wealth", "whitelist", "work from home"
];

const guruKeywords = [
  "blueprint", "coaching", "consultation", "course", "dm me for info", 
  "drop shipping", "dropshipping", "ebook", "exclusive group", "free training", 
  "guide", "how i made", "join my", "link in bio", "masterclass", "mastermind", 
  "mentor", "mentorship", "method", "mindset", "my journey", "my secret", 
  "program", "proven system", "roadmap", "secrets revealed", "seminar", 
  "strategy", "success story", "webinar", "workshop"
];

const hostilityKeywords = [
  "asshole", "bitch", "bullshit", "crap", "damn", "dick", "dumb", "f*ck", 
  "fuck", "hate", "idiot", "kill yourself", "kys", "loser", "moron", "piss", 
  "scam", "scammer", "shill", "shit", "shut up", "stfu", "stupid", "sucks", 
  "trash", "wtf"
];

const marketingKeywords = [
  "amazing", "best in class", "best solution", "bonuses", "brand new", 
  "congratulations", "dear friend", "game changer", "game-changer", 
  "groundbreaking", "guaranteed", "hottest", "incredible", "innovative", 
  "leading", "marketing", "miracle", "must have", "number one", "#1", 
  "premium", "revolutionary", "satisfaction", "subscribe", "top rated", 
  "ultimate", "unbelievable", "winner", "world class", "you need this"
];

const engagementBait = [
  "can we get to", "challenge", "comment", "like if", "like this", 
  "notification squad", "repost", "share", "smash that like", "subscribe", 
  "tag a friend", "tag someone", "upvote", "what do you think"
];

const shadyBehavior = [
  "add me", "check my bio", "check my profile", "dm me", "inbox me", 
  "link in comments", "link in description", "message me", "pm me", 
  "telegram", "whatsapp"
];

const freeEmailProviders = [
  "aol.com", "gmail.com", "hotmail.com", "icloud.com", "mail.com", 
  "outlook.com", "protonmail.com", "yahoo.com", "yandex.com", "zoho.com"
];

const urlShorteners = [
  "adf.ly", "bit.do", "bit.ly", "buff.ly", "goo.gl", "is.gd", "linktr.ee", 
  "ow.ly", "rebrand.ly", "t.co", "tinyurl.com"
];

// ==========================================
// 2. SOPHISTICATED HEURISTICS
// ==========================================

const detectObfuscation = (text: string): string[] => {
  const issues: string[] = [];
  // Detects spaced out words like "F R E E" or "S.C.A.M"
  const spacedRegex = /\b([A-Za-z]\s){3,}[A-Za-z]\b/g;
  const dottedRegex = /\b([A-Za-z]\.){3,}[A-Za-z]\b/g;

  if (spacedRegex.test(text)) issues.push("Uses spaced-out characters (e.g., 'F R E E') to bypass filters.");
  if (dottedRegex.test(text)) issues.push("Uses dotted characters (e.g., 'F.r.e.e') to bypass filters.");
  
  return issues;
};

const getCapsRatio = (text: string): number => {
  if (!text) return 0;
  const stripped = text.replace(/[^A-Za-z]/g, "");
  if (stripped.length === 0) return 0;
  const upper = stripped.replace(/[^A-Z]/g, "").length;
  return upper / stripped.length;
};

const countEmojis = (text: string): number => {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  return (text.match(emojiRegex) || []).length;
};

const analyzeLinks = (text: string): { count: number; hasShortener: boolean; hasAffiliate: boolean; reasons: string[] } => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  const reasons: string[] = [];
  
  let hasShortener = false;
  let hasAffiliate = false;

  matches.forEach(url => {
    if (urlShorteners.some(short => url.includes(short))) hasShortener = true;
    if (url.includes("?ref=") || url.includes("?aff=") || url.includes("&ref=") || url.includes("&aff=")) hasAffiliate = true;
  });

  if (hasShortener) reasons.push("Contains URL shorteners (e.g., bit.ly). These are often auto-banned.");
  if (hasAffiliate) reasons.push("Contains affiliate links (?ref=). Reddit users hate undisclosed affiliates.");
  if (matches.length > 3) reasons.push(`Contains ${matches.length} links. Excessive linking looks like a link farm.`);

  return { count: matches.length, hasShortener, hasAffiliate, reasons };
};

// ==========================================
// 3. PLATFORM SPECIFIC ENGINES
// ==========================================

const analyzeEmail = (input: AnalysisInput, reasons: string[]): number => {
  let score = 0;
  const { title = "", content, fromEmail = "" } = input;
  const fullText = `${title} ${content}`.toLowerCase();

  // A. Header Analysis
  if (fromEmail) {
    const domain = fromEmail.split('@')[1]?.toLowerCase();
    if (domain && freeEmailProviders.includes(domain)) {
      score += 25;
      reasons.push(`Cold emailing from a free domain (${domain}) is the #1 spam signal.`);
    }
  }

  // B. Subject Line Analysis
  if (title) {
    if (getCapsRatio(title) > 0.5 && title.length > 10) {
      score += 20;
      reasons.push("Subject line is over 50% uppercase.");
    }
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.startsWith("re:") || lowerTitle.startsWith("fwd:")) {
      score += 30;
      reasons.push("Deceptive 'Re:' or 'Fwd:' prefix in subject.");
    }
    if (urgencyKeywords.some(k => lowerTitle.includes(k))) {
      score += 20;
      reasons.push("Subject line contains urgency triggers.");
    }
    if (financialKeywords.some(k => lowerTitle.includes(k))) {
      score += 15;
      reasons.push("Subject line contains financial spam triggers.");
    }
  }

  // C. Body Analysis
  if (/dear (customer|friend|sir|madam)/i.test(content)) {
    score += 10;
    reasons.push("Generic greetings ('Dear Customer') indicate mass automation.");
  }

  return score;
};

const analyzeReddit = (input: AnalysisInput, reasons: string[]): number => {
  let score = 0;
  const { title = "", content } = input;
  const lowerContent = content.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // A. The "Guru" / Course Seller Check (Redditors HATE this)
  const guruCount = guruKeywords.filter(k => lowerContent.includes(k)).length;
  if (guruCount > 0) {
    score += 15 + (guruCount * 5);
    reasons.push("Contains 'Guru' language (courses, mentorship, DM for info). Redditors aggressively downvote self-promotion.");
  }

  // B. Self-Promotion Logic
  const selfPromoTriggers = ["my app", "my game", "my website", "i made", "i created", "check out my"];
  const selfPromoCount = selfPromoTriggers.filter(t => lowerContent.includes(t)).length;
  if (selfPromoCount > 0) {
    score += 5 * selfPromoCount;
    reasons.push("Contains self-promotion phrasing ('I made', 'My app'). Reddit requires a 9:1 non-promo ratio.");
  }

  // C. Title Logic
  if (title.length > 0 && title.length < 15) {
    score += 15;
    reasons.push("Title is too short (<15 chars). Likely to be auto-removed by AutoMod.");
  }
  if (getCapsRatio(title) > 0.7 && title.length > 10) {
    score += 25;
    reasons.push("ALL CAPS title. This is a major moderation trigger on Reddit.");
  }

  // D. Off-Platform redirection
  if (shadyBehavior.some(k => lowerContent.includes(k))) {
    score += 25;
    reasons.push("Directing users off-platform ('DM me', 'Link in bio') is the hallmark of a Reddit scammer.");
  }

  return score;
};

const analyzeFacebook = (input: AnalysisInput, reasons: string[]): number => {
  let score = 0;
  const fullText = `${input.title || ""} ${input.content}`.toLowerCase();

  // A. Engagement Bait
  if (engagementBait.some(k => fullText.includes(k))) {
    score += 30; 
    reasons.push("Engagement Bait detected. FB algorithm actively demotes posts asking for likes/shares.");
  }

  // B. Chain Letters
  if (fullText.includes("copy and paste") || fullText.includes("don't share just copy")) {
    score += 40;
    reasons.push("Chain-letter / 'Copy and Paste' patterns are instantly flagged.");
  }

  return score;
};

// ==========================================
// 4. MAIN ENGINE
// ==========================================

export const analyzeSpamRisk = (input: AnalysisInput): AnalysisResult => {
  let score = 0;
  let reasons: string[] = [];
  const fullText = `${input.title || ""} ${input.content}`.toLowerCase();
  
  // --- 1. Platform Specific Pass ---
  if (input.platform === 'email') {
    score += analyzeEmail(input, reasons);
  } else if (input.platform === 'reddit') {
    score += analyzeReddit(input, reasons);
  } else if (input.platform === 'facebook') {
    score += analyzeFacebook(input, reasons);
  }

  // --- 2. Universal Deep Scan ---

  // A. Hostility & Aggression (New)
  const hostilityCount = hostilityKeywords.filter(k => fullText.includes(k)).length;
  if (hostilityCount > 0) {
    score += 20 + (hostilityCount * 5);
    reasons.push("Contains aggressive or profane language. High risk of ban/report.");
  }

  // B. Urgency & FOMO
  const urgencyCount = urgencyKeywords.filter(k => fullText.includes(k)).length;
  if (urgencyCount > 0) {
    score += 10 + (urgencyCount * 5);
    reasons.push(`Found ${urgencyCount} urgency triggers (e.g. "Act Now"). High pressure = High Spam Risk.`);
  }

  // C. Financial & Scam patterns
  const financeCount = financialKeywords.filter(k => fullText.includes(k)).length;
  if (financeCount > 0) {
    score += 10 + (financeCount * 5);
    reasons.push(`Found ${financeCount} financial/sales triggers. Over-selling triggers filters.`);
  }

  // D. Obfuscation
  const obfuscationIssues = detectObfuscation(input.content); 
  if (obfuscationIssues.length > 0) {
    score += 30;
    reasons.push(...obfuscationIssues);
  }

  // E. Marketing Fluff
  const marketingCount = marketingKeywords.filter(k => fullText.includes(k)).length;
  if (marketingCount > 2) {
    score += 10;
    reasons.push("Excessive marketing buzzwords ('Game changer', 'Revolutionary'). Sound like a human, not an ad.");
  }

  // F. Formatting & Emojis
  const emojiCount = countEmojis(input.content);
  if (emojiCount > 3) {
    score += 10;
    reasons.push(`Contains ${emojiCount} emojis. Excessive emojis (3+) signal spam to many filters.`);
  }
  if (getCapsRatio(input.content) > 0.3 && input.content.length > 50) {
    score += 15;
    reasons.push("Body text contains excessive uppercase letters.");
  }

  // G. Links
  const linkAnalysis = analyzeLinks(input.content);
  if (linkAnalysis.reasons.length > 0) {
    score += linkAnalysis.count * 5;
    if (linkAnalysis.hasAffiliate) score += 15; // Extra penalty for affiliates
    reasons.push(...linkAnalysis.reasons);
  }

  // H. Punctuation Clusters
  if (/[!]{2,}/.test(input.content) || /[\$]{2,}/.test(input.content) || /[?]{2,}/.test(input.content)) {
    score += 10;
    reasons.push("Unprofessional punctuation (e.g., '!!', '$$', '??').");
  }

  // --- 3. Final Scoring Calculation ---
  
  // Cap score at 100
  let finalScore = Math.min(Math.max(score, 0), 100);

  // Normalize Logic: Very short text usually isn't spam unless it has specific triggers
  if (input.content.length < 20 && finalScore < 30) {
      finalScore = 0;
      reasons = [];
  }

  let riskLevel: "Low" | "Medium" | "High" = "Low";
  if (finalScore >= 60) riskLevel = "High";
  else if (finalScore >= 30) riskLevel = "Medium";

  return { 
    score: finalScore, 
    riskLevel, 
    reasons: [...new Set(reasons)] 
  };
};