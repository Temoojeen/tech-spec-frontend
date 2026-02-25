'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import styles from './page.module.scss';
import Header from '@/components/Header/Header';

// ===== Тип ошибки API =====
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

// ===== Zod схема =====
const objectSchema = z.object({
  name: z.string().min(2, 'Название должно содержать минимум 2 символа'),
  type: z.enum(['substation', 'tp', 'kru']),
  power_unit: z.enum(['mw', 'kw']),
  power_value: z.number().min(0.01, 'Мощность должна быть больше 0'),
  description: z.string().optional(),
});

// ===== Тип формы =====
type ObjectFormData = z.infer<typeof objectSchema>;

// ===== DTO для бэка =====
interface CreateObjectRequest {
  name: string;
  type: 'substation' | 'tp' | 'kru';
  max_power_mw: number;
  max_power_kw: number;
  description?: string;
}

export default function CreateObjectPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  // ===== React Hook Form =====
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ObjectFormData>({
    resolver: zodResolver(objectSchema),
    defaultValues: {
      name: '',
      type: 'substation',
      power_unit: 'mw',
      power_value: 0,
      description: '',
    },
  });

  // ===== useWatch вместо watch =====
  const powerUnit = useWatch({
    control,
    name: 'power_unit',
  });


  // ===== Конвертация мощности =====
  const convertPower = (value: number, unit: 'mw' | 'kw') => {
    return unit === 'mw'
      ? {
          max_power_mw: value,
          max_power_kw: value * 1000,
        }
      : {
          max_power_mw: value / 1000,
          max_power_kw: value,
        };
  };

  // ===== Mutation =====
  const createMutation = useMutation({
    mutationFn: async (data: CreateObjectRequest) => {
      const response = await api.post('/objects/', data);
      return response.data;
    },
    onSuccess: () => {
      router.push('/admin/objects');
    },
    onError: (error: ApiError) => {
      setServerError(
        error.response?.data?.error ||
          'Ошибка при создании объекта. Попробуйте снова.'
      );
    },
  });

  // ===== Submit =====
  const onSubmit = (formData: ObjectFormData) => {
    setServerError(null);

    const power = convertPower(formData.power_value, formData.power_unit);

    const requestData: CreateObjectRequest = {
      name: formData.name,
      type: formData.type,
      max_power_mw: power.max_power_mw,
      max_power_kw: power.max_power_kw,
      description: formData.description || undefined,
    };

    createMutation.mutate(requestData);
  };

  // ===== Guards =====
  if (authLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  // ===== UI =====
  return (
    <div className={styles.container}>
        <Header/>
      <div className={styles.header}>
        <h1 className={styles.title}>Создание нового объекта</h1>
        <Link href="/admin/objects" className={styles.backLink}>
           Назад к списку
        </Link>
      </div>

      {serverError && (
        <div className={styles.serverError} role="alert">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.formGrid}>
          {/* Название */}
          <div className={styles.formFieldFull}>
            <label className={styles.label}>
              Название <span className={styles.required}>*</span>
            </label>
            <input
              {...register('name')}
              className={`${styles.input} ${
                errors.name ? styles.error : ''
              }`}
              placeholder="Подстанция 164"
            />
            {errors.name && (
              <p className={styles.errorText}>{errors.name.message}</p>
            )}
          </div>

          {/* Тип */}
          <div className={styles.formField}>
            <label className={styles.label}>
              Тип объекта <span className={styles.required}>*</span>
            </label>
            <select
              {...register('type')}
              className={`${styles.select} ${
                errors.type ? styles.error : ''
              }`}
            >
              <option value="substation">Подстанция</option>
              <option value="tp">ТП</option>
              <option value="kru">КРУ</option>
            </select>
          </div>

          {/* Мощность */}
          <div className={styles.formFieldFull}>
            <label className={styles.label}>
              Мощность <span className={styles.required}>*</span>
            </label>

            <div className={styles.powerInputGroup}>
              <div className={styles.powerUnitSelector}>
                <button
                  type="button"
                  className={`${styles.unitButton} ${
                    powerUnit === 'mw' ? styles.active : ''
                  }`}
                  onClick={() => setValue('power_unit', 'mw')}
                >
                  МВт
                </button>
                <button
                  type="button"
                  className={`${styles.unitButton} ${
                    powerUnit === 'kw' ? styles.active : ''
                  }`}
                  onClick={() => setValue('power_unit', 'kw')}
                >
                  кВт
                </button>
              </div>

              <input
                type="number"
                step="0.01"
                {...register('power_value', { valueAsNumber: true })}
                className={`${styles.powerInput} ${
                  errors.power_value ? styles.error : ''
                }`}
              />
            </div>

            {errors.power_value && (
              <p className={styles.errorText}>
                {errors.power_value.message}
              </p>
            )}
          </div>

          {/* Описание */}
          <div className={styles.formFieldFull}>
            <label className={styles.label}>Описание</label>
            <textarea
              {...register('description')}
              rows={3}
              className={styles.textarea}
            />
          </div>
        </div>

        <div className={styles.formActions}>
          <Button
            type="submit"
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Создание...' : 'Создать объект'}
          </Button>

          <Link href="/admin/objects" className={styles.cancelButton}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}