import React from "react";
import type { Product } from "../types/product.js";
import type { ShoppingListItem } from "../types/project.js";
import { useAgentStore } from "../store/useAgentStore.js";

interface ProductCardProps {
  item: ShoppingListItem;
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { sendMessage } = useAgentStore();

  const shopifyDomain = "mrplus.in";
  const handle = product.specifications?.handle as string | undefined;
  const variantId = product.specifications?.variantId as string | number | undefined;

  const rawVariantNum = variantId ? String(variantId).split("/").pop() : null;
  const buyNowUrl = rawVariantNum
    ? `https://${shopifyDomain}/cart/${rawVariantNum}:1`
    : handle
    ? `https://${shopifyDomain}/products/${handle}`
    : `https://${shopifyDomain}`;

  const handleAskAi = () => {
    sendMessage(`Tell me more about ${product.name}`);
  };

  return (
    <div className="group relative bg-[#141414]/90 border border-white/10 hover:border-white/20 rounded-[32px] sm:rounded-[36px] p-6 sm:p-7 transition-all duration-300 flex flex-col items-center justify-between text-center shadow-2xl backdrop-blur-2xl hover:-translate-y-1 overflow-hidden">
      {/* 1. Hero Product Image */}
      <div className="w-full h-48 sm:h-56 flex items-center justify-center my-2 p-2">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
        />
      </div>

      {/* 2. Title & Details Stack */}
      <div className="flex flex-col items-center text-center my-3 w-full">
        {/* Product Name */}
        <h3 className="font-bold text-white text-xl sm:text-2xl tracking-tight leading-tight line-clamp-1 mb-1">
          {product.name}
        </h3>

        {/* Subtitle / Category */}
        <p className="text-xs sm:text-sm text-white/50 font-medium tracking-tight mb-3 line-clamp-1">
          {product.subcategory || product.category || "MR.PLUS Appliance"}
        </p>

        {/* Description */}
        <p className="text-xs sm:text-sm text-white/70 font-normal leading-relaxed max-w-xs line-clamp-2 mb-4 px-2">
          {product.description || "High-grade MR.PLUS appliance engineered for superior daily durability."}
        </p>

        {/* Price (No "From", just ₹11,990.00*) */}
        <div className="text-sm sm:text-base font-semibold text-white font-sans tracking-tight mb-5">
          ₹{product.price.toLocaleString()}.00*
        </div>
      </div>

      {/* 3. Action Buttons Row (Side by Side Pills) */}
      <div className="flex items-center justify-center gap-3 w-full mt-auto pt-2">
        {/* Ask AI Agent (Outlined Silver Slate Pill) */}
        <button
          type="button"
          onClick={handleAskAi}
          className="px-5 sm:px-6 py-2.5 rounded-full border border-[#86868B] text-[#E8E8ED] hover:bg-white/10 hover:border-white/50 hover:text-white active:scale-95 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm"
          title="Ask AI Agent about this product"
        >
          <span>Ask AI Agent</span>
        </button>

        {/* Buy Now (Solid Silver Slate Pill) */}
        <a
          href={buyNowUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 sm:px-7 py-2.5 rounded-full bg-[#E8E8ED] hover:bg-white active:scale-95 text-slate-950 font-semibold text-xs sm:text-sm transition-all duration-200 shadow-md flex items-center justify-center text-center"
          title="Direct checkout on mrplus.in"
        >
          <span>Buy Now</span>
        </a>
      </div>
    </div>
  );
};
