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

export interface CustomerProfile {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  ordersCount?: number;
  city?: string;
  accessToken?: string;
}

export interface AgentRequest {
  message: string;
  image?: string;
  history: ChatMessage[];
  projectState: ProjectState;
  useMock?: boolean;
  customerProfile?: CustomerProfile | null;
}

export interface AgentResponse {
  message: ChatMessage;
  projectState: ProjectState;
  suggestedActions: string[];
  toolActivity: ToolActivity[];
}
