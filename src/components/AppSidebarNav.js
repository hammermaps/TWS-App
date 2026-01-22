import { defineComponent, h, onMounted, ref, resolveComponent, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

import { cilExternalLink } from '@coreui/icons'
import { CBadge, CSidebarNav, CNavItem, CNavGroup, CNavTitle } from '@coreui/vue'
import nav from '@/_nav.js'
import { currentUser } from '@/stores/GlobalUser.js'
import { ApiUser } from '@/api/ApiUser.js'
import { useOnlineStatusStore } from '@/stores/OnlineStatus.js'

import simplebar from 'simplebar-vue'
import 'simplebar-vue/dist/simplebar.min.css'

const normalizePath = (path) =>
  decodeURI(path)
    .replace(/#.*$/, '')
    .replace(/(index)?\.(html)$/, '')

const isActiveLink = (route, link) => {
  if (link === undefined) {
    return false
  }

  if (route.hash === link) {
    return true
  }

  const currentPath = normalizePath(route.path)
  const targetPath = normalizePath(link)

  return currentPath === targetPath
}

const isActiveItem = (route, item) => {
  if (isActiveLink(route, item.to)) {
    return true
  }

  if (item.items) {
    return item.items.some((child) => isActiveItem(route, child))
  }

  return false
}

const AppSidebarNav = defineComponent({
  name: 'AppSidebarNav',
  components: {
    CNavItem,
    CNavGroup,
    CNavTitle,
  },
  setup() {
    const { t } = useI18n()
    const route = useRoute()
    const firstRender = ref(true)
    const apiUser = new ApiUser()
    const fallbackRole = ref(null)
    const isLoadingRole = ref(false)
    const onlineStatusStore = useOnlineStatusStore()

    onMounted(() => {
      firstRender.value = false
    })

    // Lade Rolle über API wenn currentUser.role undefined ist
    const loadRoleFromAPI = async () => {
      if (isLoadingRole.value) return // Verhindere mehrfache API-Calls

      // ✅ NEU: Prüfe Online-Status vor API-Call
      if (!onlineStatusStore.isFullyOnline) {
        console.log('📴 Offline-Modus: Überspringe user/role API-Call, verwende Fallback')
        fallbackRole.value = 'user' // Fallback auf 'user' im Offline-Modus
        return
      }

      console.log('🔍 Lade Rolle über getRole API...')
      isLoadingRole.value = true

      try {
        const roleResponse = await apiUser.getRole()
        if (roleResponse && roleResponse.role) {
          fallbackRole.value = roleResponse.role
          console.log('✅ Rolle über API geladen:', roleResponse.role)
        } else {
          console.log('⚠️ getRole API hat keine Rolle zurückgegeben')
          fallbackRole.value = 'user'
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden der Rolle über API:', error)
        fallbackRole.value = 'user'
      } finally {
        isLoadingRole.value = false
      }
    }

    const resolveName = (name) => {
      try {
        // Wenn name ein i18n-Key ist (z.B. enthält einen Punkt) dann übersetzen
        if (typeof name === 'string' && name.includes('.')) {
          const translated = t(name)
          // t(name) gibt key zurück wenn nicht vorhanden - überprüfe das
          if (translated && translated !== name) return translated
        }
      } catch (e) {
        // ignore i18n errors und fallback
      }
      return name
    }

    const renderItem = (item) => {
      if (item.items) {
        return h(
          CNavGroup,
          {
            as: 'div',
            compact: true,
            ...(firstRender.value && {
              visible: item.items.some((child) => isActiveItem(route, child)),
            }),
          },
          {
            togglerContent: () => [
              h(resolveComponent('CIcon'), {
                customClassName: 'nav-icon',
                name: item.icon,
              }),
              resolveName(item.name),
            ],
            default: () => item.items.map((child) => renderItem(child)),
          },
        )
      }

      if (item.href) {
        return h(
          resolveComponent(item.component),
          {
            href: item.href,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          {
            default: () => [
              item.icon
                ? h(resolveComponent('CIcon'), {
                    customClassName: 'nav-icon',
                    icon: item.icon,
                  })
                : h('span', { class: 'nav-icon' }, h('span', { class: 'nav-icon-bullet' })),
              resolveName(item.name),
              item.external && h(resolveComponent('CIcon'), {
                class: 'ms-2',
                icon: 'cil-external-link',
                size: 'sm'
              }),
              item.badge &&
                h(
                  CBadge,
                  {
                    class: 'ms-auto',
                    color: item.badge.color,
                    size: 'sm',
                  },
                  {
                    default: () => item.badge.text,
                  },
                ),
            ],
          },
        )
      }

      return item.to
        ? h(
            RouterLink,
            {
              to: item.to,
              custom: true,
            },
            {
              default: (props) =>
                h(
                  resolveComponent(item.component),
                  {
                    active: props.isActive,
                    as: 'div',
                    href: props.href,
                    onClick: () => props.navigate(),
                  },
                  {
                    default: () => [
                      item.icon
                        ? h(resolveComponent('CIcon'), {
                            customClassName: 'nav-icon',
                          name: item.icon,
                          })
                        : h('span', { class: 'nav-icon' }, h('span', { class: 'nav-icon-bullet' })),
                      resolveName(item.name),
                      item.badge &&
                        h(
                          CBadge,
                          {
                            class: 'ms-auto',
                            color: item.badge.color,
                            size: 'sm',
                          },
                          {
                            default: () => item.badge.text,
                          },
                        ),
                    ],
                  },
                ),
            },
          )
        : h(
            resolveComponent(item.component),
            {
              as: 'div',
            },
            {
              default: () => resolveName(item.name),
            },
          )
    }

    // Sichere Benutzerrolle with erweiterten Fallback
    const userRole = computed(() => {
      const role = currentUser.value?.role
      console.log('🔍 Aktuelle Benutzerrolle in Sidebar:', role)

      if (role) {
        return role // Verwende Rolle aus currentUser wenn verfügbar
      }

      // Wenn keine Rolle im currentUser, versuche API-Call
      if (!fallbackRole.value && !isLoadingRole.value) {
        loadRoleFromAPI()
      }

      return fallbackRole.value || 'user' // Fallback auf API-Rolle oder 'user'
    })

    // Gefilterte Navigation mit Debug-Logging und Online-Status
    const filteredNav = computed(() => {
      const role = userRole.value
      const isOnline = onlineStatusStore.isFullyOnline
      console.log('🎯 Filtere Navigation für Rolle:', role, '| Online:', isOnline)

      const filtered = nav.filter(item => {
        // Filter nach Rolle
        if (item.roles && item.roles.length > 0) {
          const hasRoleAccess = item.roles.includes(role)
          if (!hasRoleAccess) {
            console.log(`❌ Item "${item.name}" - Keine Rollenberechtigung für "${role}"`)
            return false
          }
        }

        // Filter nach Online-Status (nur wenn requiresOnline explizit true ist)
        if (item.requiresOnline === true && !isOnline) {
          console.log(`🔴 Item "${item.name}" - Offline nicht verfügbar`)
          return false
        }

        console.log(`✅ Zeige Item: "${item.name}"`)
        return true
      })

      console.log('📋 Gefilterte Navigation Items:', filtered.length)
      return filtered
    })

    return () =>
      h(
        CSidebarNav,
        {
          as: simplebar,
        },
        {
          default: () => filteredNav.value.map((item) => renderItem(item)),
        },
      )
  },
})

export { AppSidebarNav }
