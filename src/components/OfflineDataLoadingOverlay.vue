<template>
  <Transition name="fade">
    <div v-if="isVisible" class="offline-loading-overlay">
      <div class="overlay-backdrop"></div>
      <div class="overlay-content">
        <CCard class="loading-card">
          <CCardBody class="text-center">
            <div class="mb-4">
              <CIcon
                icon="cil-cloud-download"
                size="4xl"
                class="text-primary loading-icon"
              />
            </div>

            <h4 class="mb-3">{{ $t('offlineData.loading.title') }}</h4>

            <div class="mb-4">
              <p class="text-medium-emphasis mb-2">
                {{ currentStatus }}
              </p>
              <small v-if="currentBuilding" class="text-muted">
                {{ currentBuilding }}
              </small>
            </div>

            <!-- Fortschrittsbalken -->
            <CProgress class="mb-3" style="height: 25px">
              <CProgressBar
                :value="overallProgress"
                :color="progressColor"
              >
                {{ Math.round(overallProgress) }}%
              </CProgressBar>
            </CProgress>

            <!-- Details -->
            <div class="progress-details">
              <CRow class="g-3">
                <CCol cols="6" md="3">
                  <div class="detail-item">
                    <CIcon icon="cil-settings" class="text-info mb-1" />
                    <div class="detail-label">{{ $t('offlineData.loading.config') }}</div>
                    <div class="detail-value">
                      <CIcon
                        v-if="progress.config"
                        icon="cil-check-circle"
                        class="text-success"
                      />
                      <CSpinner v-else size="sm" color="primary" />
                    </div>
                  </div>
                </CCol>

                <CCol cols="6" md="3">
                  <div class="detail-item">
                    <CIcon icon="cil-building" class="text-primary mb-1" />
                    <div class="detail-label">{{ $t('offlineData.loading.buildings') }}</div>
                    <div class="detail-value">
                      {{ progress.buildings }} / {{ progress.totalBuildings }}
                    </div>
                  </div>
                </CCol>

                <CCol cols="6" md="3">
                  <div class="detail-item">
                    <CIcon icon="cil-home" class="text-warning mb-1" />
                    <div class="detail-label">{{ $t('offlineData.loading.apartments') }}</div>
                    <div class="detail-value">
                      {{ progress.apartments }}
                    </div>
                  </div>
                </CCol>

                <CCol cols="6" md="3">
                  <div class="detail-item">
                    <CIcon icon="cil-data-transfer-down" class="text-success mb-1" />
                    <div class="detail-label">{{ $t('offlineData.loading.progress') }}</div>
                    <div class="detail-value">
                      {{ Math.round(overallProgress) }}%
                    </div>
                  </div>
                </CCol>
              </CRow>
            </div>

            <!-- Abbrechen-Button (optional) -->
            <div v-if="showCancelButton" class="mt-4">
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                @click="handleCancel"
              >
                {{ $t('common.cancel') }}
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CCard, CCardBody, CProgress, CProgressBar, CButton, CRow, CCol, CSpinner } from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'

const { t } = useI18n()

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Object,
    default: () => ({
      buildings: 0,
      apartments: 0,
      totalBuildings: 0,
      totalApartments: 0,
      currentBuilding: null,
      config: false,
      status: 'idle'
    })
  },
  showCancelButton: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel'])

const currentStatus = computed(() => {
  if (props.progress.status === 'loading') {
    if (!props.progress.config) {
      return t('offlineData.loading.statusConfig')
    }
    if (props.progress.buildings < props.progress.totalBuildings) {
      return t('offlineData.loading.statusBuildings')
    }
    return t('offlineData.loading.statusApartments')
  }
  if (props.progress.status === 'success') {
    return t('offlineData.loading.statusSuccess')
  }
  if (props.progress.status === 'error') {
    return t('offlineData.loading.statusError')
  }
  return t('offlineData.loading.statusIdle')
})

const currentBuilding = computed(() => {
  return props.progress.currentBuilding || ''
})

const overallProgress = computed(() => {
  if (props.progress.totalBuildings === 0) {
    return 0
  }

  // Berechne Fortschritt:
  // 10% für Config
  // 20% für Gebäude
  // 70% für Apartments
  let progress = 0

  // Config geladen?
  if (props.progress.config) {
    progress += 10
  }

  // Gebäude-Fortschritt
  if (props.progress.totalBuildings > 0) {
    const buildingProgress = (props.progress.buildings / props.progress.totalBuildings) * 20
    progress += buildingProgress
  }

  // Apartment-Fortschritt (basierend auf geladenen Gebäuden)
  if (props.progress.buildings > 0 && props.progress.totalBuildings > 0) {
    const apartmentProgress = (props.progress.buildings / props.progress.totalBuildings) * 70
    progress += apartmentProgress
  }

  return Math.min(progress, 100)
})

const progressColor = computed(() => {
  if (props.progress.status === 'error') {
    return 'danger'
  }
  if (props.progress.status === 'success') {
    return 'success'
  }
  if (overallProgress.value < 30) {
    return 'info'
  }
  if (overallProgress.value < 70) {
    return 'warning'
  }
  return 'success'
})

function handleCancel() {
  emit('cancel')
}

// Verhindere Scrollen, wenn Overlay sichtbar ist
watch(() => props.isVisible, (visible) => {
  if (visible) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.offline-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.overlay-content {
  position: relative;
  z-index: 10000;
  max-width: 600px;
  width: 90%;
  animation: slideIn 0.3s ease-out;
}

.loading-card {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.loading-icon {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.progress-details {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.detail-item {
  text-align: center;
  padding: 0.5rem;
}

.detail-label {
  font-size: 0.75rem;
  color: var(--cui-secondary);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  font-weight: 500;
}

.detail-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--cui-body-color);
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .progress-details {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}
</style>

