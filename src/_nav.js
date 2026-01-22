export default [
  {
    component: 'CNavItem',
    name: 'nav.dashboard',
    to: '/dashboard',
    icon: 'cilSpeedometer',
    requiresOnline: false, // Dashboard funktioniert offline (gecachte Daten)
  },
  {
    component: 'CNavItem',
    name: 'nav.health',
    to: '/health-status',
    icon: 'cilHeart',
    requiresOnline: true, // Health Status benötigt Live-Daten vom Server
  },
  {
    component: 'CNavTitle',
    name: 'nav.buildingsAndApartments',
    requiresOnline: false,
  },
  {
    component: 'CNavItem',
    name: 'qrScanner.title',
    to: '/qr-scanner',
    icon: 'cilQrCode',
    requiresOnline: false, // QR-Scanner funktioniert auch offline (mit Cache)
  },
  {
    component: 'CNavItem',
    name: 'nav.buildings',
    to: '/buildings',
    icon: 'cilBuilding',
    requiresOnline: false, // Gebäude & Spülungen funktionieren offline
  },
  {
    component: 'CNavTitle',
    name: 'nav.users',
    requiresOnline: false,
  },
  {
    component: 'CNavItem',
    name: 'nav.profile',
    to: '/profile/view',
    icon: 'cilUser',
    requiresOnline: false, // Profil ansehen funktioniert offline (gecachte Daten)
  },
  {
    component: 'CNavItem',
    name: 'nav.profileEdit',
    to: '/profile',
    icon: 'cilSettings',
    requiresOnline: true, // Profil bearbeiten (Passwort ändern) nur online
  },
  {
    component: 'CNavTitle',
    name: 'nav.settings',
    requiresOnline: false,
  },
  {
    component: 'CNavItem',
    name: 'settings.title',
    to: '/settings',
    icon: 'cilCog',
    requiresOnline: false, // Konfiguration offline verfügbar (gecachte Daten)
  },
]
