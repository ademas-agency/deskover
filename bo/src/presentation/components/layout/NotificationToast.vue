<script setup lang="ts">
import { useNotificationsStore } from '../../../stores/notifications'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next'

const store = useNotificationsStore()

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'bg-monstera text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-edison text-white',
  info: 'bg-blue-600 text-white',
}
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50 space-y-2">
    <TransitionGroup name="toast">
      <div
        v-for="notification in store.notifications"
        :key="notification.id"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px]',
          colors[notification.type],
        ]"
      >
        <component :is="icons[notification.type]" :size="18" />
        <span class="text-sm font-medium flex-1">{{ notification.message }}</span>
        <button @click="store.remove(notification.id)" class="opacity-70 hover:opacity-100">
          <X :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
