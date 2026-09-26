// usePushNotifications.js - FCM-Push-Registrierung für die Android-App (Capacitor)
//
// Läuft ausschließlich auf der nativen Android-Plattform (Capacitor.isNativePlatform()).
// Im Browser/PWA-Kontext bleibt jeder Aufruf ein No-op, da @capacitor/push-notifications
// dort keine Implementierung hat. Erfordert außerdem ein echtes Firebase-Projekt
// (google-services.json im Android-Build) - ohne das schlägt die native Registrierung
// fehl, was hier ebenfalls nur geloggt, nie als Fehler nach außen geworfen wird.

let lastRegisteredToken = null

async function getPushNotificationsPlugin() {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) return null

    const { PushNotifications } = await import('@capacitor/push-notifications')
    return PushNotifications
  } catch (e) {
    console.warn('⚠️ @capacitor/push-notifications nicht verfügbar:', e)
    return null
  }
}

/**
 * Fordert die Benachrichtigungs-Berechtigung an, registriert das Gerät bei FCM
 * und meldet das erhaltene Token beim Backend an (POST /user/push-token).
 * apiClient: eine ApiUser-Instanz (aus useUser()/ApiUser.js).
 */
export async function registerForPushNotifications(apiClient) {
  const PushNotifications = await getPushNotificationsPlugin()
  if (!PushNotifications || !apiClient) return

  try {
    let permStatus = await PushNotifications.checkPermissions()
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }
    if (permStatus.receive !== 'granted') {
      console.warn('⚠️ Push-Benachrichtigungen: Berechtigung nicht erteilt')
      return
    }

    // Alte Listener entfernen, damit sie sich bei erneutem Login nicht anhäufen
    await PushNotifications.removeAllListeners()

    PushNotifications.addListener('registration', (token) => {
      lastRegisteredToken = token.value
      apiClient.registerPushToken(token.value, {
        deviceInfo: navigator.userAgent || null
      }).catch((e) => console.warn('⚠️ Push-Token-Registrierung fehlgeschlagen:', e))
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('⚠️ Push-Registrierung (FCM) fehlgeschlagen:', err)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('🔔 Push-Benachrichtigung empfangen:', notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('🔔 Push-Benachrichtigung angetippt:', action)
    })

    await PushNotifications.register()
  } catch (e) {
    console.warn('⚠️ Push-Benachrichtigungen konnten nicht initialisiert werden:', e)
  }
}

/**
 * Meldet das zuletzt registrierte Gerätetoken beim Backend ab (z.B. bei Logout).
 */
export async function unregisterPushNotifications(apiClient) {
  const PushNotifications = await getPushNotificationsPlugin()
  if (!PushNotifications || !apiClient || !lastRegisteredToken) return

  try {
    await apiClient.unregisterPushToken(lastRegisteredToken)
  } catch (e) {
    console.warn('⚠️ Push-Token-Abmeldung fehlgeschlagen:', e)
  } finally {
    lastRegisteredToken = null
  }
}
