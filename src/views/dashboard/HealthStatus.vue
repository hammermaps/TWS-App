<!-- HealthStatus.vue - Health Status mit CoreUI Komponenten -->
<template>
  <OnlineRequiredWrapper>
    <CRow>
    <CCol :xs="12">
      <CCard class="mb-4">
        <CCardHeader class="d-flex justify-content-between align-items-center">
          <strong>Server Health Status</strong>
          <CButton
            color="primary"
            size="sm"
            @click="refreshStatus"
            :disabled="loading"
          >
            <CSpinner
              v-if="loading"
              component="span"
              size="sm"
              aria-hidden="true"
              class="me-2"
            />
            {{ loading ? 'Wird geladen...' : 'Status aktualisieren' }}
          </CButton>
        </CCardHeader>
        <CCardBody>
          <CAlert v-if="error" color="danger" class="d-flex align-items-center">
            <CIcon icon="cil-warning" class="flex-shrink-0 me-2" width="24" height="24" />
            <div>
              <strong>Fehler:</strong> {{ error }}
            </div>
          </CAlert>

          <div v-if="status && status.isSuccess()">
            <!-- Status Overview Row -->
            <CRow class="mb-4">
              <CCol :xs="12" :md="6" :lg="3" class="mb-3 mb-lg-0">
                <CCard class="text-center h-100">
                  <CCardBody>
                    <div class="text-body-secondary small mb-2">Server Status</div>
                    <CBadge
                      :color="status.data.isHealthy() ? 'success' : 'danger'"
                      class="text-uppercase fs-6 px-3 py-2"
                    >
                      {{ status.data.status }}
                    </CBadge>
                    <div class="mt-2 fw-semibold">{{ status.data.server }}</div>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol :xs="12" :md="6" :lg="3" class="mb-3 mb-lg-0">
                <CCard class="text-center h-100">
                  <CCardBody>
                    <div class="text-body-secondary small mb-2">Version</div>
                    <h4 class="mb-0">{{ status.data.server_info.version }}</h4>
                    <small class="text-body-secondary">Server Version</small>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol :xs="12" :md="6" :lg="3" class="mb-3 mb-md-0">
                <CCard class="text-center h-100">
                  <CCardBody>
                    <div class="text-body-secondary small mb-2">Uptime</div>
                    <h4 class="mb-0">{{ formatUptime(status.data.server_info.uptime) }}</h4>
                    <small class="text-body-secondary">Laufzeit</small>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol :xs="12" :md="6" :lg="3">
                <CCard class="text-center h-100">
                  <CCardBody>
                    <div class="text-body-secondary small mb-2">Response Time</div>
                    <h4 class="mb-0">{{ status.response_time.toFixed(2) }}ms</h4>
                    <small class="text-body-secondary">Antwortzeit</small>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>

            <!-- Server Performance Row -->
            <CRow class="mb-4">
              <CCol :xs="12" :lg="8">
                <!-- Memory Usage Card -->
                <CCard class="mb-3 mb-lg-0 h-100">
                  <CCardHeader>
                    <strong>Speicherverbrauch</strong>
                  </CCardHeader>
                  <CCardBody>
                    <CRow class="mb-3">
                      <CCol :xs="4">
                        <div class="text-body-secondary small">Verwendet</div>
                        <div class="fw-semibold text-primary h5 mb-0">
                          {{ formatBytes(status.data.server_info.memory_usage.used) }}
                        </div>
                      </CCol>
                      <CCol :xs="4">
                        <div class="text-body-secondary small">Peak</div>
                        <div class="fw-semibold text-warning h5 mb-0">
                          {{ formatBytes(status.data.server_info.memory_usage.peak) }}
                        </div>
                      </CCol>
                      <CCol :xs="4">
                        <div class="text-body-secondary small">Limit</div>
                        <div class="fw-semibold h5 mb-0">
                          {{ status.data.server_info.memory_usage.limit === -1 ? 'Unbegrenzt' : formatBytes(status.data.server_info.memory_usage.limit) }}
                        </div>
                      </CCol>
                    </CRow>

                    <!-- Memory Progress Bar -->
                    <div v-if="status.data.server_info.memory_usage.limit !== -1">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="text-body-secondary small">Speicherauslastung</span>
                        <span class="fw-semibold">
                          {{ ((status.data.server_info.memory_usage.used / status.data.server_info.memory_usage.limit) * 100).toFixed(1) }}%
                        </span>
                      </div>
                      <CProgress
                        :value="(status.data.server_info.memory_usage.used / status.data.server_info.memory_usage.limit) * 100"
                        :color="getMemoryColor(status.data.server_info.memory_usage.used, status.data.server_info.memory_usage.limit)"
                        height={20}
                      />
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol :xs="12" :lg="4">
                <!-- Server Load Card -->
                <CCard class="h-100">
                  <CCardHeader>
                    <strong>System Load</strong>
                  </CCardHeader>
                  <CCardBody class="d-flex flex-column justify-content-center">
                    <div class="text-center">
                      <div class="display-4 fw-bold text-primary mb-2">
                        {{ status.data.server_info.load.toFixed(2) }}
                      </div>
                      <div class="text-body-secondary">
                        Durchschnittliche Last
                      </div>
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>

            <!-- Services Status Row -->
            <CRow class="mb-4">
              <CCol :xs="12">
                <CCard>
                  <CCardHeader>
                    <strong>Services Status</strong>
                  </CCardHeader>
                  <CCardBody>
                    <CRow>
                      <CCol :xs="12" :md="4" class="mb-3 mb-md-0">
                        <div class="d-flex justify-content-between align-items-center p-3 border rounded">
                          <div class="d-flex align-items-center">
                            <CIcon
                              icon="cil-storage"
                              class="me-3"
                              width="32"
                              height="32"
                              :class="status.data.services.database ? 'text-success' : 'text-danger'"
                            />
                            <div>
                              <div class="fw-semibold">Database</div>
                              <small class="text-body-secondary">Datenbank-Service</small>
                            </div>
                          </div>
                          <CBadge :color="status.data.services.database ? 'success' : 'danger'" class="px-2 py-1">
                            {{ status.data.services.database ? 'Online' : 'Offline' }}
                          </CBadge>
                        </div>
                      </CCol>
                      <CCol :xs="12" :md="4" class="mb-3 mb-md-0">
                        <div class="d-flex justify-content-between align-items-center p-3 border rounded">
                          <div class="d-flex align-items-center">
                            <CIcon
                              icon="cil-folder"
                              class="me-3"
                              width="32"
                              height="32"
                              :class="status.data.services.filesystem ? 'text-success' : 'text-danger'"
                            />
                            <div>
                              <div class="fw-semibold">Filesystem</div>
                              <small class="text-body-secondary">Dateisystem-Service</small>
                            </div>
                          </div>
                          <CBadge :color="status.data.services.filesystem ? 'success' : 'danger'" class="px-2 py-1">
                            {{ status.data.services.filesystem ? 'Online' : 'Offline' }}
                          </CBadge>
                        </div>
                      </CCol>
                      <CCol :xs="12" :md="4">
                        <div class="d-flex justify-content-between align-items-center p-3 border rounded">
                          <div class="d-flex align-items-center">
                            <CIcon
                              icon="cil-layers"
                              class="me-3"
                              width="32"
                              height="32"
                              :class="status.data.services.cache ? 'text-success' : 'text-danger'"
                            />
                            <div>
                              <div class="fw-semibold">Cache</div>
                              <small class="text-body-secondary">Cache-Service</small>
                            </div>
                          </div>
                          <CBadge :color="status.data.services.cache ? 'success' : 'danger'" class="px-2 py-1">
                            {{ status.data.services.cache ? 'Online' : 'Offline' }}
                          </CBadge>
                        </div>
                      </CCol>
                    </CRow>

                    <!-- Overall Services Status -->
                    <CAlert
                      :color="status.data.services.allHealthy() ? 'success' : 'warning'"
                      class="mt-3 mb-0 d-flex align-items-center"
                    >
                      <CIcon
                        :icon="status.data.services.allHealthy() ? 'cil-check-circle' : 'cil-warning'"
                        class="flex-shrink-0 me-2"
                        width="24"
                        height="24"
                      />
                      <div>
                        {{ status.data.services.allHealthy()
                          ? 'Alle Services sind online und funktionieren'
                          : 'Einige Services sind nicht verfügbar'
                        }}
                      </div>
                    </CAlert>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>

            <!-- Meta Info -->
            <CRow>
              <CCol :xs="12">
                <CCard>
                  <CCardBody class="py-2">
                    <small class="text-body-secondary">
                      <CIcon icon="cil-clock" class="me-1" width="16" height="16" />
                      Server Zeit: {{ new Date(status.server_time * 1000).toLocaleString('de-DE') }}
                    </small>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          </div>

          <!-- Loading State -->
          <div v-else-if="loading && !status" class="text-center py-5">
            <CSpinner color="primary" />
            <div class="mt-3 text-body-secondary">Lade Health Status...</div>
          </div>

          <!-- No Data State -->
          <CAlert v-else-if="!loading && !status && !error" color="info">
            <CIcon icon="cil-info" class="flex-shrink-0 me-2" width="24" height="24" />
            Klicke auf "Status aktualisieren" um den Server-Status abzurufen.
          </CAlert>
        </CCardBody>
      </CCard>
    </CCol>
  </CRow>
  </OnlineRequiredWrapper>
</template>

<script setup>
import { onMounted } from 'vue'
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CButton,
  CSpinner,
  CAlert,
  CBadge,
  CProgress,
  CListGroup,
  CListGroupItem
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import OnlineRequiredWrapper from '@/components/OnlineRequiredWrapper.vue'
import { useHealth } from '../../api/useHealth.js'

const { loading, error, status, getStatus } = useHealth()

const refreshStatus = async () => {
  await getStatus()
}

const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getMemoryColor = (used, limit) => {
  const percentage = (used / limit) * 100
  if (percentage < 60) return 'success'
  if (percentage < 80) return 'warning'
  return 'danger'
}

// Initial laden beim Mount
onMounted(() => {
  refreshStatus()
})
</script>

<style scoped src="@/styles/views/HealthStatus.css"></style>
