<template>
  <CContainer fluid class="logo-test-page">
    <CRow>
      <CCol>
        <CCard class="mb-4">
          <CCardHeader>
            <h1>🎨 WLS App - Neues Logo Design</h1>
          </CCardHeader>
          <CCardBody>
            <CAlert color="info" class="mb-4">
              <strong>📢 Information:</strong> Diese Seite zeigt das neue Logo-Design für die WLS App.
              Das Logo wird automatisch in der Sidebar verwendet.
            </CAlert>

            <LogoPreview />

            <CAlert color="success" class="mt-4">
              <strong>✅ Installation erfolgreich!</strong>
              <p class="mb-0 mt-2">
                Das neue Logo ist bereits in der Sidebar aktiv. Schauen Sie in die linke Navigation,
                um es in Aktion zu sehen.
              </p>
            </CAlert>

            <div class="documentation-links mt-4">
              <h3>📚 Dokumentation</h3>
              <ul>
                <li>
                  <strong>Logo Design Dokumentation:</strong>
                  <code>/LOGO_DESIGN_DOCUMENTATION.md</code>
                </li>
                <li>
                  <strong>Sidebar Brand Dokumentation:</strong>
                  <code>/SIDEBAR_BRAND_DOCUMENTATION.md</code>
                </li>
                <li>
                  <strong>Logo-Dateien:</strong>
                  <ul>
                    <li><code>/src/assets/brand/logo.js</code> - Vollständiges Logo</li>
                    <li><code>/src/assets/brand/sygnet.js</code> - Kompaktes Icon</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div class="features mt-4">
              <h3>✨ Features des neuen Logos</h3>
              <CRow>
                <CCol md="6">
                  <ul>
                    <li>✅ Modernes Gradient-Design (Blau → Violett)</li>
                    <li>✅ Responsive und skalierbar</li>
                    <li>✅ Optimiert für Light & Dark Mode</li>
                    <li>✅ Vektorbasiert (SVG)</li>
                  </ul>
                </CCol>
                <CCol md="6">
                  <ul>
                    <li>✅ Symbolik: W mit Wellen-Effekt</li>
                    <li>✅ Zwei Varianten (Full & Icon)</li>
                    <li>✅ Professionelles Design</li>
                    <li>✅ Barrierefrei</li>
                  </ul>
                </CCol>
              </CRow>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  </CContainer>
</template>

<script setup>
import LogoPreview from '@/components/LogoPreview.vue'
</script>

<style scoped src="@/styles/views/LogoTestView.css"></style>
}

.documentation-links code {
  background: var(--cui-tertiary-bg);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.documentation-links ul ul {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  list-style: disc;
}

.features ul {
  list-style: none;
  padding-left: 0;
}

.features li {
  padding: 0.5rem 0;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .logo-test-page {
    padding: 1rem 0;
  }

  h1 {
    font-size: 1.5rem;
  }
}
</style>

