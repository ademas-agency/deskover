<script setup lang="ts">
import TheSidebar from './TheSidebar.vue'
import TheHeader from './TheHeader.vue'
import NotificationToast from './NotificationToast.vue'
</script>

<template>
  <div class="min-h-screen bg-background">
    <TheSidebar />
    <div class="ml-64 flex flex-col min-h-screen">
      <TheHeader />
      <main class="flex-1 p-8">
        <slot />
      </main>
    </div>
    <NotificationToast />
  </div>
</template>
