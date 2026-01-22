# 📋 Vue 3 Defensive Programming - Best Practices

## Optional Chaining & Nullish Coalescing

### Problem: Null/Undefined Zugriff führt zu TypeError

```javascript
// ❌ SCHLECHT: Crash wenn store oder property null ist
const value = computed(() => {
  return store.someObject.someProperty.value
})

// ❌ AUCH SCHLECHT: Nur erste Ebene geschützt
const value = computed(() => {
  if (!store.someObject) return null
  return store.someObject.someProperty.value // Crash wenn someProperty null
})
```

### Lösung: Optionales Chaining verwenden

```javascript
// ✅ GUT: Sicher vor null/undefined auf allen Ebenen
const value = computed(() => {
  if (!store.someObject) return null
  return store.someObject?.someProperty?.value ?? null
})

// ✅ BESSER: Kurz und prägnant
const value = computed(() => {
  return store.someObject?.someProperty?.value ?? null
})
```

## Computed Properties mit Fallback-Werten

### Ref-Objekte aus Stores

```javascript
// Store hat Ref-Objekte
class MyService {
  constructor() {
    this.isLoading = ref(false)
    this.data = ref(null)
    this.error = ref(null)
  }
}

// ❌ SCHLECHT: Direkter Zugriff ohne Absicherung
const isLoading = computed(() => store.service.isLoading.value)

// ✅ GUT: Mit optionalem Chaining
const isLoading = computed(() => store.service?.isLoading?.value ?? false)
```

### Objekte und Arrays

```javascript
// ❌ SCHLECHT: Kein Fallback
const items = computed(() => store.data?.items)

// ✅ GUT: Mit Fallback-Array
const items = computed(() => store.data?.items ?? [])

// ✅ GUT: Mit Fallback-Objekt
const config = computed(() => store.config ?? { enabled: false, timeout: 5000 })
```

### Verschachtelte Zugriffe

```javascript
// ❌ SCHLECHT: Crash bei jedem null-Wert in der Kette
const userName = computed(() => store.user.profile.name)

// ✅ GUT: Jeder Schritt abgesichert
const userName = computed(() => store.user?.profile?.name ?? 'Unbekannt')

// ✅ AUCH GUT: Mit Guard Clause
const userName = computed(() => {
  if (!store.user?.profile) return 'Unbekannt'
  return store.user.profile.name
})
```

## Template-Zugriffe absichern

### v-if Guards verwenden

```vue
<!-- ❌ SCHLECHT: Crash wenn dataPreloader null -->
<div>{{ onlineStatusStore.dataPreloader.isPreloading.value }}</div>

<!-- ✅ GUT: Mit computed property -->
<div>{{ isPreloading }}</div>

<!-- ✅ AUCH GUT: Mit v-if Guard -->
<div v-if="onlineStatusStore.dataPreloader">
  {{ onlineStatusStore.dataPreloader.isPreloading.value }}
</div>
```

### Verschachtelte Bedingungen vereinfachen

```vue
<!-- ❌ SCHLECHT: Unleserlich -->
<div v-if="store && store.data && store.data.items && store.data.items.length">

<!-- ✅ GUT: Mit computed property -->
<div v-if="hasItems">

<script setup>
const hasItems = computed(() => (store.data?.items?.length ?? 0) > 0)
</script>
```

## Store-Initialisierung Pattern

### Problem: Race Condition bei Store-Setup

```javascript
// ❌ SCHLECHT: Service wird direkt zugewiesen
export const useMyStore = defineStore('myStore', () => {
  const service = useMyService() // Kann beim ersten Zugriff null sein
  
  return { service }
})
```

### Lösung A: Lazy Initialization

```javascript
// ✅ GUT: Service wird nur bei Bedarf initialisiert
export const useMyStore = defineStore('myStore', () => {
  let serviceInstance = null
  
  function getService() {
    if (!serviceInstance) {
      serviceInstance = useMyService()
    }
    return serviceInstance
  }
  
  return { getService }
})
```

### Lösung B: Ready State

```javascript
// ✅ BESSER: Expliziter Ready-State
export const useMyStore = defineStore('myStore', () => {
  const service = ref(null)
  const isReady = ref(false)
  
  onMounted(() => {
    service.value = useMyService()
    isReady.value = true
  })
  
  return { service, isReady }
})

// In Komponente
const canUse = computed(() => store.isReady && store.service)
```

## Watchers mit Absicherung

```javascript
// ❌ SCHLECHT: Watcher crasht bei null
watch(() => store.user.profile, (newVal) => {
  console.log(newVal.name)
})

// ✅ GUT: Mit null-Check
watch(() => store.user?.profile, (newVal) => {
  if (newVal?.name) {
    console.log(newVal.name)
  }
})

// ✅ BESSER: Mit immediate und deep Option
watch(
  () => store.user?.profile, 
  (newVal) => {
    if (newVal?.name) {
      console.log(newVal.name)
    }
  },
  { immediate: true, deep: true }
)
```

## Error Boundaries in Templates

```vue
<template>
  <!-- ✅ GUT: Error Boundary mit v-if -->
  <div v-if="error">
    <CAlert color="danger">{{ error }}</CAlert>
  </div>
  
  <!-- ✅ GUT: Loading State -->
  <div v-else-if="isLoading">
    <CSpinner />
  </div>
  
  <!-- ✅ GUT: Eigentlicher Inhalt -->
  <div v-else-if="data">
    {{ data.content }}
  </div>
  
  <!-- ✅ GUT: Empty State -->
  <div v-else>
    <p>Keine Daten verfügbar</p>
  </div>
</template>

<script setup>
const error = computed(() => store.error?.value ?? null)
const isLoading = computed(() => store.isLoading?.value ?? false)
const data = computed(() => store.data?.value ?? null)
</script>
```

## API Response Handling

```javascript
// ❌ SCHLECHT: Keine Absicherung
async function loadData() {
  const response = await api.getData()
  store.data = response.data.items
}

// ✅ GUT: Mit Null-Checks und Try-Catch
async function loadData() {
  try {
    const response = await api.getData()
    const items = response?.data?.items ?? []
    store.data = items
  } catch (error) {
    console.error('Failed to load data:', error)
    store.error = error.message
    store.data = [] // Fallback
  }
}
```

## Checkliste für Defensive Programmierung

- [ ] Alle Store-Zugriffe mit `?.` absichern
- [ ] Computed Properties haben Fallback-Werte mit `??`
- [ ] Refs werden mit `.value` korrekt zugegriffen
- [ ] Template hat Error/Loading/Empty States
- [ ] API-Calls in Try-Catch Blöcken
- [ ] Arrays haben `?? []` Fallback
- [ ] Objekte haben `?? {}` Fallback
- [ ] Booleans haben `?? false/true` Fallback
- [ ] Watchers prüfen auf null/undefined
- [ ] Store-Initialisierung ist abgesichert

## Typische Fehlerquellen

### 1. Doppelte .value Zugriffe
```javascript
// ❌ FALSCH
const value = ref(42)
console.log(value.value.value) // undefined

// ✅ RICHTIG
console.log(value.value) // 42
```

### 2. Vergessene .value bei Refs
```javascript
// ❌ FALSCH
const count = ref(0)
if (count > 0) // Vergleicht Ref-Objekt, nicht Wert

// ✅ RICHTIG
if (count.value > 0)
```

### 3. Null-Check ohne Property-Check
```javascript
// ❌ UNVOLLSTÄNDIG
if (store.data) {
  return store.data.items.length // Crash wenn items null
}

// ✅ VOLLSTÄNDIG
if (store.data?.items) {
  return store.data.items.length
}
```

## Performance-Hinweise

**Optionales Chaining ist schnell:**
- Moderne JavaScript-Engines optimieren `?.` sehr gut
- Kein messbarer Performance-Unterschied zu manuellen if-Checks
- Besser lesbar und wartbar

**Computed Properties werden gecacht:**
- Vue cached automatisch computed values
- Mehrfache Zugriffe kosten nichts
- Re-evaluation nur bei Dependency-Änderung

**Fallback-Objekte können optimiert werden:**
```javascript
// ❌ LANGSAM: Neues Objekt bei jedem Zugriff
const data = computed(() => store.data ?? { items: [] })

// ✅ SCHNELL: Konstantes Objekt wiederverwenden
const EMPTY_DATA = Object.freeze({ items: [] })
const data = computed(() => store.data ?? EMPTY_DATA)
```

---

**Best Practices zusammengefasst:**
1. 🛡️ Immer optionales Chaining (`?.`) für Property-Zugriffe
2. 🔄 Immer Nullish Coalescing (`??`) für Fallback-Werte
3. 🎯 Computed Properties für Template-Logik verwenden
4. ⚠️ Error/Loading/Empty States in Templates
5. 🔍 Refs korrekt mit `.value` zugreifen
6. 📦 Store-Initialisierung absichern
7. 🧪 Edge Cases testen (null, undefined, [])

**Erstellt:** 2025-11-01  
**Autor:** GitHub Copilot  
**Verwendung:** Referenz für Vue 3 Projekte

