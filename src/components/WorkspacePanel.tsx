import React from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { AnalysisView } from "./AnalysisView.js";
import { ProjectPlanView } from "./ProjectPlanView.js";
import { BudgetTrackerView } from "./BudgetTrackerView.js";
import { StoresView } from "./StoresView.js";
import { Layers, Eye, Wallet, MapPin, Sparkles, ArrowRight } from "lucide-react";

export const WorkspacePanel: React.FC = () => {
  const { activeWorkspaceTab, setWorkspaceTab, projectState, messages, isThinking, sendMessage } = useAgentStore();

  // 1. Loading Animation shown ON THE LEFT SIDE exactly as requested
  // 1. Loading Animation shown ON THE LEFT SIDE exactly as requested
  if (isThinking) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in duration-300">
        <div className="bg-white/85 backdrop-blur-2xl border border-stone-200/80 rounded-3xl p-8 sm:p-12 max-w-lg mx-auto shadow-[0_20px_50px_rgba(147,51,234,0.15)] flex flex-col items-center">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto mb-4 flex items-center justify-center">
            <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-full pointer-events-none" />
            <video
              src="/Loading animation.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="relative w-full h-full object-contain drop-shadow-[0_12px_30px_rgba(147,51,234,0.25)]"
            />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            AI Architect is Synthesizing...
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 mt-2.5 leading-relaxed max-w-sm">
            Orchestrating multimodal diagnostic tools, verifying catalog inventory, and preparing your interactive breakdown right here.
          </p>
        </div>
      </div>
    );
  }

  // 2. Initial Apple Studio Welcome Hero (when session starts or before first user message)
  if (messages.length <= 1) {
    const studioCards = [
      {
        title: "Set up a small balcony garden",
        desc: "From understanding your space to the complete plant & pot checklist under ₹8,000.",
        query: "Set up a small balcony garden (₹8,000)",
      },
      {
        title: "First apartment essentials",
        desc: "Curate a complete move-in essentials list within a budget of ₹15,000.",
        query: "First apartment essentials under ₹15,000",
      },
      {
        title: "Fix a loose cabinet hinge",
        desc: "Diagnose household repair issues from photos and get exact step-by-step guidance.",
        query: "How can I fix a loose cabinet hinge?",
      },
      {
        title: "Cable organizer & desk tidy box",
        desc: "Find exact product recommendations and compatibility checks for your desk setup.",
        query: "Find cable organizer and desk tidy box",
      },
    ];

    return (
      <div className="flex flex-col h-full overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-300">
        <div className="max-w-3xl mx-auto w-full flex flex-col items-center text-center my-auto py-6">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-600 font-bold text-xs border border-purple-500/20 shadow-sm mb-4">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
            <span>MR. Plus AI Agent</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            MR.Plus AI Agent
          </h1>
          <p className="text-sm sm:text-base font-medium text-stone-600 mb-6 max-w-xl">
            Bring your home, DIY, and shopping ideas to life right before your eyes.
          </p>

          {/* Robot Illustration */}
          <div className="relative my-2">
            <div className="absolute inset-0 bg-purple-400/20 blur-3xl rounded-full pointer-events-none" />
            <img
              src="/Ai.png"
              alt="AI Studio Hero"
              className="relative w-36 h-36 sm:w-44 sm:h-44 object-contain mx-auto drop-shadow-[0_15px_30px_rgba(147,51,234,0.25)] animate-bounce-subtle"
            />
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold text-stone-800 tracking-tight my-6">
            What would you like to purchase today?
          </h2>

          {/* Glass Effect Cards Grid (Apple Inspiration exactly like Image 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 w-full mt-2">
            {studioCards.map((card, idx) => (
              <div
                key={idx}
                onClick={() => sendMessage(card.query)}
                className="cursor-pointer bg-white/80 hover:bg-white backdrop-blur-2xl border border-stone-200/80 shadow-[0_10px_25px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgba(147,51,234,0.15)] rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between text-left group gap-4"
              >
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 group-hover:text-purple-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-2">
                  <span className="text-xs font-bold text-purple-600 group-hover:underline">Explore Scenario</span>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold text-xs shadow-md shadow-purple-500/20 group-hover:scale-105 transition-all flex items-center gap-1.5"
                  >
                    <span>Start</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. Active Workspace State (when user starts chatting and not thinking)
  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      {/* Workspace Header Tabs Bar */}
      <div className="bg-transparent border-b border-stone-200/60 px-5 pt-4 pb-3 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse shadow-[0_0_8px_rgba(147,51,234,0.8)]" />
            <span className="text-xs font-extrabold tracking-wider text-stone-800 uppercase">
              Visual Design & Project Workspace
            </span>
          </div>
          {projectState.shoppingList.length > 0 && (
            <span className="text-xs font-bold text-purple-600 font-mono bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 shadow-sm">
              {projectState.shoppingList.length} Items (₹
              {projectState.budget.currentTotal.toLocaleString()})
            </span>
          )}
        </div>

        {/* Minimalist Tab Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setWorkspaceTab("plan")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeWorkspaceTab === "plan"
                ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md border border-purple-400/50"
                : "bg-white/70 text-stone-600 hover:bg-white hover:text-stone-900 border border-stone-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Project & Basket</span>
          </button>

          {projectState.imageAnalysis && (
            <button
              onClick={() => setWorkspaceTab("analysis")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeWorkspaceTab === "analysis"
                  ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md border border-purple-400/50"
                  : "bg-white/70 text-stone-600 hover:bg-white hover:text-stone-900 border border-stone-200"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Multimodal Analysis</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping ml-1" />
            </button>
          )}

          <button
            onClick={() => setWorkspaceTab("budget")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeWorkspaceTab === "budget"
                ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md border border-purple-400/50"
                : "bg-white/70 text-stone-600 hover:bg-white hover:text-stone-900 border border-stone-200"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Budget & Breakdown</span>
          </button>

          <button
            onClick={() => setWorkspaceTab("stores")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeWorkspaceTab === "stores"
                ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md border border-purple-400/50"
                : "bg-white/70 text-stone-600 hover:bg-white hover:text-stone-900 border border-stone-200"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Nearby Stores</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable View Area */}
      <div className="flex-1 overflow-y-auto">
        {activeWorkspaceTab === "plan" && <ProjectPlanView />}
        {activeWorkspaceTab === "analysis" && <AnalysisView />}
        {activeWorkspaceTab === "budget" && <BudgetTrackerView />}
        {activeWorkspaceTab === "stores" && <StoresView />}
      </div>
    </div>
  );
};
