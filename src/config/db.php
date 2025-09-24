<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

function get_db_connection() {
    $host = 'localhost:8889';
    $dbname = 'muzic2';
    $username = 'root';
    $password = 'root';
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    try {
        $pdo = new PDO($dsn, $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        // Do not emit JSON headers here; let callers decide the response format
        http_response_code(500);
        die('Database connection failed: ' . $e->getMessage());
    }
} 