import React, { useState, useEffect } from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { ProductCard } from "./ProductCard.js";
import { Sparkles } from "lucide-react";

const LOADING_TEXTS = [
  "Searching products...",
  "Finding the best matches...",
  "Building your shopping experience...",
  "Checking live availability...",
];

export const WorkspacePanel: React.FC = () => {
  const { projectState, isThinking, getProduct } = useAgentStore();
  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    if (!isThinking) return;
    const interval = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
    }, 900);
    return () => clearInterval(interval);
  }, [isThinking]);

  // 1. Cinematic Loading State (Apple Intelligence Text Animation)
  if (isThinking) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-500">
        <div className="flex flex-col items-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>

          <h3 key={loadingIndex} className="text-xl sm:text-2xl font-semibold text-white tracking-tight animate-text-fade">
            {LOADING_TEXTS[loadingIndex]}
          </h3>

          <p className="text-xs text-white/40 mt-3 font-normal">
            Curating your custom experience
          </p>
        </div>
      </div>
    );
  }

  // 2. Initial Cinematic Hero State (When no products added yet or conversation starting)
  if (!projectState.shoppingList || projectState.shoppingList.length === 0) {

    return (
      <div className="flex flex-col h-full overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-500 items-center">
        <div className="flex flex-col items-center text-center py-4 max-w-4xl w-full mx-auto my-auto">
          {/* Big Hero Robot Graphic with Back Spotlight Glow */}
          <div className="relative flex items-center justify-center -mb-16 sm:-mb-20 md:-mb-24">
            {/* Soft Radial Backlight Glow */}
            <div
              className="absolute w-72 h-72 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] rounded-full blur-3xl opacity-70 pointer-events-none -translate-y-6"
              style={{
                background: "radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 45%, rgba(0, 0, 0, 0) 70%)",
              }}
            />

            <img
              src="/hero-graphic.png"
              alt="MR.PLUS Assistant"
              className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 object-contain drop-shadow-[0_25px_60px_rgba(255,255,255,0.15)] transition-transform duration-500 hover:scale-105 relative z-10"
            />
          </div>

          {/* Headline & Tagline right below the image */}
          <h1 className="text-4xl sm:text-6xl md:text-[68px] font-bold tracking-[-0.035em] leading-[1.14] max-w-3xl mb-3 relative z-20">
            <span className="text-white block">Discover Products with</span>
            <span className="text-gradient-silver block pb-1">AI Shopping Experience</span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-white/70 font-normal max-w-xl leading-relaxed tracking-normal">
            Kerala's First AI Agent Shopping Experience.
          </p>
        </div>
      </div>
    );
  }

  // 3. Results Gallery State (Apple Store Product Grid)
  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 sm:p-10 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {projectState.title || "Selected Products"}
          </h2>
          <p className="text-xs text-white/50 font-normal mt-1">
            {projectState.shoppingList.length} items curated for your setup
          </p>
        </div>

        {projectState.budget?.currentTotal ? (
          <div className="text-right">
            <div className="text-xs text-white/40 font-normal">Subtotal</div>
            <div className="text-xl font-bold text-white font-mono">
              ₹{projectState.budget.currentTotal.toLocaleString()}
            </div>
          </div>
        ) : null}
      </div>

      {/* 3-Column Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectState.shoppingList.map((item) => {
          const product = getProduct(item.productId);
          if (!product) return null;
          return <ProductCard key={item.productId} item={item} product={product} />;
        })}
      </div>
    </div>
  );
};
