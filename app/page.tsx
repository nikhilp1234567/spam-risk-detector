"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { analyzeSpamRisk, AnalysisResult } from "./utils/spamAnalysis";

type Platform = "reddit" | "facebook" | "email";

export default function Home() {
  const [platform, setPlatform] = useState<Platform>("reddit");
  
  // Core Content States
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  
  // Platform Specific States
  const [fromEmail, setFromEmail] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [subreddit, setSubreddit] = useState("");
  const [username, setUsername] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);


  // Reset specialized fields when switching platforms so they don't affect scoring
  useEffect(() => {
      setFromEmail("");
      setToEmail("");
      setSubreddit("");
      setUsername("");
      setTitle("");
      setResult(null);
  }, [platform]);


  const handleAnalyze = () => {
    setIsAnalyzing(true);
    
    const analysisInput = {
        platform,
        title,
        content,
        // Only pass relevant fields based on platform
        ...(platform === 'email' && { fromEmail }),
        ...(platform === 'reddit' && { username, subreddit }),
    };

    const analysis = analyzeSpamRisk(analysisInput);
    
    setResult(analysis);
    setIsAnalyzing(false);
  };
  // Debounced Auto-Analyze
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only analyze if there is minimal content to check
      if (title.length > 2 || content.length > 5 || fromEmail.length > 5) {
        handleAnalyze();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [title, content, platform, fromEmail, subreddit, username]);

  // Helper for text colors based on risk
  const getRiskColor = (level: string) => {
    switch (level) {
      case "Low": return "text-emerald-500";
      case "Medium": return "text-yellow-500";
      case "High": return "text-shill-orange";
      default: return "text-gray-500";
    }
  };
  
  // Helper for score number color
  const getScoreColor = (score: number) => {
    if (score < 20) return "text-emerald-500";
    if (score < 60) return "text-yellow-500";
    return "text-shill-orange";
  };

  return (
    // Added subtle orange ambient light to background
    <div className="h-screen bg-zinc-950 selection:bg-shill-orange selection:text-white flex flex-col relative overflow-hidden">
       <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-shill-orange/5 blur-[120px] rounded-full pointer-events-none"></div>
      
      {/* Navbar */}
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border">
              <Image 
                src="/spam-risk-detector/logo.png" 
                alt="ShillGuard Logo" 
                width={32} 
                height={32} 
                className="object-cover"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">spam risk detector</span>
            <span className="hidden sm:inline-block bg-black text-xs px-2 py-0.5 rounded-xl text-white border-gray-800 border">
              Free Tool
            </span>
          </div>
          <a
            href="https://shillguardapp.com"
            className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-full text-sm font-bold transition-all transform hover:scale-105"
          >
            Get Extension
          </a>
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 sm:p-6 gap-4 relative z-10 overflow-y-auto lg:overflow-visible">
        
        {/* LEFT PANEL: Input & Drafting */}
        <section className="flex-1 flex flex-col gap-3 min-h-0">
          
          {/* Platform Toggles */}
          <div className="shrink-0 bg-zinc-900/80 border border-zinc-800 p-1 rounded-xl flex">
            {(["reddit", "facebook", "email"] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
                  platform === p
                    ? "bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                {p === "email" ? "Cold Email" : p}
              </button>
            ))}
          </div>

          {/* Editor Card - Changed to rounded-2xl to match closer fit */}
          <div className="flex-grow bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-3 shadow-2xl min-h-0">
            
            {/* --- Reddit Specific Inputs --- */}
            {platform === "reddit" && (
                <div className="shrink-0 flex flex-col sm:flex-row gap-3 mb-1">
                    <input type="text" placeholder="r/Subreddit" value={subreddit} onChange={(e) => setSubreddit(e.target.value)} className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:border-shill-orange focus:ring-1 focus:ring-shill-orange outline-none flex-1 transition-all" />
                    <input type="text" placeholder="u/Username (optional)" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:border-shill-orange focus:ring-1 focus:ring-shill-orange outline-none flex-1 transition-all" />
                </div>
            )}

            {/* --- Email Specific Inputs --- */}
            {platform === "email" && (
                <div className="shrink-0 flex flex-col gap-2 mb-1 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                    <div className="flex items-center">
                        <span className="text-zinc-500 w-16 text-sm">From:</span>
                        <input type="email" placeholder="sender@yourdomain.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="bg-transparent border-none text-sm text-zinc-300 placeholder-zinc-600 focus:ring-0 outline-none flex-1" />
                    </div>
                    <div className="h-px bg-zinc-800 w-full" />
                    <div className="flex items-center">
                        <span className="text-zinc-500 w-16 text-sm">To:</span>
                        <input type="email" placeholder="prospect@company.com" value={toEmail} onChange={(e) => setToEmail(e.target.value)} className="bg-transparent border-none text-sm text-zinc-300 placeholder-zinc-600 focus:ring-0 outline-none flex-1" />
                    </div>
                </div>
            )}


            {/* --- Main Title Input (Reddit/Email) --- */}
            {(platform === "reddit" || platform === "email") && (
              <input
                type="text"
                placeholder={platform === "reddit" ? "Post Title" : "Subject Line"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="shrink-0 bg-transparent text-xl font-bold text-white placeholder-zinc-600 border-none focus:ring-0 p-0 w-full outline-none"
              />
            )}
            
            {(platform === "reddit" || platform === "email") && (
              <div className="shrink-0 h-px bg-zinc-800 w-full" />
            )}

            {/* --- Main Body Textarea --- */}
            <textarea
              placeholder={
                platform === "facebook" 
                  ? "What's on your mind?" 
                  : platform === "reddit" 
                    ? "Share your thoughts..." 
                    : "Hi [Name], I wanted to reach out regarding..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-grow w-full bg-transparent resize-none outline-none text-zinc-300 placeholder-zinc-600 text-lg leading-relaxed min-h-[150px]"
            />

            <div className="shrink-0 flex justify-between items-center pt-3 text-xs text-zinc-500 border-t border-zinc-800">
              <span>{content.length} characters</span>
              {/* Mobile Manual Analyze Button */}
              <button 
                onClick={handleAnalyze}
                className="lg:hidden flex items-center gap-1 text-shill-orange font-bold uppercase tracking-wider"
              >
                Analyze <span className={isAnalyzing ? "animate-spin" : ""}>⚡️</span>
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: Risk Analysis & CTA */}
        <section className="w-full lg:w-[400px] flex flex-col gap-4 shrink-0">
          
          {/* Main Score Card - Rounded 2xl */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden shadow-2xl">
             {/* Background Glow Effect - Made slightly stronger orange */}
             <div className={`absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-shill-orange/20 to-transparent blur-3xl rounded-full pointer-events-none transition-opacity duration-500 ${result && result.score > 0 ? 'opacity-100' : 'opacity-0'}`} />

            <div className="relative z-10">
              <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
                Risk Analysis Check
                {isAnalyzing && <span className="animate-pulse text-shill-orange">...</span>}
              </h2>

              <div className="flex items-baseline gap-3 mb-2">
                <span className={`text-6xl font-black tracking-tighter transition-colors duration-300 ${result ? getScoreColor(result.score) : "text-zinc-700"}`}>
                  {result ? result.score : 0}%
                </span>
                <div className="flex flex-col leading-none">
                    <span className={`text-lg font-black uppercase ${result ? getRiskColor(result.riskLevel) : "text-zinc-700"}`}>
                    {result ? result.riskLevel : "No"} Risk
                    </span>
                    <span className="text-zinc-500 text-[10px] uppercase">Probability</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-950 border border-zinc-800 h-2.5 rounded-full overflow-hidden mb-6 p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${result?.score && result.score >= 60 ? "bg-shill-orange shadow-[0_0_10px_rgba(255,68,0,0.5)]" : result?.score && result.score >= 20 ? "bg-yellow-500" : "bg-emerald-500"}`}
                  style={{ width: `${result ? Math.max(result.score, 2) : 2}%` }} // Min width 2% so it's visible
                />
              </div>

              {/* Status Message Area */}
              <div className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/80 min-h-[100px] lg:min-h-[120px] overflow-y-auto max-h-[150px]">
                {(!result || result.reasons.length === 0) ? (
                  <div className="flex items-center gap-3 text-zinc-500 h-full">
                    <svg className="w-5 h-5 opacity-50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span className="text-sm font-medium leading-snug">Start typing to run the risk analysis.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white mb-1">
                      <svg className="w-4 h-4 text-shill-orange shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      <span className="text-sm font-bold">Detection Report</span>
                    </div>
                    <ul className="space-y-2">
                      {result.reasons.map((reason, idx) => (
                        <li key={idx} className="text-xs text-zinc-300 flex gap-2 items-start">
                           <span className="text-shill-orange mt-0.5">›</span> {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CTA Card - Adjusted for compact fit */}
          <div className="bg-gradient-to-br from-shill-orange to-orange-600 rounded-2xl py-6 px-6 text-white relative overflow-hidden group shadow-xl shadow-shill-orange/20 flex-grow flex flex-col justify-center">
            <div className="relative z-10 flex flex-col items-start">
              <h3 className="font-black text-4xl mb-2 tracking-tight">Market safely forever.</h3>
              <p className="text-white/90 text-xl mb-4 leading-relaxed">
                ShillGuard checks your posts in real-time on Reddit, gmail & Facebook. </p>
              <a 
                href="https://shillguardapp.com"
                className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full text-md font-bold shadow-lg hover:bg-zinc-900 transition-all transform hover:-translate-y-1"
              >
                Get the extension <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </a>
            </div>
            
            {/* Decorative Pattern */}
            <div className="absolute -right-8 -bottom-8 opacity-10 transform rotate-12 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 ease-in-out">
              <svg width="140" height="140" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z"/></svg>
            </div>
          </div>
          
          {/* Bottom Links */}
          <div className="text-center text-zinc-600 text-[10px] uppercase tracking-widest space-x-6 mt-2 font-medium shrink-0">
            <a href="https://shillguardapp.com/privacy" className="hover:text-shill-orange transition-colors">Privacy</a>
            <a href="https://shillguardapp.com/terms" className="hover:text-shill-orange transition-colors">Terms</a>
            <a href="https://twitter.com/scientificsaas" target="_blank" rel="noopener noreferrer" className="hover:text-shill-orange transition-colors">
              @scientificsaas
            </a>
          </div>

        </section>
      </main>
    </div>
  );
}
