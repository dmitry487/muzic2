<?php

declare(strict_types=1);

$isHttp = (PHP_SAPI !== 'cli');
if ($isHttp) { header('Content-Type: application/json; charset=utf-8'); }

require_once __DIR__ . '/../src/config/db.php';

function respond($ok, $data = []){
    global $isHttp;
    $payload = $data + ['success' => (bool)$ok];
    if ($isHttp) { echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); }
    else { fwrite(STDOUT, ($ok?"OK":"ERR")."\n".json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT)."\n"); }
    exit($ok?0:1);
}

function file_contents_or_null(string $path): ?string {
    if (!is_file($path)) return null;
    $s = @file_get_contents($path);
    return ($s===false)?null:$s;
}

try {
    $db = get_db_connection();

    $hasTracks = false;
    try {
        $db->query("SELECT 1 FROM tracks LIMIT 1");
        $hasTracks = true;
    } catch (Throwable $e) { $hasTracks = false; }

    $executed = [];

    if (!$hasTracks) {
        $schemaCandidates = [
            __DIR__ . '/../db/schema.sql',
        ];
        foreach ($schemaCandidates as $schemaPath) {
            $sql = file_contents_or_null($schemaPath);
            if ($sql) {
                
                $stmts = preg_split('/;\s*(\r?\n)+/u', $sql);
                foreach ($stmts as $stmt) {
                    $stmt = trim($stmt);
                    if ($stmt === '' || strpos($stmt, '--') === 0) continue;
                    $db->exec($stmt);
                }
                $executed[] = basename($schemaPath);
                break; 
            }
        }
    }

    try { $db->exec("CREATE TABLE IF NOT EXISTS artists (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, cover VARCHAR(255), bio TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"); } catch (Throwable $e) {}
    try { $db->exec("ALTER TABLE tracks ADD COLUMN video_url VARCHAR(500) NULL"); } catch (Throwable $e) {}
    try { $db->exec("ALTER TABLE tracks ADD COLUMN explicit TINYINT(1) NOT NULL DEFAULT 0"); } catch (Throwable $e) {}
    
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS track_artists (
            id INT AUTO_INCREMENT PRIMARY KEY,
            track_id INT NOT NULL,
            artist VARCHAR(255) NOT NULL,
            role ENUM('primary','featured') NOT NULL DEFAULT 'featured',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_track_artist_role (track_id, artist, role)
        )");
    } catch (Throwable $e) {}
    
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS album_artists (
            id INT AUTO_INCREMENT PRIMARY KEY,
            album VARCHAR(255) NOT NULL,
            artist VARCHAR(255) NOT NULL,
            role ENUM('primary','featured') NOT NULL DEFAULT 'featured',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_album_artist_role (album, artist, role)
        )");
    } catch (Throwable $e) {}

    $shouldSeed = false;
    try { $cnt = (int)$db->query("SELECT COUNT(*) FROM tracks")->fetchColumn(); $shouldSeed = ($cnt === 0); } catch (Throwable $e) {}
    if ($shouldSeed) {
        $seedCandidates = [
            __DIR__ . '/../db/seed.sql',
            __DIR__ . '/../insert_tracks.sql',
        ];
        foreach ($seedCandidates as $seedPath) {
            $sql = file_contents_or_null($seedPath);
            if ($sql) {
                $stmts = preg_split('/;\s*(\r?\n)+/u', $sql);
                foreach ($stmts as $stmt) {
                    $stmt = trim($stmt);
                    if ($stmt === '' || strpos($stmt, '--') === 0) continue;
                    $db->exec($stmt);
                }
                $executed[] = basename($seedPath);
                
            }
        }
    }

    $health = [
        'tracks' => false,
        'artists' => false,
    ];
    try { $db->query("SELECT 1 FROM tracks LIMIT 1"); $health['tracks']=true; } catch (Throwable $e) {}
    try { $db->query("SELECT 1 FROM artists LIMIT 1"); $health['artists']=true; } catch (Throwable $e) {}

    respond(true, [
        'executed' => $executed,
        'health' => $health,
    ]);
} catch (Throwable $e) {
    respond(false, ['error' => $e->getMessage()]);
}

