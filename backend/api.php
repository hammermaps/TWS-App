<?php

use System\Common;

const __ROOT__ = __DIR__;

error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
ini_set('log_errors', '1');
ini_set('error_log', __ROOT__.'/logs/php-error.log');

require_once __ROOT__.'/vendor/autoload.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // CORS: Origin dynamisch setzen (erlaubt localhost Dev, Production und Android/Capacitor)
    $allowedOrigins = [
        'http://localhost:3001',
        'https://localhost:3001',
        'http://localhost',
        'https://localhost',
        'http://localhost:80',
        'https://wls.dk-automation.de',
        'capacitor://localhost',
        'capacitor://app',
        'https://app',
        'ionic://localhost',
        'http://192.168.0.1',
    ];
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($requestOrigin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $requestOrigin);
    } else {
        header('Access-Control-Allow-Origin: http://localhost:3001');
    }
    header('Access-Control-Allow-Headers: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Credentials: true');
    http_response_code(200);
    exit();
}

$common = Common::getInstance();
$common->run();
