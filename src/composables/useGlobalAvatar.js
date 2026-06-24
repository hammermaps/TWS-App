import { ref } from 'vue'

// Modulweiter Singleton — alle Komponenten teilen denselben ref
const globalAvatar = ref(null) // null = noch nicht geladen, string = base64-Data-URL

export function useGlobalAvatar() {
  function setAvatar(base64OrNull) {
    globalAvatar.value = base64OrNull || null
  }

  function clearAvatar() {
    globalAvatar.value = null
  }

  return { globalAvatar, setAvatar, clearAvatar }
}
