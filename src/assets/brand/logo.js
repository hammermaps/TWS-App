export const logo = [
  '380 80',
  `<defs>
    <linearGradient id="wlsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
  </defs>
  <g>
    <!-- Icon Teil - Modernes W-Symbol mit Wellen -->
    <g transform="translate(0, 0)">
      <!-- Äußerer Ring -->
      <circle cx="40" cy="40" r="36" fill="none" stroke="url(#wlsGradient)" stroke-width="3" opacity="0.3"/>

      <!-- W-Form mit Wellen-Effekt -->
      <path d="M 15 25 L 22 50 L 30 30 L 40 50 L 50 30 L 58 50 L 65 25"
            fill="none"
            stroke="url(#wlsGradient)"
            stroke-width="4.5"
            stroke-linecap="round"
            stroke-linejoin="round"/>

      <!-- Akzent-Punkte -->
      <circle cx="22" cy="50" r="3" fill="url(#wlsGradient)"/>
      <circle cx="40" cy="50" r="3" fill="url(#wlsGradient)"/>
      <circle cx="58" cy="50" r="3" fill="url(#wlsGradient)"/>

      <!-- Unterstrich/Welle -->
      <path d="M 20 60 Q 30 57, 40 60 T 60 60"
            fill="none"
            stroke="url(#wlsGradient)"
            stroke-width="2.5"
            stroke-linecap="round"
            opacity="0.7"/>
    </g>

    <!-- Text Teil - WLS -->
    <g transform="translate(95, 20)" style="fill: currentColor">
      <!-- W -->
      <path d="M 0 0 L 8 40 L 18 15 L 28 40 L 36 0 L 30 0 L 25 28 L 18 10 L 11 28 L 6 0 Z"
            style="fill: currentColor"/>

      <!-- L -->
      <path d="M 50 0 L 44 0 L 44 40 L 68 40 L 68 34 L 50 34 Z"
            style="fill: currentColor"/>

      <!-- S -->
      <path d="M 90 8 C 90 3 86 0 80 0 L 75 0 C 69 0 65 3 65 8 L 65 10 L 71 10 L 71 8 C 71 6 72 5 75 5 L 80 5 C 83 5 84 6 84 8 L 84 12 C 84 14 83 15 80 15 L 75 15 C 69 15 65 18 65 23 L 65 32 C 65 37 69 40 75 40 L 80 40 C 86 40 90 37 90 32 L 90 30 L 84 30 L 84 32 C 84 34 83 35 80 35 L 75 35 C 72 35 71 34 71 32 L 71 23 C 71 21 72 20 75 20 L 80 20 C 86 20 90 17 90 12 Z"
            style="fill: currentColor"/>
    </g>

    <!-- Subtext - App -->
    <g transform="translate(95, 55)" style="fill: currentColor; opacity: 0.7">
      <text x="0" y="0" font-family="Arial, sans-serif" font-size="12" font-weight="600" letter-spacing="2">
        APP
      </text>
    </g>
  </g>
`,
]
