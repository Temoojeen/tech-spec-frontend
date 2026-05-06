import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Добавление токена к запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Вспомогательная функция для скачивания файлов
export const downloadFile = async (url: string, filename: string) => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    
    // Извлекаем имя файла из заголовка Content-Disposition если есть
    const contentDisposition = response.headers['content-disposition']
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '')
      }
    }
    
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error('Ошибка при скачивании файла:', error)
    throw error
  }
}

// Вспомогательная функция для просмотра PDF в браузере
export const viewPDF = async (url: string) => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data], { type: 'application/pdf' })
    const viewUrl = window.URL.createObjectURL(blob)
    
    // Открываем в новой вкладке
    const newWindow = window.open(viewUrl, '_blank')
    
    // Очищаем URL через некоторое время
    if (newWindow) {
      newWindow.onload = () => {
        // Не очищаем сразу, даём браузеру загрузить PDF
      }
    }
    
    // Очищаем URL после использования
    setTimeout(() => {
      window.URL.revokeObjectURL(viewUrl)
    }, 1000)
  } catch (error) {
    console.error('Ошибка при просмотре PDF:', error)
    throw error
  }
}

// Вспомогательная функция для отправки multipart/form-data
export const uploadFormData = async (url: string, formData: FormData) => {
  try {
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error)
    throw error
  }
}

// Вспомогательная функция для обновления данных через multipart/form-data
export const updateFormData = async (url: string, formData: FormData) => {
  try {
    const response = await api.put(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    console.error('Ошибка при обновлении данных:', error)
    throw error
  }
}

export default api