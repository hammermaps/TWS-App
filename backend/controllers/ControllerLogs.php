<?php
/**
 * ControllerLogs - empfängt Logs vom Frontend und schreibt sie mit Monolog in Dateien.
 *
 * Endpoints:
 *  POST /logs/send    - Payload JSON: { level: "info|warning|error|debug", message: "...", context: {...}, timestamp: 123456789 }
 *
 * Die Klasse ist minimal gehalten und validiert basic Felder.
 */

namespace Controllers;

use JetBrains\PhpStorm\NoReturn;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger;
use System\BaseController;
use System\Common;

class ControllerLogs extends BaseController {

    public function __construct(Common $common) {
        parent::__construct($common);

        // Logger initialisieren
        $this->logger = new Logger(str_replace('Controllers\\Controller','',__CLASS__));
        $this->logger->pushHandler(new StreamHandler(__ROOT__.'/logs/'.str_replace('Controllers\\','',__CLASS__).'.log', Level::Warning));
    }

    /**
     * Handhabt die eingehende Anfrage und ruft die entsprechende Methode basierend auf der Ressourcen-ID auf.
     * Die Methode leitet die Anfrage an die passende Funktion weiter (z.B. callList, callCreate, ...).
     */
    #[NoReturn] public function handleRequest(): void {
        $methodName = 'call'.ucfirst($this->getCommon()->getResourceId());
        $this->logger->debug("Handling request, call method:", [ 'method' => $methodName ]);
        if (method_exists($this,$methodName)) {
            $this->$methodName();
        } else {
            $this->logger->warning("Method does not exist", [ 'method-name' => $methodName ]);
            $this->getCommon()->sendResponse([
                'success' => false,
                'error' => 'Method not found'
            ], 404);
        }
    }

    /**
     * Akzeptierte Methode: POST /logs/send
     */
    #[NoReturn] private function callSend(): void {

/*
        // If a LOG_API_KEY is defined in env, require clients to send the same
        $requiredKey = getenv('LOG_API_KEY') ?: null;
        if (!empty($requiredKey)) {
            // Accept header name X-LOG-API-KEY (case-insensitive via server vars)
            $clientKey = $_SERVER['HTTP_X_LOG_API_KEY'] ?? $_SERVER['HTTP_X_LOG_APIKEY'] ?? null;
            if ($clientKey === null || !hash_equals((string)$requiredKey, (string)$clientKey)) {
                $this->getCommon()->sendResponse([
                    'success' => false,
                    'error' => 'Forbidden: invalid or missing API key'
                ], 403);
            }
        }
      */

        $this->checkRequestMethod('POST');

        // Lese JSON-Body
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!is_array($data)) {
            $this->getCommon()->sendResponse([
                'success' => false,
                'error' => 'Invalid JSON payload'
            ], 400);
        }

        // Erwartete Felder
        $level = isset($data['level']) ? strtolower((string)$data['level']) : 'info';
        $message = isset($data['message']) ? (string)$data['message'] : '';
        $context = isset($data['context']) && is_array($data['context']) ? $data['context'] : [];
        $timestamp = isset($data['timestamp']) ? (int)$data['timestamp'] : time();
        $source = isset($data['source']) ? (string)$data['source'] : 'frontend';

        if ($message === '') {
            $this->getCommon()->sendResponse([
                'success' => false,
                'error' => 'Missing message'
            ], 400);
        }

        // Füge Standard-Kontext hinzu
        $context = array_merge([
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'url' => $_SERVER['REQUEST_URI'] ?? '',
            'source' => $source,
            'received_at' => time()
        ], $context);

        // Mappe level auf Monolog Level
        switch ($level) {
            case 'debug':
                $this->logger->debug($message, $context);
                break;
            case 'warning':
            case 'warn':
                $this->logger->warning($message, $context);
                break;
            case 'error':
            case 'fatal':
                $this->logger->error($message, $context);
                break;
            case 'critical':
                $this->logger->critical($message, $context);
                break;
            case 'notice':
                $this->logger->notice($message, $context);
                break;
            case 'info':
            default:
                $this->logger->info($message, $context);
                break;
        }

        $this->getCommon()->sendResponse([
            'success' => true,
            'data' => [ 'logged' => true ]
        ], 200);
    }
}

