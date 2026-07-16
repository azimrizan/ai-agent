import React from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { ProductCard } from "./ProductCard.js";
import { MOCK_PRODUCTS } from "../data/mockProducts.js";
import { CheckCircle2, Circle, Clock, ShieldCheck, Sparkles, Filter, Layers } from "lucide-react";

export const ProjectPlanView: React.FC = () => {
  const { projectState } = useAgentStore();
  const [priorityFilter, setPriorityFilter] = React.useState<"all" | "essential" | "recommended" | "optional">("all");

  const filteredList = React.useMemo(() => {
    if (priorityFilter === "all") return projectState.shoppingList;
    return projectState.shoppingList.filter((item) => item.priority === priorityFilter);
  }, [projectState.shoppingList, priorityFilter]);

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case "active":
        return <Clock className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />;
      default:
        return <Circle className="w-5 h-5 text-stone-600 shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-300">
      {/* Project Header Banner */}
      <div className="bg-white/90 rounded-2xl p-5 border border-stone-200/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
              {projectState.status.toUpperCase()} PLAN
            </span>
            {projectState.preferences.map((pref, idx) => (
              <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">
                {pref}
              </span>
            ))}
          </div>
          <h2 className="text-lg font-black text-stone-900">{projectState.title}</h2>
          <p className="text-xs text-stone-600 mt-0.5">{projectState.goal}</p>
        </div>

        {/* AI Compatibility Seal */}
        {projectState.shoppingList.length > 1 && (
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-xs font-bold text-emerald-800">AI Compatibility Verified</div>
              <div className="text-[10px] text-emerald-600">All items work seamlessly together</div>
            </div>
          </div>
        )}
      </div>

      {/* Project Steps Timeline */}
      {projectState.steps.length > 0 && (
        <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            AI Execution Roadmap ({projectState.steps.length} Steps)
          </h3>
          <div className="space-y-3">
            {projectState.steps.map((step, idx) => (
              <div
                key={step.id}
                className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                  step.status === "active"
                    ? "bg-purple-50/80 border-purple-300 shadow-sm"
                    : step.status === "complete"
                    ? "bg-emerald-50/60 border-emerald-200 opacity-90"
                    : "bg-white/60 border-stone-200 opacity-80"
                }`}
              >
                <div className="mt-0.5">{getStepStatusIcon(step.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="text-xs font-bold text-stone-900">
                      Step {idx + 1}: {step.title || "Project Step"}
                    </h4>
                    {step.estimatedCost && (
                      <span className="text-[11px] font-mono font-bold text-stone-600">
                        ~₹{step.estimatedCost.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shopping Basket List Header with Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
          <h3 className="text-sm font-bold text-stone-900">
            Recommended Products ({projectState.shoppingList.length})
          </h3>
        </div>

        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
          <Filter className="w-3.5 h-3.5 text-stone-500 ml-1" />
          {(["all", "essential", "recommended", "optional"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setPriorityFilter(filter)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg capitalize transition-all ${
                priorityFilter === filter
                  ? "bg-white text-purple-600 shadow-sm border border-stone-200/60 font-bold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Shopping Basket Cards */}
      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <div className="text-center py-10 bg-white/60 rounded-2xl border border-stone-200/80 text-stone-500 text-xs shadow-xs">
            No items in this filter category. Try switching to "all" items or describe your project in the chat!
          </div>
        ) : (
          filteredList.map((item) => {
            const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
            if (!product) return null;
            return <ProductCard key={item.productId} item={item} product={product} />;
          })
        )}
      </div>
    </div>
  );
};
