<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '../../../infrastructure/api/client'
import { Upload, X, Loader2, AlertCircle } from 'lucide-vue-next'
import { getImageStatus } from '../../../core/services/articleImageStatus'

const props = defineProps<{
  modelValue: string
  bucket?: string
  pathPrefix?: string
  label?: string
  height?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const uploading = ref(false)
const error = ref('')
const dragOver = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const bucket = props.bucket || 'article-covers'
const pathPrefix = props.pathPrefix || 'covers'
const previewHeight = props.height || 'h-[260px] lg:h-[400px]'

const isExternal = computed(() => getImageStatus(props.modelValue) === 'external')

async function handleFile(file: File) {
  if (!file) return
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    error.value = 'Format non supporté (jpeg, png, webp uniquement)'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image trop lourde (max 5 Mo)'
    return
  }

  uploading.value = true
  error.value = ''

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${pathPrefix}/${crypto.randomUUID()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { cacheControl: '3600', upsert: false })

  if (upErr) {
    error.value = upErr.message
    uploading.value = false
    return
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fileName)
  emit('update:modelValue', pub.publicUrl)
  uploading.value = false
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function clearImage() {
  emit('update:modelValue', '')
  if (inputRef.value) inputRef.value.value = ''
}

function setUrl() {
  const url = prompt('URL de l\'image :', props.modelValue)
  if (url !== null) emit('update:modelValue', url)
}
</script>

<template>
  <div class="space-y-2">
    <label v-if="label" class="block text-sm font-medium text-roast">{{ label }}</label>

    <!-- Preview -->
    <div v-if="modelValue" class="space-y-2">
      <div
        :class="['relative rounded-xl overflow-hidden bg-linen border border-steam/15', previewHeight]"
      >
        <img :src="modelValue" alt="Cover" class="w-full h-full object-cover" />
        <div class="absolute inset-x-0 top-0 bg-gradient-to-b from-black/30 to-transparent h-20 pointer-events-none" />
        <div class="absolute top-2 right-2 flex gap-1.5">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md bg-white/90 text-xs font-semibold text-espresso hover:bg-white transition-colors"
            @click="setUrl"
          >
            URL
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md bg-white/90 text-xs font-semibold text-espresso hover:bg-white transition-colors"
            @click="inputRef?.click()"
          >
            Remplacer
          </button>
          <button
            type="button"
            class="p-1.5 rounded-md bg-white/90 text-red-500 hover:bg-white transition-colors"
            @click="clearImage"
          >
            <X :size="14" />
          </button>
        </div>
      </div>

      <!-- Status -->
      <div v-if="isExternal" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-edison/10 text-edison text-xs">
        <AlertCircle :size="14" class="shrink-0" />
        <span>Image en URL : à remplacer par un upload sur notre Storage pour la pérennité.</span>
      </div>
      <p class="text-xs text-steam">
        Aperçu au format réel du site (260px mobile, 400px desktop).
      </p>
    </div>

    <!-- Dropzone -->
    <label
      v-else
      :class="[
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors',
        previewHeight,
        dragOver ? 'border-primary bg-primary/5' : 'border-steam/30 bg-cream/30 hover:border-primary/50 hover:bg-linen/50'
      ]"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop="onDrop"
    >
      <Loader2 v-if="uploading" :size="28" class="text-primary animate-spin" />
      <template v-else>
        <Upload :size="28" class="text-steam mb-2" />
        <p class="text-sm font-semibold text-espresso">Glisse une image ou clique</p>
        <p class="text-xs text-steam mt-1">JPG, PNG, WebP — max 5 Mo</p>
      </template>
      <input
        ref="inputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        @change="onFileChange"
      />
    </label>

    <!-- Hidden input pour replacement -->
    <input
      v-if="modelValue"
      ref="inputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="onFileChange"
    />

    <!-- URL fallback button when empty -->
    <button
      v-if="!modelValue && !uploading"
      type="button"
      class="text-xs text-primary hover:underline"
      @click="setUrl"
    >
      Ou coller une URL
    </button>

    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
