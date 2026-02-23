import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import tcService from '@/services/tc.service';
import { ResourceType, TCType, CreateTCRequest } from '@/types';
import toast from 'react-hot-toast';

export function useTC(resourceType?: ResourceType, tcType?: TCType) {
  return useQuery({
    queryKey: ['technical-conditions', resourceType, tcType],
    queryFn: () => tcService.getAll(resourceType, tcType),
  });
}

export function useCreateTC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTCRequest) => tcService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-conditions'] });
      toast.success('ТУ успешно создано');
    },
    onError: () => {
      toast.error('Ошибка при создании ТУ');
    },
  });
}

export function useUpdateTC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateTCRequest }) => 
      tcService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-conditions'] });
      toast.success('ТУ успешно обновлено');
    },
    onError: () => {
      toast.error('Ошибка при обновлении ТУ');
    },
  });
}

export function useDeleteTC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => tcService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-conditions'] });
      toast.success('ТУ успешно удалено');
    },
    onError: () => {
      toast.error('Ошибка при удалении ТУ');
    },
  });
}