'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { PowerObjectWithStats, ResourceType, getObjectTypeLabel, getResourceTypeLabel } from '@/types';
import styles from './page.module.scss';
import Header from '@/components/Header/Header';

export default function ObjectsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [resourceFilter, setResourceFilter] = useState<ResourceType | 'all'>('all');

  const { data: objects, isLoading } = useQuery({
    queryKey: ['objects', resourceFilter],
    queryFn: async () => {
      const url = resourceFilter !== 'all' 
        ? `/objects/?resource_type=${resourceFilter}&with_stats=true`
        : '/objects/?with_stats=true';
      const response = await api.get<PowerObjectWithStats[]>(url);
      return response.data;
    },
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/objects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects'] });
    },
  });

  // Фильтрация по поиску
  const filteredObjects = objects?.filter(obj => 
    obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getObjectTypeLabel(obj.type).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (obj.description && obj.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Получение отображаемой мощности объекта
  const getDisplayPower = (obj: PowerObjectWithStats): { value: number; unit: string } => {
    if (obj.resource_type === 'electricity') {
      if (obj.max_power_electricity_mw && obj.max_power_electricity_mw >= 1) {
        return { value: obj.max_power_electricity_mw, unit: 'МВт' };
      }
      return { value: obj.max_power_electricity_kw || 0, unit: 'кВт' };
    } else {
      return { value: obj.max_power_water_m3h || 0, unit: 'м³/ч' };
    }
  };

  // Получение иконки для типа объекта
  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'substation': return '⚡';
      case 'tp': return '🔧';
      case 'kru': return '⚙️';
      case 'vl': return '🔌';
      case 'kl': return '🔗';
      default: return '📦';
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <Header/>
      
      <div className={styles.header}>
        <h1 className={styles.title}>Управление объектами</h1>
        {isAdmin &&
        <Link href="/admin/objects/create" className={styles.createButton}>
          + Добавить объект
        </Link>}
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value as ResourceType | 'all')}
            className={styles.filterSelect}
          >
            <option value="all">Все типы ресурсов</option>
            <option value="electricity">⚡ Электроснабжение</option>
            <option value="water">💧 Водоснабжение</option>
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>Тип</th>
              <th className={styles.th}>Название</th>
              <th className={styles.th}>Тип ресурса</th>
              <th className={styles.th}>Мощность</th>
              <th className={styles.th}>Ячейки</th>
              <th className={styles.th}>Загрузка</th>
              {isAdmin &&
              <th className={styles.th}>Действия</th>}
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {filteredObjects?.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.noData}>
                  Нет объектов для отображения
                </td>
              </tr>
            ) : (
              filteredObjects?.map((obj) => {
                const displayPower = getDisplayPower(obj);
                return (
                  <tr key={obj.id} className={styles.tr}>
                    <td className={styles.td}>{obj.id}</td>
                    <td className={styles.td}>
                      <span className={`${styles.typeBadge} ${styles[obj.type]}`}>
                        {getTypeIcon(obj.type)} {getObjectTypeLabel(obj.type)}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {obj.name}
                      {obj.parent_id && (
                        <span className={styles.childIndicator}> </span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.resourceBadge} ${styles[obj.resource_type]}`}>
                        {obj.resource_type === 'electricity' ? '⚡' : '💧'} {getResourceTypeLabel(obj.resource_type)}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.powerValue}>
                        {displayPower.value.toFixed(2)} {displayPower.unit}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {(obj.type === 'tp' || obj.type === 'kru') ? (
                        <div className={styles.cellsInfo}>
                          <span className={`${styles.cellsBadge} ${
                            obj.available_cells > 0 ? styles.hasFree : styles.noFree
                          }`}>
                            {obj.available_cells}/{obj.total_cells}
                          </span>
                          <span className={styles.cellsLabel}>свободно</span>
                          {obj.available_cells === 0 && obj.free_power > 0 && (
                            <span className={styles.canAddCells} title="Можно добавить ячейки">
                              ⚠️ {obj.free_power.toFixed(1)} {obj.free_power_unit} свободно
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className={styles.noCells}>—</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <div className={styles.loadingInfo}>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill}
                            style={{ width: `${obj.usage_percent || 0}%` }}
                          />
                        </div>
                        <span className={styles.usagePercent}>
                          {(obj.usage_percent || 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    {isAdmin &&
                    <td className={styles.td}>
                      <Link 
                        href={`/admin/objects/${obj.id}/edit`} 
                        className={styles.editButton}
                      >
                        Редактировать
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm('Вы уверены, что хотите удалить этот объект?')) {
                            deleteMutation.mutate(obj.id);
                          }
                        }}
                        className={styles.deleteButton}
                      >
                        Удалить
                      </button>
                    </td>}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Статистика */}
      {objects && objects.length > 0 && (
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Всего объектов:</span>
            <span className={styles.statValue}>{objects.length}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>⚡ Электроснабжение:</span>
            <span className={styles.statValue}>
              {objects.filter(obj => obj.resource_type === 'electricity').length}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>💧 Водоснабжение:</span>
            <span className={styles.statValue}>
              {objects.filter(obj => obj.resource_type === 'water').length}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Подстанции:</span>
            <span className={styles.statValue}>
              {objects.filter(obj => obj.type === 'substation').length}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>ТП/КРУ:</span>
            <span className={styles.statValue}>
              {objects.filter(obj => obj.type === 'tp' || obj.type === 'kru').length}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>ВЛ/КЛ:</span>
            <span className={styles.statValue}>
              {objects.filter(obj => obj.type === 'vl' || obj.type === 'kl').length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}