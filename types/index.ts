// types/index.ts

// Типы для пользователей
export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  organization_name?: string;
  created_at?: string;
  updated_at?: string;
}

// Типы для объектов
export type ObjectType = 'substation' | 'tp' | 'kru' | 'vl' | 'kl';
export type ResourceType = 'electricity' | 'water';
export type PowerUnit = 'mw' | 'kw' | 'm3h' | 'm3d';

export interface PowerObject {
  id: number;
  name: string;
  type: ObjectType;
  resource_type: ResourceType;
  parent_id?: number | null;
  max_power_electricity_mw?: number;
  max_power_electricity_kw?: number;
  max_power_water_m3h?: number;
  max_power_water_m3d?: number;
  total_cells: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Объект со статистикой (для отображения в списке)
export interface PowerObjectWithStats extends PowerObject {
  available_cells: number;
  occupied_cells: number;
  occupied_power: number;
  free_power: number;
  free_power_unit: string;
  usage_percent: number;
}

// Статистика объекта
export interface ObjectStats {
  object_id: number;
  object_name: string;
  resource_type: ResourceType;
  total_power: number;
  issued_power: number;
  free_power: number;
  usage_percent: number;
  total_tc: number;
  active_tc: number;
  total_cells: number;
  occupied_cells: number;
  available_cells: number;
  display_unit: string;
}

// Запрос на создание объекта
export interface CreateObjectRequest {
  name: string;
  type: ObjectType;
  resource_type: ResourceType;
  parent_id?: number | null;
  power_value: number;
  power_unit: PowerUnit;
  total_cells: number;
  description?: string;
}

// Запрос на добавление ячеек
export interface AddCellsRequest {
  additional_cells: number;
}

// Типы для ТУ
export type TCType = 'permanent' | 'temporary';
export type TCStatus = 'active' | 'expired' | 'cancelled';

export interface TechnicalCondition {
  id: number;
  organization_id: number;
  organization_name: string;
  object_id: number;
  object_name: string;
  object_type?: string;
  cell_number: number;
  resource_type: ResourceType;
  tc_type: TCType;
  tc_number: string;
  power_amount: number;
  power_unit: PowerUnit;
  issue_date: string;
  expiry_date?: string | null;
  status: TCStatus;
  document_link?: string;
  document_file?: string;       // Путь к PDF файлу
  notes?: string;
  created_by?: number;
  created_by_name?: string;     // Имя пользователя создавшего ТУ
  created_at: string;
  updated_at: string;
}

// Детальная информация о ТУ с организацией и объектом
export interface TCDetails extends TechnicalCondition {
  organization_details?: Organization;
  object_details?: PowerObject;
}

// Запрос на создание ТУ
export interface CreateTCRequest {
  organization_id: number;
  object_id: number;
  cell_number: number;
  resource_type: ResourceType;
  tc_type: TCType;
  tc_number: string;
  power_amount: number;
  power_unit: PowerUnit;
  issue_date: string;
  expiry_date?: string | null;
  document_link?: string;
  notes?: string;
}

// Типы для организаций
export interface Organization {
  id: number;
  name: string;
  bin?: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
}

// Запрос на создание организации
export interface CreateOrganizationRequest {
  name: string;
  bin?: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Функция для получения метки единицы измерения
export const getUnitLabel = (unit: PowerUnit): string => {
  switch (unit) {
    case 'mw': return 'МВт';
    case 'kw': return 'кВт';
    case 'm3h': return 'м³/ч';
    case 'm3d': return 'м³/сут';
    default: return unit;
  }
};

// Функция для получения метки статуса
export const getStatusLabel = (status: TCStatus): string => {
  switch (status) {
    case 'active': return 'Активный';
    case 'expired': return 'Истекший';
    case 'cancelled': return 'Отмененный';
    default: return status;
  }
};

export const getObjectTypeLabel = (type: ObjectType): string => {
  switch (type) {
    case 'substation': return 'Подстанция';
    case 'tp': return 'ТП';
    case 'kru': return 'КРУ';
    case 'vl': return 'ВЛ';
    case 'kl': return 'КЛ';
    default: return type;
  }
};

// Функция для получения метки типа ресурса
export const getResourceTypeLabel = (type: ResourceType): string => {
  switch (type) {
    case 'electricity': return 'Электроснабжение';
    case 'water': return 'Водоснабжение';
    default: return type;
  }
};

// Функция для получения метки типа ТУ
export const getTCTypeLabel = (type: TCType): string => {
  switch (type) {
    case 'permanent': return 'Постоянное';
    case 'temporary': return 'Временное';
    default: return type;
  }
};

// Форматирование мощности для отображения
export const formatPower = (amount: number, resourceType: ResourceType, unit?: PowerUnit): string => {
  if (resourceType === 'electricity') {
    if (unit === 'mw' || (unit === 'kw' && amount >= 1000)) {
      const value = unit === 'mw' ? amount : amount / 1000;
      return `${value.toFixed(2)} МВт`;
    }
    return `${amount.toFixed(2)} кВт`;
  } else {
    if (unit === 'm3d') {
      return `${amount.toFixed(2)} м³/сут`;
    }
    return `${amount.toFixed(2)} м³/ч`;
  }
};

// Форматирование даты для отображения
export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Проверка, истекает ли ТУ скоро (в течение N дней)
export const isExpiringSoon = (tc: TechnicalCondition, days: number = 30): boolean => {
  if (!tc.expiry_date || tc.tc_type === 'permanent') return false;
  const now = new Date();
  const expiry = new Date(tc.expiry_date);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= days && diffDays >= 0;
};

// Получение количества дней до истечения ТУ
export const getDaysUntilExpiry = (tc: TechnicalCondition): number | null => {
  if (!tc.expiry_date || tc.tc_type === 'permanent') return null;
  const now = new Date();
  const expiry = new Date(tc.expiry_date);
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Доступные единицы измерения для типа ресурса
export const getAvailableUnitsForResource = (resourceType: ResourceType): PowerUnit[] => {
  switch (resourceType) {
    case 'electricity':
      return ['kw', 'mw'];
    case 'water':
      return ['m3h', 'm3d'];
    default:
      return [];
  }
};

// Валидация соответствия единицы измерения типу ресурса
export const isValidPowerUnit = (resourceType: ResourceType, unit: PowerUnit): boolean => {
  switch (resourceType) {
    case 'electricity':
      return unit === 'kw' || unit === 'mw';
    case 'water':
      return unit === 'm3h' || unit === 'm3d';
    default:
      return false;
  }
};