-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Erstellungszeit: 23. Feb 2026 um 22:01
-- Server-Version: 10.6.23-MariaDB-0ubuntu0.22.04.1
-- PHP-Version: 8.4.18

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Datenbank: `dk_control`
--

--
-- Daten für Tabelle `dk_navigation`
--

INSERT INTO `dk_navigation` (`id`, `name`, `url`, `target`, `icon`, `parent_id`, `order`, `type`, `permission`, `badge_text`, `badge_color`, `active`, `is_external`, `created_at`, `updated_at`) VALUES
(1, 'Dashboard', 'index.php', '_self', 'cil-speedometer', NULL, 1, 'item', NULL, 'NEW', 'info', 1, 0, '2026-02-23 21:22:55', '2026-02-23 21:22:55'),
(2, 'Klimatisierung', NULL, '_self', NULL, NULL, 10, 'title', NULL, NULL, NULL, 1, 0, '2026-02-23 21:22:55', '2026-02-23 21:22:55'),
(3, 'Klimasteuerung', NULL, '_self', 'cil-snow', NULL, 11, 'group', 'web.climatic.*', NULL, NULL, 1, 0, '2026-02-23 21:22:55', '2026-02-23 21:22:55'),
(4, 'Übersicht', 'climatic/dashboard.php', '_self', NULL, 3, 12, 'item', 'web.climatic.view', NULL, NULL, 1, 0, '2026-02-23 21:22:55', '2026-02-23 21:22:55'),
(5, 'Geräte', 'climatic/devices.php', '_self', NULL, 3, 13, 'item', 'web.climatic.view', NULL, NULL, 1, 0, '2026-02-23 21:22:55', '2026-02-23 21:22:55'),
(6, 'Statistiken', 'climatic/stats.php', '_self', NULL, 3, 14, 'item', 'web.climatic.view', 'Beta', 'warning', 1, 0, '2026-02-23 21:22:55', '2026-02-23 21:22:55'),
(7, 'Dashboard', 'index.php', '_self', 'cil-speedometer', NULL, 1, 'item', NULL, 'NEW', 'info', 1, 0, '2026-02-23 21:23:23', '2026-02-23 21:23:23'),
(8, 'Klimatisierung', NULL, '_self', NULL, NULL, 10, 'title', NULL, NULL, NULL, 1, 0, '2026-02-23 21:23:23', '2026-02-23 21:23:23'),
(9, 'Klimasteuerung', NULL, '_self', 'cil-snow', NULL, 11, 'group', 'web.climatic.*', NULL, NULL, 1, 0, '2026-02-23 21:23:23', '2026-02-23 21:23:23'),
(10, 'Übersicht', 'climatic/dashboard.php', '_self', NULL, 3, 12, 'item', 'web.climatic.view', NULL, NULL, 1, 0, '2026-02-23 21:23:23', '2026-02-23 21:23:23'),
(11, 'Geräte', 'climatic/devices.php', '_self', NULL, 3, 13, 'item', 'web.climatic.view', NULL, NULL, 1, 0, '2026-02-23 21:23:23', '2026-02-23 21:23:23'),
(12, 'Statistiken', 'climatic/stats.php', '_self', NULL, 3, 14, 'item', 'web.climatic.view', 'Beta', 'warning', 1, 0, '2026-02-23 21:23:23', '2026-02-23 21:23:23'),
(13, 'Dashboard', 'index.php', '_self', 'cil-speedometer', NULL, 1, 'item', NULL, 'NEW', 'info', 1, 0, '2026-02-23 21:23:56', '2026-02-23 21:23:56'),
(14, 'Klimatisierung', NULL, '_self', NULL, NULL, 10, 'title', NULL, NULL, NULL, 1, 0, '2026-02-23 21:23:56', '2026-02-23 21:23:56'),
(15, 'Klimasteuerung', NULL, '_self', 'cil-snow', NULL, 11, 'group', 'web.climatic.*', NULL, NULL, 1, 0, '2026-02-23 21:23:56', '2026-02-23 21:23:56'),
(16, 'Übersicht', 'climatic/dashboard.php', '_self', NULL, 3, 12, 'item', 'web.climatic.view', NULL, NULL, 1, 0, '2026-02-23 21:23:56', '2026-02-23 21:23:56'),
(17, 'Geräte', 'climatic/devices.php', '_self', NULL, 3, 13, 'item', 'web.climatic.view', NULL, NULL, 1, 0, '2026-02-23 21:23:56', '2026-02-23 21:23:56'),
(18, 'Statistiken', 'climatic/stats.php', '_self', NULL, 3, 14, 'item', 'web.climatic.view', 'Beta', 'warning', 1, 0, '2026-02-23 21:23:56', '2026-02-23 21:23:56'),
(19, 'Dashboard', 'index.php', '_self', 'cil-speedometer', NULL, 1, 'item', NULL, 'NEW', 'info', 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(20, 'Klimatisierung', NULL, '_self', NULL, NULL, 10, 'title', NULL, NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(21, 'Klimasteuerung', NULL, '_self', 'cil-snow', NULL, 11, 'group', 'web.climatic.*', NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(22, 'Übersicht', 'climatic/dashboard.php', '_self', NULL, 3, 12, 'item', 'web.climatic.view', NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(23, 'Geräte', 'climatic/devices.php', '_self', NULL, 3, 13, 'item', 'web.climatic.view', NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(24, 'Statistiken', 'climatic/stats.php', '_self', NULL, 3, 14, 'item', 'web.climatic.view', 'Beta', 'warning', 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(25, '', NULL, '_self', NULL, NULL, 50, 'divider', NULL, NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(26, 'Administration', NULL, '_self', NULL, NULL, 100, 'title', 'web.admin', NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(27, 'Verwaltung', NULL, '_self', 'cil-settings', NULL, 101, 'group', 'web.admin', NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(28, 'Benutzer', 'admin/users.php', '_self', 'cil-user', 9, 102, 'item', 'web.admin.users', NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(29, 'Gruppen', 'admin/groups.php', '_self', 'cil-people', 9, 103, 'item', 'web.admin.groups', NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(30, 'Berechtigungen', 'admin/permissions.php', '_self', 'cil-lock-locked', 9, 104, 'item', 'web.permission.*', NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(31, 'Navigation', 'admin/navigation.php', '_self', 'cil-menu', 9, 105, 'item', 'web.navigation.view', NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(32, 'System-Logs', 'admin/logs.php', '_self', 'cil-list', NULL, 110, 'item', 'web.admin.logs', NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(33, 'Hilfe', NULL, '_self', NULL, NULL, 200, 'title', NULL, NULL, NULL, 1, 0, '2026-02-23 21:28:43', '2026-02-23 21:28:43'),
(34, 'Dokumentation', 'https://github.com/your-repo/docs', '_blank', 'cil-book', NULL, 201, 'item', NULL, NULL, NULL, 1, 1, '2026-02-23 21:28:43', '2026-02-23 21:28:43');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
