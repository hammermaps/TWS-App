# i18n Übersetzung: flushing.noGPSData hinzugefügt

## Problem

In der Flush-History wurde bei der Position der Platzhalter `flushing.noGPSData` angezeigt, wenn keine GPS-Daten verfügbar waren. Die Übersetzung fehlte in den Sprachdateien.

## Symptom

```
Position: flushing.noGPSData
```

Statt des erwarteten Textes:
```
Position: Keine GPS-Daten verfügbar
```

## Lösung

Die fehlenden Übersetzungen wurden in beiden Sprachdateien hinzugefügt:

### Deutsche Übersetzung (`de.json`)
```json
{
  "flushing": {
    ...
    "position": "Position",
    "noGPSData": "Keine GPS-Daten verfügbar",
    "accuracy": "Genauigkeit",
    ...
  }
}
```

### Englische Übersetzung (`en.json`)
```json
{
  "flushing": {
    ...
    "position": "Position",
    "noGPSData": "No GPS data available",
    "accuracy": "Accuracy",
    ...
  }
}
```

## Verwendung

Die Übersetzung wird in `ApartmentFlushHistory.vue` verwendet:

```vue
<CTableDataCell>
  <div v-if="record.latitude && record.longitude">
    <div class="small">
      <CIcon name="cilLocationPin" class="me-1" />
      {{ record.latitude.toFixed(4) }}, {{ record.longitude.toFixed(4) }}
    </div>
    <div v-if="record.location_accuracy" class="text-muted small">
      Genauigkeit: ±{{ Math.round(record.location_accuracy) }}m
    </div>
  </div>
  <span v-else class="text-muted small">{{ $t('flushing.noGPSData') }}</span>
</CTableDataCell>
```

## Erwartetes Verhalten

### Mit GPS-Daten
```
Position:
📍 50.7350, 7.0982
Genauigkeit: ±15m
```

### Ohne GPS-Daten (nach der Korrektur)
```
Position:
Keine GPS-Daten verfügbar
```

## Geänderte Dateien

- ✅ `/src/i18n/locales/de.json` - Deutsche Übersetzung hinzugefügt
- ✅ `/src/i18n/locales/en.json` - Englische Übersetzung hinzugefügt

## Testing

1. Öffne die Flush-History einer Wohnung
2. Suche nach einem Eintrag ohne GPS-Daten
3. In der Position-Spalte sollte jetzt angezeigt werden:
   - **Deutsch**: "Keine GPS-Daten verfügbar"
   - **Englisch**: "No GPS data available"

## Autor

- **Datum**: 2026-02-19
- **Implementiert von**: GitHub Copilot

---

**Status**: ✅ Implementiert
