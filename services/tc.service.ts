import api from './api';
import { TechnicalCondition, CreateTCRequest, ResourceType, TCType } from '@/types';

class TCService {
  async getAll(resourceType?: ResourceType, tcType?: TCType): Promise<TechnicalCondition[]> {
    const params = new URLSearchParams();
    if (resourceType) params.append('resource_type', resourceType);
    if (tcType) params.append('tc_type', tcType);
    
    const response = await api.get<TechnicalCondition[]>(`/technical-conditions?${params.toString()}`);
    return response.data;
  }

  async getById(id: number): Promise<TechnicalCondition> {
    const response = await api.get<TechnicalCondition>(`/technical-conditions/${id}`);
    return response.data;
  }

  async create(data: CreateTCRequest): Promise<TechnicalCondition> {
    const response = await api.post<TechnicalCondition>('/technical-conditions', data);
    return response.data;
  }

  async update(id: number, data: CreateTCRequest): Promise<TechnicalCondition> {
    const response = await api.put<TechnicalCondition>(`/technical-conditions/${id}`, data);
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await api.delete(`/technical-conditions/${id}`);
  }
}

// Assign to a variable first
const tcService = new TCService();

export default tcService;