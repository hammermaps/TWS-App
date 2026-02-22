<template>
  <div>
    <CRow style="padding-left: 9px;">
      <CCol :lg="8">
        <!-- Benutzer-Profil Card mit Header in CCardBody -->
        <CCard class="mb-4">
          <CCardBody>
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 class="mb-0">
                  <CIcon icon="cil-user" class="me-2" />
                  {{ t('profile.title') }}
                </h2>
              </div>
            </div>
            <!-- Avatar Sektion -->
            <CRow class="mb-4">
              <CCol :md="3" class="text-center">
                <div class="position-relative d-inline-block">
                  <CAvatar
                    :src="avatar"
                    size="xl"
                    class="mb-3"
                  />
                  <CSpinner
                    v-if="avatarLoading"
                    class="position-absolute top-50 start-50 translate-middle"
                    color="primary"
                    size="sm"
                  />
                </div>
                <div>
                  <CBadge
                    :color="getRoleColor(currentUser?.role)"
                  >
                    {{ getRoleDisplayName(currentUser?.role) }}
                  </CBadge>
                </div>
              </CCol>
              <CCol :md="9">
                <CRow>
                  <CCol :sm="6" class="mb-3">
                    <div class="profile-info-item">
                      <CIcon icon="cil-user" class="text-muted me-2" />
                      <strong>{{ t('profile.username') }}:</strong>
                      <div class="ms-4">{{ currentUser?.username || 'N/A' }}</div>
                    </div>
                  </CCol>
                  <CCol :sm="6" class="mb-3">
                    <div class="profile-info-item">
                      <CIcon icon="cil-people" class="text-muted me-2" />
                      <strong>{{ t('profile.fullName') }}:</strong>
                      <div class="ms-4">{{ currentUser?.name || 'Nicht angegeben' }}</div>
                    </div>
                  </CCol>
                  <CCol :sm="6" class="mb-3">
                    <div class="profile-info-item">
                      <CIcon icon="cil-envelope-closed" class="text-muted me-2" />
                      <strong>{{ t('profile.email') }}:</strong>
                      <div class="ms-4">{{ currentUser?.email || 'Nicht angegeben' }}</div>
                    </div>
                  </CCol>
                  <CCol :sm="6" class="mb-3">
                    <div class="profile-info-item">
                      <CIcon icon="cil-fingerprint" class="text-muted me-2" />
                      <strong>{{ t('profile.identification') }}:</strong>
                      <div class="ms-4">{{ currentUser?.indent || 'Nicht angegeben' }}</div>
                    </div>
                  </CCol>
                </CRow>
              </CCol>
            </CRow>

            <!-- Status Information -->
            <CRow class="mb-4">
              <CCol :md="12">
                <h5 class="mb-3">
                  <CIcon icon="cil-lightbulb" class="me-2" />
                  {{ t('profile.statusInformation') }}
                </h5>
                <CRow>
                  <CCol :sm="4" class="mb-3">
                    <CCard class="text-center h-100">
                      <CCardBody>
                        <div class="status-icon mb-2">
                          <CIcon
                            :icon="currentUser?.enabled ? 'cil-check-circle' : 'cil-x-circle'"
                            :class="currentUser?.enabled ? 'text-success' : 'text-danger'"
                            size="xl"
                          />
                        </div>
                        <div class="status-label mb-2">{{ t('profile.accountStatus') }}</div>
                        <CBadge
                          :color="currentUser?.enabled ? 'success' : 'danger'"
                          class="px-3 py-2"
                        >
                          {{ currentUser?.enabled ? 'Aktiv' : 'Deaktiviert' }}
                        </CBadge>
                      </CCardBody>
                    </CCard>
                  </CCol>
                  <CCol :sm="4" class="mb-3">
                    <CCard class="text-center h-100">
                      <CCardBody>
                        <div class="status-icon mb-2">
                          <CIcon
                            icon="cil-shield-alt"
                            :class="getRoleIconColor(currentUser?.role)"
                            size="xl"
                          />
                        </div>
                        <div class="status-label mb-2">{{ t('profile.userRole') }}</div>
                        <CBadge
                          :color="getRoleColor(currentUser?.role)"
                          class="px-3 py-2"
                        >
                          {{ getRoleDisplayName(currentUser?.role) }}
                        </CBadge>
                      </CCardBody>
                    </CCard>
                  </CCol>
                  <CCol :sm="4" class="mb-3">
                    <CCard class="text-center h-100">
                      <CCardBody>
                        <div class="status-icon mb-2">
                          <CIcon
                            icon="cil-fingerprint"
                            class="text-info"
                            size="xl"
                          />
                        </div>
                        <div class="status-label mb-2">Benutzer-ID</div>
                        <div class="mt-1">
                          <strong class="fs-5">{{ currentUser?.id || 'N/A' }}</strong>
                        </div>
                      </CCardBody>
                    </CCard>
                  </CCol>
                </CRow>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <!-- Session und Login-Statistiken -->
        <CCard class="mb-4">
          <CCardHeader>
            <h5 class="mb-0">
              <CIcon icon="cil-history" class="me-2" />
              Session & Login-Statistiken
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol :md="6" class="mb-3">
                <div class="stat-item">
                  <CIcon icon="cil-star" class="text-primary me-2" />
                  <strong>Account erstellt:</strong>
                  <div class="mt-1">
                    <div>{{ formatDate(userStats.createdAt) }}</div>
                    <small class="text-muted">{{ getRelativeTime(userStats.createdAt) }}</small>
                  </div>
                </div>
              </CCol>
              <CCol :md="6" class="mb-3">
                <div class="stat-item">
                  <CIcon icon="cil-door" class="text-success me-2" />
                  <strong>Letzter Login:</strong>
                  <div class="mt-1">
                    <div>{{ formatDate(userStats.lastLogin) }}</div>
                    <small class="text-muted">{{ getRelativeTime(userStats.lastLogin) }}</small>
                  </div>
                </div>
              </CCol>
              <CCol :md="6" class="mb-3">
                <div class="stat-item">
                  <CIcon icon="cil-account-logout" class="text-warning me-2" />
                  <strong>Letzter Logout:</strong>
                  <div class="mt-1">
                    <div>{{ formatDate(userStats.lastLogout) }}</div>
                    <small class="text-muted">{{ getRelativeTime(userStats.lastLogout) }}</small>
                  </div>
                </div>
              </CCol>
              <CCol :md="6" class="mb-3">
                <div class="stat-item">
                  <CIcon icon="cil-check" class="text-info me-2" />
                  <strong>Letzte Token-Prüfung:</strong>
                  <div class="mt-1">
                    <div>{{ lastTokenCheckFormatted }}</div>
                    <small class="text-muted">{{ timeSinceLastCheck }}</small>
                  </div>
                </div>
              </CCol>
              <CCol :md="6" class="mb-3">
                <div class="stat-item">
                  <CIcon icon="cil-cursor" class="text-success me-2" />
                  <strong>Letzte Aktivität:</strong>
                  <div class="mt-1">
                    <div>{{ lastActivityFormatted }}</div>
                    <small class="text-muted">{{ timeSinceLastActivity }}</small>
                  </div>
                </div>
              </CCol>
              <CCol :md="6" class="mb-3">
                <div class="stat-item">
                  <CIcon icon="cil-clock" class="text-info me-2" />
                  <strong>Aktuelle Session-Zeit:</strong>
                  <div class="mt-1">
                    <div>{{ sessionTimeFormatted }}</div>
                    <small class="text-muted">{{ sessionTimeInMinutes }} Min ({{ sessionTimeInHours }} Std)</small>
                  </div>
                </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <!-- Aktivitäts-Statistiken -->
        <CCard>
          <CCardHeader>
            <h5 class="mb-0">
              <CIcon icon="cil-chart-pie" class="me-2" />
              Aktivitäts-Statistiken
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol :sm="6" :lg="3" class="mb-3">
                <div class="activity-stat text-center">
                  <div class="activity-number text-primary">
                    {{ userStats.totalLogins }}
                  </div>
                  <div class="activity-label">Gesamt-Logins</div>
                </div>
              </CCol>
              <CCol :sm="6" :lg="3" class="mb-3">
                <div class="activity-stat text-center">
                  <div class="activity-number text-success">
                    {{ loginStats.successfulLogins }}
                  </div>
                  <div class="activity-label">Erfolgreiche Logins</div>
                </div>
              </CCol>
              <CCol :sm="6" :lg="3" class="mb-3">
                <div class="activity-stat text-center">
                  <div class="activity-number text-warning">
                    {{ userStats.failedLogins }}
                  </div>
                  <div class="activity-label">Fehlgeschlagene Logins</div>
                </div>
              </CCol>
              <CCol :sm="6" :lg="3" class="mb-3">
                <div class="activity-stat text-center">
                  <div class="activity-number text-info">
                    {{ loginStats.successRate }}%
                  </div>
                  <div class="activity-label">Erfolgsrate</div>
                </div>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>

      <!-- Sidebar -->
      <CCol :lg="4">
        <!-- Quick Actions -->
        <CCard class="mb-4">
          <CCardHeader>
            <h6 class="mb-0">
              <CIcon icon="cil-lightbulb" class="me-2" />
              Schnellaktionen
            </h6>
          </CCardHeader>
          <CCardBody>
            <div class="d-grid gap-2">
              <CButton
                color="primary"
                variant="outline"
                @click="navigateToProfile"
              >
                <CIcon icon="cil-pencil" class="me-2" />
                Profil bearbeiten
              </CButton>
              <CButton
                color="warning"
                variant="outline"
                @click="changePasswordAction"
              >
                <CIcon icon="cil-lock-locked" class="me-2" />
                Passwort ändern
              </CButton>
              <CButton
                color="info"
                variant="outline"
                @click="refreshStats"
                :disabled="loading || !onlineStatusStore.isFullyOnline"
              >
                <CSpinner v-if="loading" size="sm" class="me-2" />
                <CIcon v-else icon="cil-reload" class="me-2" />
                Statistiken aktualisieren
              </CButton>
              <small v-if="!onlineStatusStore.isFullyOnline" class="text-muted mt-2">
                <CIcon icon="cil-warning" size="sm" class="me-1" />
                Offline - Aktualisierung nicht verfügbar
              </small>
            </div>
          </CCardBody>
        </CCard>

        <!-- System Info -->
        <CCard class="mb-4">
          <CCardHeader>
            <h6 class="mb-0">
              <CIcon icon="cil-laptop" class="me-2" />
              System-Informationen
            </h6>
          </CCardHeader>
          <CCardBody>
            <div class="mb-3">
              <strong>Browser:</strong>
              <div>{{ browserInfo.name }} {{ browserInfo.version }}</div>
            </div>
            <div class="mb-3">
              <strong>Betriebssystem:</strong>
              <div>{{ browserInfo.os }}</div>
            </div>
            <div class="mb-3">
              <strong>Bildschirmauflösung:</strong>
              <div>{{ browserInfo.screenResolution }}</div>
            </div>
          </CCardBody>
        </CCard>

        <!-- Berechtigungen -->
        <CCard>
          <CCardHeader>
            <h6 class="mb-0">
              <CIcon icon="cil-shield-alt" class="me-2" />
              Berechtigungen
            </h6>
          </CCardHeader>
          <CCardBody>
            <div class="permission-list">
              <div class="permission-item d-flex align-items-center mb-2">
                <CIcon
                  :icon="canEditProfile ? 'cil-check' : 'cil-ban'"
                  :class="canEditProfile ? 'text-success' : 'text-danger'"
                  class="me-2"
                />
                Profil bearbeiten
              </div>
              <div class="permission-item d-flex align-items-center mb-2">
                <CIcon
                  :icon="canChangePassword ? 'cil-check' : 'cil-ban'"
                  :class="canChangePassword ? 'text-success' : 'text-danger'"
                  class="me-2"
                />
                Passwort ändern
              </div>
              <div class="permission-item d-flex align-items-center mb-2">
                <CIcon
                  :icon="canAccessDashboard ? 'cil-check' : 'cil-ban'"
                  :class="canAccessDashboard ? 'text-success' : 'text-danger'"
                  class="me-2"
                />
                Dashboard zugriff
              </div>
              <div class="permission-item d-flex align-items-center mb-2">
                <CIcon
                  :icon="canAccessAdminArea ? 'cil-check' : 'cil-ban'"
                  :class="canAccessAdminArea ? 'text-success' : 'text-danger'"
                  class="me-2"
                />
                Admin-Bereich
              </div>
              <div class="permission-item d-flex align-items-center mb-2">
                <CIcon
                  :icon="canManageUsers ? 'cil-check' : 'cil-ban'"
                  :class="canManageUsers ? 'text-success' : 'text-danger'"
                  class="me-2"
                />
                Benutzer verwalten
              </div>
              <div class="permission-item d-flex align-items-center mb-2">
                <CIcon
                  :icon="canViewReports ? 'cil-check' : 'cil-ban'"
                  :class="canViewReports ? 'text-success' : 'text-danger'"
                  class="me-2"
                />
                Berichte anzeigen
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CButton,
  CBadge,
  CAvatar,
  CSpinner
} from '@coreui/vue'
import CIcon from '@coreui/icons-vue'
import {
  currentUser,
  setUser,
  getCurrentUser as getStoredUser,
  isAdmin,
  isSupervisor,
  canEditProfile,
  canChangePassword,
  canAccessDashboard,
  canAccessAdminArea,
  canManageUsers,
  canViewReports
} from '../../stores/GlobalUser.js'

const { t } = useI18n()
import { lastTokenCheck, lastPageTokenCheck, lastActivity } from '../../stores/TokenManager.js'
import { useOnlineStatusStore } from '../../stores/OnlineStatus.js'
import { ApiUser } from '../../api/ApiUser.js'
import defaultAvatar from '@/assets/images/avatars/8.jpg'

const router = useRouter()
const loading = ref(false)
const loadingUserData = ref(false)
const userDataError = ref('')

// Avatar-Bild laden
const avatar = ref(defaultAvatar)
const avatarLoading = ref(false)

// Stores initialisieren
const onlineStatusStore = useOnlineStatusStore()

// API-Client initialisieren
const apiUser = new ApiUser()

// Echte User-Statistiken aus currentUser
const userStats = computed(() => ({
  createdAt: currentUser.value?.created_at,
  lastLogin: currentUser.value?.last_login,
  lastLogout: currentUser.value?.last_logout,
  totalLogins: currentUser.value?.logins_total || 0,
  failedLogins: currentUser.value?.logins_failed || 0,
  // sessionCount entfernt - wird nicht verwendet
  sessionTime: currentUser.value?.session_time || 0 // Echte Session-Zeit von der API
}))

// Computed für zusätzliche Statistiken
const loginStats = computed(() => ({
  successfulLogins: Math.max(0, (userStats.value.totalLogins - userStats.value.failedLogins)),
  successRate: userStats.value.totalLogins > 0
    ? (((userStats.value.totalLogins - userStats.value.failedLogins) / userStats.value.totalLogins) * 100).toFixed(1)
    : '0.0'
}))

// Browser-Informationen
const browserInfo = computed(() => {
  const ua = navigator.userAgent
  let browser = 'Unbekannt'
  let version = ''
  let os = 'Unbekannt'

  // Browser Detection
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome'
    version = ua.match(/Chrome\/(\d+)/)?.[1] || ''
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox'
    version = ua.match(/Firefox\/(\d+)/)?.[1] || ''
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari'
    version = ua.match(/Version\/(\d+)/)?.[1] || ''
  } else if (ua.includes('Edg')) {
    browser = 'Edge'
    version = ua.match(/Edg\/(\d+)/)?.[1] || ''
  }

  // OS Detection
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iOS')) os = 'iOS'

  return {
    name: browser,
    version,
    os,
    screenResolution: `${screen.width}x${screen.height}`
  }
})

// Formatierungen
const lastTokenCheckFormatted = computed(() => {
  // Bevorzuge Page-Token-Check, falls verfügbar, sonst allgemeine Token-Prüfung
  const checkTime = lastPageTokenCheck.value || lastTokenCheck.value
  if (!checkTime) return 'Nie'
  return checkTime.toLocaleString('de-DE')
})

const timeSinceLastCheck = computed(() => {
  const checkTime = lastPageTokenCheck.value || lastTokenCheck.value
  if (!checkTime) return 'Nie'

  const now = new Date()
  const diffMs = now.getTime() - checkTime.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes > 0) {
    return `vor ${diffMinutes} Min`
  } else {
    return 'gerade eben'
  }
})

const lastActivityFormatted = computed(() => {
  if (!lastActivity.value) return 'Unbekannt'
  return lastActivity.value.toLocaleString('de-DE')
})

const timeSinceLastActivity = computed(() => {
  if (!lastActivity.value) return 'Unbekannt'

  const now = new Date()
  const diffMs = now.getTime() - lastActivity.value.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes > 0) {
    return `vor ${diffMinutes} Min`
  } else {
    return 'gerade eben'
  }
})

// Session-Zeit formatieren
const sessionTimeFormatted = computed(() => {
  const totalSeconds = userStats.value.sessionTime
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  return `${hours} Std ${minutes} Min`
})

const sessionTimeInMinutes = computed(() => {
  return Math.floor(userStats.value.sessionTime / 60)
})

const sessionTimeInHours = computed(() => {
  return Math.floor(userStats.value.sessionTime / 3600)
})

// Utility Functions
const formatDate = (date) => {
  if (!date) return 'Nicht verfügbar'
  return new Date(date).toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getRelativeTime = (date) => {
  if (!date) return ''

  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffDays > 0) {
    return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`
  } else if (diffHours > 0) {
    return `vor ${diffHours} Stunde${diffHours > 1 ? 'n' : ''}`
  } else if (diffMinutes > 0) {
    return `vor ${diffMinutes} Minute${diffMinutes > 1 ? 'n' : ''}`
  } else {
    return 'gerade eben'
  }
}

const getRoleColor = (role) => {
  switch (role) {
    case 'admin': return 'danger'
    case 'supervisor': return 'warning'
    case 'user': return 'primary'
    default: return 'secondary'
  }
}

const getRoleIconColor = (role) => {
  switch (role) {
    case 'admin': return 'text-danger'
    case 'supervisor': return 'text-warning'
    case 'user': return 'text-primary'
    default: return 'text-secondary'
  }
}

const getRoleDisplayName = (role) => {
  switch (role) {
    case 'admin': return 'Administrator'
    case 'supervisor': return 'Supervisor'
    case 'user': return 'Benutzer'
    default: return 'Unbekannt'
  }
}

// Benutzerdaten laden wenn sie fehlen
const loadUserDataIfNeeded = async () => {
  // Prüfe ob Benutzerdaten vorhanden sind
  if (currentUser.value && currentUser.value.id) {
    console.log('👤 Benutzerdaten bereits vorhanden:', currentUser.value.username)
    return
  }

  // Offline-Modus: Lade aus IndexedDB, kein API-Call
  if (!onlineStatusStore.isFullyOnline) {
    console.log('📴 Offline-Modus: Lade Benutzerdaten aus IndexedDB...')
    const storedUser = await getStoredUser()
    if (storedUser && storedUser.id) {
      setUser(storedUser)
    } else {
      userDataError.value = 'Keine gespeicherten Benutzerdaten verfügbar (Offline-Modus)'
    }
    return
  }

  console.log('🔄 Benutzerdaten fehlen - lade über API nach...')
  loadingUserData.value = true
  userDataError.value = ''

  try {
    // Aktuelle Benutzerdaten über API laden
    const userData = await apiUser.getCurrentUser()

    if (userData && userData.id) {
      console.log('✅ Benutzerdaten erfolgreich geladen:', userData.username)

      // Benutzerdaten im globalen Store setzen
      setUser(userData)

      // Optional: Toast-Benachrichtigung
      if (window.showToast) {
        window.showToast('Profildaten wurden aktualisiert', 'success')
      }
    } else {
      console.warn('⚠️ Keine gültigen Benutzerdaten von API erhalten')
      userDataError.value = 'Benutzerdaten konnten nicht geladen werden'

      // Zur Login-Seite weiterleiten wenn keine Daten verfügbar
      if (window.showToast) {
        window.showToast('Benutzerdaten nicht verfügbar. Bitte melden Sie sich erneut an.', 'warning')
      }
      router.push('/login')
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden der Benutzerdaten:', error)
    userDataError.value = `Fehler beim Laden: ${error.message || 'Unbekannter Fehler'}`

    if (window.showToast) {
      window.showToast('Fehler beim Laden der Profildaten', 'danger')
    }
  } finally {
    loadingUserData.value = false
  }
}

// Benutzerdaten manuell neu laden
const reloadUserData = async () => {
  console.log('🔄 Manueller Reload der Benutzerdaten...')

  // Prüfe ob Online-Modus aktiv ist
  if (!onlineStatusStore.isFullyOnline) {
    console.warn('⚠️ Reload nicht möglich - Offline-Modus aktiv')
    if (window.showToast) {
      window.showToast('Profildaten können im Offline-Modus nicht aktualisiert werden', 'warning')
    }
    return
  }

  loadingUserData.value = true
  userDataError.value = ''

  try {
    const userData = await apiUser.getCurrentUser()

    if (userData && userData.id) {
      console.log('✅ Benutzerdaten manuell neu geladen:', userData.username)
      setUser(userData)

      if (window.showToast) {
        window.showToast('Profildaten wurden erfolgreich aktualisiert', 'success')
      }
    } else {
      throw new Error('Keine gültigen Benutzerdaten erhalten')
    }
  } catch (error) {
    console.error('❌ Fehler beim manuellen Reload:', error)
    userDataError.value = `Fehler: ${error.message || 'Unbekannter Fehler'}`

    if (window.showToast) {
      window.showToast('Fehler beim Aktualisieren der Profildaten', 'danger')
    }
  } finally {
    loadingUserData.value = false
  }
}

// Watcher für currentUser - laden wenn null/undefined
watch(currentUser, (newUser) => {
  if (!newUser || !newUser.id) {
    console.log('👤 currentUser ist leer - automatisches Nachladen...')
    loadUserDataIfNeeded()
  } else {
    // Wenn User geladen ist, lade auch das Profilbild
    loadProfileImage()
  }
}, { immediate: false })

// Profilbild laden
const loadProfileImage = async () => {
  if (!currentUser.value || !currentUser.value.id) {
    console.log('⚠️ Kein User vorhanden - kann Profilbild nicht laden')
    return
  }

  avatarLoading.value = true
  console.log('🖼️ Lade Profilbild für User:', currentUser.value.id)

  try {
    const result = await apiUser.getProfileImage(currentUser.value.id, {
      ttlMinutes: 24 * 60 // 24 Stunden Cache
    })

    if (result.success && result.data && result.data.base64) {
      avatar.value = result.data.base64
      console.log('✅ Profilbild erfolgreich geladen')
    } else {
      console.log('ℹ️ Kein Profilbild verfügbar, verwende Standard-Avatar')
      avatar.value = defaultAvatar
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden des Profilbilds:', error)
    avatar.value = defaultAvatar
  } finally {
    avatarLoading.value = false
  }
}

// Actions
const changePasswordAction = () => {
  router.push({ name: 'Profile', hash: '#password' })

  // Automatisches Scrollen zum Passwort-Element
  nextTick(() => {
    const passwordElement = document.getElementById('password')
    if (passwordElement) {
      passwordElement.scrollIntoView({ behavior: 'smooth' })
    }
  })
}

const refreshStats = async () => {
  // Prüfe ob Online-Modus aktiv ist
  if (!onlineStatusStore.isFullyOnline) {
    console.warn('⚠️ Aktualisierung der Statistiken nicht möglich - Offline-Modus aktiv')
    if (window.showToast) {
      window.showToast('Statistiken können im Offline-Modus nicht aktualisiert werden', 'warning')
    }
    return
  }

  loading.value = true

  try {
    // Benutzerdaten neu laden
    await reloadUserData()

    // Simuliere weitere Statistik-Updates
    await new Promise(resolve => setTimeout(resolve, 500))

    console.log('📊 Benutzer-Statistiken und Profildaten aktualisiert')
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Statistiken:', error)
  } finally {
    loading.value = false
  }
}

// Navigation zu Profilseite
const navigateToProfile = () => {
  router.push('/profile')
}

// Lifecycle
onMounted(async () => {
  console.log('👤 Profil-Ansicht geladen')

  // Prüfe beim Mount ob Benutzerdaten vorhanden sind
  await loadUserDataIfNeeded()

  // Lade Profilbild wenn User verfügbar
  if (currentUser.value && currentUser.value.id) {
    await loadProfileImage()
  }
})
</script>

<style scoped>
.profile-info-item {
  margin-bottom: 1rem;
}

.status-icon {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-label {
  font-size: 0.875rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.stat-item {
  padding: 1rem;
  border-radius: 0.375rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
}

.activity-stat {
  padding: 1.5rem 1rem;
  border-radius: 0.375rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
}

.activity-number {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.activity-label {
  font-size: 0.875rem;
  color: #6c757d;
}

.permission-item {
  font-size: 0.875rem;
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .stat-item {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .activity-stat {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .activity-label,
  .status-label {
    color: rgba(255, 255, 255, 0.6);
  }
}

/* CoreUI Dark Theme Support */
[data-coreui-theme="dark"] .stat-item {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

[data-coreui-theme="dark"] .activity-stat {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

[data-coreui-theme="dark"] .activity-label,
[data-coreui-theme="dark"] .status-label {
  color: rgba(255, 255, 255, 0.6);
}

@media (max-width: 768px) {
  .activity-stat {
    padding: 1rem 0.5rem;
  }

  .activity-number {
    font-size: 1.5rem;
  }
}
</style>
