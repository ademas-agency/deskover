<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArticlesStore } from '../../stores/articles'
import { useNotificationsStore } from '../../stores/notifications'
import type { Article } from '../../core/domain/entities/Article'
import { generateSlug } from '../../core/domain/entities/Article'
import BaseInput from '../components/ui/BaseInput.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import ImageUploader from '../components/ui/ImageUploader.vue'
import { supabase } from '../../infrastructure/api/client'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'
import {
  ArrowLeft, Save, Bold, Italic, List, ListOrdered,
  Heading1, Heading2, Quote, ImageIcon, Link, Undo, Redo,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useArticlesStore()
const notifications = useNotificationsStore()

const slug = computed(() => route.params.slug as string)
const article = ref<Article | null>(null)

const editor = useEditor({
  extensions: [
    StarterKit,
    TiptapImage,
    TiptapLink.configure({ openOnClick: false }),
    Markdown.configure({
      html: true,
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ],
  content: '',
  onUpdate: ({ editor: ed }) => {
    if (article.value) {
      article.value.content = (ed.storage as any).markdown.getMarkdown()
    }
  },
})

onMounted(async () => {
  if (!store.articles.length) {
    await store.fetchArticles()
  }
  article.value = store.getArticleBySlug(slug.value) || null
  if (article.value && editor.value) {
    editor.value.commands.setContent(article.value.content || '')
  }
})

function updateTitle(val: string | number) {
  if (article.value) {
    const str = String(val)
    article.value.title = str
    article.value.slug = generateSlug(str)
  }
}

async function handleSave() {
  if (!article.value) return
  await store.saveArticle(article.value)
  notifications.success('Article sauvegarde avec succes')
}

async function addImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !editor.value) return
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `inline/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('article-covers')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })
    if (upErr) {
      const url = prompt(`Upload échoué (${upErr.message}). Coller une URL :`)
      if (url) editor.value.chain().focus().setImage({ src: url }).run()
      return
    }
    const { data: pub } = supabase.storage.from('article-covers').getPublicUrl(fileName)
    editor.value.chain().focus().setImage({ src: pub.publicUrl }).run()
  }
  input.click()
}

function addLink() {
  const url = prompt('URL du lien :')
  if (url && editor.value) {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back button -->
    <div>
      <BaseButton variant="ghost" size="sm" @click="router.push({ name: 'articles' })">
        <ArrowLeft :size="16" />
        Retour aux articles
      </BaseButton>
    </div>

    <div v-if="!article" class="bg-edison/10 border border-edison/30 rounded-xl p-8 text-center">
      <p class="text-sm text-roast">Article non trouve</p>
    </div>

    <template v-else>
      <!-- Meta -->
      <BaseCard title="Informations">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BaseInput
            :modelValue="article.title"
            label="Titre"
            placeholder="Titre de l'article"
            @update:modelValue="updateTitle"
          />
          <BaseInput
            :modelValue="article.slug"
            label="Slug"
            readonly
          />
          <BaseInput
            v-model="article.city"
            label="Ville"
            placeholder="Paris, Lyon..."
          />
          <div class="space-y-1">
            <label class="block text-sm font-medium text-roast">Statut</label>
            <select
              v-model="article.status"
              class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
          </div>
          <BaseInput
            v-model="article.meta_description"
            label="Meta description"
            placeholder="Description pour le SEO..."
          />
        </div>

        <!-- Cover image -->
        <div class="mt-4">
          <ImageUploader
            :modelValue="article.cover_photo"
            label="Image hero"
            @update:modelValue="(v: string) => article && (article.cover_photo = v)"
          />
        </div>
      </BaseCard>

      <!-- Editor -->
      <BaseCard title="Contenu">
        <div class="tiptap-editor border border-steam/30 rounded-lg overflow-hidden">
          <!-- Toolbar -->
          <div v-if="editor" class="flex flex-wrap gap-1 p-2 border-b border-steam/15 bg-cream/50">
            <button
              type="button"
              :class="['p-1.5 rounded transition-colors', editor.isActive('bold') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']"
              @click="editor.chain().focus().toggleBold().run()"
            >
              <Bold :size="16" />
            </button>
            <button
              type="button"
              :class="['p-1.5 rounded transition-colors', editor.isActive('italic') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']"
              @click="editor.chain().focus().toggleItalic().run()"
            >
              <Italic :size="16" />
            </button>
            <div class="w-px h-6 bg-steam/20 self-center mx-1" />
            <button
              type="button"
              :class="['p-1.5 rounded transition-colors', editor.isActive('heading', { level: 2 }) ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']"
              @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
            >
              <Heading1 :size="16" />
            </button>
            <button
              type="button"
              :class="['p-1.5 rounded transition-colors', editor.isActive('heading', { level: 3 }) ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']"
              @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
            >
              <Heading2 :size="16" />
            </button>
            <div class="w-px h-6 bg-steam/20 self-center mx-1" />
            <button
              type="button"
              :class="['p-1.5 rounded transition-colors', editor.isActive('bulletList') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']"
              @click="editor.chain().focus().toggleBulletList().run()"
            >
              <List :size="16" />
            </button>
            <button
              type="button"
              :class="['p-1.5 rounded transition-colors', editor.isActive('orderedList') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']"
              @click="editor.chain().focus().toggleOrderedList().run()"
            >
              <ListOrdered :size="16" />
            </button>
            <button
              type="button"
              :class="['p-1.5 rounded transition-colors', editor.isActive('blockquote') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']"
              @click="editor.chain().focus().toggleBlockquote().run()"
            >
              <Quote :size="16" />
            </button>
            <div class="w-px h-6 bg-steam/20 self-center mx-1" />
            <button
              type="button"
              class="p-1.5 rounded text-roast hover:bg-linen transition-colors"
              @click="addImage"
            >
              <ImageIcon :size="16" />
            </button>
            <button
              type="button"
              :class="['p-1.5 rounded transition-colors', editor.isActive('link') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']"
              @click="addLink"
            >
              <Link :size="16" />
            </button>
            <div class="w-px h-6 bg-steam/20 self-center mx-1" />
            <button
              type="button"
              class="p-1.5 rounded text-roast hover:bg-linen transition-colors"
              @click="editor.chain().focus().undo().run()"
            >
              <Undo :size="16" />
            </button>
            <button
              type="button"
              class="p-1.5 rounded text-roast hover:bg-linen transition-colors"
              @click="editor.chain().focus().redo().run()"
            >
              <Redo :size="16" />
            </button>
          </div>

          <!-- Editor content -->
          <EditorContent :editor="editor" class="bg-white" />
        </div>
      </BaseCard>

      <!-- Save button -->
      <div class="flex justify-end sticky bottom-6">
        <BaseButton variant="primary" size="lg" @click="handleSave">
          <Save :size="18" />
          Sauvegarder
        </BaseButton>
      </div>
    </template>
  </div>
</template>
