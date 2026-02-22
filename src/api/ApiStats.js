import { ref } from 'vue'
import { getAuthHeaders } from '../stores/GlobalToken.js'
import { PRODUCTION_API_URL } from '../config/apiConfig.js'

/**
 * Gibt die Basis-URL für Stats-Endpunkte zurück.
 * Stats hat keinen /api Prefix, sondern zeigt direkt auf /stats/...
 * Im Dev-Modus wird der Vite-Proxy verwendet (leere String → relative URL),
 * in Production (und Android/Capacitor) die absolute URL.
 */
function getStatsBaseUrl() {
  // Capacitor/Android erkennen: kein localhost Dev-Server vorhanden
  const isCapacitor = typeof window !== 'undefined' &&
    (window.location.protocol === 'capacitor:' ||
     window.location.hostname === 'localhost' && typeof window.Capacitor !== 'undefined' ||
     window.location.hostname === 'app')

  if (import.meta.env.DEV && !isCapacitor) {
    // Im Dev-Modus: relative URL (Vite-Proxy übernimmt Weiterleitung)
    return ''
  }
  // In Production und Android: absolute URL ohne /api Prefix
  return PRODUCTION_API_URL
}

/**
 * Composable für Statistics API
 */
export function useApiStats() {
  const workStats = ref(null)
  const loading = ref(false)
  const error = ref(null)

  /**
   * Arbeitsstatistiken für einen Benutzer abrufen
   * @param {number} userId - ID des Benutzers
   */
  async function getWorkStats(userId) {
    if (!userId) {
      error.value = 'Benutzer-ID ist erforderlich'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const headers = getAuthHeaders()
      const baseUrl = getStatsBaseUrl()

      console.log(`🚀 Lade Arbeitsstatistiken für Benutzer ${userId}`)

      // Endpoint: /stats/work/{userId} (ohne /api Prefix)
      const response = await fetch(`${baseUrl}/stats/work/${userId}`, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...headers
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Versuche JSON zu parsen (auch wenn Content-Type nicht application/json ist)
      let data
      try {
        const text = await response.text()
        // Prüfe ob es wie JSON aussieht
        const trimmed = text.trim()
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          console.error('❌ Keine JSON-Antwort erhalten:', trimmed.substring(0, 200))
          throw new Error('Server hat keine JSON-Antwort zurückgegeben')
        }
        data = JSON.parse(trimmed)
      } catch (parseErr) {
        console.error('❌ JSON-Parsing fehlgeschlagen:', parseErr.message)
        throw new Error('JSON-Parsing fehlgeschlagen: ' + parseErr.message)
      }

      if (data.success) {
        workStats.value = data.data
        console.log('✅ Arbeitsstatistiken erfolgreich geladen:', data.data)
        return data.data
      } else {
        throw new Error(data.error || 'Unbekannter Fehler beim Laden der Statistiken')
      }
    } catch (err) {
      console.error('❌ Fehler beim Laden der Arbeitsstatistiken:', err)
      error.value = err.message
      workStats.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Monatsexport für einen Benutzer
   * @param {string} month - Monat im Format YYYY-MM
   */
  async function exportMonth(month) {
    if (!month) {
      error.value = 'Monat ist erforderlich'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const headers = getAuthHeaders()
      const baseUrl = getStatsBaseUrl()

      console.log(`🚀 Exportiere Daten für Monat ${month}`)

      // Endpoint: /stats/export/{month} (ohne /api Prefix)
      const response = await fetch(`${baseUrl}/stats/export/${month}`, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...headers
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Versuche JSON zu parsen (auch ohne application/json Content-Type)
      let data
      try {
        const text = await response.text()
        const trimmed = text.trim()
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          console.error('❌ Keine JSON-Antwort erhalten:', trimmed.substring(0, 200))
          throw new Error('Server hat keine JSON-Antwort zurückgegeben')
        }
        data = JSON.parse(trimmed)
      } catch (parseErr) {
        console.error('❌ JSON-Parsing fehlgeschlagen:', parseErr.message)
        throw new Error('JSON-Parsing fehlgeschlagen: ' + parseErr.message)
      }

      if (data.success) {
        console.log('✅ Export erfolgreich:', data.data)
        return data.data
      } else {
        throw new Error(data.error || 'Unbekannter Fehler beim Export')
      }
    } catch (err) {
      console.error('❌ Fehler beim Export:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Statistiken zurücksetzen
   */
  function clearStats() {
    workStats.value = null
    error.value = null
    loading.value = false
  }

  /**
   * Export-Daten als CSV herunterladen
   * @param {Object} exportData - Die Export-Daten vom Server
   * @param {string} filename - Dateiname ohne Erweiterung
   */
  function downloadExportAsCSV(exportData, filename = 'arbeitszeit-export') {
    if (!exportData || !exportData.records) {
      console.error('Keine Export-Daten verfügbar')
      return
    }

    const csvHeader = [
      'Datum',
      'Startzeit',
      'Endzeit',
      'Dauer',
      'Gebäude',
      'Apartment',
      'GPS Lat',
      'GPS Lng',
      'GPS Genauigkeit',
      'Erstellt am'
    ].join(';')

    const csvRows = exportData.records.map(record => [
      record.date,
      record.start_time,
      record.end_time,
      record.duration_formatted,
      record.building_name,
      record.apartment_number,
      record.gps_coordinates.latitude || '',
      record.gps_coordinates.longitude || '',
      record.gps_coordinates.accuracy || '',
      record.created_at
    ].join(';'))

    const csvContent = [csvHeader, ...csvRows].join('\n')

    // CSV-Datei erstellen und herunterladen
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}-${exportData.export_month}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)

    console.log(`✅ CSV-Export heruntergeladen: ${link.download}`)
  }

  /**
   * Export-Daten für Druck aufbereiten (HTML-Format)
   * @param {Object} exportData - Die Export-Daten vom Server
   */
  function generatePrintableHTML(exportData) {
    if (!exportData) {
      console.error('Keine Export-Daten verfügbar')
      return ''
    }

    const formatDateTime = (dateTime) => {
      try {
        return new Date(dateTime).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch {
        return dateTime
      }
    }

    const formatDate = (date) => {
      try {
        return new Date(date).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      } catch {
        return date
      }
    }

    // Gruppiere Einträge nach Datum
    const recordsByDate = {}
    exportData.records.forEach(record => {
      if (!recordsByDate[record.date]) {
        recordsByDate[record.date] = []
      }
      recordsByDate[record.date].push(record)
    })

    let htmlContent = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Arbeitszeit Export - ${exportData.export_month}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }

        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          margin: 20px;
          color: #333;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }

        .header h1 {
          margin: 0;
          font-size: 24px;
          color: #2c5aa0;
        }

        .summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
        }

        .summary-box {
          background: white;
          padding: 15px;
          border-radius: 5px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .summary-box h3 {
          margin: 0 0 10px 0;
          color: #2c5aa0;
          font-size: 14px;
        }

        .daily-section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }

        .daily-header {
          background: #e9ecef;
          padding: 10px;
          border-left: 4px solid #2c5aa0;
          margin-bottom: 10px;
        }

        .daily-header h3 {
          margin: 0;
          font-size: 16px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }

        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }

        th {
          background: #f8f9fa;
          font-weight: bold;
          font-size: 11px;
        }

        td {
          font-size: 10px;
        }

        .time {
          font-family: monospace;
          white-space: nowrap;
        }

        .duration {
          font-weight: bold;
          color: #28a745;
        }

        .apartment {
          background: #e3f2fd;
          font-weight: bold;
          text-align: center;
        }

        .gps-yes {
          color: #28a745;
        }

        .gps-no {
          color: #dc3545;
        }

        .total-row {
          background: #f8f9fa;
          font-weight: bold;
        }

        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          color: #666;
          text-align: center;
        }

        .print-button {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()"
              style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
        🖨️ Drucken
      </button>

      <div class="header">
        <h1>Arbeitszeit Export</h1>
        <p><strong>Zeitraum:</strong> ${formatDate(exportData.period_start)} bis ${formatDate(exportData.period_end)}</p>
        <p><strong>Export erstellt am:</strong> ${formatDateTime(exportData.export_date)}</p>
      </div>

      <div class="summary">
        <div class="summary-box">
          <h3>📊 Gesamtstatistik</h3>
          <p><strong>Einträge gesamt:</strong> ${exportData.total_records}</p>
          <p><strong>Gesamtdauer:</strong> ${exportData.total_duration_formatted}</p>
          <p><strong>Zeitraum:</strong> ${exportData.export_month}</p>
        </div>
      </div>`

    // Gebäude-Übersicht
    if (exportData.summary.buildings && exportData.summary.buildings.length > 0) {
      htmlContent += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #2c5aa0; border-bottom: 1px solid #ddd; padding-bottom: 5px;">🏢 Gebäude-Übersicht</h2>
        ${exportData.summary.buildings.map(building => `
          <div style="margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${building.building_name}</h3>
            <p><strong>Einträge gesamt:</strong> ${building.total_entries} | <strong>Gesamtdauer:</strong> ${building.total_duration_formatted}</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 10px;">
              ${building.apartments.map(apt => `
                <div style="background: white; padding: 10px; border-radius: 3px; border-left: 3px solid #007bff;">
                  <strong>Apartment ${apt.apartment_number}</strong><br>
                  ${apt.entries} Einträge | ${apt.duration_formatted}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>`
    }

    // Tägliche Aufschlüsselung
    htmlContent += `<h2 style="color: #2c5aa0; border-bottom: 1px solid #ddd; padding-bottom: 5px;">📅 Tägliche Aufschlüsselung</h2>`

    Object.keys(recordsByDate).sort().forEach(date => {
      const dayRecords = recordsByDate[date]
      const dayTotal = dayRecords.reduce((sum, record) => sum + record.duration_seconds, 0)
      const dayTotalFormatted = Math.floor(dayTotal / 3600) + 'h ' +
                               Math.floor((dayTotal % 3600) / 60) + 'm ' +
                               (dayTotal % 60) + 's'

      htmlContent += `
        <div class="daily-section">
          <div class="daily-header">
            <h3>${formatDate(date)} (${dayRecords.length} Einträge - ${dayTotalFormatted})</h3>
          </div>

          <table>
            <thead>
              <tr>
                <th>Zeit</th>
                <th>Von</th>
                <th>Bis</th>
                <th>Dauer</th>
                <th>Gebäude</th>
                <th>Apartment</th>
                <th>GPS</th>
              </tr>
            </thead>
            <tbody>
              ${dayRecords.map(record => `
                <tr>
                  <td class="time">#${record.record_id}</td>
                  <td class="time">${record.start_time.split(' ')[1]}</td>
                  <td class="time">${record.end_time.split(' ')[1]}</td>
                  <td class="duration">${record.duration_formatted}</td>
                  <td>${record.building_name}</td>
                  <td class="apartment">${record.apartment_number}</td>
                  <td class="${record.gps_coordinates.latitude ? 'gps-yes' : 'gps-no'}">
                    ${record.gps_coordinates.latitude ? '✓' : '✗'}
                  </td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3"><strong>Tagessumme</strong></td>
                <td class="duration"><strong>${dayTotalFormatted}</strong></td>
                <td colspan="3"></td>
              </tr>
            </tbody>
          </table>
        </div>`
    })

    htmlContent += `
      <div class="footer">
        <p>Generiert am ${new Date().toLocaleString('de-DE')} |
           Gesamtdauer: ${exportData.total_duration_formatted} |
           Einträge: ${exportData.total_records}</p>
      </div>
    </body>
    </html>`

    return htmlContent
  }

  /**
   * Export-Daten als druckbare HTML-Seite öffnen
   * @param {Object} exportData - Die Export-Daten vom Server
   */
  function openPrintView(exportData) {
    const htmlContent = generatePrintableHTML(exportData)
    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Auto-Print nach dem Laden
    printWindow.onload = () => {
      setTimeout(() => {
        console.log('🖨️ Druckansicht geöffnet')
      }, 100)
    }
  }

  return {
    workStats,
    loading,
    error,
    getWorkStats,
    exportMonth,
    clearStats,
    downloadExportAsCSV,
    openPrintView
  }
}
