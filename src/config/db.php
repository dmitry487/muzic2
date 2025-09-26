<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

function get_db_connection() {
    $host = 'localhost';
    $dbname = 'muzic2';
    $username = 'root';
    $password = 'root';
    
    // Пробуем сначала порт 3306 (Windows MAMP), потом 8889 (Mac MAMP)
    $ports = [3306, 8889];
    
    foreach ($ports as $port) {
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
        try {
            $pdo = new PDO($dsn, $username, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            return $pdo;
        } catch (PDOException $e) {
            // Пробуем следующий порт
            continue;
        }
    }
    
    // Если ни один порт не сработал
    throw new Exception('Database connection failed: Unable to connect to MySQL on ports 3306 or 8889');
} 