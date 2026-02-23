'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { User, Organization } from '@/types';
import Button from '@/components/ui/Button';
import Header from '@/components/Header/Header';
import styles from './page.module.scss';

/* ===================== TYPES ===================== */

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

const userSchema = z.object({
  username: z
    .string()
    .min(3, 'Имя пользователя должно содержать минимум 3 символа')
    .max(50, 'Имя пользователя не может быть длиннее 50 символов')
    .regex(/^[a-zA-Z0-9_]+$/, 'Только буквы, цифры и _'),
  email: z.string().email('Введите корректный email'),
  password: z
    .string()
    .min(6, 'Минимум 6 символов')
    .regex(/[A-Z]/, 'Нужна заглавная буква')
    .regex(/[a-z]/, 'Нужна строчная буква')
    .regex(/[0-9]/, 'Нужна цифра')
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'user']),
  organization_name: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UpdateUserRequest {
  username: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  organization_name?: string;
}

/* ===================== PAGE ===================== */

export default function EditUserPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role: 'user',
      organization_name: '',
    },
  });

  /* ✅ React Compiler safe */
  const selectedRole = useWatch({
    control,
    name: 'role',
  });

  /* ===================== QUERIES ===================== */

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await api.get<User>(`/users/${id}`);
      return res.data;
    },
    enabled: !!id && isAdmin,
  });

  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await api.get<Organization[]>('/organizations/');
      return res.data;
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (user) {
      reset({
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
        organization_name: user.organization_name || '',
      });
    }
  }, [user, reset]);

  /* ===================== MUTATION ===================== */

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateUserRequest) => {
      return api.put(`/users/${id}`, data);
    },
    onSuccess: () => {
      router.push('/admin/users');
    },
    onError: (error: ApiError) => {
      setServerError(
        error.response?.data?.error ??
          'Ошибка при обновлении пользователя'
      );
    },
  });

  /* ===================== HANDLERS ===================== */

  const onSubmit = (data: UserFormData) => {
    setServerError(null);

    const payload: UpdateUserRequest = {
      username: data.username,
      email: data.email,
      role: data.role,
      organization_name: data.organization_name || undefined,
    };

    if (data.password?.trim()) {
      payload.password = data.password;
    }

    updateMutation.mutate(payload);
  };

  /* ===================== GUARDS ===================== */

  if (authLoading || userLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!isAdmin) return null;

  if (!user) {
    return (
      <div className={styles.container}>
        <h2>Пользователь не найден</h2>
        <Link href="/admin/users">← Назад</Link>
      </div>
    );
  }

  /* ===================== RENDER ===================== */

  return (
    <div className={styles.container}>
      <Header />

      <h1 className={styles.title}>
        Редактирование пользователя {user.username}
      </h1>

      {serverError && (
        <div className={styles.serverError}>{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <input {...register('username')} placeholder="Username" />
        {errors.username && <p>{errors.username.message}</p>}

        <input {...register('email')} placeholder="Email" />
        {errors.email && <p>{errors.email.message}</p>}

        <div>
          <input
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            placeholder="Новый пароль"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
          >
            👁
          </button>
        </div>

        <select {...register('role')}>
          <option value="user">Пользователь</option>
          <option value="admin">Администратор</option>
        </select>

        {selectedRole === 'user' && (
          <>
            <input
              {...register('organization_name')}
              list="organizations"
              placeholder="Организация"
            />
            <datalist id="organizations">
              {organizations?.map(org => (
                <option key={org.id} value={org.name} />
              ))}
            </datalist>
          </>
        )}

        <div className={styles.actions}>
          <Button type="submit" loading={updateMutation.isPending}>
            Сохранить
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/users')}
          >
            Отмена
          </Button>
        </div>
      </form>
    </div>
  );
}