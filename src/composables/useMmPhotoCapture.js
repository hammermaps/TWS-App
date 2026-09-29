/**
 * useMmPhotoCapture.js
 * Composable für die Foto-Erfassung bei Mängelmeldungen (Capacitor Camera Plugin).
 *
 * Kapselt Camera.getPhoto() (Quelle wählbar: Kamera oder Galerie) und verwaltet
 * ein Array von Fotos (Base64/DataURL) vor dem Absenden der Meldung. Die Fotos
 * verlassen dieses Composable nie als natives Capacitor-Objekt - Aufrufer
 * erhalten nur {name, dataUrl}, passend zum Format, das OfflineMmReportStorage
 * und der Zwei-Phasen-Upload (ApiMm.preUpload()) erwarten.
 */

import { ref } from 'vue'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

const MAX_PHOTOS = 10

/**
 * @returns {{
 *   photos: import('vue').Ref<Array<{name: string, dataUrl: string}>>,
 *   capturing: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<string|null>,
 *   takePhoto: () => Promise<void>,
 *   pickFromGallery: () => Promise<void>,
 *   removePhoto: (index: number) => void,
 *   clearPhotos: () => void,
 * }}
 */
export function useMmPhotoCapture() {
  const photos = ref([])
  const capturing = ref(false)
  const error = ref(null)

  const _addPhotoFromCapacitor = (photo, sourceLabel) => {
    if (photos.value.length >= MAX_PHOTOS) {
      error.value = `Maximal ${MAX_PHOTOS} Fotos pro Meldung erlaubt`
      return
    }
    const dataUrl = `data:image/${photo.format || 'jpeg'};base64,${photo.base64String}`
    const name = `mm_${sourceLabel}_${Date.now()}_${photos.value.length + 1}.${photo.format || 'jpg'}`
    photos.value.push({ name, dataUrl })
  }

  /**
   * Nimmt ein Foto über die Gerätekamera auf
   */
  const takePhoto = async () => {
    error.value = null
    capturing.value = true
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
      })
      _addPhotoFromCapacitor(photo, 'camera')
    } catch (err) {
      // Abbruch durch den Nutzer (Dialog geschlossen) ist kein Fehler
      if (err?.message !== 'User cancelled photos app') {
        console.error('❌ Fehler bei der Fotoaufnahme:', err)
        error.value = err?.message || 'Foto konnte nicht aufgenommen werden'
      }
    } finally {
      capturing.value = false
    }
  }

  /**
   * Wählt ein Foto aus der Galerie
   */
  const pickFromGallery = async () => {
    error.value = null
    capturing.value = true
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        correctOrientation: true,
      })
      _addPhotoFromCapacitor(photo, 'gallery')
    } catch (err) {
      if (err?.message !== 'User cancelled photos app') {
        console.error('❌ Fehler bei der Fotoauswahl:', err)
        error.value = err?.message || 'Foto konnte nicht ausgewählt werden'
      }
    } finally {
      capturing.value = false
    }
  }

  /**
   * Entfernt ein einzelnes Foto aus der Liste
   * @param {number} index
   */
  const removePhoto = (index) => {
    photos.value.splice(index, 1)
  }

  /**
   * Entfernt alle erfassten Fotos (z. B. nach erfolgreichem Absenden)
   */
  const clearPhotos = () => {
    photos.value = []
  }

  return {
    photos,
    capturing,
    error,
    takePhoto,
    pickFromGallery,
    removePhoto,
    clearPhotos,
  }
}
