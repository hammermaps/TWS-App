<template>
  <CFooter class="safe-area-bottom px-4">
    <div>
WLS
      <span class="ms-1"
        >&copy; {{ new Date().getFullYear() }} Lucas Eulberg.</span
      >
    </div>
    <div class="ms-auto">
      WLS-App Version {{ appVersion }}
    </div>
    <div class="ms-auto d-flex align-items-center">
      <span class="me-1" target="_blank">Powered by</span>
      <a href="https://coreui.io/vue">CoreUI</a>
    </div>
  </CFooter>
</template>

<script setup>
const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'
</script>
