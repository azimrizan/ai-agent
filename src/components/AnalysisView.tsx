import React from "react";
import { useAgentStore } from "../store/useAgentStore.js";
import { Eye, AlertTriangle, CheckCircle2, HelpCircle, ArrowRight, ShieldCheck, Camera } from "lucide-react";

export const AnalysisView: React.FC = () => {
  const { projectState, setWorkspaceTab } = useAgentStore();
  const analysis = projectState.imageAnalysis;

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full gap-4 text-stone-500">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-sm">
          <Camera className="w-8 h-8 animate-pulse" />
        </div>
        <div className="max-w-md">
          <h3 className="text-base font-bold text-stone-900 mb-1">No Photo Uploaded Yet</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Upload a photo of a broken hinge, plumbing fixture, cabinet, or DIY space in the chat box on the right. Our multimodal AI will inspect the photo, diagnose possible issues, and provide safe step-by-step repair guidance!
          </p>
        </div>
      </div>
    );
  }

  const getConfidenceStyle = (conf: string) => {
    switch (conf) {
      case "high":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "medium":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-sky-50 text-sky-700 border-sky-200";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-300">
      {/* Title & Badge */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-stone-200/80 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600">Multimodal AI Inspection</span>
          <h2 className="text-lg font-black text-stone-900">{projectState.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-medium">Diagnostic Confidence:</span>
          <span
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${getConfidenceStyle(
              analysis.confidence || "medium"
            )}`}
          >
            {analysis.confidence} Confidence
          </span>
        </div>
      </div>

      {/* Image and Primary Diagnosis Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Uploaded Photo Preview */}
        <div className="relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-md group">
          <img
            src={analysis.imageUrl}
            alt="Uploaded Photo for Inspection"
            className="w-full h-64 object-cover group-hover:scale-102 transition-transform duration-300"
          />
          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-white/90 backdrop-blur-md border border-stone-200 text-xs font-semibold text-stone-900 flex items-center gap-1.5 shadow-sm">
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            AI Visual Scan Active
          </div>
        </div>

        {/* Diagnosed Issue Box */}
        <div className="flex flex-col gap-4">
          <div className="bg-white/90 rounded-2xl p-5 border border-stone-200/80 shadow-md">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-sm mb-2">
              <AlertTriangle className="w-4 h-4" />
              Primary AI Diagnostic Findings
            </div>
            <p className="text-stone-800 text-sm leading-relaxed font-medium">
              {analysis.possibleIssue}
            </p>
          </div>

          {/* Additional Information Needed Box */}
          {analysis.additionalInformationNeeded && analysis.additionalInformationNeeded.length > 0 && (
            <div className="bg-white/80 rounded-xl p-4 border border-stone-200/80 shadow-xs">
              <div className="flex items-center gap-2 text-sky-600 font-bold text-xs mb-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                To Verify 100% Accuracy (Recommended Next Step):
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-stone-600">
                {analysis.additionalInformationNeeded.map((info, idx) => (
                  <li key={idx}>{info}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Safety Reminder */}
          <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200 flex items-start gap-2.5 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
              This DIY fix only requires standard hand tools or plates. No structural, electrical, or hazardous demolition required.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Observations List */}
      <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/80 shadow-sm">
        <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-600" />
          What the AI Detected in Your Photo (Key Observations)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {analysis.observations.map((obs, idx) => (
            <div
              key={idx}
              className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 text-xs text-stone-800 flex items-start gap-2.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{obs}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action to Switch to Plan */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => setWorkspaceTab("plan")}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold text-xs transition-all shadow-md shadow-purple-500/20 flex items-center gap-2"
        >
          <span>View Recommended 3-Step Repair Plan & Parts</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
