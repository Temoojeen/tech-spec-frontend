export type TCType = 'temporary' | 'permanent';
export type ResourceType = 'electricity' | 'water';
export type TCStatus = 'active' | 'expired' | 'cancelled';

export interface TechnicalCondition {
  id: number;
  organization_id: number;
  organization_name: string;
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