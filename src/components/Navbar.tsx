import React from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { RefreshCw } from "lucide-react";

export const Navbar: React.FC = () => {
  const { resetSession } = useAgentStore();

  return (
    <header className="px-6 py-4 flex items-center justify-between gap-4 shrink-0 z-40 border-b border-stone-200/60 bg-white/40 backdrop-blur-md">
      {/* Clean Brand Title */}
      <div className="flex items-center gap-2.5">
        <span className="font-extrabold tracking-tight text-base sm:text-lg text-stone-900">
          MR. Plus
        </span>
        <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
          AI Companion
        </span>
      </div>

      {/* Minimalist Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => resetSession("blank")}
          title="Start fresh conversation"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/80 hover:bg-purple-600 hover:text-white text-stone-700 border border-stone-200 hover:border-transparent text-xs font-semibold transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Session</span>
        </button>
      </div>
    </header>
  );
};
