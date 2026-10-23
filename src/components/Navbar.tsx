import React from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { Home, ShoppingBag, Plus, ExternalLink } from "lucide-react";

export const Navbar: React.FC = () => {
  const { resetSession } = useAgentStore();

  return (
    <header className="fixed top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-50 flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-full glass-capsule max-w-7xl mx-auto shadow-2xl transition-all duration-300">
      {/* Left: Logo & Tagline */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <img
          src="/White.png"
          alt="MR.PLUS"
          className="h-5 sm:h-7 w-auto object-contain cursor-pointer shrink-0"
          onClick={() => resetSession("blank")}
        />
        <span className="text-[11px] text-white/40 font-normal hidden lg:inline border-l border-white/10 pl-3">
          India's First AI Shopping Experience
        </span>
      </div>

      {/* Center: Navigation Menu (Home & Shop) */}
      <nav className="flex items-center gap-0.5 sm:gap-2 bg-white/5 border border-white/5 px-1.5 sm:px-3 py-1 rounded-full shrink">
        <button
          onClick={() => resetSession("blank")}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
          title="Home"
        >
          <Home className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline sm:inline">Home</span>
        </button>

        <a
          href="https://mrplus.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
          title="Shop Storefront"
        >
          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline sm:inline">Shop</span>
          <ExternalLink className="w-3 h-3 opacity-50 hidden sm:inline" />
        </a>
      </nav>

      {/* Right Actions: New Session */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={() => resetSession("blank")}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black text-xs font-medium transition-all"
          title="Start fresh session"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">New Session</span>
        </button>
      </div>
    </header>
  );
};
