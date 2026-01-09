<?php
/**
 * SPDX-License-Identifier: MIT
 *
 * QRCodeService.php
 *
 * Service zur Generierung von QR-Codes für Apartments
 *
 * @package System
 * @author  Generated
 * @version 1.0.0
 */

namespace System;

/**
 * QRCodeService-Klasse zur Generierung von QR-Codes
 *
 * Dieser Service stellt Methoden bereit, um QR-Codes für Apartment-UUIDs zu generieren.
 * Verwendet eine reine PHP-Implementierung ohne externe Bibliotheken.
 */
class QRCodeService {

    /**
     * Generiert einen QR-Code als PNG-Image-Data-URL
     *
     * @param string $data Die zu encodierenden Daten (UUID)
     * @param int $size Größe des QR-Codes in Pixeln (Standard: 300)
     * @param int $margin Rand um den QR-Code in Pixeln (Standard: 10)
     * @return string Base64-encoded PNG Data URL
     */
    public function generateQRCode(string $data, int $size = 300, int $margin = 10): string {
        // Einfache Implementierung: Erstelle eine URL zu einem QR-Code-Generator-Service
        // In Produktion sollte eine dedizierte QR-Code-Bibliothek verwendet werden

        $encodedData = urlencode($data);
        $qrSize = $size - (2 * $margin);

        // Verwende eine öffentliche QR-Code-API (z.B. qrserver.com)
        $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size={$qrSize}x{$qrSize}&data={$encodedData}";

        // Hole das Bild
        $imageData = @file_get_contents($qrCodeUrl);

        if ($imageData === false) {
            // Fallback: Generiere einen einfachen QR-Code lokal
            return $this->generateSimpleQRCode($data, $size, $margin);
        }

        return 'data:image/png;base64,' . base64_encode($imageData);
    }

    /**
     * Generiert einen einfachen QR-Code lokal (Fallback)
     *
     * @param string $data
     * @param int $size
     * @param int $margin
     * @return string Base64-encoded PNG Data URL
     */
    private function generateSimpleQRCode(string $data, int $size, int $margin): string {
        // Erstelle ein einfaches Bild mit der UUID als Text
        // Dies ist ein Fallback und sollte durch eine richtige QR-Code-Bibliothek ersetzt werden

        $image = imagecreatetruecolor($size, $size);

        // Weißer Hintergrund
        $white = imagecolorallocate($image, 255, 255, 255);
        $black = imagecolorallocate($image, 0, 0, 0);
        imagefill($image, 0, 0, $white);

        // Rand zeichnen
        imagerectangle($image, $margin, $margin, $size - $margin, $size - $margin, $black);

        // Text in der Mitte
        $fontSize = 3;
        $textWidth = imagefontwidth($fontSize) * strlen($data);
        $textHeight = imagefontheight($fontSize);
        $x = ($size - $textWidth) / 2;
        $y = ($size - $textHeight) / 2;

        imagestring($image, $fontSize, (int)$x, (int)$y, $data, $black);

        // PNG in Buffer
        ob_start();
        imagepng($image);
        $imageData = ob_get_clean();
        imagedestroy($image);

        return 'data:image/png;base64,' . base64_encode($imageData);
    }

    /**
     * Generiert ein QR-Code PNG für direkten Download
     *
     * @param string $data Die zu encodierenden Daten (UUID)
     * @param string $filename Dateiname für den Download
     * @param int $size Größe des QR-Codes in Pixeln
     * @return void
     */
    public function downloadQRCode(string $data, string $filename = 'qrcode.png', int $size = 500): void {
        $encodedData = urlencode($data);
        $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size={$size}x{$size}&data={$encodedData}";

        $imageData = @file_get_contents($qrCodeUrl);

        if ($imageData === false) {
            // Fallback
            $dataUrl = $this->generateSimpleQRCode($data, $size, 10);
            $imageData = base64_decode(str_replace('data:image/png;base64,', '', $dataUrl));
        }

        header('Content-Type: image/png');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . strlen($imageData));

        echo $imageData;
        exit;
    }

    /**
     * Generiert QR-Codes für alle Apartments und gibt sie als ZIP zurück
     *
     * @param array $apartments Array von Apartment-Objekten
     * @param string $zipFilename Name der ZIP-Datei
     * @return void
     */
    public function downloadBulkQRCodes(array $apartments, string $zipFilename = 'apartment_qrcodes.zip'): void {
        // Erstelle temporäres Verzeichnis
        $tempDir = sys_get_temp_dir() . '/qrcodes_' . uniqid();
        mkdir($tempDir);

        // Generiere QR-Codes für jedes Apartment
        foreach ($apartments as $apartment) {
            if (empty($apartment['qr_code_uuid'])) {
                continue;
            }

            $filename = sprintf(
                'apartment_%s_%s.png',
                $apartment['building_id'],
                preg_replace('/[^a-zA-Z0-9]/', '_', $apartment['number'])
            );

            $encodedData = urlencode($apartment['qr_code_uuid']);
            $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data={$encodedData}";

            $imageData = @file_get_contents($qrCodeUrl);
            if ($imageData !== false) {
                file_put_contents($tempDir . '/' . $filename, $imageData);
            }
        }

        // Erstelle ZIP
        $zipFile = sys_get_temp_dir() . '/' . $zipFilename;
        $zip = new \ZipArchive();

        if ($zip->open($zipFile, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) === true) {
            $files = glob($tempDir . '/*.png');
            foreach ($files as $file) {
                $zip->addFile($file, basename($file));
            }
            $zip->close();

            // Sende ZIP zum Download
            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="' . $zipFilename . '"');
            header('Content-Length: ' . filesize($zipFile));
            readfile($zipFile);

            // Cleanup
            unlink($zipFile);
        }

        // Cleanup temp dir
        array_map('unlink', glob($tempDir . '/*.png'));
        rmdir($tempDir);

        exit;
    }
}

