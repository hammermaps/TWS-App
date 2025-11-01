import { h, resolveComponent } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '@/stores/GlobalToken.js'
import { checkTokenOnPageLoad, setRouter } from '@/stores/TokenManager.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

import DefaultLayout from '@/layouts/DefaultLayout.vue'

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
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () =>
          import(
            /* webpackChunkName: "dashboard" */ '@/views/dashboard/Dashboard.vue'
          ),
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
      // Buildings routes
      {
        path: '/buildings',
        name: 'BuildingsOverview',
        meta: { requiresAuth: true, requiresOnline: false }, // Gebäude offline verfügbar (gecacht)
        component: () =>
          import(
            /* webpackChunkName: "buildings" */ '@/views/buildings/BuildingsOverview.vue'
          ),
      },
      {
        path: '/buildings/:id/apartments',
        name: 'BuildingApartments',
        meta: { requiresAuth: true, requiresOnline: false }, // Apartments offline verfügbar (gecacht)
        component: () =>
          import(
            /* webpackChunkName: "building-apartments" */ '@/views/buildings/BuildingApartments.vue'
          ),
      },
      // Apartment Flushing routes
      {
        path: '/buildings/:buildingId/apartments/:apartmentId/flush',
        name: 'ApartmentFlushing',
        meta: { requiresAuth: true, requiresOnline: false }, // Spülungen offline möglich!
        component: () =>
          import(
            /* webpackChunkName: "apartment-flushing" */ '@/views/apartments/ApartmentFlushing.vue'
          ),
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
  const token = getToken()
  const isAuthenticated = !!token

  console.log(`🧭 Navigation von "${from.name || 'Startseite'}" zu "${to.name || to.path}"`)

  // Routen die Authentication erfordern
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('Route erfordert Authentication, weiterleitung zu /login')
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
        // Umleitung erfolgt bereits im TokenManager
        return // Stoppe Navigation
      } else {
        console.log(`✅ Token-Prüfung für Route "${to.name}" erfolgreich`)
      }
    } catch (error) {
      console.error('❌ Fehler bei Router Token-Prüfung:', error)
      // Bei Fehler trotzdem weiter navigieren, aber warnen
      console.warn('⚠️ Navigation wird trotz Token-Prüfungsfehler fortgesetzt')
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
