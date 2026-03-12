'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { TechnicalCondition, PowerObject } from '@/types';
import Header from '@/components/Header/Header';
import styles from './page.module.scss';
import SideBar from '@/components/SideBar/SideBar';

/* ===================== TYPES ===================== */

interface ObjectStats {
  object: PowerObject;
  issuedPower: number;        // Выданная мощность в базовых единицах (кВт или м³/ч)
  issuedPowerUnit: string;    // Единица измерения выданной мощности
  freePower: number;          // Свободная мощность
  freePowerUnit: string;      // Единица измерения свободной мощности
  totalPower: number;         // Общая мощность в удобных единицах
  totalPowerUnit: string;     // Единица общей мощности
  usagePercent: number;       // Процент загрузки
  totalTC: number;            // Всего ТУ
  activeTC: number;           // Активных ТУ
}

type ObjectTypeConfig = {
  icon: string;
  color: string;
};

/* ===================== CONFIG ===================== */

const OBJECT_TYPE_CONFIG: Record<string, ObjectTypeConfig> = {
  substation: {
    icon: '⚡',
    color: '#3b82f6',
  },
  tp: {
    icon: '🔧',
    color: '#10b981',
  },
  kru: {
    icon: '⚙️',
    color: '#f59e0b',
  },
};

/* ===================== PAGE ===================== */

export default function DashboardPage() {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const router = useRouter();

  /* ---------- QUERIES ---------- */
  const { data: objects, isLoading: objectsLoading } = useQuery({
    queryKey: ['objects'],
    queryFn: async () => {
      const res = await api.get<PowerObject[]>('/objects/');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: allTCs, isLoading: tcLoading } = useQuery({
    queryKey: ['technical-conditions'],
    queryFn: async () => {
      const res = await api.get<TechnicalCondition[]>('/technical-conditions');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  /* ---------- AUTH REDIRECT ---------- */
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  /* ---------- CALCULATIONS ---------- */
  const objectStats = useMemo<ObjectStats[]>(() => {
    if (!objects || !allTCs) return [];

    return objects
      .filter(obj => obj && obj.id) // Фильтруем объекты без id
      .map(object => {
        const objectTCs = allTCs.filter(tc => tc.object_id === object.id);
        const activeTCs = objectTCs.filter(tc => tc.status === 'active');

        // Расчет в базовых единицах (кВт для электричества, м³/ч для воды)
        let issuedPower = 0;
        let totalPower = 0;
        let totalPowerUnit = '';
        let issuedPowerUnit = '';

        if (object.resource_type === 'electricity') {
          // Для электричества базовая единица - кВт
          issuedPower = activeTCs.reduce((sum, tc) => {
            if (tc.power_unit === 'mw') {
              return sum + (tc.power_amount || 0) * 1000;
            }
            return sum + (tc.power_amount || 0);
          }, 0);
          
          totalPower = object.max_power_electricity_kw || 0;
          
          // Определяем удобные единицы для отображения
          if (totalPower >= 1000) {
            totalPowerUnit = 'МВт';
            totalPower = object.max_power_electricity_mw || 0;
            issuedPower = issuedPower / 1000;
            issuedPowerUnit = 'МВт';
          } else {
            totalPowerUnit = 'кВт';
            issuedPowerUnit = 'кВт';
          }
        } else {
          // Для воды базовая единица - м³/ч
          issuedPower = activeTCs.reduce((sum, tc) => {
            if (tc.power_unit === 'm3d') {
              return sum + (tc.power_amount || 0) / 24;
            }
            return sum + (tc.power_amount || 0);
          }, 0);
          
          totalPower = object.max_power_water_m3h || 0;
          totalPowerUnit = 'м³/ч';
          issuedPowerUnit = 'м³/ч';
        }

        const freePower = Math.max(0, totalPower - issuedPower);
        const usagePercent = totalPower > 0 ? Math.min(100, (issuedPower / totalPower) * 100) : 0;

        return {
          object,
          issuedPower,
          issuedPowerUnit,
          freePower,
          freePowerUnit: issuedPowerUnit,
          totalPower,
          totalPowerUnit,
          usagePercent,
          totalTC: objectTCs.length,
          activeTC: activeTCs.length,
        };
      });
  }, [objects, allTCs]);

  // Общая статистика
  const totalStats = useMemo(() => {
    if (!objectStats.length) return null;

    return {
      totalObjects: objectStats.length,
      totalActiveTC: objectStats.reduce((sum, stat) => sum + stat.activeTC, 0),
      totalIssuedPower: objectStats.reduce((sum, stat) => sum + stat.issuedPower, 0),
      averageUsage: objectStats.reduce((sum, stat) => sum + stat.usagePercent, 0) / objectStats.length,
    };
  }, [objectStats]);

  /* ---------- STATES ---------- */
  if (loading || objectsLoading || tcLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Загрузка данных...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  /* ---------- RENDER ---------- */
  return (
    <div className={styles.dashboardLayout}>
      <Header />
      <SideBar />
      
      <main className={styles.main}>
        {/* Заголовок */}
        <div className={styles.header}>
          <h1 className={styles.title}>Панель управления</h1>
          {totalStats && (
            <div className={styles.statsSummary}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{totalStats.totalObjects}</span>
                <span className={styles.statLabel}>Объектов</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{totalStats.totalActiveTC}</span>
                <span className={styles.statLabel}>Активных ТУ</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{totalStats.averageUsage.toFixed(1)}%</span>
                <span className={styles.statLabel}>Средняя загрузка</span>
              </div>
            </div>
          )}
        </div>

        {/* Статистика по объектам */}
        <div className={styles.objectsSection}>
          <h2 className={styles.sectionTitle}>Статистика по объектам</h2>
          <div className={styles.objectsGrid}>
            {objectStats.map(stats => {
              const config = OBJECT_TYPE_CONFIG[stats.object.type] || {
                icon: '📦',
                color: '#6b7280',
              };

              return (
                <div
                  key={stats.object.id}
                  className={styles.objectCard}
                >
                  <div className={styles.objectHeader}>
                    <span className={styles.objectIcon}>{config.icon}</span>
                    <h3 className={styles.objectName}>{stats.object.name}</h3>
                    <span className={styles.objectType}>
                      {stats.object.type === 'substation' && 'Подстанция'}
                      {stats.object.type === 'tp' && 'ТП'}
                      {stats.object.type === 'kru' && 'КРУ'}
                    </span>
                  </div>

                  <div className={styles.objectStats}>
                    <div className={styles.statRow}>
                      <span className={styles.statName}>Общая мощность:</span>
                      <span className={styles.statValue}>
                        {stats.totalPower.toFixed(2)} {stats.totalPowerUnit}
                      </span>
                    </div>
                    
                    <div className={styles.statRow}>
                      <span className={styles.statName}>Выдано:</span>
                      <span className={styles.statValue}>
                        {stats.issuedPower.toFixed(2)} {stats.issuedPowerUnit}
                      </span>
                    </div>
                    
                    <div className={styles.statRow}>
                      <span className={styles.statName}>Свободно:</span>
                      <span className={`${styles.statValue} ${styles.freePower}`}>
                        {stats.freePower.toFixed(2)} {stats.freePowerUnit}
                      </span>
                    </div>

                    <div className={styles.tcStats}>
                      <span className={styles.tcBadge}>
                        Всего ТУ: {stats.totalTC}
                      </span>
                      <span className={`${styles.tcBadge} ${styles.activeBadge}`}>
                        Активных: {stats.activeTC}
                      </span>
                    </div>
                  </div>

                  <div className={styles.progressSection}>
                    <div className={styles.progressHeader}>
                      <span className={styles.progressLabel}>Загрузка</span>
                      <span className={styles.progressPercent}>
                        {stats.usagePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${stats.usagePercent}%`,
                          backgroundColor: config.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles.resourceBadge}>
                    {stats.object.resource_type === 'electricity' ? '⚡' : '💧'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Навигационные карточки */}
        <div className={styles.navigationSection}>
          <h2 className={styles.sectionTitle}>Быстрый переход</h2>
          <div className={styles.navCards}>
            <Link href="/electricity" className={styles.navCard}>
              <div className={styles.navCardIcon}>⚡</div>
              <div className={styles.navCardContent}>
                <h3 className={styles.navCardTitle}>Электроснабжение</h3>
                <p className={styles.navCardDescription}>
                  Управление ТУ по электроснабжению
                </p>
              </div>
            </Link>

            <Link href="/water" className={styles.navCard}>
              <div className={styles.navCardIcon}>💧</div>
              <div className={styles.navCardContent}>
                <h3 className={styles.navCardTitle}>Водоснабжение</h3>
                <p className={styles.navCardDescription}>
                  Управление ТУ по водоснабжению
                </p>
              </div>
            </Link>

            {isAdmin && (
              <Link href="/admin/objects" className={styles.navCard}>
                <div className={styles.navCardIcon}>🏭</div>
                <div className={styles.navCardContent}>
                  <h3 className={styles.navCardTitle}>Управление объектами</h3>
                  <p className={styles.navCardDescription}>
                    Добавление и редактирование объектов
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}