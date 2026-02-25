'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { PowerObject } from '@/types';
import Button from '@/components/ui/Button';
import styles from './page.module.scss';

// ===== API Error =====
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

// ===== Units =====
type PowerUnit = 'mw' | 'kw';

// ===== Zod schema (БЕЗ default) =====
const objectSchema = z.object({
  name: z.string().min(2, 'Название должно содержать минимум 2 символа'),
  type: z.enum(['substation', 'tp', 'kru']),
  power_unit: z.enum(['mw', 'kw']),
  power_value: z.number().min(0.01, 'Мощность должна быть больше 0'),
  description: z.string().optional(),
});

type ObjectFormData = z.infer<typeof objectSchema>;

// ===== DTO =====
interface UpdateObjectRequest {
  name: string;
  type: 'substation' | 'tp' | 'kru';
  max_power_mw: number;
  max_power_kw: number;
  description?: string;
}

export default function EditObjectPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [serverError, setServerError] = useState<string | null>(null);

  // ===== Form =====
  const {
    register,
    handleSubmit,
    setValue,
    reset,
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
  const powerUnit = useWatch({ control, name: 'power_unit' });
  const powerValue = useWatch({ control, name: 'power_value' });

  // ===== Fetch object =====
  const { data: object, isLoading } = useQuery({
    queryKey: ['object', id],
    queryFn: async () => {
      const res = await api.get<PowerObject>(`/objects/${id}`);
      return res.data;
    },
    enabled: !!id && isAdmin,
  });

  // ===== Fill form =====
  useEffect(() => {
    if (!object) return;

    const useMW =
      object.max_power_mw >= 1 ||
      object.max_power_mw === object.max_power_kw / 1000;

    reset({
      name: object.name,
      type: object.type,
      power_unit: useMW ? 'mw' : 'kw',
      power_value: useMW ? object.max_power_mw : object.max_power_kw,
      description: object.description || '',
    });
  }, [object, reset]);

  // ===== Power convert =====
  const convertPower = (value: number, unit: PowerUnit) =>
    unit === 'mw'
      ? { max_power_mw: value, max_power_kw: value * 1000 }
      : { max_power_mw: value / 1000, max_power_kw: value };

  // ===== Mutation =====
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateObjectRequest) => {
      const res = await api.put(`/objects/${id}`, data);
      return res.data;
    },
    onSuccess: () => router.push('/admin/objects'),
    onError: (error: ApiError) =>
      setServerError(
        error.response?.data?.error ||
          'Ошибка при обновлении объекта'
      ),
  });

  // ===== Submit =====
  const onSubmit = (data: ObjectFormData) => {
    const power = convertPower(data.power_value, data.power_unit);

    updateMutation.mutate({
      name: data.name,
      type: data.type,
      max_power_mw: power.max_power_mw,
      max_power_kw: power.max_power_kw,
      description: data.description || undefined,
    });
  };

  if (authLoading || isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!isAdmin || !object) {
    return null;
  }

  // ===== UI =====
 return (
  <div className={styles.container}>
    <h1 className={styles.title}>Редактирование объекта</h1>

    {serverError && (
      <div className={styles.serverError}>{serverError}</div>
    )}

    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formField}>
        <label>Название *</label>
        <input 
          {...register('name')} 
          placeholder="Подстанция 164"
          className={!errors.name ? styles.validInput : ''}
        />
        {errors.name && <p className={styles.errorText}>{errors.name.message}</p>}
      </div>

      <div className={styles.formField}>
        <label>Тип *</label>
        <select {...register('type')}>
          <option value="substation">Подстанция</option>
          <option value="tp">ТП</option>
          <option value="kru">КРУ</option>
        </select>
      </div>

      <div className={styles.powerSection}>
        <label>Мощность *</label>
        <div className={styles.powerInputGroup}>
          <div className={styles.powerUnitSelector}>
            <button
              type="button"
              className={`${styles.unitButton} ${powerUnit === 'mw' ? styles.active : ''}`}
              onClick={() => setValue('power_unit', 'mw')}
            >
              МВт
            </button>
            <button
              type="button"
              className={`${styles.unitButton} ${powerUnit === 'kw' ? styles.active : ''}`}
              onClick={() => setValue('power_unit', 'kw')}
            >
              кВт
            </button>
          </div>

          <input
            type="number"
            step="0.01"
            {...register('power_value', { valueAsNumber: true })}
            className={`${styles.powerInput} ${errors.power_value ? styles.error : ''}`}
          />
        </div>

        {powerValue > 0 && (
          <div className={styles.powerHint}>
            {powerUnit === 'mw'
              ? `${powerValue} МВт = ${powerValue * 1000} кВт`
              : `${powerValue} кВт = ${(powerValue / 1000).toFixed(3)} МВт`}
          </div>
        )}
        
        {errors.power_value && (
          <p className={styles.errorText}>{errors.power_value.message}</p>
        )}
      </div>

      <div className={styles.formField}>
        <label>Описание</label>
        <textarea 
          {...register('description')} 
          rows={3}
          placeholder="Дополнительная информация об объекте"
        />
      </div>

      <div className={styles.formActions}>
        <Button type="submit" loading={updateMutation.isPending}>
          Сохранить
        </Button>
        <Button 
          type="button" 
          variant="secondary"
          onClick={() => router.push('/admin/objects')}
        >
          Отмена
        </Button>
      </div>
    </form>
  </div>
);
}