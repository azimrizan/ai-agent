export type WorkspaceStatus = "discovering" | "planning" | "shopping" | "complete";
export type StepStatus = "pending" | "active" | "complete";
export type ShoppingPriority = "essential" | "recommended" | "optional";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface ProjectStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  relatedProductIds: string[];
  estimatedCost?: number;
}

export interface ShoppingListItem {
  productId: string;
  quantity: number;
  priority: ShoppingPriority;
  reason: string;
}

export interface ImageAnalysisState {
  imageUrl?: string;
  observations: string[];
  possibleIssue?: string;
  confidence?: ConfidenceLevel;
  additionalInformationNeeded?: string[];
}

export interface BudgetState {
  maximum: number | null;
  currentTotal: number;
  remaining: number | null;
}

export interface ProjectState {
  id: string;
  title: string;
  status: WorkspaceStatus;
  goal: string;
  budget: BudgetState;
  preferences: string[];
  imageAnalysis?: ImageAnalysisState;
  steps: ProjectStep[];
  shoppingList: ShoppingListItem[];
  suggestedActions: string[];
}
