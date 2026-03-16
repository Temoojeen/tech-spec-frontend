'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { 
  PowerObject, TechnicalCondition, Organization, 
  getTCStatusLabel
} from '@/types';
import Header from '@/components/Header/Header';
import styles from './page.module.scss';

/* ===================== TYPES ===================== */

interface ObjectStats {
  object_id: number;
  object_name: string;
  resource_type: string;
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

interface TCWithOrganization extends TechnicalCondition {
  organization_name: string;
}

interface CellInfo {
  cell_number: number;
  status: 'free' | 'occupied';
  tc?: TCWithOrganization;
}

/* ===================== HELPER FUNCTIONS ===================== */

const formatPower = (amount: number, resourceType: string, unit?: string): string => {
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

/* ===================== PAGE ===================== */

export default function ObjectDetailPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [showAddCellModal, setShowAddCellModal] = useState(false);
  const [additionalCells, setAdditionalCells] = useState(1);

  /* ---------- QUERIES ---------- */
  const { data: object, isLoading: objectLoading } = useQuery({
    queryKey: ['object', id],
    queryFn: async () => {
      const res = await api.get<PowerObject>(`/objects/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['object-stats', id],
    queryFn: async () => {
      const res = await api.get<ObjectStats>(`/objects/${id}/stats`);
      return res.data;
    },
    enabled: !!id,
  });
console.log(selectedCell)
  // Загружаем все ТУ для этого объекта
  const { data: tcs, isLoading: tcsLoading } = useQuery({
    queryKey: ['object-tcs', id],
    queryFn: async () => {
      const res = await api.get<TechnicalCondition[]>(`/technical-conditions/object/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Загружаем все организации одним запросом (используем публичный эндпоинт или тот же с правами)
  const { data: organizationsMap } = useQuery({
    queryKey: ['organizations-map'],
    queryFn: async () => {
      try {
        // Пробуем получить список организаций
        const res = await api.get<Organization[]>('/organizations/');
        // Создаем Map для быстрого поиска по ID
        return new Map(res.data.map(org => [org.id, org.name]));
      } catch (error) {
        console.error('Ошибка загрузки организаций:', error);
        return new Map<number, string>();
      }
    },
    enabled: !!id,
  });

  const { data: availableCells } = useQuery({
    queryKey: ['available-cells', id],
    
    queryFn: async () => {
      const res = await api.get<{ available_cells: number[] }>(`/objects/${id}/available-cells`);
      console.log(availableCells)
      return res.data.available_cells;
    },
    enabled: !!id && object?.type !== 'substation',
  });

  /* ---------- MUTATIONS ---------- */
  const addCellsMutation = useMutation({
    mutationFn: async (cells: number) => {
      await api.post(`/objects/${id}/add-cells`, { additional_cells: cells });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['object', id] });
      queryClient.invalidateQueries({ queryKey: ['object-stats', id] });
      queryClient.invalidateQueries({ queryKey: ['available-cells', id] });
      setShowAddCellModal(false);
    },
  });

  /* ---------- HELPER FUNCTIONS ---------- */
  const getCellStatus = (cellNumber: number): CellInfo => {
    if (!tcs || !organizationsMap) {
      return {
        cell_number: cellNumber,
        status: 'free',
      };
    }

    const tc = tcs.find(t => t.cell_number === cellNumber && t.status === 'active');
    
    if (tc) {
      const organizationName = organizationsMap.get(tc.organization_id) || 'Не найдено';
      
      return {
        cell_number: cellNumber,
        status: 'occupied',
        tc: {
          ...tc,
          organization_name: organizationName
        } as TCWithOrganization,
      };
    }
    
    return {
      cell_number: cellNumber,
      status: 'free',
    };
  };

  const getPowerDisplay = (tc: TechnicalCondition): string => {
    return formatPower(tc.power_amount, tc.resource_type, tc.power_unit);
  };

  const handleAddCells = () => {
    if (additionalCells > 0) {
      addCellsMutation.mutate(additionalCells);
    }
  };

  /* ---------- RENDER STATES ---------- */
  if (authLoading || objectLoading || statsLoading || tcsLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Загрузка данных...</p>
      </div>
    );
  }

  if (!object) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.error}>
          <h1>Объект не найден</h1>
          <Link href="/admin/objects" className={styles.backLink}>
            ← Вернуться к списку
          </Link>
        </div>
      </div>
    );
  }

  /* ---------- MAIN RENDER ---------- */
  return (
    <div className={styles.container}>
      <Header />
      
      <div className={styles.content}>
        {/* Шапка */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>
              {object.type === 'substation' && '⚡'}
              {object.type === 'tp' && '🔧'}
              {object.type === 'kru' && '⚙️'}
              {object.name}
            </h1>
          </div>
          <div className={styles.headerActions}>
            {isAdmin &&
            <Link 
              href={`/admin/objects/${id}/edit`} 
              className={styles.editButton}
            >
              Редактировать
            </Link>}
            {object.type !== 'substation' && (
                isAdmin &&
              <button
                onClick={() => setShowAddCellModal(true)}
                className={styles.addCellButton}
                disabled={stats?.free_power === 0}
                title={stats?.free_power === 0 ? 'Нет свободной мощности' : 'Добавить ячейки'}
              >
                 Добавить ячейки
              </button>
            )}
          </div>
        </div>

        {/* Информация об объекте */}
        <div className={styles.infoGrid}>

          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <h3>Мощность</h3>
            </div>
            <div className={styles.infoCardBody}>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Общая мощность:</span>
                  <span className={styles.statValue}>
                    {stats?.total_power.toFixed(2)} {stats?.display_unit}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Выдано:</span>
                  <span className={styles.statValue}>
                    {stats?.issued_power.toFixed(2)} {stats?.display_unit}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Свободно:</span>
                  <span className={`${styles.statValue} ${styles.freePower}`}>
                    {stats?.free_power.toFixed(2)} {stats?.display_unit}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Загрузка:</span>
                  <span className={styles.statValue}>
                    {stats?.usage_percent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${stats?.usage_percent || 0}%` }}
                />
              </div>
            </div>
          </div>

          {object.type !== 'substation' && (
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <h3>Ячейки</h3>
              </div>
              <div className={styles.infoCardBody}>
                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Всего ячеек:</span>
                    <span className={styles.statValue}>{object.total_cells}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Занято:</span>
                    <span className={styles.statValue}>{stats?.occupied_cells}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Свободно:</span>
                    <span className={`${styles.statValue} ${styles.freeCells}`}>
                      {stats?.available_cells}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Секция ячеек для ТП/КРУ */}
        {object.type !== 'substation' && object.total_cells > 0 && (
          <div className={styles.cellsSection}>
            <h2 className={styles.sectionTitle}>Ячейки</h2>
            
            <div className={styles.cellsGrid}>
              {Array.from({ length: object.total_cells }, (_, i) => i + 1).map(cellNum => {
                const cellInfo = getCellStatus(cellNum);
                
                return (
                  <div
                    key={cellNum}
                    className={`${styles.cellCard} ${styles[cellInfo.status]}`}
                    onClick={() => setSelectedCell(cellNum)}
                  >
                    <div className={styles.cellHeader}>
                      <span className={styles.cellNumber}>Ячейка №{cellNum}</span>
                      <span className={styles.cellStatus}>
                        {cellInfo.status === 'free' ? 'Свободна' : 'Занята'}
                      </span>
                    </div>
                    
                    {cellInfo.status === 'occupied' && cellInfo.tc && (
                      <div className={styles.cellContent}>
                        <div className={styles.cellTcInfo}>
                          <div className={styles.tcOrganization}>
                            {cellInfo.tc.organization_name}
                          </div>
                          <div className={styles.tcNumber}>
                            ТУ: {cellInfo.tc.tc_number}
                          </div>
                          <div className={styles.tcPower}>
                            Мощность: {getPowerDisplay(cellInfo.tc)}
                          </div>
                          <div className={styles.tcDate}>
                            Выдано: {new Date(cellInfo.tc.issue_date).toLocaleDateString('ru-RU')}
                          </div>
                          {cellInfo.tc.expiry_date && (
                            <div className={styles.tcDate}>
                              Действует до: {new Date(cellInfo.tc.expiry_date).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                          <div className={`${styles.tcStatus} ${styles[cellInfo.tc.status]}`}>
                            {getTCStatusLabel(cellInfo.tc.status)}
                          </div>
                        </div>
                        {isAdmin &&
                        <Link 
                          href={`/admin/tc-management/${cellInfo.tc.id}/edit`}
                          className={styles.tcEditLink}
                        >
                          Редактировать ТУ
                        </Link>}
                      </div>
                    )}
                    
                    {cellInfo.status === 'free' && (
                      <div className={styles.cellFree}>
                        {isAdmin &&
                        <Link
                          href={`/admin/tc-management/create?objectId=${id}&cellNumber=${cellNum}`}
                          className={styles.createTCLink}
                        >
                           Создать ТУ
                        </Link>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Модальное окно для добавления ячеек */}
        {showAddCellModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h3 className={styles.modalTitle}>Добавить ячейки</h3>
              
              <div className={styles.modalContent}>
                <p className={styles.modalInfo}>
                  Свободная мощность: {stats?.free_power.toFixed(2)} {stats?.display_unit}
                </p>
                
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>
                    Количество ячеек:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={additionalCells}
                    onChange={(e) => setAdditionalCells(parseInt(e.target.value) || 1)}
                    className={styles.modalInput}
                  />
                </div>
                
                <p className={styles.modalNote}>
                  После добавления ячеек они станут доступны для выдачи новых ТУ.
                </p>
              </div>
              
              <div className={styles.modalActions}>
                <button
                  onClick={handleAddCells}
                  disabled={addCellsMutation.isPending}
                  className={styles.modalSubmit}
                >
                  {addCellsMutation.isPending ? 'Добавление...' : 'Добавить'}
                </button>
                <button
                  onClick={() => setShowAddCellModal(false)}
                  className={styles.modalCancel}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}