export type UserRole = 'admin' | 'user';
export type TCType = 'temporary' | 'permanent';
export type ResourceType = 'electricity' | 'water';
export type TCStatus = 'active' | 'expired' | 'cancelled';
export * from './tc';
export type ObjectType = 'substation' | 'tp' | 'kru';


export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  organization_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Organization {
  id: number;
  name: string;
  bin?: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TechnicalCondition {
  id: number;
  organization_id: number;
  organization_name: string;
  object_id: number;
  object_name: string;
  tc_type: TCType;
  resource_type: ResourceType;
  tc_number: string;
  power_amount: number;
  issue_date: string;
  expiry_date?: string;
  status: TCStatus;
  document_link?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface PowerObject {
  id: number;
  name: string;
  type: ObjectType;
  max_power_mw: number;
  max_power_kw: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}


// ⚠️ ДОБАВЬТЕ ЭТОТ ИНТЕРФЕЙС ⚠️
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email: string;
  role: UserRole;
  organization_name?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  bin?: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
}

export interface CreateTCRequest {
  organization_id: number;
  tc_type: TCType;
  resource_type: ResourceType;
  tc_number: string;
  power_amount: number;
  issue_date: string;
  expiry_date?: string;
  document_link?: string;
  notes?: string;
}

// Добавьте этот интерфейс для ошибок API
export interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}