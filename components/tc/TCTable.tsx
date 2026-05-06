import React from 'react';
import { TechnicalCondition } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatPower, formatTCStatus } from '@/utils/format';
import styles from './TCTable.module.scss';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import Link from 'next/link';

interface TCTableProps {
  data: TechnicalCondition[];
  isLoading: boolean;
  resourceType: 'electricity' | 'water';
  tcType: 'permanent' | 'temporary';
  onEdit?: (tc: TechnicalCondition) => void;
  onDelete?: (id: number) => void;
}

export default function TCTable({ 
  data, 
  isLoading, 
  resourceType,
  tcType,
}: TCTableProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/technical-conditions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-conditions'] });
    },
  });
  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!data.length) {
    return <div className={styles.empty}>Нет данных для отображения</div>;
  }
const getStatusClass = (status: string) => {
  switch (status) {
    case 'active':
      return styles.statusActive;
    case 'expired':
      return styles.statusExpired;
    case 'pending':
      return styles.statusPending;
    case 'cancelled':
      return styles.statusCancelled;
    default:
      return '';
  }
};
  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>Наименование организации</th>
            <th className={styles.th}>Выданая мощность</th>
            <th className={styles.th}>Объект</th>
            <th className={styles.th}>Номер ТУ</th>
            <th className={styles.th}>Дата выдачи</th>
            <th className={styles.th}>
              {tcType === 'temporary' ? 'Дата окончания' : 'Статус'}
            </th>
            {isAdmin && <th className={styles.th}>Действия</th>}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {data.map((tc) => (
            <tr key={tc.id} className={styles.tr}>
              <td className={styles.td}>{tc.organization_name}</td>
              <td className={styles.td}>
                {formatPower(tc.power_amount, resourceType)}
              </td>
              <td className={styles.td}>{tc.object_name}</td>
              <td className={styles.td}>{tc.tc_number}</td>
              <td className={styles.td}>{formatDate(tc.issue_date)}</td>
              <td className={styles.td}>
  {tcType === 'temporary' ? (
    formatDate(tc.expiry_date)
  ) : (
    <span className={`${styles.statusBadge} ${getStatusClass(tc.status)}`}>
      {formatTCStatus(tc.status)}
    </span>
  )}
</td>

{isAdmin && (
  <td className={styles.td}>
    <div className={styles.actions}>
      <Link 
        href={`/admin/tc-management/${tc.id}/edit`}
        className={`${styles.actionLink} ${styles.editLink}`}
      >
        📝
      </Link>
      <Link 
        href={`/tc-management/${tc.id}`}
        className={`${styles.actionLink} ${styles.viewLink}`}
      >
        👁
      </Link>
      <button
        onClick={() => {
          if (confirm('Вы уверены, что хотите удалить это ТУ?')) {
            deleteMutation.mutate(tc.id);
          }
        }}
        className={styles.deleteButton}
      >
        🗑
      </button>
    </div>
  </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}