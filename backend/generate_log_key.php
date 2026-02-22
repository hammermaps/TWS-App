<?php
/**
 * Simple helper to generate a secure LOG_API_KEY and write it to backend/.env
 * Usage: php backend/generate_log_key.php
 */

function gen_random_key($len = 48) {
    try {
        return bin2hex(random_bytes($len));
    } catch (Exception $e) {
        // fallback
        return bin2hex(openssl_random_pseudo_bytes($len));
    }
}

$envPath = __DIR__ . '/.env';
$key = gen_random_key(32); // 64 hex chars

// Preserve existing .env entries except LOG_API_KEY
$lines = [];
if (file_exists($envPath)) {
    $raw = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($raw as $line) {
        if (strpos(trim($line), '#') === 0) { $lines[] = $line; continue; }
        if (!strpos($line, '=')) { $lines[] = $line; continue; }
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        if ($name === 'LOG_API_KEY') continue; // skip
        $lines[] = $line;
    }
}

$lines[] = "LOG_API_KEY={$key}";
$lines[] = "# To enforce checks on the server set ENFORCE_LOG_API_KEY=1";

file_put_contents($envPath, implode(PHP_EOL, $lines) . PHP_EOL);

echo "Wrote LOG_API_KEY to backend/.env\n";
echo "Key: {$key}\n";

