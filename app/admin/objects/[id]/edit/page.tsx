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
import Header from '@/components/Header/Header';

// ===== API Error =====
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

// ===== Zod schema =====
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

type ObjectFormData = z.infer<typeof objectSchema>;

// ===== Вспомогательные функции =====

// Функция для определения подходящей единицы измерения на основе мощности объекта
const determinePowerUnit = (obj: PowerObject): { value: number; unit: 'mw' | 'kw' | 'm3h' | 'm3d' } => {
  if (obj.resource_type === 'electricity') {
    // Для электричества, если мощность в МВт >= 1, показываем в МВт, иначе в кВт
    if (obj.max_power_electricity_mw && obj.max_power_electricity_mw >= 1) {
      return { value: obj.max_power_electricity_mw, unit: 'mw' };
    }
    return { value: obj.max_power_electricity_kw || 0, unit: 'kw' };
  } else {
    // Для воды показываем в м³/ч (более привычная единица)
    return { value: obj.max_power_water_m3h || 0, unit: 'm3h' };
  }
};

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
      resource_type: 'electricity',
      power_value: 0,
      power_unit: 'mw',
      description: '',
    },
  });

  // ===== useWatch для отслеживания изменений =====
  const resourceType = useWatch({ control, name: 'resource_type' });
  const powerUnit = useWatch({ control, name: 'power_unit' });
  const powerValue = useWatch({ control, name: 'power_value' }); // Добавлено

  // Автоматически меняем единицу измерения при смене типа ресурса
  const handleResourceTypeChange = (type: 'electricity' | 'water') => {
    setValue('resource_type', type);
    if (type === 'electricity') {
      setValue('power_unit', 'mw');
    } else {
      setValue('power_unit', 'm3h');
    }
  };

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

    const powerInfo = determinePowerUnit(object);

    reset({
      name: object.name,
      type: object.type,
      resource_type: object.resource_type,
      power_value: powerInfo.value,
      power_unit: powerInfo.unit,
      description: object.description || '',
    });
  }, [object, reset]);

  // ===== Mutation =====
  const updateMutation = useMutation({
    mutationFn: async (data: ObjectFormData) => {
      const res = await api.put(`/objects/${id}`, data);
      return res.data;
    },
    onSuccess: () => router.push('/admin/objects'),
    onError: (error: ApiError) => {
      setServerError(
        error.response?.data?.error ||
          'Ошибка при обновлении объекта'
      );
    },
  });

  // ===== Submit =====
  const onSubmit = (data: ObjectFormData) => {
    setServerError(null);
    updateMutation.mutate(data);
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
      <Header />
      
      <div className={styles.header}>
        <h1 className={styles.title}>Редактирование объекта</h1>
        <button 
          onClick={() => router.push('/admin/objects')} 
          className={styles.backLink}
        >
           Назад к списку
        </button>
      </div>

      {serverError && (
        <div className={styles.serverError}>{serverError}</div>
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
              className={`${styles.input} ${errors.name ? styles.error : ''}`}
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
              className={`${styles.select} ${errors.type ? styles.error : ''}`}
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
                 Электроснабжение
              </button>
              <button
                type="button"
                className={`${styles.resourceButton} ${
                  resourceType === 'water' ? styles.active : ''
                }`}
                onClick={() => handleResourceTypeChange('water')}
              >
                 Водоснабжение
              </button>
            </div>
            {errors.resource_type && (
              <p className={styles.errorText}>{errors.resource_type.message}</p>
            )}
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
                className={`${styles.powerInput} ${errors.power_value ? styles.error : ''}`}
                placeholder="0.00"
              />
            </div>

            {errors.power_value && (
              <p className={styles.errorText}>{errors.power_value.message}</p>
            )}
            {errors.power_unit && (
              <p className={styles.errorText}>{errors.power_unit.message}</p>
            )}

            {/* Подсказка с конвертацией - ИСПРАВЛЕНО */}
            {powerUnit && resourceType === 'electricity' && (
              <p className={styles.hint}>
                {powerUnit === 'mw' 
                  ? '1 МВт = 1000 кВт'
                  : powerUnit === 'kw' && powerValue >= 1000
                  ? `${(powerValue / 1000).toFixed(2)} МВт`
                  : ''}
              </p>
            )}
            {powerUnit && resourceType === 'water' && (
              <p className={styles.hint}>
                {powerUnit === 'm3h'
                  ? '1 м³/ч = 24 м³/сут'
                  : powerUnit === 'm3d'
                  ? `${(powerValue / 24).toFixed(2)} м³/ч`
                  : ''}
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
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
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