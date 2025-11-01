/**
 * Navigation zur nächsten Wohnung - Implementierung für ApartmentFlushing.vue
 *
 * Diese Funktion ersetzt die TODO-Implementierung in Zeile 484
 *
 * ANLEITUNG:
 * 1. Öffne: src/views/apartments/ApartmentFlushing.vue
 * 2. Suche nach: const navigateToNextApartment = async () => {
 * 3. Ersetze die gesamte Funktion (Zeilen 484-488) mit dem Code unten
 */

const navigateToNextApartment = async () => {
  try {
    // Hole alle Apartments für dieses Gebäude aus dem Storage
    const buildingApartments = apartmentStorage.getByBuildingId(buildingId.value)

    if (!buildingApartments || buildingApartments.length === 0) {
      console.log('Keine Apartments gefunden, zurück zur Übersicht')
      goBack()
      return
    }

    // Sortiere Apartments nach 'sorted' Feld, dann nach Etage und Nummer
    const sortedApartments = [...buildingApartments].sort((a, b) => {
      // Erst nach 'sorted' sortieren (falls vorhanden)
      if (a.sorted !== b.sorted) {
        return a.sorted - b.sorted
      }
      // Dann nach Etage
      if (a.floor !== b.floor) {
        return (a.floor || '').localeCompare(b.floor || '')
      }
      // Dann nach Apartment-Nummer
      return (a.number || '').localeCompare(b.number || '')
    })

    // Finde die aktuelle Position
    const currentIndex = sortedApartments.findIndex(apt => apt.id === parseInt(apartmentId.value))

    if (currentIndex === -1) {
      console.log('Aktuelles Apartment nicht gefunden, zurück zur Übersicht')
      goBack()
      return
    }

    // Finde das nächste aktivierte Apartment
    let nextApartment = null
    for (let i = currentIndex + 1; i < sortedApartments.length; i++) {
      if (sortedApartments[i].enabled) {
        nextApartment = sortedApartments[i]
        break
      }
    }

    // Falls kein nächstes gefunden, zurück zum Anfang suchen (wrap around)
    if (!nextApartment) {
      for (let i = 0; i < currentIndex; i++) {
        if (sortedApartments[i].enabled) {
          nextApartment = sortedApartments[i]
          break
        }
      }
    }

    // Wenn nächstes Apartment gefunden, dorthin navigieren
    if (nextApartment) {
      console.log('Navigiere zum nächsten Apartment:', nextApartment.number)
      await router.push({
        name: 'ApartmentFlushing',
        params: {
          buildingId: buildingId.value,
          apartmentId: nextApartment.id
        },
        query: {
          buildingName: buildingName.value,
          apartmentNumber: nextApartment.number
        }
      })
    } else {
      // Keine weiteren aktivierten Apartments gefunden
      console.log('Keine weiteren aktivierten Apartments, zurück zur Übersicht')
      goBack()
    }
  } catch (err) {
    console.error('Fehler beim Navigieren zum nächsten Apartment:', err)
    goBack()
  }
}

