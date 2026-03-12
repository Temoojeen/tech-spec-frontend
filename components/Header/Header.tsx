"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import styles from './Header.module.scss';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {    
    const link = document.createElement('link');
    link.href = "https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.head.removeChild(link);
    };
    
  }, []);

  const { user, isAuthenticated, loading, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
  };

  // Проверяем, что мы на странице логина
  if (pathname === '/login') return null;

  // Показываем загрузку
  if (loading) {
    return (
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.headerContent}>
          <div className={styles.loading}>Загрузка...</div>
        </div>
      </header>
    );
  }

  // Если пользователь не авторизован, не показываем хедер
  if (!isAuthenticated) return null;

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.headerContent}>
        <div className={styles.leftSection}>
          <Link href="/" className={styles.logoLink}>
            <span className={styles.logoIcon}>
                <Image 
                  src="https://yt3.googleusercontent.com/tgJGLg5JbmlDU4S_R5ifDG4ReV1LSbK7ix37OUt6PG1vTW-ZHnQiXJT569sKbGKKFkQVuBqm=s900-c-k-c0x00ffffff-no-rj"
                  alt="Логотип"
                  width={100}
                  height={100}
                />
            </span>
          </Link>
        </div>

        <div className={styles.centerSection}>
          <h1 className={styles.welcomeText}>
            {user?.username || user?.email}
          </h1>
        </div>

        <div className={styles.rightSection}>
          {user?.role === 'admin' && (
            <nav className={styles.adminNav}>
              <Link href="/admin/" className={styles.adminLink}>
                Панель управления
              </Link>
            </nav>
          )}

          <button
            onClick={handleLogout}
            className={styles.logoutButton}
            aria-label="Выйти из системы"
          >
            <span className={styles.logoutIcon}>🚪</span>
            <span className={styles.logoutText}>Выйти</span>
          </button>
        </div>
      </div>
      {!pathname.startsWith("/dashboard") &&
      <div className={styles.headerFooter}>
        <p>
          Designed by Temoojeen
          </p>
          </div>}
    </header>
  );
};

export default Header;