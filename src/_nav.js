export default [
  {
    component: 'CNavItem',
    name: 'Dashboard',
    to: '/dashboard',
    icon: 'cilSpeedometer',
    badge: {
      color: 'info',
      text: 'NEU',
    },
    requiresOnline: false, // Dashboard funktioniert offline (gecachte Daten)
  },
  {
    component: 'CNavItem',
    name: 'Health Status',
    to: '/health-status',
    icon: 'cilHeart',
    requiresOnline: true, // Health Status benötigt Live-Daten vom Server
  },
  {
    component: 'CNavTitle',
    name: 'Gebäude & Wohnungen',
    requiresOnline: false,
  },
  {
    component: 'CNavItem',
    name: 'Gebäude',
    to: '/buildings',
    icon: 'cilBuilding',
    badge: {
      color: 'success',
      text: 'SPÜLUNG',
    },
    requiresOnline: false, // Gebäude & Spülungen funktionieren offline
  },
  {
    component: 'CNavTitle',
    name: 'Benutzer',
    requiresOnline: false,
  },
  {
    component: 'CNavItem',
    name: 'Profile',
    to: '/profile/view',
    icon: 'cilUser',
    requiresOnline: false, // Profil ansehen funktioniert offline (gecachte Daten)
  },
  {
    component: 'CNavItem',
    name: 'Profil bearbeiten',
    to: '/profile',
    icon: 'cilSettings',
    requiresOnline: true, // Profil bearbeiten (Passwort ändern) nur online
  },
  {
    component: 'CNavTitle',
    name: 'Einstellungen',
    requiresOnline: false,
  },
  {
    component: 'CNavItem',
    name: 'Konfiguration',
    to: '/settings',
    icon: 'cilCog',
    requiresOnline: false, // Konfiguration offline verfügbar (gecachte Daten)
  },
]
