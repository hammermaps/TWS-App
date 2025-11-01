// BuildingStorage.js

const BuildingStorage = {
  saveBuildings(buildings) {
    if (Array.isArray(buildings)) {
      localStorage.setItem('buildings', JSON.stringify(buildings));
    } else {
      console.error('Buildings data must be an array');
    }
  },

  getBuildings() {
    const buildings = localStorage.getItem('buildings');
    return buildings ? JSON.parse(buildings) : [];
  },

  clearBuildings() {
    localStorage.removeItem('buildings');
  }
};

export default BuildingStorage;
