'use client';

import { useState } from 'react';
import Link from 'next/link';
// import { usePathname } from 'next/navigation'; // можно удалить, если не используется
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { TechnicalCondition, ResourceType, TCType } from '@/types';
import { formatDate, formatPower, formatTCStatus, formatTCType } from '@/utils/format';
import styles from './page.module.scss';
import Header from '@/components/Header/Header';
// import Header from '@/components/Header/Header'; // УДАЛИТЕ эту строку

export default function TCManagementPage() {
  const { isAdmin } = useAuth();
  // const pathname = usePathname(); // можно удалить, если не используется
  const queryClient = useQueryClient();
  const [resourceFilter, setResourceFilter] = useState<ResourceType | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TCType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: technicalConditions, isLoading } = useQuery({
    queryKey: ['technical-conditions', resourceFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (resourceFilter !== 'all') params.append('resource_type', resourceFilter);
      if (typeFilter !== 'all') params.append('tc_type', typeFilter);
      
      const url = `/technical-conditions?${params.toString()}`;
      console.log('📡 Запрос:', url);
      
      const response = await api.get<TechnicalCondition[]>(url);
      return response.data;
    },
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/technical-conditions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-conditions'] });
    },
  });

  const filteredTCs = technicalConditions?.filter(tc => 
    tc.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tc.tc_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
        <Header/>
      
      <div className={styles.header}>
        <h1 className={styles.title}>Управление техническими условиями</h1>
        <Link href="/admin/tc-management/create" className={styles.createButton}>
          + Создать ТУ
        </Link>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Поиск по организации или номеру ТУ..."
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
            <option value="all">Все ресурсы</option>
            <option value="electricity">Электроснабжение</option>
            <option value="water">Водоснабжение</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TCType | 'all')}
            className={styles.filterSelect}
          >
            <option value="all">Все типы</option>
            <option value="permanent">Постоянные</option>
            <option value="temporary">Временные</option>
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>Организация</th>
              <th className={styles.th}>Тип ресурса</th>
              <th className={styles.th}>Тип ТУ</th>
              <th className={styles.th}>Номер ТУ</th>
              <th className={styles.th}>Мощность</th>
              <th className={styles.th}>Дата выдачи</th>
              <th className={styles.th}>Дата окончания</th>
              <th className={styles.th}>Статус</th>
              <th className={styles.th}>Действия</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {filteredTCs?.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.noData}>
                  Нет данных для отображения
                </td>
              </tr>
            ) : (
              filteredTCs?.map((tc) => (
                <tr key={tc.id} className={styles.tr}>
                  <td className={styles.td}>{tc.id}</td>
                  <td className={styles.td}>{tc.organization_name}</td>
                  <td className={styles.td}>
                    {tc.resource_type === 'electricity' ? '⚡ ЭЭ' : '💧 Вода'}
                  </td>
                  <td className={styles.td}>{formatTCType(tc.tc_type)}</td>
                  <td className={styles.td}>{tc.tc_number}</td>
                  <td className={styles.td}>
                    {formatPower(tc.power_amount, tc.resource_type)}
                  </td>
                  <td className={styles.td}>{formatDate(tc.issue_date)}</td>
                  <td className={styles.td}>{formatDate(tc.expiry_date)}</td>
                  <td className={styles.td}>
                    <span className={`${styles.statusBadge} ${styles[tc.status]}`}>
                      {formatTCStatus(tc.status)}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <Link 
                      href={`/admin/tc-management/${tc.id}/edit`} 
                      className={styles.editButton}
                    >
                      Редактировать
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm('Вы уверены, что хотите удалить это ТУ?')) {
                          deleteMutation.mutate(tc.id);
                        }
                      }}
                      className={styles.deleteButton}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}