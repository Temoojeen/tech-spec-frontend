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
  resource_type: z.enum(['electricity', 'water']),
  power_value: z.number().min(0.01, 'Мощность должна быть больше 0'),
  power_unit: z.enum(['mw', 'kw', 'm3h', 'm3d']),
  description: z.string().optional(),
}).refine(
  (data) => {
    // Проверка соответствия единицы измерения типу ресурса
    if (data.resource_type === 'electricity') {
      return ['mw', 'kw'].includes(data.power_unit);
    }
    if (data.resource_type === 'water') {
      return ['m3h', 'm3d'].includes(data.power_unit);
    }
    return true;
  },
  {
    message: 'Неверная единица измерения для выбранного типа ресурса',
    path: ['power_unit'],
  }
);

// ===== Тип формы =====
type ObjectFormData = z.infer<typeof objectSchema>;

// ===== DTO для бэка =====
interface CreateObjectRequest {
  name: string;
  type: 'substation' | 'tp' | 'kru';
  resource_type: 'electricity' | 'water';
  power_value: number;
  power_unit: 'mw' | 'kw' | 'm3h' | 'm3d';
  description?: string;
}

// ===== Вспомогательные функции =====

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
      resource_type: 'electricity',
      power_value: 0,
      power_unit: 'mw',
      description: '',
    },
  });

  // ===== useWatch для отслеживания изменений =====
  const resourceType = useWatch({ control, name: 'resource_type' });
  const powerUnit = useWatch({ control, name: 'power_unit' });

  // Автоматически меняем единицу измерения при смене типа ресурса
  const handleResourceTypeChange = (type: 'electricity' | 'water') => {
    setValue('resource_type', type);
    if (type === 'electricity') {
      setValue('power_unit', 'mw');
    } else {
      setValue('power_unit', 'm3h');
    }
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
    createMutation.mutate(formData);
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
      <Header />
      
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

          {/* Тип объекта */}
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

          {/* Тип ресурса */}
          <div className={styles.formField}>
            <label className={styles.label}>
              Тип ресурса <span className={styles.required}>*</span>
            </label>
            <div className={styles.resourceTypeButtons}>
              <button
                type="button"
                className={`${styles.resourceButton} ${
                  resourceType === 'electricity' ? styles.active : ''
                }`}
                onClick={() => handleResourceTypeChange('electricity')}
              >
                ⚡ Электроснабжение
              </button>
              <button
                type="button"
                className={`${styles.resourceButton} ${
                  resourceType === 'water' ? styles.active : ''
                }`}
                onClick={() => handleResourceTypeChange('water')}
              >
                💧 Водоснабжение
              </button>
            </div>
            <input type="hidden" {...register('resource_type')} />
          </div>

          {/* Мощность */}
          <div className={styles.formFieldFull}>
            <label className={styles.label}>
              Мощность <span className={styles.required}>*</span>
            </label>

            <div className={styles.powerInputGroup}>
              <div className={styles.powerUnitSelector}>
                {resourceType === 'electricity' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`${styles.unitButton} ${
                        powerUnit === 'm3h' ? styles.active : ''
                      }`}
                      onClick={() => setValue('power_unit', 'm3h')}
                    >
                      м³/ч
                    </button>
                    <button
                      type="button"
                      className={`${styles.unitButton} ${
                        powerUnit === 'm3d' ? styles.active : ''
                      }`}
                      onClick={() => setValue('power_unit', 'm3d')}
                    >
                      м³/сут
                    </button>
                  </>
                )}
              </div>

              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('power_value', { valueAsNumber: true })}
                className={`${styles.powerInput} ${
                  errors.power_value ? styles.error : ''
                }`}
                placeholder="0.00"
              />
            </div>

            {errors.power_value && (
              <p className={styles.errorText}>
                {errors.power_value.message}
              </p>
            )}
            {errors.power_unit && (
              <p className={styles.errorText}>
                {errors.power_unit.message}
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
              placeholder="Дополнительная информация об объекте"
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