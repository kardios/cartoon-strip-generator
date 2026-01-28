"use client";

import { useState, useEffect, useRef } from "react";

type PanelCount = 1 | 3 | 4;
type Style = "clean_editorial" | "funky_surreal" | "cute_but_dark";
type Slant = "neutral" | "playful" | "dark";

interface ArticleExtraction {
  concept: string;
  centralImage: string;
  supportingDetails: string;
  tension: string;
  visualMetaphor: string;
}

interface GenerateResult {
  imageUrl: string;
  extraction: ArticleExtraction;
  prompt: string;
}

type LoadingStep = "fetching" | "analyzing" | "generating" | null;

const LOADING_STEPS: { id: LoadingStep; label: string; duration: number }[] = [
  { id: "fetching", label: "Fetching article...", duration: 3000 },
  { id: "analyzing", label: "Analyzing content...", duration: 5000 },
  { id: "generating", label: "Generating cartoon...", duration: 0 },
];

const PANEL_OPTIONS: { value: PanelCount; label: string }[] = [
  { value: 1, label: "1" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
];

const STYLE_OPTIONS: { value: Style; label: string }[] = [
  { value: "clean_editorial", label: "Clean Editorial" },
  { value: "funky_surreal", label: "Funky Surreal" },
  { value: "cute_but_dark", label: "Cute-but-Dark" },
];

const SLANT_OPTIONS: { value: Slant; label: string }[] = [
  { value: "neutral", label: "Neutral" },
  { value: "playful", label: "Playful" },
  { value: "dark", label: "Dark" },
];

export default function Home() {
  const [articleUrl, setArticleUrl] = useState("");
  const [panelCount, setPanelCount] = useState<PanelCount>(3);
  const [style, setStyle] = useState<Style>("clean_editorial");
  const [slant, setSlant] = useState<Slant>("playful");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>(null);
  const [completedSteps, setCompletedSteps] = useState<LoadingStep[]>([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const stepTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      stepTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  const startLoadingSteps = () => {
    setCompletedSteps([]);
    setLoadingStep("fetching");
    
    // Clear any existing timers
    stepTimersRef.current.forEach(clearTimeout);
    stepTimersRef.current = [];

    // Step 1 -> Step 2 after 3s
    const timer1 = setTimeout(() => {
      setCompletedSteps(["fetching"]);
      setLoadingStep("analyzing");
    }, 3000);
    stepTimersRef.current.push(timer1);

    // Step 2 -> Step 3 after 8s total
    const timer2 = setTimeout(() => {
      setCompletedSteps(["fetching", "analyzing"]);
      setLoadingStep("generating");
    }, 8000);
    stepTimersRef.current.push(timer2);
  };

  const stopLoadingSteps = () => {
    stepTimersRef.current.forEach(clearTimeout);
    stepTimersRef.current = [];
    setLoadingStep(null);
    setCompletedSteps([]);
  };

  const handleGenerate = async () => {
    if (!articleUrl.trim()) {
      setError("Please enter an article URL.");
      return;
    }

    // Basic URL validation
    try {
      new URL(articleUrl);
    } catch {
      setError("Please enter a valid URL.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    startLoadingSteps();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleUrl,
          panelCount,
          style,
          slant,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate cartoon strip");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      stopLoadingSteps();
    }
  };

  const handleDownload = async () => {
    if (!result?.imageUrl) return;
    
    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cartoon-strip.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: open in new tab
      window.open(result.imageUrl, "_blank");
    }
  };

  const getStepStatus = (stepId: LoadingStep) => {
    if (completedSteps.includes(stepId)) return "completed";
    if (loadingStep === stepId) return "active";
    return "pending";
  };

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4" style={{ color: "var(--foreground)" }}>
            Cartoon Strip Generator
          </h1>
          <p className="text-lg" style={{ color: "var(--muted)" }}>
            Transform any news article into a visual cartoon strip
          </p>
          <div className="mt-4 w-24 h-1 mx-auto" style={{ background: "var(--accent)" }} />
        </header>

        {/* Input Section */}
        <section className="mb-8 p-6 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <label htmlFor="article-url" className="block text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
            Article URL
          </label>
          <input
            id="article-url"
            type="url"
            value={articleUrl}
            onChange={(e) => setArticleUrl(e.target.value)}
            placeholder="https://example.com/news-article"
            className="w-full p-4 rounded-md text-base focus:outline-none focus:ring-2 transition-shadow"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading && articleUrl.trim()) {
                handleGenerate();
              }
            }}
          />
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Paste the URL of any news article and we&apos;ll extract the content automatically
          </p>
        </section>

        {/* Options Section */}
        <section className="mb-8 p-6 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-6" style={{ color: "var(--muted)" }}>
            Customize Your Strip
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Panel Count */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>
                Number of Panels
              </label>
              <div className="flex gap-2">
                {PANEL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPanelCount(option.value)}
                    className="flex-1 py-3 px-4 rounded-md text-sm font-semibold transition-all"
                    style={{
                      background: panelCount === option.value ? "var(--accent)" : "var(--background)",
                      color: panelCount === option.value ? "white" : "var(--foreground)",
                      border: `1px solid ${panelCount === option.value ? "var(--accent)" : "var(--border)"}`,
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>
                Visual Style
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as Style)}
                className="w-full py-3 px-4 rounded-md text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 transition-shadow"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Slant */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>
                Creative Slant
              </label>
              <select
                value={slant}
                onChange={(e) => setSlant(e.target.value as Slant)}
                className="w-full py-3 px-4 rounded-md text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 transition-shadow"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {SLANT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Generate Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !articleUrl.trim()}
            className="px-12 py-4 rounded-md text-lg font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--accent)",
              color: "white",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && articleUrl.trim()) {
                e.currentTarget.style.background = "var(--accent-hover)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--accent)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {isLoading ? "Processing..." : "Generate Cartoon Strip"}
          </button>
        </div>

        {/* Loading Progress */}
        {isLoading && (
          <div className="mb-12 p-6 rounded-lg animate-slide-up" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="space-y-3">
              {LOADING_STEPS.map((step, index) => {
                const status = getStepStatus(step.id);
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    {/* Step indicator */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        background: status === "completed" ? "var(--accent)" : status === "active" ? "var(--accent)" : "var(--border)",
                        color: status === "pending" ? "var(--muted)" : "white",
                      }}
                    >
                      {status === "completed" ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    {/* Step label */}
                    <span
                      className="text-sm font-medium"
                      style={{
                        color: status === "pending" ? "var(--muted)" : "var(--foreground)",
                      }}
                    >
                      {step.label}
                    </span>
                    
                    {/* Spinner for active step */}
                    {status === "active" && (
                      <svg className="animate-spin h-4 w-4 ml-auto" style={{ color: "var(--accent)" }} viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 rounded-md text-center animate-slide-up" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
            {error}
          </div>
        )}

        {/* Result Display */}
        {result && (
          <section className="animate-slide-up">
            {/* Generated Image */}
            <div className="mb-8 p-6 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
                Your Cartoon Strip
              </h2>
              <div className="rounded-lg overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
                <img
                  src={result.imageUrl}
                  alt="Generated cartoon strip"
                  className="w-full h-auto"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-md text-sm font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.borderColor = "var(--accent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </button>
                
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-6 py-3 rounded-md text-sm font-semibold transition-all"
                  style={{
                    background: "var(--accent)",
                    color: "white",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--accent)";
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </div>

            {/* Article Extraction */}
            <div className="mb-8 p-6 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--muted)" }}>
                Article Analysis
              </h3>
              
              <div className="space-y-4">
                {/* Concept */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>
                    Concept
                  </h4>
                  <p style={{ color: "var(--foreground)" }}>
                    {result.extraction.concept}
                  </p>
                </div>

                {/* Central Image */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>
                    Central Image
                  </h4>
                  <p className="font-medium" style={{ color: "var(--foreground)" }}>
                    {result.extraction.centralImage}
                  </p>
                </div>

                {/* Supporting Details */}
                {result.extraction.supportingDetails && result.extraction.supportingDetails.toLowerCase() !== "none needed" && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>
                      Supporting Details
                    </h4>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      {result.extraction.supportingDetails}
                    </p>
                  </div>
                )}

                {/* Tension */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>
                    Core Tension
                  </h4>
                  <p style={{ color: "var(--foreground)" }}>
                    {result.extraction.tension}
                  </p>
                </div>

                {/* Visual Metaphor */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--accent)" }}>
                    Visual Metaphor
                  </h4>
                  <p className="italic" style={{ color: "var(--foreground)" }}>
                    {result.extraction.visualMetaphor}
                  </p>
                </div>
              </div>
            </div>

            {/* Prompt (collapsible) */}
            <details className="mb-8 p-6 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                View Generated Prompt
              </summary>
              <pre className="mt-4 p-4 rounded-md text-sm whitespace-pre-wrap overflow-x-auto" style={{ background: "var(--background)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                {result.prompt}
              </pre>
            </details>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center pt-8 mt-12" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Powered by Jina.ai, Gemini Flash &amp; fal.ai
          </p>
        </footer>
      </div>
    </main>
  );
}
