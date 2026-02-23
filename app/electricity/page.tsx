'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTC } from '@/hooks/useTC';
import TCTable from '@/components/tc/TCTable';
import { TCType, TCStatus } from '@/types';
import styles from './page.module.scss';
import Header from '@/components/Header/Header';

export default function ElectricityPage() {
  const { isAuthenticated, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<TCType>('permanent');
  const [statusFilter, setStatusFilter] = useState<TCStatus | 'all'>('all');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: tcList, isLoading: tcLoading } = useTC('electricity', selectedType);

  useEffect(() => {
    console.log('Auth state:', { isAuthenticated, authLoading });
    
    if (!authLoading) {
      if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
      }
    }
  }, [isAuthenticated, authLoading, router]);

  // Фильтрация данных
  const filteredTCs = tcList?.filter(tc => {
    // Фильтр по статусу
    if (statusFilter !== 'all' && tc.status !== statusFilter) {
      return false;
    }
    
    // Фильтр по организации
    if (organizationFilter && !tc.organization_name.toLowerCase().includes(organizationFilter.toLowerCase())) {
      return false;
    }
    
    // Фильтр по дате начала
    if (dateFrom && new Date(tc.issue_date) < new Date(dateFrom)) {
      return false;
    }
    
    // Фильтр по дате окончания
    if (dateTo && new Date(tc.issue_date) > new Date(dateTo)) {
      return false;
    }
    
    return true;
  });

  // Сброс фильтров
  const resetFilters = () => {
    setStatusFilter('all');
    setOrganizationFilter('');
    setDateFrom('');
    setDateTo('');
  };

  if (authLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
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
          <button 
            className={styles.filterToggle}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? '🔽 Скрыть фильтры' : '▶️ Показать фильтры'}
          </button>
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
          <div className={styles.filtersPanel}>
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
                Найдено: {filteredTCs?.length || 0}
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
          data={filteredTCs || []}
          isLoading={tcLoading}
          resourceType="electricity"
          tcType={selectedType}
        />
      </main>
    </div>
  );
}