# Sprachauswahl auf der Login-Seite

## Übersicht
Die Login-Seite wurde um eine Sprachauswahl erweitert, die es Benutzern ermöglicht, die Sprache der Anwendung zu ändern, bevor sie sich anmelden.

## Implementierung

### 1. UI-Komponente
- **Position**: Oben rechts im Login-Formular neben dem Titel
- **Komponente**: CoreUI Dropdown (CDropdown)
- **Anzeige**: Flagge + Sprachcode (z.B. "🇩🇪 DE" oder "🇬🇧 EN")

### 2. Funktionalität
- **Verfügbare Sprachen**: 
  - Deutsch (de) 🇩🇪
  - English (en) 🇬🇧

- **Sprachwechsel**: 
  - Klick auf eine Sprache wechselt sofort die gesamte UI-Sprache
  - Die Auswahl wird im LocalStorage gespeichert
  - Beim nächsten Besuch wird die gespeicherte Sprache verwendet

### 3. Technische Details

#### Komponenten
```vue
<CDropdown variant="btn-group" placement="bottom-end" class="language-selector">
  <CDropdownToggle color="light" size="sm" class="border">
    {{ currentLocale.flag }} {{ currentLocale.code.toUpperCase() }}
  </CDropdownToggle>
  <CDropdownMenu>
    <CDropdownItem
      v-for="locale in availableLocales"
      :key="locale.code"
      @click="switchLanguage(locale.code)"
      :active="locale.code === currentLocale.code"
    >
      {{ locale.flag }} {{ locale.name }}
    </CDropdownItem>
  </CDropdownMenu>
</CDropdown>
```

#### Script Setup
```javascript
import { availableLocales, changeLanguage } from '../../i18n/index.js'
const { locale } = useI18n()

const currentLocale = computed(() => {
  return availableLocales.find(l => l.code === locale.value) || availableLocales[0]
})

const switchLanguage = (newLocale) => {
  changeLanguage(newLocale)
}
```

### 4. Styling
- Kompakte Darstellung mit kleiner Schaltfläche (size="sm")
- Border für bessere Sichtbarkeit
- Aktive Sprache wird im Dropdown hervorgehoben
- Hover-Effekt für bessere Benutzerfreundlichkeit

### 5. Integration mit i18n
Die Sprachauswahl nutzt die zentrale i18n-Konfiguration:
- `availableLocales`: Array aller verfügbaren Sprachen mit Code, Name und Flag
- `changeLanguage()`: Funktion zum Wechseln der Sprache
- Automatisches Speichern im LocalStorage
- Synchronisation mit HTML lang-Attribut

## Benutzerfluss
1. Benutzer öffnet die Login-Seite
2. Die zuletzt gewählte Sprache (oder Browser-Sprache) wird automatisch geladen
3. Benutzer kann über das Dropdown oben rechts die Sprache wechseln
4. Die komplette Login-Seite wird sofort in der neuen Sprache angezeigt
5. Die Sprachwahl wird für zukünftige Besuche gespeichert

## Vorteile
- ✅ Einfache Bedienung
- ✅ Kompaktes Design
- ✅ Persistente Speicherung
- ✅ Sofortige Aktualisierung
- ✅ Keine Anmeldung erforderlich zum Sprachwechsel
- ✅ Visuell ansprechend mit Flaggen

## Zukünftige Erweiterungen
- Weitere Sprachen können einfach hinzugefügt werden durch:
  1. Erstellen einer neuen Locale-Datei (z.B. `fr.json`)
  2. Import in `src/i18n/index.js`
  3. Hinzufügen zu `availableLocales` Array

## Getestete Szenarien
- ✅ Sprachwechsel auf Login-Seite
- ✅ Persistierung der Sprachwahl
- ✅ Browser-Sprache als Fallback
- ✅ Alle Texte werden korrekt übersetzt
- ✅ Responsive Design

