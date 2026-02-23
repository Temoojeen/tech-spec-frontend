'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { User } from '@/types';
import styles from './page.module.scss';
import Header from '@/components/Header/Header';

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<User[]>('/users/');
      return response.data;
    },
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const filteredUsers = users?.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.organization_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
        <Header/>
      <div className={styles.header}>
        <h1 className={styles.title}>Управление пользователями</h1>
        <Link href="/admin/users/create" className={styles.createButton}>
          + Добавить пользователя
        </Link>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Поиск по имени, email или организации..."
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
              <th className={styles.th}>Имя пользователя</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Роль</th>
              <th className={styles.th}>Организация</th>
              <th className={styles.th}>Действия</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {filteredUsers?.map((user) => (
              <tr key={user.id} className={styles.tr}>
                <td className={styles.td}>{user.id}</td>
                <td className={styles.td}>{user.username}</td>
                <td className={styles.td}>{user.email}</td>
                <td className={styles.td}>
                  <span className={`${styles.roleBadge} ${styles[user.role]}`}>
                    {user.role === 'admin' ? 'Админ' : 'Пользователь'}
                  </span>
                </td>
                <td className={styles.td}>{user.organization_name || '-'}</td>
                <td className={styles.td}>
                  <Link href={`/admin/users/${user.id}/edit`} className={styles.editButton}>
                    Редактировать
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
                        deleteMutation.mutate(user.id);
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