import React from 'react';
import { TechnicalCondition } from '@/types/tc';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatPower, formatTCStatus } from '@/utils/format';
import styles from './TCTable.module.scss';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

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
                {tcType === 'temporary' 
                  ? formatDate(tc.expiry_date) 
                  : formatTCStatus(tc.status)}
              </td>
              {isAdmin && (
                <td className={styles.td}>
                  <a href={`/admin/tc-management/${tc.id}/edit`}
                  >
                    Редактировать
                  </a>
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
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}