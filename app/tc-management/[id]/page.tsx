'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { 
  TCDetails,
  formatDate, 
  getStatusLabel, 
  getTCTypeLabel,
  getResourceTypeLabel,
  getObjectTypeLabel,
  getUnitLabel,
  isExpiringSoon,
  getDaysUntilExpiry
} from '@/types';
import Header from '@/components/Header/Header';
import styles from './page.module.css';

export default function TCDetailPage() {
  const { isAuthenticated, loading: authLoading, isAdmin } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // const [isDownloading, setIsDownloading] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);

  // Загружаем детальную информацию о ТУ
  const { data: tc, isLoading, error } = useQuery({
    queryKey: ['tc-details', id],
    queryFn: async () => {
      const res = await api.get<TCDetails>(`/technical-conditions/${id}/details`);
      return res.data;
    },
    enabled: !!id && isAuthenticated,
  });

  // Просмотр PDF в модальном окне
  const handleViewPDF = async () => {
    try {
      setIsLoadingPDF(true);
      const response = await api.get(`/technical-conditions/${id}/document/view`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setShowPDFModal(true);
    } catch (error) {
      console.error('Ошибка при загрузке PDF:', error);
      alert('Не удалось загрузить PDF для просмотра');
    } finally {
      setIsLoadingPDF(false);
    }
  };

  // Закрытие модалки с очисткой URL
  const handleClosePDF = () => {
    setShowPDFModal(false);
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
    }
  };

  // // Скачивание PDF
  // const handleDownloadPDF = async () => {
  //   try {
  //     setIsDownloading(true);
  //     await downloadFile(
  //       `/technical-conditions/${id}/document`, 
  //       `test.pdf`
  //     );
  //   } catch (error) {
  //     console.error('Ошибка при скачивании PDF:', error);
  //     alert('Не удалось скачать файл. Возможно, документ не прикреплён.');
  //   } finally {
  //     setIsDownloading(false);
  //   }
  // };

  // Удаление ТУ
  const handleDelete = async () => {
    try {
      await api.delete(`/technical-conditions/${id}`);
      router.push('/admin/tc-management');
    } catch (error) {
      console.error('Ошибка при удалении ТУ:', error);
      alert('Не удалось удалить ТУ');
    }
  };

  // Состояния загрузки
  if (authLoading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Загрузка данных...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  // Состояние ошибки
  if (error || !tc) {
    return (
      <div className={styles.container}>
        <Header />
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2>ТУ не найдено</h2>
          <p>Техническое условие с ID {id} не существует или было удалено</p>
          <Link href="/admin/tc-management" className={styles.backButton}>
            ← Вернуться к списку ТУ
          </Link>
        </div>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry(tc);
  const expiringSoon = isExpiringSoon(tc);

  return (
    <div className={styles.container}>
      <Header />

      <div className={styles.content}>
        {/* Хлебные крошки */}
        <div className={styles.breadcrumbs}>
          <Link href="/dashboard" className={styles.breadcrumbLink}>Главная</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <Link href="/admin/tc-management" className={styles.breadcrumbLink}>ТУ</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>{tc.tc_number}</span>
        </div>

        {/* Заголовок */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>
              Технические условия №{tc.tc_number}
            </h1>
            <div className={styles.badges}>
              <span className={`${styles.badge} ${styles[`status_${tc.status}`]}`}>
                {getStatusLabel(tc.status)}
              </span>
              <span className={`${styles.badge} ${styles[`type_${tc.resource_type}`]}`}>
                {getResourceTypeLabel(tc.resource_type)}
              </span>
              <span className={styles.badge}>
                {getTCTypeLabel(tc.tc_type)}
              </span>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            {tc.document_file && (
              <>
                <button 
                  onClick={handleViewPDF}
                  disabled={isLoadingPDF}
                  className={styles.viewButton}
                >
                  {isLoadingPDF ? '⏳ Загрузка...' : ' Просмотреть PDF'}
                </button>
              </>
            )}
            {isAdmin && (
              <>
                <Link 
                  href={`/admin/tc-management/${tc.id}/edit`}
                  className={styles.editButton}
                >
                   Редактировать ТУ
                </Link>
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className={styles.deleteButton}
                >
                   Удалить ТУ
                </button>
              </>
            )}
          </div>
        </div>

        {/* Предупреждение о скором истечении */}
        {expiringSoon && daysUntilExpiry !== null && (
          <div className={`${styles.alert} ${daysUntilExpiry <= 3 ? styles.alertDanger : styles.alertWarning}`}>
            <span className={styles.alertIcon}>
              {daysUntilExpiry <= 3 ? '🔴' : '🟡'}
            </span>
            <div className={styles.alertContent}>
              <strong>Внимание!</strong>
              <p>
                {daysUntilExpiry === 0 
                  ? 'Срок действия ТУ истекает сегодня!' 
                  : `Срок действия ТУ истекает через ${daysUntilExpiry} ${getDayWord(daysUntilExpiry)}`
                }
              </p>
            </div>
          </div>
        )}

        {/* Основная информация */}
        <div className={styles.sections}>
          {/* Карточка ТУ */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Основная информация</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Номер ТУ</span>
                <span className={styles.infoValue}>{tc.tc_number}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Тип ТУ</span>
                <span className={styles.infoValue}>{getTCTypeLabel(tc.tc_type)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Тип ресурса</span>
                <span className={styles.infoValue}>
                  {tc.resource_type === 'electricity' ? '⚡' : '💧'} {getResourceTypeLabel(tc.resource_type)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Статус</span>
                <span className={`${styles.infoValue} ${styles[`status_${tc.status}`]}`}>
                  {getStatusLabel(tc.status)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Ячейка</span>
                <span className={styles.infoValue}>№{tc.cell_number}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Мощность</span>
                <span className={styles.infoValue}>
                  {tc.power_amount} {getUnitLabel(tc.power_unit)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Дата выдачи</span>
                <span className={styles.infoValue}>{formatDate(tc.issue_date)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Дата окончания</span>
                <span className={styles.infoValue}>
                  {tc.tc_type === 'permanent' ? 'Бессрочно' : formatDate(tc.expiry_date)}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Создано</span>
                <span className={styles.infoValue}>
                  {formatDate(tc.created_at)}
                  {tc.created_by_name && ` (${tc.created_by_name})`}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Обновлено</span>
                <span className={styles.infoValue}>{formatDate(tc.updated_at)}</span>
              </div>
            </div>

            {/* Примечания */}
            {tc.notes && (
              <div className={styles.notesSection}>
                <h3 className={styles.notesTitle}>Примечания</h3>
                <p className={styles.notesText}>{tc.notes}</p>
              </div>
            )}

            {/* Ссылка на документ */}
            {tc.document_link && (
              <div className={styles.documentLinkSection}>
                <h3 className={styles.notesTitle}>Ссылка на документ</h3>
                <a 
                  href={tc.document_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.externalLink}
                >
                  🔗 Открыть документ
                </a>
              </div>
            )}
          </div>

          {/* Карточка организации */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Организация</h2>
            {tc.organization_details ? (
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Название</span>
                  <span className={styles.infoValue}>{tc.organization_details.name}</span>
                </div>
                {tc.organization_details.bin && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>БИН</span>
                    <span className={styles.infoValue}>{tc.organization_details.bin}</span>
                  </div>
                )}
                {tc.organization_details.address && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Адрес</span>
                    <span className={styles.infoValue}>{tc.organization_details.address}</span>
                  </div>
                )}
                {tc.organization_details.contact_person && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Контактное лицо</span>
                    <span className={styles.infoValue}>{tc.organization_details.contact_person}</span>
                  </div>
                )}
                {tc.organization_details.contact_phone && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Телефон</span>
                    <span className={styles.infoValue}>{tc.organization_details.contact_phone}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Название</span>
                  <span className={styles.infoValue}>{tc.organization_name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Карточка объекта */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Объект выдачи</h2>
            {tc.object_details ? (
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Название</span>
                  <span className={styles.infoValue}>
                    {tc.object_details.type === 'substation' && '⚡'}
                    {tc.object_details.type === 'tp' && '🔧'}
                    {tc.object_details.type === 'kru' && '⚙️'}
                    {' '}{tc.object_details.name}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Тип объекта</span>
                  <span className={styles.infoValue}>{getObjectTypeLabel(tc.object_details.type)}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Тип ресурса</span>
                  <span className={styles.infoValue}>{getResourceTypeLabel(tc.object_details.resource_type)}</span>
                </div>
                {tc.object_details.resource_type === 'electricity' ? (
                  <>
                    {tc.object_details.max_power_electricity_mw ? (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Мощность</span>
                        <span className={styles.infoValue}>{tc.object_details.max_power_electricity_mw} МВт</span>
                      </div>
                    ) : null}
                    {tc.object_details.max_power_electricity_kw ? (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Мощность (кВт)</span>
                        <span className={styles.infoValue}>{tc.object_details.max_power_electricity_kw} кВт</span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Мощность (м³/ч)</span>
                      <span className={styles.infoValue}>{tc.object_details.max_power_water_m3h || '—'} м³/ч</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Мощность (м³/сут)</span>
                      <span className={styles.infoValue}>{tc.object_details.max_power_water_m3d || '—'} м³/сут</span>
                    </div>
                  </>
                )}
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Количество ячеек</span>
                  <span className={styles.infoValue}>{tc.object_details.total_cells}</span>
                </div>
                {tc.object_details.description && (
                  <div className={styles.infoItemFull}>
                    <span className={styles.infoLabel}>Описание</span>
                    <span className={styles.infoValue}>{tc.object_details.description}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Название</span>
                  <span className={styles.infoValue}>{tc.object_name}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно для просмотра PDF */}
      {showPDFModal && (
        <div className={styles.modalOverlay} onClick={handleClosePDF}>
          <div className={styles.pdfModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pdfModalHeader}>
              <h3>Просмотр документа — ТУ №{tc.tc_number}</h3>
              <button onClick={handleClosePDF} className={styles.pdfModalClose}>
                ✕
              </button>
            </div>
            <div className={styles.pdfModalContent}>
              <iframe 
                src={pdfUrl} 
                className={styles.pdfIframe}
                title={`PDF документ ТУ №${tc.tc_number}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Подтверждение удаления</h3>
            <p className={styles.modalText}>
              Вы действительно хотите удалить ТУ №{tc.tc_number}? 
              Это действие нельзя будет отменить.
            </p>
            <div className={styles.modalActions}>
              <button 
                onClick={handleDelete}
                className={styles.modalDeleteButton}
              >
                Удалить
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className={styles.modalCancelButton}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Вспомогательная функция для склонения слова "день"
function getDayWord(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'дней';
  }
  
  if (lastDigit === 1) {
    return 'день';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня';
  }
  
  return 'дней';
}