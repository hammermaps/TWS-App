/**
 * StorageMigration.js
 * One-time migration utility to move data from localStorage to IndexedDB
 */

import indexedDBHelper, { STORES } from './IndexedDBHelper.js'

const MIGRATION_KEY = 'wls_migration_completed'

/**
 * Migrates all data from localStorage to IndexedDB
 * This is a one-time operation that should run on app startup
 */
export async function migrateLocalStorageToIndexedDB() {
  try {
    // Check if migration was already completed
    const migrationStatus = await indexedDBHelper.get(STORES.METADATA, MIGRATION_KEY)
    if (migrationStatus && migrationStatus.value === true) {
      console.log('✓ Storage migration already completed')
      return { success: true, alreadyMigrated: true }
    }

    console.log('🔄 Starting migration from localStorage to IndexedDB...')
    
    const migrated = {
      config: 0,
      buildings: 0,
      apartments: 0,
      flushes: 0,
      auth: 0,
      user: 0,
      settings: 0
    }

    // Migrate config
    const configStr = localStorage.getItem('wls_config_cache')
    if (configStr) {
      try {
        await indexedDBHelper.set(STORES.CONFIG, {
          key: 'wls_config_cache',
          value: JSON.parse(configStr)
        })
        migrated.config++
      } catch (e) {
        console.warn('⚠️ Failed to migrate config:', e)
      }
    }

    const configUpdate = localStorage.getItem('wls_config_last_update')
    if (configUpdate) {
      try {
        await indexedDBHelper.set(STORES.CONFIG, {
          key: 'wls_config_last_update',
          value: configUpdate
        })
        migrated.config++
      } catch (e) {
        console.warn('⚠️ Failed to migrate config update time:', e)
      }
    }

    // Migrate buildings
    const buildingsStr = localStorage.getItem('buildings')
    if (buildingsStr) {
      try {
        await indexedDBHelper.set(STORES.BUILDINGS, {
          id: 'buildings',
          data: JSON.parse(buildingsStr),
          timestamp: Date.now()
        })
        migrated.buildings++
      } catch (e) {
        console.warn('⚠️ Failed to migrate buildings:', e)
      }
    }

    // Migrate apartments
    const apartmentsStr = localStorage.getItem('wls_apartments_db')
    if (apartmentsStr) {
      try {
        const apartmentsData = JSON.parse(apartmentsStr)
        for (const [buildingId, apartments] of Object.entries(apartmentsData)) {
          if (Array.isArray(apartments)) {
            for (const apartment of apartments) {
              await indexedDBHelper.set(STORES.APARTMENTS, {
                id: `${buildingId}_${apartment.id}`,
                buildingId: String(buildingId),
                apartmentId: apartment.id,
                ...apartment
              })
              migrated.apartments++
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to migrate apartments:', e)
      }
    }

    // Migrate apartment metadata
    const apartmentMetaStr = localStorage.getItem('wls_apartments_metadata')
    if (apartmentMetaStr) {
      try {
        await indexedDBHelper.set(STORES.METADATA, {
          key: 'wls_apartments_metadata',
          value: JSON.parse(apartmentMetaStr)
        })
      } catch (e) {
        console.warn('⚠️ Failed to migrate apartment metadata:', e)
      }
    }

    // Migrate offline flushes
    const flushesStr = localStorage.getItem('wls_offline_flushes')
    if (flushesStr) {
      try {
        const flushes = JSON.parse(flushesStr)
        if (Array.isArray(flushes)) {
          for (const flush of flushes) {
            await indexedDBHelper.set(STORES.OFFLINE_FLUSHES, flush)
            migrated.flushes++
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to migrate offline flushes:', e)
      }
    }

    // Migrate auth token
    const token = localStorage.getItem('jwt_token')
    if (token) {
      try {
        await indexedDBHelper.set(STORES.AUTH, {
          key: 'jwt_token',
          value: token
        })
        migrated.auth++
      } catch (e) {
        console.warn('⚠️ Failed to migrate auth token:', e)
      }
    }

    // Migrate user
    const userStr = localStorage.getItem('wls_current_user')
    if (userStr) {
      try {
        await indexedDBHelper.set(STORES.USER, {
          key: 'wls_current_user',
          value: JSON.parse(userStr)
        })
        migrated.user++
      } catch (e) {
        console.warn('⚠️ Failed to migrate user:', e)
      }
    }

    // Migrate settings
    const language = localStorage.getItem('wls_language')
    if (language) {
      try {
        await indexedDBHelper.set(STORES.SETTINGS, {
          key: 'wls_language',
          value: language
        })
        migrated.settings++
      } catch (e) {
        console.warn('⚠️ Failed to migrate language:', e)
      }
    }

    const manualOffline = localStorage.getItem('wls-manual-offline-mode')
    if (manualOffline) {
      try {
        await indexedDBHelper.set(STORES.SETTINGS, {
          key: 'wls-manual-offline-mode',
          value: manualOffline
        })
        migrated.settings++
      } catch (e) {
        console.warn('⚠️ Failed to migrate manual offline mode:', e)
      }
    }

    // Migrate preload metadata
    const preloadMeta = localStorage.getItem('wls_preload_metadata')
    if (preloadMeta) {
      try {
        await indexedDBHelper.set(STORES.METADATA, {
          key: 'wls_preload_metadata',
          value: JSON.parse(preloadMeta)
        })
      } catch (e) {
        console.warn('⚠️ Failed to migrate preload metadata:', e)
      }
    }

    // Migrate config sync queue
    const syncQueue = localStorage.getItem('wls_config_sync_queue')
    if (syncQueue) {
      try {
        await indexedDBHelper.set(STORES.METADATA, {
          key: 'wls_config_sync_queue',
          value: JSON.parse(syncQueue)
        })
      } catch (e) {
        console.warn('⚠️ Failed to migrate sync queue:', e)
      }
    }

    // Mark migration as completed
    await indexedDBHelper.set(STORES.METADATA, {
      key: MIGRATION_KEY,
      value: true,
      timestamp: new Date().toISOString(),
      migrated
    })

    console.log('✅ Migration completed successfully:', migrated)
    
    // Optional: Clear localStorage after successful migration
    // This can be done in a future update to ensure everything works
    // clearLocalStorageAfterMigration()

    return { success: true, migrated, alreadyMigrated: false }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Clears localStorage after successful migration
 * Use this carefully after verifying the migration worked
 */
export function clearLocalStorageAfterMigration() {
  const keysToKeep = [
    // Keep any keys that might be used by other libraries
    // or temporary UI state that doesn't need persistence
  ]
  
  const keysToRemove = [
    'wls_config_cache',
    'wls_config_last_update',
    'buildings',
    'buildings_timestamp',
    'wls_apartments_db',
    'wls_apartments_metadata',
    'wls_offline_flushes',
    'wls_flush_sync_queue',
    'jwt_token',
    'wls_current_user',
    'wls_language',
    'wls-manual-offline-mode',
    'wls_preload_metadata',
    'wls_config_sync_queue',
    'userId',
    'wls_user_id',
    'user',
    'auth_token'
  ]

  for (const key of keysToRemove) {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.warn(`⚠️ Failed to remove ${key} from localStorage:`, e)
    }
  }

  console.log('🗑️ localStorage cleaned up after migration')
}

export default { migrateLocalStorageToIndexedDB, clearLocalStorageAfterMigration }
