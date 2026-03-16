'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';

import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { TechnicalCondition, PowerObject } from '@/types';
import Header from '@/components/Header/Header';
import styles from './page.module.scss';
import SideBar from '@/components/SideBar/SideBar';
import Image from 'next/image';

/* ===================== TYPES ===================== */

// Определяем допустимые типы ресурсов
type ObjectType = 'substation' | 'tp' | 'kru';

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
  totalCells: number;         // Всего ячеек (для ТП/КРУ)
  occupiedCells: number;      // Занятых ячеек
  availableCells: number;     // Свободных ячеек
}

interface DashboardStats {
  totalObjects: number;
  totalSubstations: number;
  totalTPKRU: number;
  totalActiveTC: number;
  totalIssuedPower: number;
  averageUsage: number;
  totalCells: number;
  totalOccupiedCells: number;
  totalAvailableCells: number;
}

interface ObjectTypeConfig {
  icon: string;
  color: string;
  label: string;
}


type ChartData = {
  name: string;
  usage: number;
  free: number;
};

type TypeData = {
  name: string;
  value: number;
};

/* ===================== CONFIG ===================== */

const OBJECT_TYPE_CONFIG: Record<ObjectType, ObjectTypeConfig> = {
  substation: {
    icon: '⚡',
    color: '#3b82f6',
    label: 'Подстанция',
  },
  tp: {
    icon: '🔧',
    color: '#10b981',
    label: 'ТП',
  },
  kru: {
    icon: '⚙️',
    color: '#f59e0b',
    label: 'КРУ',
  },
};


const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

/* ===================== PAGE ===================== */

export default function DashboardPage() {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const router = useRouter();
  
  /* ---------- LOCAL STATE ---------- */
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterResource, setFilterResource] = useState<string>('all');

  /* ---------- QUERIES ---------- */
  const { 
    data: objects, 
    isLoading: objectsLoading, 
    error: objectsError,
    refetch: refetchObjects 
  } = useQuery({
    queryKey: ['objects'],
    queryFn: async () => {
      const res = await api.get<PowerObject[]>('/objects/?with_stats=true');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { 
    data: allTCs, 
    isLoading: tcLoading, 
    error: tcError,
    refetch: refetchTCs 
  } = useQuery({
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

  /* ---------- HELPER FUNCTIONS ---------- */
  const calculatePowerStats = useCallback((object: PowerObject, activeTCs: TechnicalCondition[]) => {
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

    return { issuedPower, issuedPowerUnit, totalPower, totalPowerUnit };
  }, []);

  const calculateCellStats = useCallback((object: PowerObject, activeTCs: TechnicalCondition[]) => {
    const occupiedCells = new Set(activeTCs.map(tc => tc.cell_number)).size;
    const availableCells = object.type !== 'substation' ? object.total_cells - occupiedCells : 0;
    
    return { occupiedCells, availableCells };
  }, []);

  /* ---------- CALCULATIONS ---------- */
  const objectStats = useMemo<ObjectStats[]>(() => {
    if (!objects || !allTCs) return [];

    return objects
      .filter(obj => obj?.id)
      .map(object => {
        const objectTCs = allTCs.filter(tc => tc.object_id === object.id);
        const activeTCs = objectTCs.filter(tc => tc.status === 'active');

        const powerStats = calculatePowerStats(object, activeTCs);
        const cellStats = calculateCellStats(object, activeTCs);

        const freePower = Math.max(0, powerStats.totalPower - powerStats.issuedPower);
        const usagePercent = powerStats.totalPower > 0 
          ? Math.min(100, (powerStats.issuedPower / powerStats.totalPower) * 100) 
          : 0;

        return {
          object,
          ...powerStats,
          freePower,
          freePowerUnit: powerStats.issuedPowerUnit,
          usagePercent,
          totalTC: objectTCs.length,
          activeTC: activeTCs.length,
          totalCells: object.total_cells,
          ...cellStats,
        };
      });
  }, [objects, allTCs, calculatePowerStats, calculateCellStats]);

  // Фильтрованные объекты
  const filteredStats = useMemo(() => {
    return objectStats.filter(stat => {
      const matchesSearch = stat.object.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || stat.object.type === filterType;
      const matchesResource = filterResource === 'all' || stat.object.resource_type === filterResource;
      return matchesSearch && matchesType && matchesResource;
    });
  }, [objectStats, searchTerm, filterType, filterResource]);

  // Общая статистика
  const totalStats = useMemo<DashboardStats | null>(() => {
    if (!filteredStats.length) return null;

    const totalObjects = filteredStats.length;
    const totalSubstations = filteredStats.filter(s => s.object.type === 'substation').length;
    const totalTPKRU = filteredStats.filter(s => s.object.type !== 'substation').length;
    const totalActiveTC = filteredStats.reduce((sum, stat) => sum + stat.activeTC, 0);
    const totalIssuedPower = filteredStats.reduce((sum, stat) => sum + stat.issuedPower, 0);
    const averageUsage = filteredStats.reduce((sum, stat) => sum + stat.usagePercent, 0) / filteredStats.length;
    const totalCells = filteredStats.reduce((sum, stat) => sum + stat.totalCells, 0);
    const totalOccupiedCells = filteredStats.reduce((sum, stat) => sum + stat.occupiedCells, 0);
    const totalAvailableCells = totalCells - totalOccupiedCells;

    return {
      totalObjects,
      totalSubstations,
      totalTPKRU,
      totalActiveTC,
      totalIssuedPower,
      averageUsage,
      totalCells,
      totalOccupiedCells,
      totalAvailableCells,
    };
  }, [filteredStats]);


  /* ---------- RESET FILTERS ---------- */
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterType('all');
    setFilterResource('all');
  }, []);

  /* ---------- CHARTS DATA ---------- */
  const usageData = useMemo<ChartData[]>(() => {
    return filteredStats.map(stat => ({
      name: stat.object.name.length > 20 ? stat.object.name.substring(0, 20) + '...' : stat.object.name,
      usage: stat.usagePercent,
      free: 100 - stat.usagePercent,
    }));
  }, [filteredStats]);

  const typeData = useMemo<TypeData[]>(() => {
    const counts = filteredStats.reduce((acc, stat) => {
      const type = stat.object.type as ObjectType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<ObjectType, number>);

    return Object.entries(counts).map(([type, count]) => ({
      name: OBJECT_TYPE_CONFIG[type as ObjectType]?.label || type,
      value: count,
    }));
  }, [filteredStats]);

  // const resourceData = useMemo<TypeData[]>(() => {
  //   const counts = filteredStats.reduce((acc, stat) => {
  //     const resource = stat.object.resource_type as ResourceType;
  //     acc[resource] = (acc[resource] || 0) + 1;
  //     return acc;
  //   }, {} as Record<ResourceType, number>);

  //   return Object.entries(counts).map(([resource, count]) => ({
  //     name: RESOURCE_TYPE_CONFIG[resource as ResourceType]?.label || resource,
  //     value: count,
  //   }));
  // }, [filteredStats]);

  /* ---------- LOADING STATES ---------- */
  if (loading || objectsLoading || tcLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Загрузка данных...</p>
      </div>
    );
  }

  /* ---------- ERROR STATES ---------- */
  if (objectsError || tcError) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2>Ошибка загрузки данных</h2>
        <p>{(objectsError as Error)?.message || (tcError as Error)?.message}</p>
        <button 
          className={styles.retryButton}
          onClick={() => {
            refetchObjects();
            refetchTCs();
          }}
        >
          Повторить попытку
        </button>
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
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Обзорная страница</h1>
            
          </div>
          
          {totalStats && (
            <div className={styles.statsSummary}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{totalStats.totalObjects}</span>
                <span className={styles.statLabel}>Объектов</span>
                <span className={styles.statDetail}>
                  (ПС: {totalStats.totalSubstations}, ТП/КРУ: {totalStats.totalTPKRU})
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{totalStats.totalActiveTC}</span>
                <span className={styles.statLabel}>Активных ТУ</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{totalStats.averageUsage.toFixed(1)}%</span>
                <span className={styles.statLabel}>Средняя загрузка</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {totalStats.totalAvailableCells}/{totalStats.totalCells}
                </span>
                <span className={styles.statLabel}>Свободных ячеек</span>
              </div>
            </div>
          )}
        </div>

        {/* Поиск и фильтры */}
        <div className={styles.filtersSection}>
          <div className={styles.filters}>
            <input
              type="text"
              placeholder="🔍 Поиск по названию объекта..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Все типы объектов</option>
              <option value="substation">Подстанции</option>
              <option value="tp">ТП</option>
              <option value="kru">КРУ</option>
            </select>

            <select 
              value={filterResource} 
              onChange={(e) => setFilterResource(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Все ресурсы</option>
              <option value="electricity">Электричество</option>
              <option value="water">Вода</option>
            </select>

            {(searchTerm || filterType !== 'all' || filterResource !== 'all') && (
              <button 
                className={styles.resetButton}
                onClick={resetFilters}
              >
                ✕ Сбросить
              </button>
            )}
          </div>
        </div>

        {/* Статистика по объектам */}
        <div className={styles.objectsSection}>
          <h2 className={styles.sectionTitle}>
            Статистика по объектам 
            {searchTerm && ` (найдено: ${filteredStats.length})`}
          </h2>
          
          {filteredStats.length === 0 ? (
            <div className={styles.noResults}>
              <p>Объекты не найдены</p>
              <button onClick={resetFilters} className={styles.resetFiltersButton}>
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className={styles.objectsGrid}>
              {filteredStats.map(stats => {
                // Безопасное приведение типов
                const objectType = stats.object.type as ObjectType;
                
                const config = OBJECT_TYPE_CONFIG[objectType] || {
                  icon: '📦',
                  color: '#6b7280',
                  label: stats.object.type,
                };

                return (
                  <Link 
                    key={stats.object.id}
                    href={`/objects/${stats.object.id}`}
                    className={styles.objectCardLink}
                  >
                    <div
                      className={styles.objectCard}
                      style={{ borderTopColor: config.color }}
                    >
                      <div className={styles.objectHeader}>
                        <div className={styles.objectTitle}>
                          <span className={styles.objectIcon}>{config.icon}</span>
                          <h3 className={styles.objectName}>{stats.object.name}</h3>
                        </div>
                        <span className={styles.objectType}>
                          {config.label}
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

                        {/* Информация о ячейках для ТП/КРУ */}
                        {stats.object.type !== 'substation' && (
                          <div className={styles.statRow}>
                            <span className={styles.statName}>Ячейки:</span>
                            <span className={styles.statValue}>
                              <span className={styles.cellsInfo}>
                                {stats.availableCells > 0 ? (
                                  <span className={styles.cellsFree}>
                                    {stats.availableCells} свободно
                                  </span>
                                ) : (
                                  <span className={styles.cellsFull}>
                                    {stats.occupiedCells}/{stats.totalCells} занято
                                  </span>
                                )}
                              </span>
                            </span>
                          </div>
                        )}

                        <div className={styles.tcStats}>
                          <span className={styles.tcBadge}>
                            📋 Всего ТУ: {stats.totalTC}
                          </span>
                          <span className={`${styles.tcBadge} ${styles.activeBadge}`}>
                            ✅ Активных: {stats.activeTC}
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

                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

       <div className={styles.navigationSection}>
  <div className={styles.navCards}>
    <Link href="/electricity" className={styles.navCard}>
      <Image 
        width={300} 
        height={300} 
        src="https://ovikv.ru/new/img/proek393/06.jpg" 
        alt="Электроснабжение"
      />
      <span>Электроснабжение</span>
    </Link>
    
    <Link href="/water" className={styles.navCard}>
      <Image 
        width={300} 
        height={300} 
        src="https://thumbs.dreamstime.com/z/selfie-shots-family-couples-vector-detailed-character-proffesional-plumber-men-set-plumber-repair-professional-plumber-fixing-72189579.jpg" 
        alt="Водоснабжение"
      />
      <span>Водоснабжение</span>
    </Link>
  </div>
</div>
        {/* Графики */}
        {filteredStats.length > 0 && (
          <div className={styles.chartsSection}>
            <h2 className={styles.sectionTitle}>Аналитика</h2>
            <div className={styles.chartsGrid}>
              <div className={styles.chartCard}>
                <h3>Загрузка объектов</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      interval={0}
                      fontSize={12}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="usage" fill="#3b82f6" name="Загрузка %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className={styles.chartCard}>
                <h3>Распределение по типам</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
  <Pie
    data={typeData}
    cx="50%"
    cy="50%"
    labelLine={false}
    label={({ name, percent }) =>
      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
    }
    outerRadius={80}
    fill="#8884d8"
    dataKey="value"
  >
    {typeData.map((entry, index) => (
      <Cell
        key={`cell-${index}`}
        fill={CHART_COLORS[index % CHART_COLORS.length]}
      />
    ))}
  </Pie>

  <Tooltip />
</PieChart>
                </ResponsiveContainer>
              </div>

              {/* <div className={styles.chartCard}>
                <h3>Распределение по ресурсам</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
  <Pie
    data={resourceData}
    cx="50%"
    cy="50%"
    labelLine={false}
    label={({ name, percent }) =>
      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
    }
    outerRadius={80}
    fill="#8884d8"
    dataKey="value"
  >
    {resourceData.map((entry, index) => (
      <Cell
        key={`cell-${index}`}
        fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]}
      />
    ))}
  </Pie>

  <Tooltip />
</PieChart>
                </ResponsiveContainer>
              </div> */}
            </div>
          </div>
        )}


        {/* Навигационные карточки */}
        {isAdmin &&
        <div className={styles.navigationSection}>
          <h2 className={styles.sectionTitle}>Быстрый переход</h2>
          <div className={styles.navCards}>
            <Link href="/admin/objects" className={styles.navCard}>
              <div className={styles.navCardIcon}>🏭</div>
              <div className={styles.navCardContent}>
                <h3 className={styles.navCardTitle}>Объекты</h3>
                <p className={styles.navCardDescription}>
                  Управление подстанциями, ТП и КРУ
                </p>
              </div>
            </Link>

            <Link href="/admin/tc-management" className={styles.navCard}>
              <div className={styles.navCardIcon}>📋</div>
              <div className={styles.navCardContent}>
                <h3 className={styles.navCardTitle}>Технические условия</h3>
                <p className={styles.navCardDescription}>
                  Управление ТУ на подключение
                </p>
              </div>
            </Link>

            <Link href="/admin/organizations" className={styles.navCard}>
              <div className={styles.navCardIcon}>🏢</div>
              <div className={styles.navCardContent}>
                <h3 className={styles.navCardTitle}>Организации</h3>
                <p className={styles.navCardDescription}>
                  Управление организациями-заявителями
                </p>
              </div>
            </Link>

            {isAdmin && (
              <Link href="/admin/users" className={styles.navCard}>
                <div className={styles.navCardIcon}>👥</div>
                <div className={styles.navCardContent}>
                  <h3 className={styles.navCardTitle}>Пользователи</h3>
                  <p className={styles.navCardDescription}>
                    Управление пользователями системы
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>}
      </main>
    </div>
  );
}