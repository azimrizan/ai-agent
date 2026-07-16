import React from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { MOCK_PRODUCTS } from "../data/mockProducts.js";
import { Wallet, TrendingDown, PieChart, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

export const BudgetTrackerView: React.FC = () => {
  const { projectState } = useAgentStore();
  const { budget, shoppingList } = projectState;

  // Calculate real totals by priority
  const breakdown = React.useMemo(() => {
    let essential = 0;
    let recommended = 0;
    let optional = 0;
    let total = 0;

    for (const item of shoppingList) {
      const prod = MOCK_PRODUCTS.find((p) => p.id === item.productId);
      if (prod) {
        const cost = prod.price * item.quantity;
        total += cost;
        if (item.priority === "essential") essential += cost;
        else if (item.priority === "recommended") recommended += cost;
        else if (item.priority === "optional") optional += cost;
      }
    }
    return { essential, recommended, optional, total };
  }, [shoppingList]);

  const maxBudget = budget.maximum || (breakdown.total > 0 ? breakdown.total * 1.2 : 10000);
  const percentageSpent = Math.min(100, Math.round((breakdown.total / maxBudget) * 100));
  const isOverBudget = typeof budget.maximum === "number" && breakdown.total > budget.maximum;

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-300">
      {/* Main Budget Dashboard Banner */}
      <div className="bg-white/90 rounded-2xl p-6 border border-stone-200/80 shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20 shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500">
                AI Financial & Basket Monitor
              </span>
              <h2 className="text-xl font-black text-stone-900">
                ₹{breakdown.total.toLocaleString()}{" "}
                <span className="text-sm font-normal text-stone-500">
                  / {budget.maximum ? `₹${budget.maximum.toLocaleString()} max` : "No limit set"}
                </span>
              </h2>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs ${
              isOverBudget
                ? "bg-red-50 text-red-600 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {isOverBudget ? (
              <>
                <ShieldAlert className="w-4 h-4" /> Over Budget by ₹{(breakdown.total - budget.maximum!).toLocaleString()}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Safe Buffer: ₹
                {budget.maximum ? (budget.maximum - breakdown.total).toLocaleString() : "Active"} remaining
              </>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-stone-700">
            <span>Budget Utilization</span>
            <span>{percentageSpent}% of target</span>
          </div>
          <div className="w-full h-4 rounded-full bg-stone-100 p-0.5 border border-stone-200 overflow-hidden flex">
            {/* Stacked Bars by Priority */}
            <div
              style={{ width: `${(breakdown.essential / maxBudget) * 100}%` }}
              className="h-full bg-emerald-500 transition-all duration-500"
              title={`Essential: ₹${breakdown.essential.toLocaleString()}`}
            />
            <div
              style={{ width: `${(breakdown.recommended / maxBudget) * 100}%` }}
              className="h-full bg-sky-500 transition-all duration-500"
              title={`Recommended: ₹${breakdown.recommended.toLocaleString()}`}
            />
            <div
              style={{ width: `${(breakdown.optional / maxBudget) * 100}%` }}
              className="h-full bg-amber-500 transition-all duration-500"
              title={`Optional: ₹${breakdown.optional.toLocaleString()}`}
            />
          </div>
          <div className="flex flex-wrap gap-4 pt-1 text-[11px] font-medium text-stone-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Essential (₹
              {breakdown.essential.toLocaleString()})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Recommended (₹
              {breakdown.recommended.toLocaleString()})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Optional (₹
              {breakdown.optional.toLocaleString()})
            </span>
          </div>
        </div>
      </div>

      {/* AI Budget Optimization Insights */}
      <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/80 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
          AI Cost Optimization Strategies
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1 shadow-xs">
            <div className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" /> Remove Optional Items
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Dropping optional aesthetic items would instantly save you **₹{breakdown.optional.toLocaleString()}**, bringing your total to only **₹{(breakdown.total - breakdown.optional).toLocaleString()}**.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1 shadow-xs">
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <PieChart className="w-4 h-4" /> Core Functionality Protected
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your **{shoppingList.filter((i) => i.priority === "essential").length} essential items** account for only **₹{breakdown.essential.toLocaleString()}**, guaranteeing you can complete your primary goal at minimum expenditure.
            </p>
          </div>
        </div>
      </div>

      {/* Shopping List Table Breakdown */}
      <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/80 shadow-sm">
        <h3 className="text-sm font-bold text-stone-900 mb-3">Itemized Financial Breakdown</h3>
        <div className="divide-y divide-stone-100">
          {shoppingList.map((item) => {
            const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
            if (!product) return null;
            const cost = product.price * item.quantity;
            return (
              <div key={item.productId} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-stone-800 truncate">{product.name}</span>
                  <span className="text-stone-500">x{item.quantity}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                    {item.priority}
                  </span>
                  <span className="font-bold text-stone-900 font-mono">₹{cost.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
