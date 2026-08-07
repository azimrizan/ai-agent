import React from "react";
import { Navbar } from "./Navbar.js";
import { WorkspacePanel } from "./WorkspacePanel.js";
import { ChatPanel } from "./ChatPanel.js";
import { ReplacementModal } from "./ReplacementModal.js";
import { MobileChatFab } from "./MobileChatFab.js";
import { useAgentStore } from "../store/useAgentStore.js";

export const AgentPage: React.FC = () => {
  const { isMobileChatOpen } = useAgentStore();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505] text-white overflow-hidden font-sans select-none sm:select-auto relative">
      {/* Floating Header */}
      <Navbar />

      {/* Main Layout: 100% Workspace on Mobile, 74%/26% Split on Desktop (lg) */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden pt-20 sm:pt-24 pb-4 sm:pb-6 px-4 sm:px-8 gap-5 sm:gap-6 max-w-[1700px] w-full mx-auto relative z-10">
        {/* Left Workspace Panel (100% Mobile, 74% Desktop) */}
        <div className="w-full lg:w-[74%] h-full flex flex-col overflow-hidden glass-panel rounded-[28px] sm:rounded-[36px] shadow-2xl transition-all duration-300 relative">
          <WorkspacePanel />
        </div>

        {/* Desktop Chat Panel (26% Desktop, Hidden on Mobile) */}
        <div className="hidden lg:flex lg:w-[26%] h-full flex-col overflow-hidden glass-panel rounded-[28px] sm:rounded-[36px] shadow-2xl transition-all duration-300 relative">
          <ChatPanel />
        </div>
      </main>

      {/* Mobile Floating Chat FAB (Bottom Left) */}
      <MobileChatFab />

      {/* Mobile Floating Chat Layer Card Overlay */}
      {isMobileChatOpen && (
        <div className="fixed inset-x-4 top-20 bottom-6 z-50 lg:hidden rounded-[32px] liquid-glass-card border border-white/15 shadow-2xl overflow-hidden backdrop-blur-2xl animate-in slide-in-from-bottom-5 duration-300 flex flex-col">
          <ChatPanel />
        </div>
      )}

      {/* Global Swap Modal */}
      <ReplacementModal />
    </div>
  );
};

export default AgentPage;
