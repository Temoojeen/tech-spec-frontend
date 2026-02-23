'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { PowerObject } from '@/types';
import styles from './page.module.scss';
import Header from '@/components/Header/Header';

export default function ObjectsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: objects, isLoading } = useQuery({
    queryKey: ['objects'],
    queryFn: async () => {
      const response = await api.get<PowerObject[]>('/objects/');
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

  const filteredObjects = objects?.filter(obj => 
    obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'substation': return 'Подстанция';
      case 'tp': return 'ТП';
      case 'kru': return 'КРУ';
      default: return type;
    }
  };

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

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Поиск по названию или типу..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>Тип</th>
              <th className={styles.th}>Название</th>
              <th className={styles.th}>Мощность (МВт)</th>
              <th className={styles.th}>Мощность (кВт)</th>
              <th className={styles.th}>Описание</th>
              <th className={styles.th}>Действия</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {filteredObjects?.map((obj) => (
              <tr key={obj.id} className={styles.tr}>
                <td className={styles.td}>{obj.id}</td>
                <td className={styles.td}>
                  <span className={`${styles.typeBadge} ${styles[obj.type]}`}>
                    {getTypeIcon(obj.type)} {getTypeLabel(obj.type)}
                  </span>
                </td>
                <td className={styles.td}>{obj.name}</td>
                <td className={styles.td}>{obj.max_power_mw}</td>
                <td className={styles.td}>{obj.max_power_kw}</td>
                <td className={styles.td}>{obj.description || '-'}</td>
                <td className={styles.td}>
                  <Link href={`/admin/objects/${obj.id}/edit`} className={styles.editButton}>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}