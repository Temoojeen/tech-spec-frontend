'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { User, Organization, TechnicalCondition, PowerObject } from '@/types';
import styles from './page.module.scss';
import Header from '@/components/Header/Header';

// Интерфейс для статистики
interface AdminStats {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  totalOrganizations: number;
  totalObjects: number;
  substations: number;
  tp: number;
  kru: number;
  permanentTC: number;
  temporaryTC: number;
  activeTC: number;
  expiredTC: number;
  totalPowerIssuedMW: number;
  totalPowerIssuedKW: number;
}

export default function AdminDashboardPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  // Запрос пользователей
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<User[]>('/users/');
      return response.data;
    },
    enabled: isAdmin,
  });

  // Запрос организаций
  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const response = await api.get<Organization[]>('/organizations/');
      return response.data;
    },
    enabled: isAdmin,
  });

  // Запрос объектов
  const { data: objects, isLoading: objectsLoading } = useQuery({
    queryKey: ['objects'],
    queryFn: async () => {
      const response = await api.get<PowerObject[]>('/objects/');
      return response.data;
    },
    enabled: isAdmin,
  });

  // Запрос всех ТУ
  const { data: technicalConditions, isLoading: tcLoading } = useQuery({
    queryKey: ['technical-conditions'],
    queryFn: async () => {
      const response = await api.get<TechnicalCondition[]>('/technical-conditions');
      return response.data;
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, loading, router]);

  // Расчет статистики
  const calculateStats = (): AdminStats => {
    const stats: AdminStats = {
      totalUsers: users?.length || 0,
      adminUsers: users?.filter(u => u.role === 'admin').length || 0,
      regularUsers: users?.filter(u => u.role === 'user').length || 0,
      totalOrganizations: organizations?.length || 0,
      totalObjects: objects?.length || 0,
      substations: objects?.filter(o => o.type === 'substation').length || 0,
      tp: objects?.filter(o => o.type === 'tp').length || 0,
      kru: objects?.filter(o => o.type === 'kru').length || 0,
      permanentTC: technicalConditions?.filter(tc => tc.tc_type === 'permanent').length || 0,
      temporaryTC: technicalConditions?.filter(tc => tc.tc_type === 'temporary').length || 0,
      activeTC: technicalConditions?.filter(tc => tc.status === 'active').length || 0,
      expiredTC: technicalConditions?.filter(tc => tc.status === 'expired').length || 0,
      totalPowerIssuedKW: technicalConditions?.reduce((sum, tc) => sum + tc.power_amount, 0) || 0,
      totalPowerIssuedMW: (technicalConditions?.reduce((sum, tc) => sum + tc.power_amount, 0) || 0) / 1000,
    };
    return stats;
  };

  const stats = calculateStats();

  // Карточки статистики
  const statCards = [
    { 
      title: 'Всего пользователей', 
      value: stats.totalUsers.toString(), 
      icon: '👥', 
      color: '#3b82f6',
    },
    { 
      title: 'Организации', 
      value: stats.totalOrganizations.toString(), 
      icon: '🏢', 
      color: '#10b981' 
    },
    { 
      title: 'Объекты', 
      value: stats.totalObjects.toString(), 
      icon: '⚡', 
      color: '#8b5cf6',
      subValue: `${stats.substations} ПС • ${stats.tp} ТП • ${stats.kru} КРУ`
    },
    { 
      title: 'Постоянные ТУ', 
      value: stats.permanentTC.toString(), 
      icon: '📄', 
      color: '#f59e0b' 
    },
    { 
      title: 'Временные ТУ', 
      value: stats.temporaryTC.toString(), 
      icon: '⏳', 
      color: '#ef4444' 
    },
    { 
      title: 'Активные ТУ', 
      value: stats.activeTC.toString(), 
      icon: '✅', 
      color: '#22c55e' 
    },
    { 
      title: 'Истекшие ТУ', 
      value: stats.expiredTC.toString(), 
      icon: '⚠️', 
      color: '#f97316' 
    },
    { 
      title: 'Выдано мощности', 
      value: stats.totalPowerIssuedMW.toFixed(2), 
      unit: 'МВт',
      icon: '⚡', 
      color: '#6366f1',
      subValue: `${stats.totalPowerIssuedKW.toFixed(0)} кВт`
    },
  ];

  if (loading || usersLoading || orgsLoading || objectsLoading || tcLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <Header />
      
      <div className={styles.header}>
        <h1 className={styles.title}>Панель управления</h1>
        <div className={styles.date}>
          {new Date().toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </div>
      </div>

      <div className={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <div key={index} className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: stat.color + '20', color: stat.color }}>
              {stat.icon}
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>
                {stat.value}
                {stat.unit && <span className={styles.statUnit}>{stat.unit}</span>}
              </div>
              <div className={styles.statTitle}>{stat.title}</div>
              {stat.subValue && (
                <div className={styles.statSubValue}>{stat.subValue}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.recentActivity}>
          <h2 className={styles.sectionTitle}>Последние ТУ</h2>
          <div className={styles.activityList}>
            {technicalConditions?.slice(0, 5).map((tc) => (
              <div key={tc.id} className={styles.activityItem}>
                <div className={styles.activityAction}>
                  {tc.tc_number} - {tc.organization_name}
                </div>
                <div className={styles.activityMeta}>
                  <span className={styles.activityType}>
                    {tc.tc_type === 'permanent' ? '📄 Постоянное' : '⏳ Временное'}
                  </span>
                  <span className={`${styles.activityStatus} ${styles[tc.status]}`}>
                    {tc.status === 'active' ? 'Активно' : 
                     tc.status === 'expired' ? 'Истекло' : 'Отменено'}
                  </span>
                  <span className={styles.activityDate}>
                    {new Date(tc.issue_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
            ))}
            {(!technicalConditions || technicalConditions.length === 0) && (
              <div className={styles.noData}>Нет ТУ для отображения</div>
            )}
          </div>
        </div>

        <div className={styles.quickActions}>
          <h2 className={styles.sectionTitle}>Быстрые действия</h2>
          <div className={styles.actionsGrid}>
            <Link href="/admin/users/" className={styles.actionCard}>
              <span className={styles.actionIcon}>👥</span>
              <span className={styles.actionText}>Пользователи</span>
              <span className={styles.actionCount}>{stats.totalUsers}</span>
            </Link>

            <Link href="/admin/organizations/" className={styles.actionCard}>
              <span className={styles.actionIcon}>🏢</span>
              <span className={styles.actionText}>Организации</span>
              <span className={styles.actionCount}>{stats.totalOrganizations}</span>
            </Link>

            <Link href="/admin/objects/" className={styles.actionCard}>
              <span className={styles.actionIcon}>⚡</span>
              <span className={styles.actionText}>Объекты</span>
              <span className={styles.actionCount}>{stats.totalObjects}</span>
            </Link>

            <Link href="/admin/tc-management/" className={styles.actionCard}>
              <span className={styles.actionIcon}>📋</span>
              <span className={styles.actionText}>ТУ</span>
              <span className={styles.actionCount}>{stats.permanentTC + stats.temporaryTC}</span>
            </Link>

            
          </div>
        </div>
      </div>
    </div>
  );
}