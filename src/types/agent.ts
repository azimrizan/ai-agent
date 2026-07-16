import type { ProjectState } from "./project.js";

export interface ToolActivity {
  tool: string;
  status: "running" | "completed" | "failed";
  displayLabel: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageAttachment?: string; // base64 or URL preview
  toolActivity?: ToolActivity[];
  replacedItemInfo?: {
    originalName: string;
    newName: string;
    savings: number;
  };
}

export interface AgentRequest {
  message: string;
  image?: string; // base64 representation if user uploaded a photo
  history: ChatMessage[];
  projectState: ProjectState;
  useMock?: boolean;
}

export interface AgentResponse {
  message: ChatMessage;
  projectState: ProjectState;
  suggestedActions: string[];
  toolActivity: ToolActivity[];
}
