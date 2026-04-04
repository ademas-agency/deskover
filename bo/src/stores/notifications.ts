import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notification {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

let nextId = 0

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])

  function add(type: Notification['type'], message: string) {
    const id = nextId++
    notifications.value.push({ id, type, message })
    setTimeout(() => remove(id), 4000)
  }

  function remove(id: number) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  function success(message: string) { add('success', message) }
  function error(message: string) { add('error', message) }
  function warning(message: string) { add('warning', message) }
  function info(message: string) { add('info', message) }

  return { notifications, add, remove, success, error, warning, info }
})
