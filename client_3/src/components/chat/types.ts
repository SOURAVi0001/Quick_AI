export interface ChatLink {
  label: string;
  href: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  kind?: "answer" | "rejected" | "unavailable" | "error";
  links?: ChatLink[];
  sources?: string[];
  createdAt: number;
}

export interface AssistantReply {
  content: string;
  kind?: "answer" | "rejected" | "unavailable" | "error";
  links?: ChatLink[];
  sources?: string[];
}

export interface CreationHistoryItem {
  id: number | string;
  type: string;
  prompt: string;
  content?: string;
  publish: boolean;
  likes_count?: number;
  created_at?: string;
}

export interface UserActivityItem {
  activity_id?: string;
  action: string;
  timestamp: string;
}

export interface UserContext {
  id?: string;
  name: string;
  email?: string;
  plan: "free" | "premium" | string;
  freeUsage: number;
  freeLimit: number;
  totalCreations?: number;
  recentCreations?: CreationHistoryItem[];
  recentActivity?: UserActivityItem[];
}

export interface ConnectionInfo {
  service: string;
  version: string;
  status: string;
  provider: string;
  applicationId: string;
  maxRetries: number;
  topK: number;
  endpoint: string;
}

export type SendMessageFn = (payload: {
  message: string;
  history: ChatMessage[];
  user?: UserContext | null;
  conversationId?: string;
}) => Promise<AssistantReply>;
