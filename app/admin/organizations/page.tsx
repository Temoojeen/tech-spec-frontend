'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { Organization } from '@/types';
import styles from './page.module.scss';
import Header from '@/components/Header/Header';

export default function OrganizationsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const response = await api.get<Organization[]>('/organizations/');
      return response.data;
    },
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/organizations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations/'] });
    },
  });

  const filteredOrgs = organizations?.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.bin?.includes(searchTerm) ||
    org.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
        <Header/>
      <div className={styles.header}>
        <h1 className={styles.title}>Управление организациями</h1>
        <Link href="/admin/organizations/create" className={styles.createButton}>
          + Добавить организацию
        </Link>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Поиск по названию, БИН или контактному лицу..."
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
              <th className={styles.th}>Название</th>
              <th className={styles.th}>БИН</th>
              <th className={styles.th}>Адрес</th>
              <th className={styles.th}>Контактное лицо</th>
              <th className={styles.th}>Телефон</th>
              <th className={styles.th}>Действия</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {filteredOrgs?.map((org) => (
              <tr key={org.id} className={styles.tr}>
                <td className={styles.td}>{org.id}</td>
                <td className={styles.td}>{org.name}</td>
                <td className={styles.td}>{org.bin || '-'}</td>
                <td className={styles.td}>{org.address || '-'}</td>
                <td className={styles.td}>{org.contact_person || '-'}</td>
                <td className={styles.td}>{org.contact_phone || '-'}</td>
                <td className={styles.td}>
                  
                  <Link href={`/admin/organizations/${org.id}/edit`} className={styles.editButton}>
                    Редактировать
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Вы уверены, что хотите удалить эту организацию?')) {
                        deleteMutation.mutate(org.id);
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