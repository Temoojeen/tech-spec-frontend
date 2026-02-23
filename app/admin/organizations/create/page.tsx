'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import Button from '@/components/ui/Button';
import styles from './page.module.scss';
import Header from '@/components/Header/Header';

// Тип для ошибки API
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

// Схема валидации для организации
const organizationSchema = z.object({
  name: z.string().min(2, 'Название должно содержать минимум 2 символа'),
  bin: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  contact_person: z.string().optional().or(z.literal('')),
  contact_phone: z.string().optional().or(z.literal('')),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

// Интерфейс для отправки на бэкенд
interface CreateOrganizationRequest {
  name: string;
  bin?: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
}

export default function CreateOrganizationPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      bin: '',
      address: '',
      contact_person: '',
      contact_phone: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateOrganizationRequest) => {
      console.log('📤 Отправка данных организации:', data);
      const response = await api.post('/organizations/', data);
      return response.data;
    },
    onSuccess: () => {
      console.log('✅ Организация успешно создана');
      router.push('/admin/organizations');
    },
    onError: (error: ApiError) => {
      console.error('❌ Ошибка при создании организации:', error);
      const errorMessage = error.response?.data?.error || 'Ошибка при создании организации. Попробуйте снова.';
      setServerError(errorMessage);
    },
  });

  const onSubmit = (data: OrganizationFormData) => {
    setServerError(null);
    
    // Подготавливаем данные для отправки (убираем пустые строки)
    const requestData: CreateOrganizationRequest = {
      name: data.name,
      bin: data.bin || undefined,
      address: data.address || undefined,
      contact_person: data.contact_person || undefined,
      contact_phone: data.contact_phone || undefined,
    };

    console.log('📦 Подготовленные данные:', requestData);
    createMutation.mutate(requestData);
  };

  const handleCancel = () => {
    reset();
    router.push('/admin/organizations');
  };

  if (authLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={styles.container}>
        <Header/>
      <div className={styles.header}>
        <h1 className={styles.title}>Создание новой организации</h1>
        <Link href="/admin/organizations" className={styles.backLink}>
          ← к списку организаций
        </Link>
      </div>

      {serverError && (
        <div className={styles.serverError} role="alert">
          <p>{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Основная информация</h2>
          
          <div className={styles.formGrid}>
            <div className={styles.formFieldFull}>
              <label htmlFor="name" className={styles.label}>
                Название организации <span className={styles.required}>*</span>
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className={`${styles.input} ${errors.name ? styles.error : ''}`}
                placeholder="ООО &quot;Ромашка&quot;"
                aria-invalid={errors.name ? 'true' : 'false'}
              />
              {errors.name && (
                <p className={styles.errorText} role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="bin" className={styles.label}>
                БИН
              </label>
              <input
                id="bin"
                type="text"
                {...register('bin')}
                className={`${styles.input} ${errors.bin ? styles.error : ''}`}
                placeholder="7701234567"
                aria-invalid={errors.bin ? 'true' : 'false'}
              />
              {errors.bin && (
                <p className={styles.errorText} role="alert">
                  {errors.bin.message}
                </p>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="contact_phone" className={styles.label}>
                Контактный телефон
              </label>
              <input
                id="contact_phone"
                type="tel"
                {...register('contact_phone')}
                className={`${styles.input} ${errors.contact_phone ? styles.error : ''}`}
                placeholder="+7 (495) 123-45-67"
                aria-invalid={errors.contact_phone ? 'true' : 'false'}
              />
              {errors.contact_phone && (
                <p className={styles.errorText} role="alert">
                  {errors.contact_phone.message}
                </p>
              )}
            </div>

            <div className={styles.formFieldFull}>
              <label htmlFor="address" className={styles.label}>
                Адрес
              </label>
              <input
                id="address"
                type="text"
                {...register('address')}
                className={`${styles.input} ${errors.address ? styles.error : ''}`}
                placeholder="г. Москва, ул. Ленина, д. 1"
                aria-invalid={errors.address ? 'true' : 'false'}
              />
              {errors.address && (
                <p className={styles.errorText} role="alert">
                  {errors.address.message}
                </p>
              )}
            </div>

            <div className={styles.formFieldFull}>
              <label htmlFor="contact_person" className={styles.label}>
                Контактное лицо
              </label>
              <input
                id="contact_person"
                type="text"
                {...register('contact_person')}
                className={`${styles.input} ${errors.contact_person ? styles.error : ''}`}
                placeholder="Иванов Иван Иванович"
                aria-invalid={errors.contact_person ? 'true' : 'false'}
              />
              {errors.contact_person && (
                <p className={styles.errorText} role="alert">
                  {errors.contact_person.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <Button 
            type="submit" 
            variant="primary" 
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Создание...' : 'Создать организацию'}
          </Button>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleCancel}
            disabled={createMutation.isPending}
          >
            Отмена
          </Button>
        </div>
      </form>
    </div>
  );
}