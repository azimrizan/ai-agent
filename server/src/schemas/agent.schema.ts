import { ProjectState } from "./project.schema.js";

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
  imageAttachment?: string;
  toolActivity?: ToolActivity[];
  replacedItemInfo?: {
    originalName: string;
    newName: string;
    savings: number;
  };
}

export interface AgentRequest {
  message: string;
  image?: string;
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
