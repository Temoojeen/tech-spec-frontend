'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { PowerObject, ResourceType, getObjectTypeLabel, getResourceTypeLabel } from '@/types';
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
        ? `/objects/?resource_type=${resourceFilter}`
        : '/objects/';
      const response = await api.get<PowerObject[]>(url);
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
  const getDisplayPower = (obj: PowerObject): { value: number; unit: string } => {
    if (obj.resource_type === 'electricity') {
      // Для электричества показываем в МВт если >= 1, иначе в кВт
      if (obj.max_power_electricity_mw && obj.max_power_electricity_mw >= 1) {
        return { value: obj.max_power_electricity_mw, unit: 'МВт' };
      }
      return { value: obj.max_power_electricity_kw || 0, unit: 'кВт' };
    } else {
      // Для воды показываем в м³/ч
      return { value: obj.max_power_water_m3h || 0, unit: 'м³/ч' };
    }
  };

  // Получение иконки для типа объекта
  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'substation': return '⚡';
      case 'tp': return '🔧';
      case 'kru': return '⚙️';
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
        <Link href="/admin/objects/create" className={styles.createButton}>
          + Добавить объект
        </Link>
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
              <th className={styles.th}>Описание</th>
              <th className={styles.th}>Действия</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {filteredObjects?.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.noData}>
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
                    <td className={styles.td}>{obj.name}</td>
                    <td className={styles.td}>
                      <span className={`${styles.resourceBadge} ${styles[obj.resource_type]}`}>
                        {obj.resource_type === 'electricity' ? '⚡' : '💧'} {getResourceTypeLabel(obj.resource_type)}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.powerValue}>
                        {displayPower.value.toFixed(2)} {displayPower.unit}
                      </span>
                      {obj.resource_type === 'electricity' && obj.max_power_electricity_kw && (
                        <span className={styles.powerDetail}>
                          ({obj.max_power_electricity_kw} кВт)
                        </span>
                      )}
                      {obj.resource_type === 'water' && obj.max_power_water_m3d && (
                        <span className={styles.powerDetail}>
                          ({obj.max_power_water_m3d} м³/сут)
                        </span>
                      )}
                    </td>
                    <td className={styles.td}>
                      {obj.description || '-'}
                    </td>
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
                    </td>
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
        </div>
      )}
    </div>
  );
}