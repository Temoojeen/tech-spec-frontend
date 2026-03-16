'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { 
  Organization, PowerObject, 
  ResourceType, TCType, PowerUnit 
} from '@/types';
import Button from '@/components/ui/Button';
import Header from '@/components/Header/Header';
import styles from './page.module.scss';

// ===== Типы для ответа от API =====
interface AvailableCellsResponse {
  available_cells: number[];
  free_power: number;
  free_power_unit: string;
  total_cells: number;
  occupied_cells: number;
}

/* =========================
   ZOD SCHEMA
========================= */
const tcSchema = z
  .object({
    organization_id: z
      .number()
      .refine(val => !isNaN(val) && val > 0, { message: 'Выберите организацию' }),

    object_id: z
      .number()
      .refine(val => !isNaN(val) && val > 0, { message: 'Выберите объект' }),

    cell_number: z
      .number()
      .refine(val => !isNaN(val) && val > 0, { message: 'Выберите ячейку' }),

    resource_type: z.enum(['electricity', 'water'] as const),

    tc_type: z.enum(['permanent', 'temporary'] as const),

    tc_number: z.string().min(1, 'Введите номер ТУ'),

    power_amount: z
      .number()
      .min(0.01, 'Мощность должна быть больше 0'),

    power_unit: z.enum(['kw', 'mw', 'm3h', 'm3d'] as const),

    issue_date: z.string().min(1, 'Выберите дату выдачи'),

    expiry_date: z.string().optional(),

    notes: z.string().optional(),
  })
  .refine(
    data => data.tc_type === 'permanent' || (data.tc_type === 'temporary' && !!data.expiry_date),
    {
      path: ['expiry_date'],
      message: 'Для временных ТУ необходимо указать дату окончания',
    }
  )
  .refine(
    data => {
      if (data.resource_type === 'electricity') {
        return ['kw', 'mw'].includes(data.power_unit);
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
    setValue,
    formState: { errors },
  } = useForm<TCFormData>({
    resolver: zodResolver(tcSchema),
    defaultValues: {
      resource_type: 'electricity',
      tc_type: 'permanent',
      power_unit: 'kw',
    },
  });

  // Отслеживаем изменения
  const resourceType = useWatch({ control, name: 'resource_type' }) as ResourceType;
  const tcType = useWatch({ control, name: 'tc_type' }) as TCType;
  const selectedObjectId = useWatch({ control, name: 'object_id' }) as number | undefined;
  const powerUnit = useWatch({ control, name: 'power_unit' }) as PowerUnit;

  // Автоматически меняем единицу измерения при смене типа ресурса
  useEffect(() => {
    if (resourceType === 'electricity') {
      setValue('power_unit', 'kw');
    } else {
      setValue('power_unit', 'm3h');
    }
  }, [resourceType, setValue]);

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
  const { data: allObjects, isLoading: objectsLoading } = useQuery({
    queryKey: ['objects'],
    queryFn: async () => {
      const res = await api.get<PowerObject[]>('/objects/');
      return res.data;
    },
  });

  // Фильтруем объекты по типу ресурса и исключаем подстанции
  const availableObjects = useMemo(() => {
    if (!allObjects) return [];
    return allObjects.filter(obj => 
      obj.resource_type === resourceType && 
      obj.type !== 'substation' // Только ТП и КРУ
    );
  }, [allObjects, resourceType]);

  // Загружаем информацию о свободных ячейках при выборе объекта
  const { data: cellData, refetch: refetchCells } = useQuery({
    queryKey: ['available-cells', selectedObjectId],
    queryFn: async () => {
      if (!selectedObjectId) return null;
      const res = await api.get<AvailableCellsResponse>(`/objects/${selectedObjectId}/available-cells`);
      return res.data;
    },
    enabled: !!selectedObjectId,
  });

  // Сбрасываем выбранную ячейку при смене объекта
  useEffect(() => {
    setValue('cell_number', undefined as unknown as number);
  }, [selectedObjectId, setValue]);

  /* =========================
     CREATE MUTATION
  ========================= */
  const createMutation = useMutation({
    mutationFn: async (data: TCFormData) => {
      const payload = {
        ...data,
        issue_date: new Date(data.issue_date).toISOString(),
        expiry_date: data.tc_type === 'temporary' && data.expiry_date
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
      const errorMsg = error.response?.data?.error;
      if (errorMsg?.includes('Недостаточно свободной мощности')) {
        setServerError('Недостаточно свободной мощности на выбранном объекте');
      } else if (errorMsg?.includes('ячейка уже занята')) {
        setServerError('Эта ячейка уже занята. Пожалуйста, выберите другую');
        refetchCells(); // Обновляем список свободных ячеек
      } else {
        setServerError(errorMsg || 'Ошибка при создании ТУ. Попробуйте снова.');
      }
    },
  });

  const onSubmit = (data: TCFormData) => {
    setServerError(null);
    createMutation.mutate(data);
  };

  /* =========================
     ADD CELLS HANDLER
  ========================= */
  const handleAddCells = async () => {
    const additionalCells = prompt('Сколько ячеек добавить?', '1');
    if (!additionalCells) return;
    
    const num = parseInt(additionalCells);
    if (isNaN(num) || num <= 0) {
      alert('Введите положительное число');
      return;
    }

    try {
      await api.post(`/objects/${selectedObjectId}/add-cells`, {
        additional_cells: num
      });
      refetchCells(); // Обновляем список ячеек
      alert(`Добавлено ${num} ячеек`);
    } catch (error) {
      alert('Ошибка при добавлении ячеек');
      console.log(error)
    }
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

      <div className={styles.header}>
        <h1 className={styles.title}>Создание нового ТУ</h1>
        <Link href="/admin/tc-management" className={styles.backLink}>
          ← Назад к списку
        </Link>
      </div>

      {serverError && (
        <div className={styles.serverError}>{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.formGrid}>
          {/* Организация */}
          <div className={styles.formField}>
            <label className={styles.label}>
              Организация <span className={styles.required}>*</span>
            </label>
            <select 
              {...register('organization_id', { valueAsNumber: true })}
              className={`${styles.select} ${errors.organization_id ? styles.error : ''}`}
            >
              <option value="">Выберите организацию</option>
              {organizations?.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            {errors.organization_id && (
              <p className={styles.errorText}>{errors.organization_id.message}</p>
            )}
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
                onClick={() => setValue('resource_type', 'electricity')}
              >
                ⚡ Электроснабжение
              </button>
              <button
                type="button"
                className={`${styles.resourceButton} ${
                  resourceType === 'water' ? styles.active : ''
                }`}
                onClick={() => setValue('resource_type', 'water')}
              >
                💧 Водоснабжение
              </button>
            </div>
            <input type="hidden" {...register('resource_type')} />
            {errors.resource_type && (
              <p className={styles.errorText}>{errors.resource_type.message}</p>
            )}
          </div>

          {/* Объект */}
          <div className={styles.formField}>
            <label className={styles.label}>
              Объект выдачи <span className={styles.required}>*</span>
            </label>
            <select 
              {...register('object_id', { valueAsNumber: true })}
              className={`${styles.select} ${errors.object_id ? styles.error : ''}`}
              disabled={availableObjects.length === 0}
            >
              <option value="">Выберите объект</option>
              {availableObjects.map(obj => (
                <option key={obj.id} value={obj.id}>
                  {obj.name} — {obj.resource_type === 'electricity' 
                    ? `${obj.max_power_electricity_kw} кВт` 
                    : `${obj.max_power_water_m3h} м³/ч`}
                </option>
              ))}
            </select>
            {errors.object_id && (
              <p className={styles.errorText}>{errors.object_id.message}</p>
            )}
          </div>

          {/* Информация о выбранном объекте и выбор ячейки */}
          {selectedObjectId && cellData && (
            <div className={styles.formFieldFull}>
              <div className={styles.objectInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Свободная мощность:</span>
                  <span className={styles.infoValue}>
                    {cellData.free_power.toFixed(2)} {cellData.free_power_unit}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Ячейки:</span>
                  <span className={styles.infoValue}>
                    {cellData.available_cells.length} / {cellData.total_cells} свободно
                  </span>
                </div>
              </div>

              {cellData.available_cells.length > 0 ? (
                <div className={styles.formField}>
                  <label className={styles.label}>
                    Выберите ячейку <span className={styles.required}>*</span>
                  </label>
                  <select
                    {...register('cell_number', { valueAsNumber: true })}
                    className={`${styles.select} ${errors.cell_number ? styles.error : ''}`}
                  >
                    <option value="">Выберите ячейку</option>
                    {cellData.available_cells.map((cellNum: number) => (
                      <option key={cellNum} value={cellNum}>
                        Ячейка №{cellNum}
                      </option>
                    ))}
                  </select>
                  {errors.cell_number && (
                    <p className={styles.errorText}>{errors.cell_number.message}</p>
                  )}
                </div>
              ) : (
                <div className={styles.warning}>
                  <p className={styles.warningText}>
                    ⚠️ Нет свободных ячеек
                  </p>
                  {cellData.free_power > 0 && (
                    isAdmin &&
                    <button
                      type="button"
                      onClick={handleAddCells}
                      className={styles.addCellButton}
                    >
                      + Добавить ячейку
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Тип ТУ */}
          <div className={styles.formField}>
            <label className={styles.label}>
              Тип ТУ <span className={styles.required}>*</span>
            </label>
            <select 
              {...register('tc_type')}
              className={`${styles.select} ${errors.tc_type ? styles.error : ''}`}
            >
              <option value="permanent">Постоянное</option>
              <option value="temporary">Временное</option>
            </select>
          </div>

          {/* Номер ТУ */}
          <div className={styles.formField}>
            <label className={styles.label}>
              Номер ТУ <span className={styles.required}>*</span>
            </label>
            <input 
              {...register('tc_number')}
              className={`${styles.input} ${errors.tc_number ? styles.error : ''}`}
              placeholder="ТУ-2024-001"
            />
            {errors.tc_number && (
              <p className={styles.errorText}>{errors.tc_number.message}</p>
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
                        powerUnit === 'kw' ? styles.active : ''
                      }`}
                      onClick={() => setValue('power_unit', 'kw')}
                    >
                      кВт
                    </button>
                    <button
                      type="button"
                      className={`${styles.unitButton} ${
                        powerUnit === 'mw' ? styles.active : ''
                      }`}
                      onClick={() => setValue('power_unit', 'mw')}
                    >
                      МВт
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
                {...register('power_amount', { valueAsNumber: true })}
                className={`${styles.powerInput} ${errors.power_amount ? styles.error : ''}`}
                placeholder="0.00"
              />
            </div>

            {errors.power_amount && (
              <p className={styles.errorText}>{errors.power_amount.message}</p>
            )}
            {errors.power_unit && (
              <p className={styles.errorText}>{errors.power_unit.message}</p>
            )}
          </div>

          {/* Дата выдачи */}
          <div className={styles.formField}>
            <label className={styles.label}>
              Дата выдачи <span className={styles.required}>*</span>
            </label>
            <input 
              type="date" 
              {...register('issue_date')}
              className={`${styles.input} ${errors.issue_date ? styles.error : ''}`}
            />
            {errors.issue_date && (
              <p className={styles.errorText}>{errors.issue_date.message}</p>
            )}
          </div>

          {/* Дата окончания (для временных) */}
          {tcType === 'temporary' && (
            <div className={styles.formField}>
              <label className={styles.label}>
                Дата окончания <span className={styles.required}>*</span>
              </label>
              <input 
                type="date" 
                {...register('expiry_date')}
                className={`${styles.input} ${errors.expiry_date ? styles.error : ''}`}
              />
              {errors.expiry_date && (
                <p className={styles.errorText}>{errors.expiry_date.message}</p>
              )}
            </div>
          )}

          {/* Примечания */}
          <div className={styles.formFieldFull}>
            <label className={styles.label}>Примечания</label>
            <textarea 
              rows={4} 
              {...register('notes')}
              className={styles.textarea}
              placeholder="Дополнительная информация..."
            />
          </div>
        </div>

        <div className={styles.formActions}>
          <Button
            type="submit"
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Создание...' : 'Создать ТУ'}
          </Button>

          <Link href="/admin/tc-management" className={styles.cancelButton}>
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}