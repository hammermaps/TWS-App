<template>
  <div class="buildings-overview">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2>Gebäude Übersicht</h2>
      <CButton color="primary" @click="loadBuildings">
        <CIcon icon="cil-reload" class="me-2" />
        Aktualisieren
      </CButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center">
      <CSpinner color="primary" />
      <p class="mt-2">Lade Gebäude...</p>
    </div>

    <!-- Error State -->
    <CAlert v-if="error" color="danger" :visible="true">
      <strong>Fehler:</strong> {{ error }}
    </CAlert>

    <!-- Buildings Grid -->
    <CRow v-if="!loading && !error">
      <CCol
        v-for="building in buildings"
        :key="building.id"
        xs="12"
        sm="6"
        md="4"
        lg="4"
        class="mb-4"
      >
        <CCard
          class="h-100 building-card"
          :class="{ 'opacity-50': building.hidden }"
          @click="viewApartments(building)"
          style="cursor: pointer; transition: all 0.2s ease-in-out;"
          @mouseover="$event.currentTarget.style.transform = 'translateY(-2px)'"
          @mouseleave="$event.currentTarget.style.transform = 'translateY(0)'"
        >
          <CCardHeader class="d-flex justify-content-between align-items-center">
            <h5 class="mb-0">{{ building.name }}</h5>
            <CBadge
              :color="building.hidden ? 'secondary' : 'success'"
              shape="rounded-pill"
            >
              {{ building.hidden ? 'Versteckt' : 'Aktiv' }}
            </CBadge>
          </CCardHeader>

          <CCardBody>
            <div class="building-info">
              <div class="info-item mb-2">
                <CIcon icon="cil-building" class="me-2 text-muted" />
                <span class="text-muted">Gebäude ID:</span>
                <strong class="ms-1">#{{ building.id }}</strong>
              </div>

              <div class="info-item mb-2">
                <CIcon icon="cil-list" class="me-2 text-muted" />
                <span class="text-muted">Sortierung:</span>
                <strong class="ms-1">{{ building.sorted }}</strong>
              </div>

              <div class="info-item mb-2">
                <CIcon icon="cil-home" class="me-2 text-muted" />
                <span class="text-muted">Apartments:</span>
                <strong class="ms-1">{{ building.apartments_count || 0 }}</strong>
              </div>

              <div class="info-item mb-2">
                <CIcon icon="cil-calendar" class="me-2 text-muted" />
                <span class="text-muted">Erstellt:</span>
                <small class="ms-1">{{ formatDate(building.created) }}</small>
              </div>

              <div class="info-item mb-2">
                <CIcon icon="cil-pencil" class="me-2 text-muted" />
                <span class="text-muted">Aktualisiert:</span>
                <small class="ms-1">{{ formatDate(building.updated) }}</small>
              </div>
            </div>
          </CCardBody>

          <CCardFooter class="text-center">
            <CButton
              color="primary"
              variant="ghost"
              size="sm"
              class="w-100"
            >
              <CIcon icon="cil-home" class="me-2" />
              Apartments anzeigen
            </CButton>
          </CCardFooter>
        </CCard>
      </CCol>
    </CRow>

    <!-- Empty State -->
    <div v-if="!loading && !error && buildings.length === 0" class="text-center py-5">
      <CIcon icon="cil-building" size="4xl" class="text-muted mb-3" />
      <h4 class="text-muted">Keine Gebäude gefunden</h4>
      <p class="text-muted">Es sind derzeit keine Gebäude in der Datenbank vorhanden.</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
  CCardFooter,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CBadge
} from '@coreui/vue'
import { CIcon } from '@coreui/icons-vue'
import { useApiBuilding } from '@/api/ApiBuilding'

const router = useRouter()
const { buildings, loading, error, list } = useApiBuilding()

const loadBuildings = async () => {
  await list()
}

const viewApartments = (building) => {
  router.push({
    name: 'BuildingApartments',
    params: { id: building.id },
    query: { buildingName: building.name }
  })
}

const formatDate = (dateString) => {
  if (!dateString) return 'Unbekannt'
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch {
    return 'Ungültiges Datum'
  }
}

onMounted(() => {
  loadBuildings()
})
</script>

<style scoped src="@/styles/views/BuildingsOverview.css"></style>
