import React from "react";
import { Navbar } from "./Navbar.js";
import { WorkspacePanel } from "./WorkspacePanel.js";
import { ChatPanel } from "./ChatPanel.js";
import { ReplacementModal } from "./ReplacementModal.js";

export const AgentPage: React.FC = () => {
  return (
    <div
      className="flex flex-col h-screen w-screen text-stone-900 overflow-hidden font-sans select-none sm:select-auto"
      style={{
        background: "linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 35%, #FAF5FF 70%, #FFFFFF 100%)",
      }}
    >
      {/* Top Navigation & Status Bar */}
      <Navbar />

      {/* Main Split-Screen Workspace Container (64% Left / 36% Right on desktop exactly like Image 3) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 sm:p-5 gap-4 sm:gap-6">
        {/* Left Workspace Panel — Apple Glass Card */}
        <div className="w-full lg:w-[64%] h-[55vh] lg:h-full shrink-0 flex flex-col overflow-hidden bg-white/75 backdrop-blur-2xl border border-white/90 rounded-3xl shadow-[0_15px_40px_rgba(147,51,234,0.18)] transition-all">
          <WorkspacePanel />
        </div>

        {/* Right Chat Panel — Apple Glass Card */}
        <div className="w-full lg:w-[36%] h-[45vh] lg:h-full flex-1 flex flex-col overflow-hidden bg-white/75 backdrop-blur-2xl border border-white/90 rounded-3xl shadow-[0_15px_40px_rgba(147,51,234,0.18)] transition-all">
          <ChatPanel />
        </div>
      </main>

      {/* Global Product Replacement & Alternative Swap Modal */}
      <ReplacementModal />
    </div>
  );
};

export default AgentPage;
