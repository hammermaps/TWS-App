// BuildingStorage.js - Verwendet IndexedDB statt localStorage
import indexedDBHelper, { STORES } from '@/utils/IndexedDBHelper.js'

const BuildingStorage = {
  async saveBuildings(buildings) {
    if (!Array.isArray(buildings)) {
      console.error('Buildings data must be an array');
      return false;
    }
    
    try {
      // Store as a single document with key 'buildings'
      await indexedDBHelper.set(STORES.BUILDINGS, {
        id: 'buildings',
        data: buildings,
        timestamp: Date.now()
      });
      console.log('💾 Buildings in IndexedDB gespeichert:', buildings.length);
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Buildings:', error);
      return false;
    }
  },

  async getBuildings() {
    try {
      const result = await indexedDBHelper.get(STORES.BUILDINGS, 'buildings');
      if (result && result.data) {
        console.log('📦 Buildings aus IndexedDB geladen:', result.data.length);
        return result.data;
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Buildings:', error);
    }
    return [];
  },

  async clearBuildings() {
    try {
      await indexedDBHelper.delete(STORES.BUILDINGS, 'buildings');
      console.log('🗑️ Buildings aus IndexedDB entfernt');
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Löschen der Buildings:', error);
      return false;
    }
  }
};

export default BuildingStorage;
