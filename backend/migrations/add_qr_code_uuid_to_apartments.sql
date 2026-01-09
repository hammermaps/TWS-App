-- Migration: QR-Code UUID für Apartments
-- Datum: 2026-01-09
-- Beschreibung: Fügt qr_code_uuid Feld zu apartments Tabelle hinzu

-- Prüfe ob Feld bereits existiert und füge es hinzu
SET @dbname = DATABASE();
SET @tablename = "apartments";
SET @columnname = "qr_code_uuid";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " varchar(36) DEFAULT NULL AFTER sorted")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Füge UNIQUE Index für qr_code_uuid hinzu
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = 'uniq_qr_code_uuid')
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD UNIQUE KEY uniq_qr_code_uuid (qr_code_uuid)")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Füge normalen Index für Suche hinzu
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = 'idx_apartments_qr_code_uuid')
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD KEY idx_apartments_qr_code_uuid (qr_code_uuid)")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Generiere UUIDs für existierende Apartments ohne UUID
-- HINWEIS: Dies wird automatisch beim ersten API-Aufruf durchgeführt
-- Kann aber auch manuell ausgeführt werden:

-- UPDATE apartments
-- SET qr_code_uuid = UUID()
-- WHERE qr_code_uuid IS NULL;

SELECT
    CONCAT('Migration abgeschlossen. Apartments mit UUID: ',
           COUNT(CASE WHEN qr_code_uuid IS NOT NULL THEN 1 END),
           ', ohne UUID: ',
           COUNT(CASE WHEN qr_code_uuid IS NULL THEN 1 END)) AS status
FROM apartments;

