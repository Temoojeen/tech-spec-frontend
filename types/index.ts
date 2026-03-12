// types/index.ts

// ===== Базовые типы =====
export type UserRole = 'admin' | 'user';
export type TCType = 'temporary' | 'permanent';
export type ResourceType = 'electricity' | 'water';
export type TCStatus = 'active' | 'expired' | 'cancelled';
export type ObjectType = 'substation' | 'tp' | 'kru';
export type PowerUnit = 'mw' | 'kw' | 'm3h' | 'm3d';

// ===== Пользователи =====
export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  organization_name?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== Организации =====
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

// ===== Объекты (ОБНОВЛЕННЫЙ) =====
export interface PowerObject {
  id: number;
  name: string;
  type: ObjectType;
  resource_type: ResourceType;          // Новое поле: тип ресурса
  
  // Для электричества
  max_power_electricity_mw?: number;    // Заменяет max_power_mw
  max_power_electricity_kw?: number;    // Заменяет max_power_kw
  
  // Для воды
  max_power_water_m3h?: number;         // Новое поле: м³/час
  max_power_water_m3d?: number;         // Новое поле: м³/сутки
  
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Для обратной совместимости (если нужно)
export interface LegacyPowerObject {
  id: number;
  name: string;
  type: ObjectType;
  max_power_mw: number;
  max_power_kw: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== Технические условия (ОБНОВЛЕННЫЙ) =====
export interface TechnicalCondition {
  id: number;
  organization_id: number;
  organization_name: string;
  object_id: number;
  object_name: string;
  object_type?: ObjectType;
  tc_type: TCType;
  resource_type: ResourceType;
  tc_number: string;
  power_amount: number;
  power_unit: PowerUnit;                 // Новое поле: единица измерения
  issue_date: string;
  expiry_date?: string;
  status: TCStatus;
  document_link?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

// ===== Статистика по объекту =====
export interface ObjectStats {
  object_id: number;
  object_name: string;
  resource_type: ResourceType;
  total_power: number;           // Общая мощность
  issued_power: number;          // Выданная мощность
  issued_power_unit: string;     // Единица выданной мощности
  free_power: number;            // Свободная мощность
  free_power_unit: string;       // Единица свободной мощности
  usage_percent: number;         // Процент загрузки
  total_tc: number;              // Всего ТУ
  active_tc: number;             // Активных ТУ
  display_unit: string;          // Единица для отображения
}

// ===== Запросы =====
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

// ОБНОВЛЕННЫЙ: создание объекта
export interface CreateObjectRequest {
  name: string;
  type: ObjectType;
  resource_type: ResourceType;
  power_value: number;
  power_unit: PowerUnit;
  description?: string;
}

// ОБНОВЛЕННЫЙ: создание ТУ
export interface CreateTCRequest {
  organization_id: number;
  object_id: number;
  resource_type: ResourceType;
  tc_type: TCType;
  tc_number: string;
  power_amount: number;
  power_unit: PowerUnit;
  issue_date: string;
  expiry_date?: string;
  document_link?: string;
  notes?: string;
}

// ===== Ошибки API =====
export interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

// ===== Вспомогательные функции =====
export function getResourceTypeLabel(type: ResourceType): string {
  switch(type) {
    case 'electricity': return 'Электроснабжение';
    case 'water': return 'Водоснабжение';
    default: return type;
  }
}

export function getUnitLabel(unit: PowerUnit): string {
  switch(unit) {
    case 'mw': return 'МВт';
    case 'kw': return 'кВт';
    case 'm3h': return 'м³/ч';
    case 'm3d': return 'м³/сут';
    default: return unit;
  }
}

export function getObjectTypeLabel(type: ObjectType): string {
  switch(type) {
    case 'substation': return 'Подстанция';
    case 'tp': return 'ТП';
    case 'kru': return 'КРУ';
    default: return type;
  }
}

export function getStatusLabel(status: TCStatus): string {
  switch(status) {
    case 'active': return 'Активный';
    case 'expired': return 'Истекший';
    case 'cancelled': return 'Отмененный';
    default: return status;
  }
}

// Конвертация мощности для отображения
export function formatPower(amount: number, unit: PowerUnit): string {
  const label = getUnitLabel(unit);
  return `${amount.toFixed(2)} ${label}`;
}