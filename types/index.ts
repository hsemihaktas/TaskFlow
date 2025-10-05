// types/index.ts - Global type definitions

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  position?: string;
  phone?: string;
  timezone?: string;
  created_at: string;
  updated_at?: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  organization?: Organization;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority?: "low" | "medium" | "high";
  created_by: string;
  created_at: string;
  updated_at?: string;
  assignments?: TaskAssignment[];
}

export interface TaskAssignment {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  assigned_at: string;
  assigned_by: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
  updated_at?: string;
  organization?: Organization;
  profiles?: Profile;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: "admin" | "member";
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}
