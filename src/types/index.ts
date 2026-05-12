export type UserRole = "citizen" | "officer" | "admin";
export type ComplaintStatus = "submitted" | "assigned" | "in_progress" | "escalated" | "resolved";
export type ComplaintCategory = "water" | "electricity" | "road" | "sanitation" | "others";
export type PriorityLevel = "low" | "medium" | "high";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface StatusLog {
  status: ComplaintStatus;
  note?: string;
  created_at: string;
}

export interface Complaint {
  id: number;
  complaint_id: string;
  title: string;
  description: string;
  category?: string;
  domain?: string;
  status: string;
  priority: string;
  severity_score?: number;
  estimated_resolution_days?: number;
  location?: string;
  location_area?: string;
  location_city?: string;
  location_state?: string;
  latitude?: number;
  longitude?: number;
  is_duplicate: boolean;
  duplicate_of?: string;
  routing_metadata?: Record<string, any>;
  ai_metadata?: Record<string, any>;
  escalated_at?: string;
  escalation_reason?: string;
  created_at: string;
  updated_at?: string;
  user?: User;
  status_logs: StatusLog[];
}

export interface Analytics {
  total_complaints: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  avg_resolution_days?: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
