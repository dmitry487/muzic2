<?php
// Windows detection and API routing
function isWindows() {
    return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
}

// Route to optimized Windows APIs or original Mac APIs
if (isWindows()) {
    // Windows: Use optimized APIs for speed
    $api_map = [
        'likes.php' => 'likes_windows.php',
        'home.php' => 'home_windows.php', 
        'user.php' => 'user_windows.php'
    ];
    
    $current_api = basename($_SERVER['REQUEST_URI']);
    if (isset($api_map[$current_api])) {
        $optimized_api = $api_map[$current_api];
        $api_path = __DIR__ . '/' . $optimized_api;
        
        if (file_exists($api_path)) {
            include $api_path;
            exit;
        }
    }
}

// Mac: Use original APIs (fallback)
// This will be handled by the original API files
?>
