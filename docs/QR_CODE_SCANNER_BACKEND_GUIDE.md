# QR-Code Scanner - Backend-Implementierungsanleitung

**Datum:** 2026-01-09
**Zielgruppe:** Backend-Entwickler

## Übersicht

Diese Anleitung beschreibt die erforderlichen Backend-Änderungen für die QR-Code-Scanner-Funktionalität.

## Erforderliche Änderungen

### 1. Datenbank-Schema

#### Migration erstellen

```sql
-- Migration: add_qr_code_uuid_to_apartments
ALTER TABLE apartments 
ADD COLUMN qr_code_uuid VARCHAR(36) UNIQUE DEFAULT NULL;

-- Index für schnelle UUID-Suche
CREATE INDEX idx_apartments_qr_code_uuid ON apartments(qr_code_uuid);

-- Trigger für automatische UUID-Generierung (optional)
CREATE TRIGGER before_insert_apartments
BEFORE INSERT ON apartments
FOR EACH ROW
BEGIN
  IF NEW.qr_code_uuid IS NULL THEN
    SET NEW.qr_code_uuid = UUID();
  END IF;
END;
```

#### Rollback

```sql
DROP INDEX idx_apartments_qr_code_uuid ON apartments;
ALTER TABLE apartments DROP COLUMN qr_code_uuid;
```

### 2. Model-Anpassungen

#### PHP (Laravel Beispiel)

**app/Models/Apartment.php:**
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Apartment extends Model
{
    protected $fillable = [
        'building_id',
        'number',
        'floor',
        'min_flush_duration',
        'enabled',
        'sorted',
        'qr_code_uuid', // ✅ NEU
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'min_flush_duration' => 'integer',
        'sorted' => 'integer',
    ];

    protected $hidden = [
        'created_at',
        'updated_at',
    ];

    /**
     * Boot-Methode: UUID automatisch generieren
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($apartment) {
            if (empty($apartment->qr_code_uuid)) {
                $apartment->qr_code_uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Beziehung zu Building
     */
    public function building()
    {
        return $this->belongsTo(Building::class);
    }

    /**
     * QR-Code URL generieren
     */
    public function getQrCodeUrlAttribute()
    {
        return config('app.url') . '/scan?uuid=' . $this->qr_code_uuid;
    }
}
```

### 3. API-Endpoints

#### 3.1 Listen-Endpoints anpassen

**GET /api/apartments/list**
**GET /api/apartments/list/{building_id}**

**Controller:**
```php
<?php

namespace App\Http\Controllers\Api;

use App\Models\Apartment;
use App\Models\Building;
use Illuminate\Http\Request;

class ApartmentController extends Controller
{
    /**
     * Liste aller Apartments oder gefiltert nach Gebäude
     */
    public function list(Request $request, $buildingId = null)
    {
        $query = Apartment::with('building');

        if ($buildingId) {
            $query->where('building_id', $buildingId);
        }

        $apartments = $query->orderBy('sorted', 'asc')
                           ->orderBy('number', 'asc')
                           ->get();

        // Formatiere Response mit qr_code_uuid
        $items = $apartments->map(function ($apartment) {
            return [
                'id' => $apartment->id,
                'building_id' => $apartment->building_id,
                'number' => $apartment->number,
                'floor' => $apartment->floor,
                'min_flush_duration' => $apartment->min_flush_duration,
                'enabled' => $apartment->enabled ? 1 : 0,
                'sorted' => $apartment->sorted,
                'created_at' => $apartment->created_at->toISOString(),
                'updated_at' => $apartment->updated_at->toISOString(),
                'last_flush_date' => $apartment->last_flush_date,
                'next_flush_due' => $apartment->next_flush_due,
                'qr_code_uuid' => $apartment->qr_code_uuid, // ✅ NEU
            ];
        });

        return response()->json([
            'success' => true,
            'items' => $items,
            'server_time' => now()->timestamp,
            'response_time' => 0,
        ]);
    }
}
```

#### 3.2 Neuer Endpoint: Suche per UUID

**GET /api/apartments/by-uuid/{uuid}**

**Route:**
```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    // Bestehende Routes...
    
    // ✅ NEU: Suche per UUID
    Route::get('/apartments/by-uuid/{uuid}', [ApartmentController::class, 'findByUuid']);
});
```

**Controller-Methode:**
```php
/**
 * Finde Apartment per QR-Code UUID
 *
 * @param string $uuid
 * @return \Illuminate\Http\JsonResponse
 */
public function findByUuid($uuid)
{
    // Validiere UUID-Format
    if (!$this->isValidUuid($uuid)) {
        return response()->json([
            'success' => false,
            'error' => 'Ungültige UUID'
        ], 400);
    }

    // Suche Apartment mit Building
    $apartment = Apartment::with('building')
                          ->where('qr_code_uuid', $uuid)
                          ->first();

    if (!$apartment) {
        return response()->json([
            'success' => false,
            'error' => 'Apartment nicht gefunden'
        ], 404);
    }

    // Prüfe Berechtigung (optional)
    // if (!$this->canAccessBuilding($apartment->building_id)) {
    //     return response()->json([
    //         'success' => false,
    //         'error' => 'Zugriff verweigert'
    //     ], 403);
    // }

    return response()->json([
        'success' => true,
        'data' => [
            'apartment' => [
                'id' => $apartment->id,
                'building_id' => $apartment->building_id,
                'number' => $apartment->number,
                'floor' => $apartment->floor,
                'min_flush_duration' => $apartment->min_flush_duration,
                'enabled' => $apartment->enabled ? 1 : 0,
                'sorted' => $apartment->sorted,
                'created_at' => $apartment->created_at->toISOString(),
                'updated_at' => $apartment->updated_at->toISOString(),
                'last_flush_date' => $apartment->last_flush_date,
                'next_flush_due' => $apartment->next_flush_due,
                'qr_code_uuid' => $apartment->qr_code_uuid,
            ],
            'building' => [
                'id' => $apartment->building->id,
                'name' => $apartment->building->name,
            ]
        ],
        'server_time' => now()->timestamp,
        'response_time' => 0,
    ]);
}

/**
 * Validiere UUID-Format
 */
private function isValidUuid($uuid)
{
    return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uuid);
}
```

### 4. QR-Code Generierung

#### 4.1 Installation

```bash
composer require endroid/qr-code
```

#### 4.2 QR-Code Service

**app/Services/QRCodeService.php:**
```php
<?php

namespace App\Services;

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel\ErrorCorrectionLevelHigh;
use Endroid\QrCode\RoundBlockSizeMode\RoundBlockSizeModeMargin;
use Endroid\QrCode\Writer\PngWriter;

class QRCodeService
{
    /**
     * Generiere QR-Code für Apartment
     *
     * @param string $uuid
     * @return string Base64-encoded PNG
     */
    public function generateForApartment($uuid)
    {
        $result = Builder::create()
            ->writer(new PngWriter())
            ->writerOptions([])
            ->data($uuid)
            ->encoding(new Encoding('UTF-8'))
            ->errorCorrectionLevel(new ErrorCorrectionLevelHigh())
            ->size(300)
            ->margin(10)
            ->roundBlockSizeMode(new RoundBlockSizeModeMargin())
            ->build();

        return base64_encode($result->getString());
    }

    /**
     * Generiere QR-Code als Download
     */
    public function generateDownload($uuid, $filename = 'qrcode.png')
    {
        $result = Builder::create()
            ->writer(new PngWriter())
            ->data($uuid)
            ->encoding(new Encoding('UTF-8'))
            ->errorCorrectionLevel(new ErrorCorrectionLevelHigh())
            ->size(500)
            ->margin(10)
            ->build();

        return response($result->getString(), 200)
            ->header('Content-Type', 'image/png')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }
}
```

#### 4.3 QR-Code Download-Endpoint

**Route:**
```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/apartments/{id}/qr-code', [ApartmentController::class, 'downloadQRCode']);
});
```

**Controller:**
```php
public function downloadQRCode($id, QRCodeService $qrCodeService)
{
    $apartment = Apartment::findOrFail($id);
    
    $filename = sprintf(
        'apartment_%s_%s_qrcode.png',
        $apartment->building_id,
        $apartment->number
    );
    
    return $qrCodeService->generateDownload(
        $apartment->qr_code_uuid,
        $filename
    );
}
```

### 5. Datenbank-Seeding

#### Existierende Apartments aktualisieren

**Seeder:**
```php
<?php

namespace Database\Seeders;

use App\Models\Apartment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UpdateApartmentUuidsSeeder extends Seeder
{
    public function run()
    {
        $apartments = Apartment::whereNull('qr_code_uuid')->get();
        
        foreach ($apartments as $apartment) {
            $apartment->qr_code_uuid = (string) Str::uuid();
            $apartment->save();
            
            $this->command->info("UUID generiert für Apartment {$apartment->id}: {$apartment->qr_code_uuid}");
        }
        
        $this->command->info("UUIDs für {$apartments->count()} Apartments generiert.");
    }
}
```

**Ausführen:**
```bash
php artisan db:seed --class=UpdateApartmentUuidsSeeder
```

### 6. Tests

#### Unit Test

**tests/Unit/ApartmentTest.php:**
```php
<?php

namespace Tests\Unit;

use App\Models\Apartment;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ApartmentTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_generates_uuid_on_creation()
    {
        $apartment = Apartment::factory()->create([
            'qr_code_uuid' => null
        ]);

        $this->assertNotNull($apartment->qr_code_uuid);
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            $apartment->qr_code_uuid
        );
    }

    /** @test */
    public function it_can_find_apartment_by_uuid()
    {
        $apartment = Apartment::factory()->create();

        $found = Apartment::where('qr_code_uuid', $apartment->qr_code_uuid)->first();

        $this->assertEquals($apartment->id, $found->id);
    }
}
```

#### Feature Test

**tests/Feature/ApartmentApiTest.php:**
```php
<?php

namespace Tests\Feature;

use App\Models\Apartment;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ApartmentApiTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_can_find_apartment_by_uuid()
    {
        $user = User::factory()->create();
        $apartment = Apartment::factory()->create();

        $response = $this->actingAs($user)
            ->getJson("/api/apartments/by-uuid/{$apartment->qr_code_uuid}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'apartment' => [
                        'id' => $apartment->id,
                        'qr_code_uuid' => $apartment->qr_code_uuid
                    ]
                ]
            ]);
    }

    /** @test */
    public function it_returns_404_for_invalid_uuid()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/api/apartments/by-uuid/invalid-uuid');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'error' => 'Ungültige UUID'
            ]);
    }

    /** @test */
    public function it_returns_apartments_with_uuid_in_list()
    {
        $user = User::factory()->create();
        $apartment = Apartment::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/api/apartments/list');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'items' => [
                    '*' => ['id', 'qr_code_uuid']
                ]
            ]);
    }
}
```

**Tests ausführen:**
```bash
php artisan test --filter=ApartmentTest
php artisan test --filter=ApartmentApiTest
```

## Deployment-Checkliste

### 1. Pre-Deployment
- [ ] Migration erstellt und getestet
- [ ] Model angepasst
- [ ] API-Endpoints implementiert
- [ ] Tests geschrieben und bestanden
- [ ] QR-Code Service implementiert

### 2. Deployment
- [ ] Migration ausführen: `php artisan migrate`
- [ ] UUIDs für existierende Apartments: `php artisan db:seed --class=UpdateApartmentUuidsSeeder`
- [ ] Cache leeren: `php artisan cache:clear`
- [ ] Config cache: `php artisan config:cache`

### 3. Post-Deployment
- [ ] API-Endpoints testen
- [ ] QR-Codes generieren
- [ ] Frontend-Test mit echten QR-Codes
- [ ] Monitoring einrichten

## API-Dokumentation

### Endpoints

#### GET /api/apartments/list
```
Response:
{
  "success": true,
  "items": [
    {
      "id": 1,
      "building_id": 1,
      "number": "101",
      "floor": "1",
      "qr_code_uuid": "550e8400-e29b-41d4-a716-446655440000",
      ...
    }
  ]
}
```

#### GET /api/apartments/by-uuid/{uuid}
```
Response (Success):
{
  "success": true,
  "data": {
    "apartment": { ... },
    "building": { ... }
  }
}

Response (Error):
{
  "success": false,
  "error": "Apartment nicht gefunden"
}
```

#### GET /api/apartments/{id}/qr-code
```
Response: PNG Image (Download)
```

## Sicherheit

### Best Practices

1. **Authentifizierung:** Alle Endpoints erfordern `auth:sanctum`
2. **UUID-Validierung:** Format-Prüfung vor Datenbankabfrage
3. **Rate-Limiting:** Schütze Endpoints vor Missbrauch
4. **Berechtigungen:** Prüfe Zugriff auf Gebäude/Apartments

### Rate-Limiting

```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        'throttle:60,1', // 60 requests per minute
        // ...
    ],
];

// Für QR-Scanner speziell:
Route::middleware(['auth:sanctum', 'throttle:10,1'])->group(function () {
    Route::get('/apartments/by-uuid/{uuid}', [ApartmentController::class, 'findByUuid']);
});
```

## Monitoring

### Log-Einträge

```php
// Bei UUID-Suche
Log::info('QR Code scanned', [
    'uuid' => $uuid,
    'user_id' => auth()->id(),
    'apartment_id' => $apartment->id,
    'building_id' => $apartment->building_id,
]);
```

### Metriken

- Anzahl QR-Code-Scans pro Tag
- Erfolgsrate
- Fehlerhafte UUIDs
- Beliebteste Apartments

## Zusammenfassung

### Implementierungsaufwand

**Geschätzte Zeit:** 2-4 Stunden

**Aufgaben:**
1. ✅ Datenbank-Migration (15 min)
2. ✅ Model-Anpassungen (15 min)
3. ✅ API-Endpoints (45 min)
4. ✅ QR-Code Service (30 min)
5. ✅ Tests (60 min)
6. ✅ Deployment (30 min)

### Kritische Punkte

⚠️ **Wichtig:**
- UUIDs müssen eindeutig sein
- Migration muss rückwärtskompatibel sein
- Existierende Apartments brauchen UUIDs
- Cache muss nach Deployment geleert werden

### Kontakt

Bei Fragen zur Implementierung:
- Frontend-Dokumentation: `QR_CODE_SCANNER_IMPLEMENTATION.md`
- API-Tests mit Postman/Insomnia durchführen
- Frontend-Team für Integration kontaktieren

