import { h, resolveComponent } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '@/stores/GlobalToken.js'
import { checkTokenOnPageLoad, setRouter } from '@/stores/TokenManager.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

import DefaultLayout from '@/layouts/DefaultLayout.vue'

// Eager load kritische Offline-Komponenten
import Dashboard from '@/views/dashboard/Dashboard.vue'
import ApartmentFlushing from '@/views/apartments/ApartmentFlushing.vue'
import BuildingApartments from '@/views/buildings/BuildingApartments.vue'
import BuildingsOverview from '@/views/buildings/BuildingsOverview.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: DefaultLayout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        meta: { requiresAuth: true, requiresOnline: false },
        component: Dashboard, // Eager loaded - kritisch nach Login
      },
      {
        path: '/health-status',
        name: 'HealthStatus',
        meta: { requiresAuth: true, requiresOnline: true },
        component: () =>
          import(
            /* webpackChunkName: "health-status" */ '@/views/dashboard/HealthStatus.vue'
          ),
      },
      {
        path: '/profile',
        name: 'Profile',
        meta: { requiresAuth: true, requiresOnline: true }, // Profil bearbeiten (Passwort) nur online
        component: () =>
          import(
            /* webpackChunkName: "profile" */ '@/views/pages/Profile.vue'
          ),
      },
      {
        path: '/profile/view',
        name: 'ProfileView',
        meta: { requiresAuth: true, requiresOnline: false }, // Profil ansehen offline möglich
        component: () =>
          import(
            /* webpackChunkName: "profile-view" */ '@/views/pages/ProfileView.vue'
          ),
      },
      {
        path: '/settings',
        name: 'Settings',
        meta: { requiresAuth: true, requiresOnline: false }, // Einstellungen offline verfügbar
        component: () =>
          import(
            /* webpackChunkName: "settings" */ '@/views/pages/ConfigSettings.vue'
          ),
      },
      // QR Scanner route
      {
        path: '/qr-scanner',
        name: 'QRScanner',
        meta: { requiresAuth: true, requiresOnline: false }, // QR-Scanner offline verfügbar (mit Cache)
        component: () =>
          import(
            /* webpackChunkName: "qr-scanner" */ '@/views/scanner/QRScannerPage.vue'
          ),
      },
      // Buildings routes
      {
        path: '/buildings',
        name: 'BuildingsOverview',
        meta: { requiresAuth: true, requiresOnline: false }, // Gebäude offline verfügbar (gecacht)
        component: BuildingsOverview, // Eager loaded für Offline-Support
      },
      {
        path: '/buildings/:id/apartments',
        name: 'BuildingApartments',
        meta: { requiresAuth: true, requiresOnline: false }, // Apartments offline verfügbar (gecacht)
        component: BuildingApartments, // Eager loaded für Offline-Support
      },
      // Apartment Flushing routes
      {
        path: '/buildings/:buildingId/apartments/:apartmentId/flush',
        name: 'ApartmentFlushing',
        meta: { requiresAuth: true, requiresOnline: false }, // Spülungen offline möglich!
        component: ApartmentFlushing, // Eager loaded für Offline-Support
      },
      {
        path: '/apartments/:id/flush-history',
        name: 'ApartmentFlushHistory',
        meta: { requiresAuth: true, requiresOnline: false }, // Historie offline verfügbar
        component: () =>
          import(
            /* webpackChunkName: "flush-history" */ '@/views/apartments/ApartmentFlushHistory.vue'
          ),
      },
    ],
  },
  // Authentifizierungs-Routen (außerhalb des DefaultLayouts)
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/pages/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/pages/Register.vue'),
    meta: { requiresGuest: true }
  },
  // Fehlerseiten
  {
    path: '/pages',
    redirect: '/pages/404',
    name: 'Pages',
    component: {
      render() {
        return h(resolveComponent('router-view'))
      },
    },
    children: [
      {
        path: '404',
        name: 'Page404',
        component: () => import('@/views/pages/Page404.vue'),
      },
      {
        path: '500',
        name: 'Page500',
        component: () => import('@/views/pages/Page500.vue'),
      },
    ],
  },
  // Catch-all für 404
  {
    path: '/:pathMatch(.*)*',
    redirect: '/pages/404'
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    // always scroll to top
    return { top: 0 }
  },
})

// TokenManager mit Router-Instanz initialisieren
setRouter(router)

// Navigation Guards für Authentication und Token-Validierung
router.beforeEach(async (to, from, next) => {
  // Sicherstellen, dass Token aus localStorage geladen wurde
  // (Schutz gegen Race Condition beim App-Start)
  const tokenFromStorage = localStorage.getItem('jwt_token')
  const token = getToken()

  // Wenn Token im Storage, aber nicht in State -> laden
  if (tokenFromStorage && !token) {
    console.warn('⚠️ Token im localStorage gefunden, aber nicht im State. Lade Token...')
    const { loadTokenFromStorage } = await import('@/stores/GlobalToken.js')
    loadTokenFromStorage()
    // Token erneut abrufen nach dem Laden
    const reloadedToken = getToken()
    console.log('🔄 Token neu geladen:', !!reloadedToken)
  }

  const isAuthenticated = !!getToken() // Nach potentiellem Nachladen erneut prüfen

  console.log(`🧭 Navigation von "${from.name || 'Startseite'}" zu "${to.name || to.path}"`)
  console.log(`🔑 Token vorhanden: ${!!getToken()}, isAuthenticated: ${isAuthenticated}`)

  // Routen die Authentication erfordern
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.error('❌ Route erfordert Authentication, aber Token fehlt! weiterleitung zu /login')
    console.error('🔍 Token-Status Debug:', { token: getToken() ? 'exists' : 'missing', length: getToken()?.length, localStorage: !!tokenFromStorage })
    next('/login')
    return
  }

  // Routen die nur für Gäste (nicht-authentifizierte Benutzer) sind
  if (to.meta.requiresGuest && isAuthenticated) {
    console.log('Benutzer bereits authentifiziert, weiterleitung zu /dashboard')
    next('/dashboard')
    return
  }

  // Online-Status prüfen für requiresOnline Routes
  if (to.meta.requiresOnline) {
    const onlineStatusStore = useOnlineStatusStore()

    if (!onlineStatusStore.isFullyOnline) {
      console.warn(`🔴 Route "${to.name}" erfordert Online-Verbindung, aber App ist offline`)

      // Zeige Benachrichtigung
      if (window.showToast) {
        window.showToast(
          `Die Seite "${to.meta.title || to.name}" ist offline nicht verfügbar. Bitte stellen Sie eine Internetverbindung her.`,
          'warning'
        )
      } else {
        alert(`Die Seite "${to.meta.title || to.name}" ist offline nicht verfügbar.`)
      }

      // Verhindere Navigation - bleibe auf aktueller Seite oder gehe zum Dashboard
      if (from.name) {
        next(false) // Bleibe auf aktueller Seite
      } else {
        next('/dashboard') // Gehe zum Dashboard wenn keine vorherige Seite
      }
      return
    }
  }

  // Token-Prüfung bei authentifizierten Routen
  if (to.meta.requiresAuth && isAuthenticated) {
    try {
      console.log(`🔐 Führe Token-Prüfung für geschützte Route "${to.name}" durch...`)
      const tokenValidation = await checkTokenOnPageLoad(to.name || to.path)

      if (!tokenValidation.valid) {
        console.warn(`❌ Token-Prüfung für Route "${to.name}" fehlgeschlagen:`, tokenValidation.reason)

        // WICHTIG: Nur zur Login-Seite umleiten, wenn wirklich nicht authentifiziert
        // Bei "Nicht authentifiziert" umleiten, bei anderen Fehlern NICHT
        if (tokenValidation.reason === 'Nicht authentifiziert') {
          console.error('🚫 Nicht authentifiziert - Umleitung zu /login')
          next('/login')
          return
        } else {
          // Bei anderen Fehlern Navigation trotzdem erlauben
          console.warn('⚠️ Token-Prüfung fehlgeschlagen, aber Navigation wird erlaubt (lokales Token vorhanden)')
        }
      } else {
        console.log(`✅ Token-Prüfung für Route "${to.name}" erfolgreich`)
      }
    } catch (error) {
      console.error('❌ Fehler bei Router Token-Prüfung:', error)
      // Bei Fehler trotzdem weiter navigieren, da lokales Token vorhanden ist
      console.warn('⚠️ Navigation wird trotz Token-Prüfungsfehler fortgesetzt (lokales Token vorhanden)')
    }
  }

  // Normale Navigation
  next()
})

// Nach jeder erfolgreichen Navigation
router.afterEach((to, from) => {
  console.log(`✅ Navigation zu "${to.name || to.path}" abgeschlossen`)

  // Dokumententitel aktualisieren basierend auf der Route
  if (to.meta.title) {
    document.title = `${to.meta.title} - WLS App`
  } else if (to.name) {
    document.title = `${to.name} - WLS App`
  }
})

export default router
