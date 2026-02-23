'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { TechnicalCondition, PowerObject } from '@/types';
import Header from '@/components/Header/Header';
import styles from './page.module.scss';

/* ===================== TYPES ===================== */

interface ObjectStats {
  object: PowerObject;
  issuedPowerKW: number;
  issuedPowerMW: number;
  freePowerKW: number;
  freePowerMW: number;
  usagePercent: number;
  totalTC: number;
  activeTC: number;
}

type ObjectTypeConfig = {
  icon: string;
  unit: 'кВт' | 'МВт';
  power: 'kw' | 'mw';
  color: string;
};

/* ===================== CONFIG ===================== */

const OBJECT_TYPE_CONFIG: Record<string, ObjectTypeConfig> = {
  substation: {
    icon: '⚡',
    unit: 'МВт',
    power: 'mw',
    color: '#3b82f6',
  },
  tp: {
    icon: '🔧',
    unit: 'кВт',
    power: 'kw',
    color: '#10b981',
  },
  kru: {
    icon: '⚙️',
    unit: 'кВт',
    power: 'kw',
    color: '#f59e0b',
  },
};

/* ===================== PAGE ===================== */

export default function DashboardPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  /* ---------- QUERIES ---------- */

  const { data: objects, isLoading: objectsLoading } = useQuery({
    queryKey: ['objects'],
    queryFn: async () => {
      const res = await api.get<PowerObject[]>('/objects/');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: allTCs, isLoading: tcLoading } = useQuery({
    queryKey: ['technical-conditions'],
    queryFn: async () => {
      const res = await api.get<TechnicalCondition[]>('/technical-conditions');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  /* ---------- AUTH REDIRECT ---------- */

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  /* ---------- CALCULATIONS ---------- */

  const objectStats = useMemo<ObjectStats[]>(() => {
    if (!objects || !allTCs) return [];

    return objects.map(object => {
      const objectTCs = allTCs.filter(tc => tc.object_id === object.id);
      const activeTCs = objectTCs.filter(tc => tc.status === 'active');

      const issuedPowerKW = activeTCs.reduce(
        (sum, tc) => sum + tc.power_amount,
        0
      );

      const issuedPowerMW = issuedPowerKW / 1000;
      const freePowerKW = Math.max(0, object.max_power_kw - issuedPowerKW);
      const freePowerMW = freePowerKW / 1000;

      const usagePercent = object.max_power_kw
        ? Math.min(100, (issuedPowerKW / object.max_power_kw) * 100)
        : 0;

      return {
        object,
        issuedPowerKW,
        issuedPowerMW,
        freePowerKW,
        freePowerMW,
        usagePercent,
        totalTC: objectTCs.length,
        activeTC: activeTCs.length,
      };
    });
  }, [objects, allTCs]);

  /* ---------- STATES ---------- */

  if (loading || objectsLoading || tcLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loading}>Загрузка…</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  /* ---------- RENDER ---------- */

  return (
    <div>
      <Header />

      <div className={styles.dashboard}>
        {objectStats.map(stats => {
          const config = OBJECT_TYPE_CONFIG[stats.object.type];
          if (!config) return null;

          return (
            <ObjectStatisticsCard
              key={stats.object.id}
              stats={stats}
              config={config}
            />
          );
        })}
      </div>

      {/* Нижние карточки */}
      <div className={styles.container}>
        <div className={styles.card__container}>
          <NavigationCard
            href="/electricity"
            title="Электроснабжение"
            image="https://dom.com.cy/upload/live/1746592384_3845.jpeg"
          />

          <NavigationCard
            href="/water"
            title="Водоснабжение"
            image="https://www.ineos.com/globalassets/ineos-group/businesses/ineos-hydrogen/images/cfb6be6d047c11b997d7d1ef1be74603.jpeg"
            
          />
        </div>
      </div>
    </div>
  );
}

/* ===================== COMPONENTS ===================== */

function ObjectStatisticsCard({
  stats,
  config,
}: {
  stats: ObjectStats;
  config: ObjectTypeConfig;
}) {
  const isMW = config.power === 'mw';

  const total = isMW
    ? stats.object.max_power_mw
    : stats.object.max_power_kw;

  const free = isMW ? stats.freePowerMW : stats.freePowerKW;
  const issued = isMW ? stats.issuedPowerMW : stats.issuedPowerKW;

  return (
    <div className={styles.generalStatistics}>
      <h3 className={styles.statisticsHeader}>
        {config.icon} {stats.object.name}
      </h3>

      <div className={styles.stats}>
        <Stat label="Общая мощность" value={total} unit={config.unit} />
        <Stat label="Всего ТУ" value={stats.totalTC} unit="шт" />
        <Stat label="Свободная мощность" value={free} unit={config.unit} />
        <Stat label="Выданная мощность" value={issued} unit={config.unit} />
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{
            width: `${stats.usagePercent}%`,
            backgroundColor: config.color,
          }}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className={styles.statWrapper}>
      <div className={styles.statItem}>
        <span className={styles.digit}>
          {Number.isInteger(value) ? value : value.toFixed(2)}
        </span>
        <span className={styles.unit}>{unit}</span>
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

function NavigationCard({
  href,
  title,
  image,
  description,
}: {
  href: string;
  title: string;
  image: string;
  description?: string;
}) {
  return (
    <Link href={href} className={styles.card__link}>
      <article className={styles.card__article}>
        <Image
          src={image}
          alt={title}
          className={styles.card__img}
          width={800}
          height={500}
          priority
        />
        <div className={styles.card__data}>
          {description && (
            <span className={styles.card__description}>{description}</span>
          )}
          <h2 className={styles.card__title}>{title}</h2>
        </div>
      </article>
    </Link>
  );
}