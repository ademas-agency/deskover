// Suppress known mapbox-gl v3 bug: "Invalid LngLat object: (NaN, NaN)"
// This is an internal rendering error that doesn't affect map functionality.
// See: https://github.com/mapbox/mapbox-gl-js/issues/13400
export default defineNuxtPlugin(() => {
  window.addEventListener('error', (e) => {
    if (e.message?.includes('Invalid LngLat')) {
      e.preventDefault()
    }
  })

  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.message?.includes('Invalid LngLat')) {
      e.preventDefault()
    }
  })
})
