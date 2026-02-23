'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.scss';

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Только если не загружается и пользователь авторизован
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  // Показываем загрузку только пока проверяем авторизацию
 if (loading) {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingCard}>
        <div className={styles.spinner} />
        <div className={styles.loadingText}>Проверка авторизации…</div>
      </div>
    </div>
  );
}


  // Если пользователь уже авторизован, не показываем форму
  if (isAuthenticated) {
    return null;
  }

  return <LoginForm />;
}