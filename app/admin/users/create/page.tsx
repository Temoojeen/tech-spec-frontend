'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { Organization } from '@/types';
import Button from '@/components/ui/Button';
import styles from './page.module.scss';
import Header from '@/components/Header/Header';

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

const userSchema = z.object({
  username: z.string()
    .min(3, 'Имя пользователя должно содержать минимум 3 символа')
    .max(50, 'Имя пользователя не может быть длиннее 50 символов')
    .regex(/^[a-zA-Z0-9_]+$/, 'Имя пользователя может содержать только буквы, цифры и нижнее подчеркивание'),
  email: z.string()
    .email('Введите корректный email адрес')
    .min(1, 'Email обязателен'),
  password: z.string()
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
    .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру'),
  role: z.enum(['admin', 'user']),
  organization_name: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  organization_name?: string;
}

export default function CreateUserPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role: 'user',
      organization_name: '',
    },
  });

  // ✅ безопасное использование watch
  const selectedRole = useWatch({
    control,
    name: 'role',
  });

  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const response = await api.get<Organization[]>('/organizations/');
      return response.data;
    },
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const response = await api.post('/users/', data);
      return response.data;
    },
    onSuccess: () => router.push('/admin/users'),
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.error || 'Ошибка при создании пользователя. Попробуйте снова.';
      setServerError(errorMessage);
    },
  });

  const onSubmit = (data: UserFormData) => {
    setServerError(null);

    const requestData: CreateUserRequest = {
      username: data.username,
      email: data.email,
      password: data.password,
      role: data.role,
      organization_name: data.organization_name || undefined,
    };

    createMutation.mutate(requestData);
  };

  const handleCancel = () => {
    reset();
    router.push('/admin/users');
  };

  if (authLoading) return <div className={styles.loading}>Загрузка...</div>;
  if (!isAdmin) return null;

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.header}>
        <h1 className={styles.title}>Создание нового пользователя</h1>
        <Link href="/admin/users" className={styles.backLink}> к списку пользователей</Link>
      </div>

      {serverError && <div className={styles.serverError}>{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Основная информация</h2>

          <div className={styles.formGrid}>
            <div className={styles.formFieldFull}>
              <label htmlFor="username" className={styles.label}>Имя пользователя *</label>
              <input id="username" {...register('username')} className={`${styles.input} ${errors.username ? styles.error : ''}`} placeholder="john_doe" />
              {errors.username && <p className={styles.errorText}>{errors.username.message}</p>}
            </div>

            <div className={styles.formFieldFull}>
              <label htmlFor="email" className={styles.label}>Email *</label>
              <input id="email" type="email" {...register('email')} className={`${styles.input} ${errors.email ? styles.error : ''}`} placeholder="user@example.com" />
              {errors.email && <p className={styles.errorText}>{errors.email.message}</p>}
            </div>

            <div className={styles.formFieldFull}>
              <label htmlFor="password" className={styles.label}>Пароль *</label>
              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`${styles.input} ${errors.password ? styles.error : ''}`}
                  placeholder="••••••"
                />
                <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <p className={styles.errorText}>{errors.password.message}</p>}
            </div>

            <div className={styles.formField}>
              <label htmlFor="role" className={styles.label}>Роль *</label>
              <select id="role" {...register('role')} className={`${styles.select} ${errors.role ? styles.error : ''}`}>
                <option value="">Выберите роль</option>
                <option value="user">Пользователь</option>
                <option value="admin">Администратор</option>
              </select>
              {errors.role && <p className={styles.errorText}>{errors.role.message}</p>}
            </div>

            {selectedRole === 'user' && (
              <div className={styles.formField}>
                <label htmlFor="organization_name" className={styles.label}>Организация</label>
                <input id="organization_name" {...register('organization_name')} className={`${styles.input} ${errors.organization_name ? styles.error : ''}`} placeholder="Название организации" list="organizations" />
                <datalist id="organizations">
                  {organizations?.map(org => <option key={org.id} value={org.name} />)}
                </datalist>
              </div>
            )}
          </div>
        </div>

        <div className={styles.formActions}>
          <Button type="submit" variant="primary" loading={createMutation.isPending} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Создание...' : 'Создать пользователя'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel} disabled={createMutation.isPending}>Отмена</Button>
        </div>
      </form>
    </div>
  );
}