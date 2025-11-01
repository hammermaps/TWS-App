# ControllerUser API-Dokumentation

## Übersicht
Der ControllerUser stellt verschiedene API-Endpunkte zur Benutzerverwaltung bereit:

- Registrierung, Login, Logout
- Benutzer auflisten, abrufen, erstellen, löschen, bearbeiten
- Rollen und Token verwalten
- Passwort ändern

---

## Endpunkte und Zweck

### 1. Registrierung
**POST /user/register**
- Zweck: Neuen Benutzer registrieren
- Erwartet: JSON mit `username`, `password`, optional `name`, `email`
- Antwort: Erfolgs-/Fehlerobjekt mit Benutzerdaten
- Beispiel:
```bash
curl -X POST https://example.com/api/user/register -d '{"username":"max","password":"geheim"}'
```

### 2. Login
**POST /user/login**
- Zweck: Benutzer authentifizieren und Session/JWT erzeugen
- Erwartet: JSON mit `username`, `password`
- Antwort: Erfolgs-/Fehlerobjekt mit Benutzerdaten und Token
- Beispiel:
```bash
curl -X POST https://example.com/api/user/login -d '{"username":"max","password":"geheim"}'
```

### 3. Logout
**POST /user/logout**
- Zweck: Benutzer abmelden, Session und Token löschen
- Antwort: Erfolgs-/Fehlerobjekt

### 4. Benutzerliste
**GET /user/list**
- Zweck: Alle Benutzer auflisten (Admin/Supervisor)
- Antwort: Array mit Benutzerdaten

### 5. Einzelner Benutzer
**GET /user/get/{id}**
- Zweck: Benutzerdaten abrufen (eigene oder als Admin/Supervisor)
- Antwort: Benutzerdaten

### 6. Benutzer erstellen
**POST /user/create**
- Zweck: Neuen Benutzer anlegen (Admin/Supervisor)
- Erwartet: JSON mit `username`, `password`, `name`, `email`, `role`, `enabled`
- Antwort: Erfolgs-/Fehlerobjekt mit Benutzerdaten

### 7. Benutzer löschen
**DELETE /user/remove/{id}**
- Zweck: Benutzer löschen (Admin/Supervisor)
- Antwort: Erfolgs-/Fehlerobjekt

### 8. Benutzer bearbeiten
**POST /user/update/{id}**
- Zweck: Benutzerdaten ändern
- Erwartet: JSON mit Feldern wie `username`, `password`, `name`, `email`, `role`, `enabled`
- Antwort: Erfolgs-/Fehlerobjekt mit aktualisierten Daten

### 9. Token prüfen
**POST /user/checktoken**
- Zweck: JWT-Token auf Gültigkeit prüfen
- Erwartet: JSON mit `token`
- Antwort: Objekt mit `valid: true/false`

### 10. Passwort ändern
**POST /user/changepw**
- Zweck: Passwort des eigenen Accounts ändern
- Erwartet: JSON mit `oldPassword`, `newPassword`
- Antwort: Erfolgs-/Fehlerobjekt

### 11. Rolle abfragen
**GET /user/role**
- Zweck: Rolle des aktuellen Benutzers abfragen
- Antwort: Objekt mit `id`, `role`

### 12. Rolle setzen
**POST /user/setrole**
- Zweck: Rolle eines Benutzers ändern (Admin/Supervisor)
- Erwartet: JSON mit `id`, `role`, optional `enabled`
- Antwort: Erfolgs-/Fehlerobjekt

---

## Beispielantworten

**Erfolgreiche Registrierung:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "max",
    "name": "Max Mustermann",
    "email": "max@example.com",
    "role": "user",
    "enabled": true
  },
  "message": "User registered successfully"
}
```

**Fehlerhafte Anmeldung:**
```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

---

## Hinweise
- Die Endpunkte sind für die sichere Verwaltung von Benutzern und deren Rollen konzipiert.
- Fehler werden als JSON mit `success: false` und einer Fehlerbeschreibung zurückgegeben.
- Rollen und Berechtigungen werden strikt geprüft.
- Die API ist für Web- und Mobile-Clients geeignet.

