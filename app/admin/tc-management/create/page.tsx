'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { Organization, PowerObject } from '@/types';
import Button from '@/components/ui/Button';
import Header from '@/components/Header/Header';
import styles from './page.module.scss';

/* =========================
   ZOD SCHEMA
========================= */
const tcSchema = z
  .object({
    organization_id: z
      .number()
      .refine(v => !Number.isNaN(v), { message: 'Выберите организацию' }),

    object_id: z
      .number()
      .refine(v => !Number.isNaN(v), { message: 'Выберите объект выдачи' }),

    tc_type: z.enum(['permanent', 'temporary']),
    resource_type: z.enum(['electricity', 'water']),

    tc_number: z.string().min(1, 'Введите номер ТУ'),

    power_amount: z
      .number()
      .min(0.1, 'Мощность должна быть больше 0'),

    issue_date: z.string().min(1, 'Выберите дату выдачи'),

    expiry_date: z.string().optional(),

    document_link: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    data =>
      data.tc_type === 'permanent' ||
      (data.tc_type === 'temporary' && !!data.expiry_date),
    {
      path: ['expiry_date'],
      message: 'Выберите дату окончания',
    }
  );

type TCFormData = z.infer<typeof tcSchema>;

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

/* =========================
   COMPONENT
========================= */
export default function CreateTCPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TCFormData>({
    resolver: zodResolver(tcSchema),
    defaultValues: {
      tc_type: 'permanent',
      resource_type: 'electricity',
    },
  });

  /* ✅ React Compiler safe */
  const tcType = useWatch({ control, name: 'tc_type' });
  const resourceType = useWatch({ control, name: 'resource_type' });

  /* =========================
     LOAD ORGANIZATIONS
  ========================= */
  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await api.get<Organization[]>('/organizations/');
      return res.data;
    },
  });

  /* =========================
     LOAD OBJECTS
  ========================= */
  const { data: objects, isLoading: objectsLoading } = useQuery({
    queryKey: ['objects'],
    queryFn: async () => {
      const res = await api.get<PowerObject[]>('/objects/');
      return res.data;
    },
  });

  /* =========================
     CREATE MUTATION
  ========================= */
  const createMutation = useMutation({
    mutationFn: async (data: TCFormData) => {
      const payload = {
        ...data,
        issue_date: new Date(data.issue_date).toISOString(),
        expiry_date:
          data.tc_type === 'temporary' && data.expiry_date
            ? new Date(data.expiry_date).toISOString()
            : null,
      };

      const res = await api.post('/technical-conditions', payload);
      return res.data;
    },
    onSuccess: () => {
      router.push('/admin/tc-management');
    },
    onError: (error: ApiError) => {
      setServerError(
        error.response?.data?.error ||
          'Ошибка при создании ТУ. Попробуйте снова.'
      );
    },
  });

  const onSubmit = (data: TCFormData) => {
    setServerError(null);
    createMutation.mutate(data);
  };

  /* =========================
     STATES
  ========================= */
  if (authLoading || orgsLoading || objectsLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!isAdmin) return null;

  /* =========================
     RENDER
  ========================= */
  return (
    <div className={styles.container}>
      <Header />

      <h1 className={styles.title}>Создание нового ТУ</h1>

      {serverError && (
        <div className={styles.serverError}>{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label>Организация *</label>
            <select {...register('organization_id', { valueAsNumber: true })}>
              <option value="">Выберите организацию</option>
              {organizations?.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            {errors.organization_id && (
              <p className={styles.errorText}>
                {errors.organization_id.message}
              </p>
            )}
          </div>

          <div className={styles.formField}>
            <label>Объект выдачи *</label>
            <select {...register('object_id', { valueAsNumber: true })}>
              <option value="">Выберите объект</option>
              {objects?.map(obj => (
                <option key={obj.id} value={obj.id}>
                  {obj.name} — {obj.max_power_kw} кВт
                </option>
              ))}
            </select>
            {errors.object_id && (
              <p className={styles.errorText}>
                {errors.object_id.message}
              </p>
            )}
          </div>

          <div className={styles.formField}>
            <label>Тип ресурса *</label>
            <select {...register('resource_type')}>
              <option value="electricity">Электроснабжение</option>
              <option value="water">Водоснабжение</option>
            </select>
          </div>

          <div className={styles.formField}>
            <label>Тип ТУ *</label>
            <select {...register('tc_type')}>
              <option value="permanent">Постоянное</option>
              <option value="temporary">Временное</option>
            </select>
          </div>

          <div className={styles.formField}>
            <label>Номер ТУ *</label>
            <input {...register('tc_number')} />
            {errors.tc_number && (
              <p className={styles.errorText}>{errors.tc_number.message}</p>
            )}
          </div>

          <div className={styles.formField}>
            <label>
              Мощность * ({resourceType === 'electricity' ? 'кВт' : 'м³/ч'})
            </label>
            <input
              type="number"
              step="0.01"
              {...register('power_amount', { valueAsNumber: true })}
            />
            {errors.power_amount && (
              <p className={styles.errorText}>
                {errors.power_amount.message}
              </p>
            )}
          </div>

          <div className={styles.formField}>
            <label>Дата выдачи *</label>
            <input type="date" {...register('issue_date')} />
            {errors.issue_date && (
              <p className={styles.errorText}>{errors.issue_date.message}</p>
            )}
          </div>

          {tcType === 'temporary' && (
            <div className={styles.formField}>
              <label>Дата окончания *</label>
              <input type="date" {...register('expiry_date')} />
              {errors.expiry_date && (
                <p className={styles.errorText}>
                  {errors.expiry_date.message}
                </p>
              )}
            </div>
          )}

          <div className={styles.formFieldFull}>
            <label>Примечания</label>
            <textarea rows={4} {...register('notes')} />
          </div>
        </div>

        <div className={styles.formActions}>
          <Button
            type="submit"
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
          >
            Создать ТУ
          </Button>
          <Link href="/admin/tc-management">Отмена</Link>
        </div>
      </form>
    </div>
  );
}