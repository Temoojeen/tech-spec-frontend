'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTC } from '@/hooks/useTC';
import TCTable from '@/components/tc/TCTable';
import { 
  TCType, 
  TCStatus, 
  TechnicalCondition,
} from '@/types'; // Импорт из правильного места
import styles from './page.module.scss';
import Header from '@/components/Header/Header';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function ElectricityPage() {
  const { isAuthenticated, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<TCType>('permanent');
  const [statusFilter, setStatusFilter] = useState<TCStatus | 'all'>('all');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [objectFilter, setObjectFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: tcList, isLoading: tcLoading, error: tcError } = useTC('electricity', selectedType);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth state:', { isAuthenticated, authLoading });
    }
    
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Мемоизированная фильтрация данных
  const filteredTCs = useMemo(() => {
    return tcList?.filter((tc: TechnicalCondition) => {
      // Фильтр по статусу
      if (statusFilter !== 'all' && tc.status !== statusFilter) {
        return false;
      }
      
      // Фильтр по организации
      if (organizationFilter && !tc.organization_name?.toLowerCase().includes(organizationFilter.toLowerCase())) {
        return false;
      }
      
      // Фильтр по объектам
      if (objectFilter && !tc.object_name?.toLowerCase().includes(objectFilter.toLowerCase())) {
        return false;
      }
      
      // Фильтр по дате начала
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        const issueDate = new Date(tc.issue_date);
        if (!isNaN(fromDate.getTime()) && issueDate < fromDate) {
          return false;
        }
      }
      
      // Фильтр по дате окончания
      if (dateTo) {
        const toDate = new Date(dateTo);
        const issueDate = new Date(tc.issue_date);
        if (!isNaN(toDate.getTime()) && issueDate > toDate) {
          return false;
        }
      }
      
      return true;
    }) || [];
  }, [tcList, statusFilter, organizationFilter, objectFilter, dateFrom, dateTo]);

  // Функция для экспорта в Excel
  const exportToExcel = async () => {
    try {
      setIsExporting(true);

      // Подготовка данных для экспорта
      const exportData = filteredTCs.map((tc: TechnicalCondition) => ({
        'Организация': tc.organization_name || '-',
        'Номер ТУ': tc.tc_number || '-',
        'Объект': tc.object_name || '-',
        'Дата выдачи': tc.issue_date ? new Date(tc.issue_date).toLocaleDateString('ru-RU') : '-',
        'Дата окончания': tc.expiry_date ? new Date(tc.expiry_date).toLocaleDateString('ru-RU') : 'Постоянный',
        'Статус': getStatusLabel(tc.status),
        'Мощность (кВт)': tc.power_amount || '-',
        'Примечание': tc.notes || '-'
      }));

      // Создание рабочей книги
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Настройка ширины колонок
      const colWidths = [
        { wch: 0 }, // Организация
        { wch: 20 }, // Номер ТУ
        { wch: 40 }, // Объект
        { wch: 15 }, // Дата выдачи
        { wch: 15 }, // Дата окончания
        { wch: 15 }, // Статус
        { wch: 15 }, // Мощность
        { wch: 30 }, // Примечание
      ];
      ws['!cols'] = colWidths;

      // Добавление листа в книгу
      const fileName = `электроснабжение_${selectedType === 'permanent' ? 'постоянные' : 'временные'}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
      XLSX.utils.book_append_sheet(wb, ws, 'ТУ по электроснабжению');

      // Генерация и сохранение файла
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(data, fileName);

    } catch (error) {
      console.error('Ошибка при экспорте в Excel:', error);
      alert('Произошла ошибка при выгрузке данных. Пожалуйста, попробуйте снова.');
    } finally {
      setIsExporting(false);
    }
  };

  // Функция для экспорта всех данных (без фильтров)
  const exportAllToExcel = async () => {
    try {
      setIsExporting(true);

      const exportData = (tcList || []).map((tc: TechnicalCondition) => ({
        'Организация': tc.organization_name || '-',
        'Номер ТУ': tc.tc_number || '-',
        'Объект': tc.object_name || '-',
        'Дата выдачи': tc.issue_date ? new Date(tc.issue_date).toLocaleDateString('ru-RU') : '-',
        'Дата окончания': tc.expiry_date ? new Date(tc.expiry_date).toLocaleDateString('ru-RU') : 'Постоянный',
        'Статус': getStatusLabel(tc.status),
        'Мощность (кВт)': tc.power_amount || '-',
        'Примечание': tc.notes || '-'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 40 }, 
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }
      ];

      const fileName = `электроснабжение_все_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`;
      XLSX.utils.book_append_sheet(wb, ws, 'Все ТУ по электроснабжению');
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(data, fileName);

    } catch (error) {
      console.error('Ошибка при экспорте в Excel:', error);
      alert('Произошла ошибка при выгрузке данных. Пожалуйста, попробуйте снова.');
    } finally {
      setIsExporting(false);
    }
  };

  // Вспомогательная функция для получения текста статуса
  const getStatusLabel = (status: TCStatus): string => {
    const statusMap: Record<TCStatus, string> = {
      active: 'Активный',
      expired: 'Истекший',
      cancelled: 'Отмененный'
    };
    return statusMap[status] || status;
  };

  // Сброс фильтров
  const resetFilters = () => {
    setStatusFilter('all');
    setOrganizationFilter('');
    setObjectFilter('');
    setDateFrom('');
    setDateTo('');
  };

  // Подсчет активных фильтров
  const activeFiltersCount = [
    statusFilter !== 'all',
    !!organizationFilter,
    !!objectFilter,
    !!dateFrom,
    !!dateTo
  ].filter(Boolean).length;

  // Обработка ошибок
  if (tcError) {
    return (
      <div className={styles.error}>
        <h2>Ошибка загрузки данных</h2>
        <p>{tcError.message}</p>
        <button onClick={() => window.location.reload()} className={styles.retryButton}>
          Повторить попытку
        </button>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Header/>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Электроснабжение</h1>
          <div className={styles.headerActions}>
            <button 
              className={styles.filterToggle}
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="filters-panel"
            >
              {showFilters ? '🔽' : '▶️'} Фильтры
              {activeFiltersCount > 0 && !showFilters && (
                <span className={styles.filterBadge}>{activeFiltersCount}</span>
              )}
            </button>
            
            {/* Кнопки экспорта */}
            <div className={styles.exportButtons}>
              <button
                onClick={exportToExcel}
                disabled={isExporting || filteredTCs.length === 0}
                className={styles.exportButton}
                title="Выгрузить отфильтрованные данные"
              >
                {isExporting ? '⏳' : '📥'} Excel (отфильтрованные)
              </button>
              <button
                onClick={exportAllToExcel}
                disabled={isExporting || !tcList?.length}
                className={styles.exportButton}
                title="Выгрузить все данные"
              >
                {isExporting ? '⏳' : '📥'} Excel 
              </button>
            </div>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${selectedType === 'permanent' ? styles.active : ''}`}
            onClick={() => setSelectedType('permanent')}
          >
            Постоянные ТУ
          </button>
          <button
            className={`${styles.tab} ${selectedType === 'temporary' ? styles.active : ''}`}
            onClick={() => setSelectedType('temporary')}
          >
            Временные ТУ
          </button>
        </div>

        {/* Панель фильтров */}
        {showFilters && (
          <div id="filters-panel" className={styles.filtersPanel}>
            <h3 className={styles.filtersTitle}>Фильтры</h3>
            
            <div className={styles.filtersGrid}>
              {/* Фильтр по статусу */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Статус:</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TCStatus | 'all')}
                  className={styles.filterSelect}
                >
                  <option value="all">Все статусы</option>
                  <option value="active">Активные</option>
                  <option value="expired">Истекшие</option>
                  <option value="cancelled">Отмененные</option>
                </select>
              </div>

              {/* Фильтр по организации */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Организация:</label>
                <input
                  type="text"
                  value={organizationFilter}
                  onChange={(e) => setOrganizationFilter(e.target.value)}
                  placeholder="Введите название..."
                  className={styles.filterInput}
                />
              </div>

              {/* Фильтр по объектам */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Объект:</label>
                <input
                  type="text"
                  value={objectFilter}
                  onChange={(e) => setObjectFilter(e.target.value)}
                  placeholder="Введите название..."
                  className={styles.filterInput}
                />
              </div>

              {/* Фильтр по дате с */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Дата с:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={styles.filterInput}
                />
              </div>

              {/* Фильтр по дате по */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Дата по:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={styles.filterInput}
                />
              </div>
            </div>

            <div className={styles.filterActions}>
              <button onClick={resetFilters} className={styles.resetButton}>
                Сбросить фильтры
              </button>
              <span className={styles.resultsCount}>
                Найдено: {filteredTCs.length}
              </span>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className={styles.actions}>
            <Link href="/admin/tc-management/create" className={styles.createButton}>
              + Создать новое ТУ
            </Link>
          </div>
        )}

        <TCTable
          data={filteredTCs}
          isLoading={tcLoading}
          resourceType="electricity"
          tcType={selectedType}
        />
      </main>
    </div>
  );
}