<script setup lang="ts">
import { computed, ref } from 'vue'

interface Series {
  label: string
  color: string
  data: { date: string; value: number }[]
  invert?: boolean
  format?: (n: number) => string
}

const props = defineProps<{
  series: Series[]
  height?: number
}>()

const VIEW_W = 1000
const VIEW_H = props.height || 320
const PAD_X = 28
const PAD_TOP = 24
const PAD_BOTTOM = 36

const hover = ref<{ x: number; date: string; idx: number } | null>(null)

const allDates = computed(() => {
  const set = new Set<string>()
  for (const s of props.series) for (const d of s.data) set.add(d.date)
  return [...set].sort()
})

interface Path {
  d: string
  pts: { x: number; y: number; v: number; date: string }[]
  min: number
  max: number
}

const xStep = computed(() => {
  const n = allDates.value.length
  return (VIEW_W - PAD_X * 2) / Math.max(n - 1, 1)
})

function pathFor(serie: Series): Path {
  const dates = allDates.value
  const map = new Map(serie.data.map(d => [d.date, d.value]))
  const valid: number[] = []
  for (const d of dates) {
    const v = map.get(d)
    if (v !== undefined && v !== null) valid.push(v)
  }
  if (valid.length === 0) return { d: '', pts: [], min: 0, max: 0 }
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1
  const yScale = (v: number) => {
    const norm = (v - min) / range
    const flipped = serie.invert ? norm : 1 - norm
    return PAD_TOP + flipped * (VIEW_H - PAD_TOP - PAD_BOTTOM)
  }
  const pts: Path['pts'] = []
  for (let i = 0; i < dates.length; i++) {
    const v = map.get(dates[i])
    if (v === undefined || v === null) continue
    pts.push({ x: PAD_X + i * xStep.value, y: yScale(v), v, date: dates[i] })
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return { d, pts, min, max }
}

const seriesPaths = computed(() => props.series.map(pathFor))

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const tickDates = computed(() => {
  const dates = allDates.value
  if (dates.length <= 6) return dates
  const step = Math.ceil(dates.length / 6)
  return dates.filter((_, i) => i % step === 0 || i === dates.length - 1)
})

function onMouseMove(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * VIEW_W
  const idx = Math.round((x - PAD_X) / xStep.value)
  if (idx < 0 || idx >= allDates.value.length) { hover.value = null; return }
  hover.value = { x: PAD_X + idx * xStep.value, date: allDates.value[idx], idx }
}
function onLeave() { hover.value = null }

function valueOf(serie: Series, date: string): number | null {
  const v = serie.data.find(d => d.date === date)?.value
  return v === undefined ? null : v
}
</script>

<template>
  <div class="w-full">
    <div class="relative" @mousemove="onMouseMove" @mouseleave="onLeave">
      <svg :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`" class="w-full block" :style="{ height: VIEW_H + 'px' }">
        <!-- Bottom grid line -->
        <line :x1="PAD_X" :y1="VIEW_H - PAD_BOTTOM" :x2="VIEW_W - PAD_X" :y2="VIEW_H - PAD_BOTTOM"
              stroke="var(--color-steam)" stroke-opacity="0.15" />

        <!-- X ticks -->
        <g v-for="d in tickDates" :key="d">
          <text
            :x="PAD_X + allDates.indexOf(d) * xStep"
            :y="VIEW_H - 14"
            text-anchor="middle"
            class="text-[11px] fill-[var(--color-steam)]"
          >{{ fmtDate(d) }}</text>
        </g>

        <!-- Series -->
        <g v-for="(p, i) in seriesPaths" :key="i">
          <path :d="p.d" :stroke="series[i].color" stroke-width="2" fill="none"
                stroke-linejoin="round" stroke-linecap="round" />
          <circle v-for="pt in p.pts" :key="pt.date"
                  :cx="pt.x" :cy="pt.y"
                  :r="hover && hover.date === pt.date ? 4 : 2.5"
                  :fill="series[i].color" />
        </g>

        <!-- Hover line -->
        <line v-if="hover" :x1="hover.x" :y1="PAD_TOP" :x2="hover.x" :y2="VIEW_H - PAD_BOTTOM"
              stroke="var(--color-roast)" stroke-opacity="0.3" stroke-dasharray="2 4" />
      </svg>

      <!-- Tooltip flottant : à droite du curseur si on est dans la 1ère moitié, à gauche sinon -->
      <div
        v-if="hover"
        class="absolute pointer-events-none bg-white border border-steam/20 shadow-lg rounded-lg px-3 py-2 text-xs"
        :class="(hover.x / VIEW_W) > 0.55 ? 'right-tooltip' : 'left-tooltip'"
        :style="(hover.x / VIEW_W) > 0.55
          ? { right: `calc(${100 - (hover.x / VIEW_W) * 100}% + 8px)`, top: '8px', minWidth: '160px' }
          : { left: `calc(${(hover.x / VIEW_W) * 100}% + 8px)`, top: '8px', minWidth: '160px' }"
      >
        <p class="text-espresso font-semibold mb-1.5">{{ fmtDate(hover.date) }}</p>
        <div v-for="s in series" :key="s.label" class="flex items-center justify-between gap-3 py-0.5">
          <span class="flex items-center gap-1.5 text-steam">
            <span class="w-2 h-2 rounded-full inline-block" :style="{ background: s.color }"></span>
            {{ s.label }}
          </span>
          <span v-if="valueOf(s, hover.date) !== null" class="text-espresso font-semibold tabular-nums">
            {{ s.format ? s.format(valueOf(s, hover.date)!) : valueOf(s, hover.date) }}
          </span>
          <span v-else class="text-steam">—</span>
        </div>
      </div>
    </div>

    <!-- Légende -->
    <div class="mt-3 flex flex-wrap items-center gap-4 text-xs">
      <span v-for="s in series" :key="s.label" class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full inline-block" :style="{ background: s.color }"></span>
        <span class="text-steam">{{ s.label }}</span>
      </span>
    </div>
  </div>
</template>
