# Fix: Vue Lifecycle Hook Warnung behoben

## Problem

```
[Vue warn]: onUnmounted is called when there is no active component instance to be associated with. 
Lifecycle injection APIs can only be used during execution of setup(). 
If you are using async setup(), make sure to register lifecycle hooks before the first await statement.
```

## Ursache

In Vue 3 mit `<script setup>` oder async `setup()` müssen **alle Lifecycle-Hooks vor dem ersten `await` registriert werden**.

### Warum?

Vue 3's Composition API bindet Lifecycle-Hooks an die aktive Komponenten-Instanz. Nach einem `await` ist die Komponenten-Instanz möglicherweise nicht mehr aktiv, daher kann der Hook nicht korrekt registriert werden.

### Betroffener Code

**Vorher - FALSCH:**
```javascript
onMounted(async () => {
  // ... Setup-Code ...
  
  // Apartment-Daten laden
  await loadApartmentData()  // ← Erstes await
  
  // ❌ FALSCH: onUnmounted NACH dem await
  onUnmounted(() => {
    // Cleanup
  })
})
```

## Lösung

**Datei:** `/src/views/apartments/ApartmentFlushing.vue`

**Nachher - RICHTIG:**
```javascript
onMounted(async () => {
  // ... Setup-Code ...
  
  // Sync-Status regelmäßig aktualisieren
  const statusInterval = setInterval(() => {
    updateSyncStatus()
  }, 10000)
  
  // ✅ WICHTIG: Lifecycle-Hooks VOR dem ersten await registrieren!
  onUnmounted(() => {
    console.log('🧹 ApartmentFlushing cleanup')
    
    clearTimer()
    
    if (autoSyncInterval) {
      syncService.stopAutoSync(autoSyncInterval)
    }
    
    if (statusInterval) {
      clearInterval(statusInterval)
    }
    
    stopAutoNavWatch()
    stopOnlineWatch()
    unsubscribeSyncListener()
  })
  
  // Apartment-Daten laden (NACH onUnmounted-Registrierung)
  await loadApartmentData()  // ← Jetzt NACH onUnmounted
})
```

## Regel: Lifecycle-Hook-Registrierung

### ✅ RICHTIG - Hooks vor await:
```javascript
setup() {
  // 1. Reactive Refs
  const data = ref(null)
  
  // 2. Lifecycle-Hooks registrieren
  onMounted(() => { ... })
  onUnmounted(() => { ... })
  
  // 3. Async-Operationen
  await fetchData()
  
  return { data }
}
```

### ❌ FALSCH - Hooks nach await:
```javascript
setup() {
  const data = ref(null)
  
  await fetchData()  // ← await hier
  
  // ❌ FEHLER: Hook nach await
  onMounted(() => { ... })
  
  return { data }
}
```

## Best Practices für async setup()

### 1. Synchrone Registrierung
```javascript
onMounted(async () => {
  // Alle Hooks sofort registrieren
  onUnmounted(() => { ... })
  onBeforeUnmount(() => { ... })
  
  // Dann async-Operationen
  await loadData()
})
```

### 2. Watchers vor await
```javascript
onMounted(async () => {
  // Watchers registrieren
  const stopWatch = watch(source, callback)
  
  // Cleanup registrieren
  onUnmounted(() => {
    stopWatch()
  })
  
  // Dann async
  await loadData()
})
```

### 3. Event-Listener vor await
```javascript
onMounted(async () => {
  // Listener registrieren
  const handler = () => { ... }
  window.addEventListener('event', handler)
  
  // Cleanup registrieren
  onUnmounted(() => {
    window.removeEventListener('event', handler)
  })
  
  // Dann async
  await loadData()
})
```

## Reihenfolge in onMounted

**Empfohlene Reihenfolge:**

1. ✅ **Refs & Reactive State** (falls nötig)
2. ✅ **Watchers** erstellen
3. ✅ **Event-Listeners** registrieren
4. ✅ **Intervals/Timeouts** starten
5. ✅ **Lifecycle-Hooks** registrieren (onUnmounted, etc.)
6. ✅ **Async-Operationen** (await ...)

```javascript
onMounted(async () => {
  // 1. State
  const localState = ref(null)
  
  // 2. Watchers
  const stopWatch = watch(prop, callback)
  
  // 3. Event-Listeners
  window.addEventListener('event', handler)
  
  // 4. Intervals
  const interval = setInterval(callback, 1000)
  
  // 5. Lifecycle-Hooks (Cleanup)
  onUnmounted(() => {
    stopWatch()
    window.removeEventListener('event', handler)
    clearInterval(interval)
  })
  
  // 6. Async-Operationen
  await loadData()
  await fetchMore()
})
```

## Weitere betroffene Lifecycle-Hooks

Diese Regel gilt für **alle** Lifecycle-Hooks:

- `onBeforeMount()`
- `onMounted()`
- `onBeforeUpdate()`
- `onUpdated()`
- `onBeforeUnmount()`
- `onUnmounted()`
- `onActivated()`
- `onDeactivated()`
- `onErrorCaptured()`

**Alle müssen vor dem ersten await registriert werden!**

## Alternative: Top-Level await (Vue 3.3+)

Ab Vue 3.3 kann man auch Top-Level await in `<script setup>` verwenden:

```vue
<script setup>
// Top-level await ist erlaubt
const data = await fetchData()

// Lifecycle-Hooks danach sind OK
onMounted(() => {
  console.log('Mounted with data:', data)
})

onUnmounted(() => {
  // Cleanup
})
</script>
```

**Aber:** Das verzögert das Rendern der Komponente!

## Zusammenfassung

| Aktion | Timing | Korrekt? |
|--------|--------|----------|
| Lifecycle-Hook vor await | Vor erstem await | ✅ Ja |
| Lifecycle-Hook nach await | Nach erstem await | ❌ Nein |
| Watcher vor await | Vor erstem await | ✅ Empfohlen |
| Event-Listener vor await | Vor erstem await | ✅ Empfohlen |
| Async-Operation | Nach Hook-Registrierung | ✅ Ja |

## Geänderte Dateien

### ✅ `/src/views/apartments/ApartmentFlushing.vue`
**Änderung:**
- `onUnmounted()` verschoben: von **nach** await zu **vor** await
- Kommentar hinzugefügt: "WICHTIG: Lifecycle-Hooks VOR dem ersten await registrieren!"

### 📚 `/docs/VUE_LIFECYCLE_HOOKS_ASYNC_FIX.md`
**Neu:** Diese Dokumentation

## Testing

### Erwartetes Verhalten:
- ✅ Keine Vue-Warnung mehr in Console
- ✅ Component mounted korrekt
- ✅ Cleanup funktioniert beim Unmount
- ✅ Keine Memory-Leaks

### Test-Schritte:
1. Navigiere zu ApartmentFlushing.vue
2. Öffne Browser-Console
3. Prüfe: Keine "onUnmounted" Warnung
4. Navigiere weg von der Komponente
5. Prüfe: Cleanup-Log erscheint

---

**Status:** ✅ **Vollständig behoben**

Die Vue Lifecycle-Hook-Warnung ist jetzt behoben! `onUnmounted` wird korrekt vor dem ersten `await` registriert. 🎉

