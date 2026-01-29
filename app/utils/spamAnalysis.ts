// app/utils/spamAnalysis.ts

interface AnalysisInput {
  platform: "reddit" | "facebook" | "email";
  title?: string;
  content: string;
  fromEmail?: string;
  // username?: string; // Can be used in backend later
  // subreddit?: string; // Can be used in backend later
}

export interface AnalysisResult {
  score: number;
  riskLevel: "Low" | "Medium" | "High";
  reasons: string[];
}

// --- keyword lists (keep these globally available) ---
const urgencyKeywords = ["act now", "limited time", "hurry", "last chance", "expires soon", "don't miss out", "once in a lifetime"];
const cryptoKeywords = ["crypto", "bitcoin", "ethereum", "doge", "shib", "moon", "pump", "100x", "gem", "whitelist", "presale", "airdrop"];
const salesyKeywords = ["buy now", "sign up", "guaranteed", "risk-free", "no obligation", "free trial", "winner", "congratulations", "selected"];
const spammyPatterns = ["$$$", "!!", "100%", "CLICK HERE", "LINK IN BIO"];
const freeEmailProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "protonmail.com"];

// Helper: Calculate Caps Ratio
const getCapsRatio = (text: string): number => {
    if (!text) return 0;
    const stripped = text.replace(/[^A-Za-z]/g, "");
    if (stripped.length === 0) return 0;
    const upper = stripped.replace(/[^A-Z]/g, "").length;
    return upper / stripped.length;
};


// --- Platform Specific Analysis Functions ---

const analyzeEmail = (input: AnalysisInput, reasons: string[]): number => {
  let score = 0;
  const { title = "", fromEmail = "" } = input;

  // 1. Check "From" Email Domain (Critical for cold email)
  if (fromEmail) {
    const domain = fromEmail.split('@')[1]?.toLowerCase();
    if (domain && freeEmailProviders.includes(domain)) {
      score += 25;
      reasons.push(`Using a free email provider (${domain}) significantly increases spam filters.`);
    }
  }

  // 2. Subject Line Analysis
  if (getCapsRatio(title) > 0.6 && title.length > 10) {
    score += 15;
    reasons.push("Subject line uses excessive CAPITAL LETTERS.");
  }
  if (title.toLowerCase().startsWith("re:") || title.toLowerCase().startsWith("fwd:")) {
      score += 10;
      reasons.push("Using fake 'Re:' or 'Fwd:' in cold emails is a major spam trigger.");
  }
  if (urgencyKeywords.some(k => title.toLowerCase().includes(k))) {
      score += 15;
      reasons.push("Urgency keywords in the subject line are high risk.");
  }

  return score;
};

const analyzeReddit = (input: AnalysisInput, reasons: string[]): number => {
  let score = 0;
  const { title = "" } = input;

  // 1. Title Analysis
  if (title.length > 0 && title.length < 15) {
      score += 10;
      reasons.push("Very short titles often get flagged by auto-mods.");
  }
  if (getCapsRatio(title) > 0.8 && title.length > 10) {
      score += 20;
      reasons.push("ALL CAPS titles are almost instantly removed on many subreddits.");
  }

  // Note: Username/Subreddit checks are best done on backend due to API needs,
  // but simple client-side checks could go here if needed later.

  return score;
};

const analyzeFacebook = (input: AnalysisInput, reasons: string[]): number => {
   // Facebook is mostly about the body content and pattern matching
   return 0; // Base score remains 0 before body check
};


// --- Main Analysis Function ---

export const analyzeSpamRisk = (input: AnalysisInput): AnalysisResult => {
  let score = 0;
  const reasons: string[] = [];
  const fullText = `${input.title || ""} ${input.content}`.toLowerCase();
  
  // --- 1. Run Platform Specific Checks first ---
  if (input.platform === 'email') {
      score += analyzeEmail(input, reasons);
  } else if (input.platform === 'reddit') {
      score += analyzeReddit(input, reasons);
  } else if (input.platform === 'facebook') {
      score += analyzeFacebook(input, reasons);
  }

  // --- 2. Run Universal Body Content Checks ---

  // Check keywords
  if (urgencyKeywords.some((k) => fullText.includes(k))) {
    score += 20;
    reasons.push("Contains high-pressure urgency keywords.");
  }
  if (cryptoKeywords.some((k) => fullText.includes(k))) {
    score += 30;
    reasons.push("Contains high-risk crypto or hype terminology.");
  }
  if (salesyKeywords.some((k) => fullText.includes(k))) {
    score += 15;
    reasons.push("Uses overly 'salesy' language typical of spam.");
  }

  // Check patterns
  if (spammyPatterns.some((p) => fullText.includes(p.toLowerCase()))) {
    score += 20;
    reasons.push("Uses spammy punctuation or patterns (e.g., $$$, !!!).");
  }

  // Check caps ratio in body
  if (getCapsRatio(input.content) > 0.4 && input.content.length > 50) {
      score += 15;
      reasons.push("Excessive use of CAPITAL LETTERS in the body text.");
  }

  // Ensure score is between 0 and 100
  const finalScore = Math.min(Math.max(score, 0), 100);

  let riskLevel: "Low" | "Medium" | "High" = "Low";
  if (finalScore >= 60) riskLevel = "High";
  else if (finalScore >= 20) riskLevel = "Medium";

  return { score: finalScore, riskLevel, reasons };
};