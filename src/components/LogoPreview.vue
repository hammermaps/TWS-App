<template>
  <div class="logo-preview-container">
    <h2>WLS App Logo Vorschau</h2>

    <!-- Vollständiges Logo -->
    <div class="preview-section">
      <h3>Vollständiges Logo</h3>

      <div class="preview-row">
        <div class="preview-card light">
          <h4>Hell (Light Mode)</h4>
          <div class="logo-display">
            <CIcon :icon="logo" :height="80" />
          </div>
          <p class="size-label">Standard (80px)</p>
        </div>

        <div class="preview-card dark">
          <h4>Dunkel (Dark Mode)</h4>
          <div class="logo-display">
            <CIcon :icon="logo" :height="80" />
          </div>
          <p class="size-label">Standard (80px)</p>
        </div>
      </div>

      <!-- Verschiedene Größen -->
      <div class="size-variations">
        <h4>Größenvariationen</h4>
        <div class="sizes-row">
          <div class="size-item">
            <CIcon :icon="logo" :height="24" />
            <span>24px</span>
          </div>
          <div class="size-item">
            <CIcon :icon="logo" :height="32" />
            <span>32px (Standard)</span>
          </div>
          <div class="size-item">
            <CIcon :icon="logo" :height="48" />
            <span>48px</span>
          </div>
          <div class="size-item">
            <CIcon :icon="logo" :height="64" />
            <span>64px</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Kompaktes Icon -->
    <div class="preview-section">
      <h3>Kompaktes Icon (Sygnet)</h3>

      <div class="preview-row">
        <div class="preview-card light">
          <h4>Hell (Light Mode)</h4>
          <div class="logo-display">
            <CIcon :icon="sygnet" :height="80" />
          </div>
          <p class="size-label">Standard (80px)</p>
        </div>

        <div class="preview-card dark">
          <h4>Dunkel (Dark Mode)</h4>
          <div class="logo-display">
            <CIcon :icon="sygnet" :height="80" />
          </div>
          <p class="size-label">Standard (80px)</p>
        </div>
      </div>

      <!-- Verschiedene Größen -->
      <div class="size-variations">
        <h4>Größenvariationen</h4>
        <div class="sizes-row">
          <div class="size-item">
            <CIcon :icon="sygnet" :height="24" />
            <span>24px</span>
          </div>
          <div class="size-item">
            <CIcon :icon="sygnet" :height="32" />
            <span>32px (Standard)</span>
          </div>
          <div class="size-item">
            <CIcon :icon="sygnet" :height="48" />
            <span>48px</span>
          </div>
          <div class="size-item">
            <CIcon :icon="sygnet" :height="64" />
            <span>64px</span>
          </div>
          <div class="size-item">
            <CIcon :icon="sygnet" :height="96" />
            <span>96px</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Verwendung in Sidebar Simulation -->
    <div class="preview-section">
      <h3>Sidebar Simulation</h3>

      <div class="sidebar-preview-row">
        <div class="sidebar-mock expanded">
          <div class="sidebar-header">
            <div class="brand-area">
              <CIcon :icon="logo" :height="32" />
            </div>
          </div>
          <p class="label">Ausgeklappt</p>
        </div>

        <div class="sidebar-mock collapsed">
          <div class="sidebar-header">
            <div class="brand-area">
              <CIcon :icon="sygnet" :height="32" />
            </div>
          </div>
          <p class="label">Minimiert</p>
        </div>
      </div>
    </div>

    <!-- Farbinformationen -->
    <div class="preview-section">
      <h3>Farbpalette</h3>
      <div class="color-palette">
        <div class="color-item">
          <div class="color-swatch" style="background: #2563eb;"></div>
          <div class="color-info">
            <strong>Primär (Start)</strong>
            <span>#2563eb</span>
            <span>RGB(37, 99, 235)</span>
          </div>
        </div>
        <div class="color-item">
          <div class="color-swatch" style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);"></div>
          <div class="color-info">
            <strong>Gradient</strong>
            <span>Blau → Violett</span>
          </div>
        </div>
        <div class="color-item">
          <div class="color-swatch" style="background: #7c3aed;"></div>
          <div class="color-info">
            <strong>Sekundär (Ende)</strong>
            <span>#7c3aed</span>
            <span>RGB(124, 58, 237)</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { logo } from '@/assets/brand/logo'
import { sygnet } from '@/assets/brand/sygnet'
</script>

<style scoped src="@/styles/components/LogoPreview.css"></style>

