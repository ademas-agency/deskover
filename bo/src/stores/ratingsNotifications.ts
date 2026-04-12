import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../infrastructure/api/client'

const STORAGE_KEY = 'bo_ratings_last_seen'

export const useRatingsNotificationsStore = defineStore('ratingsNotifications', () => {
  const unreadCount = ref(0)
  const lastSeenAt = ref<string>(localStorage.getItem(STORAGE_KEY) || new Date(0).toISOString())

  async function fetchUnreadCount() {
    const { count, error } = await supabase
      .from('ratings')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', lastSeenAt.value)
      .or('source.is.null,source.neq.creation')

    if (!error) unreadCount.value = count || 0
  }

  function markAsSeen() {
    const now = new Date().toISOString()
    lastSeenAt.value = now
    localStorage.setItem(STORAGE_KEY, now)
    unreadCount.value = 0
  }

  return { unreadCount, lastSeenAt, fetchUnreadCount, markAsSeen }
})
