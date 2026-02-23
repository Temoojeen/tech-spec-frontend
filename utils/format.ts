import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Форматирует дату в русский формат (ДД.ММ.ГГГГ)
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd.MM.yyyy', { locale: ru });
  } catch (error) {
    console.error('Ошибка форматирования даты:', error);
    return '-';
  }
}

/**
 * Форматирует дату с временем
 */
export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd.MM.yyyy HH:mm', { locale: ru });
  } catch (error) {
    console.error('Ошибка форматирования даты:', error);
    return '-';
  }
}

/**
 * Форматирует число мощности с единицей измерения
 */
export function formatPower(amount: number, resourceType: 'electricity' | 'water'): string {
  const unit = resourceType === 'electricity' ? 'кВт' : 'м³/ч';
  return `${amount} ${unit}`;
}

/**
 * Форматирует статус ТУ
 */
export function formatTCStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'Действует',
    expired: 'Истекло',
    cancelled: 'Отменено',
  };
  
  return statusMap[status] || status;
}

/**
 * Форматирует тип ТУ
 */
export function formatTCType(type: string): string {
  return type === 'permanent' ? 'Постоянное' : 'Временное';
}

/**
 * Форматирует тип ресурса
 */
export function formatResourceType(type: string): string {
  return type === 'electricity' ? 'Электроснабжение' : 'Водоснабжение';
}