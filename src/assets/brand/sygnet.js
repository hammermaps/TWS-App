export const sygnet = [
  '80 80',
  `<defs>
    <linearGradient id="wlsGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
  </defs>
  <g>
    <!-- Äußerer Ring mit Glow-Effekt -->
    <circle cx="40" cy="40" r="36"
            fill="none"
            stroke="url(#wlsGradientIcon)"
            stroke-width="3"
            opacity="0.3"/>

    <!-- Innerer Kreis als Background -->
    <circle cx="40" cy="40" r="32"
            fill="url(#wlsGradientIcon)"
            opacity="0.1"/>

    <!-- Hauptsymbol - Stilisiertes W mit Wellen -->
    <path d="M 15 25 L 22 50 L 30 30 L 40 50 L 50 30 L 58 50 L 65 25"
          fill="none"
          stroke="url(#wlsGradientIcon)"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"/>

    <!-- Akzent-Punkte für visuelle Balance -->
    <circle cx="22" cy="50" r="3.5" fill="url(#wlsGradientIcon)"/>
    <circle cx="40" cy="50" r="3.5" fill="url(#wlsGradientIcon)"/>
    <circle cx="58" cy="50" r="3.5" fill="url(#wlsGradientIcon)"/>

    <!-- Untere Welle als Designelement -->
    <path d="M 20 60 Q 30 57, 40 60 T 60 60"
          fill="none"
          stroke="url(#wlsGradientIcon)"
          stroke-width="3"
          stroke-linecap="round"
          opacity="0.7"/>

    <!-- Dezente Highlight-Linien oben -->
    <path d="M 25 18 L 30 18"
          stroke="url(#wlsGradientIcon)"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.5"/>
    <path d="M 50 18 L 55 18"
          stroke="url(#wlsGradientIcon)"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.5"/>
  </g>`,
]
