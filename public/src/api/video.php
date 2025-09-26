<?php
// Simple video proxy to enforce correct Content-Type and support Range
// Usage: /muzic2/public/src/api/video.php?f=tracks/video/Agent-provo-video.mp4

// Security: allow only paths under project root and within tracks/video or tracks/music
$rel = isset($_GET['f']) ? (string)$_GET['f'] : '';
$rel = str_replace(['\\', '..'], ['/', ''], $rel);
if ($rel === '' || (strpos($rel, 'tracks/video/') !== 0 && strpos($rel, 'tracks/music/') !== 0)) {
  http_response_code(400);
  echo 'Bad request';
  exit;
}

$root = realpath(__DIR__ . '/../../..');
$file = realpath($root . '/' . $rel);
if (!$file || !is_file($file) || strpos($file, $root . '/tracks/') !== 0) {
  http_response_code(404);
  echo 'Not found';
  exit;
}

$size = filesize($file);
$mime = 'video/mp4';
$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
if ($ext === 'webm') { $mime = 'video/webm'; }
if ($ext === 'm4v') { $mime = 'video/mp4'; }

header('Content-Type: ' . $mime);
header('Accept-Ranges: bytes');

$start = 0; $length = $size; $end = $size - 1;
if (isset($_SERVER['HTTP_RANGE'])) {
  if (preg_match('/bytes=(\d+)-(\d*)/i', $_SERVER['HTTP_RANGE'], $m)) {
    $start = (int)$m[1];
    if ($m[2] !== '') { $end = (int)$m[2]; }
    if ($end >= $size) { $end = $size - 1; }
    if ($start > $end) { $start = 0; }
    $length = $end - $start + 1;
    header('HTTP/1.1 206 Partial Content');
    header("Content-Range: bytes $start-$end/$size");
  }
}
header('Content-Length: ' . $length);

$fp = fopen($file, 'rb');
if ($fp === false) { http_response_code(500); exit; }
if ($start > 0) fseek($fp, $start);
$buf = 8192;
while (!feof($fp) && $length > 0) {
  $read = ($length > $buf) ? $buf : $length;
  $data = fread($fp, $read);
  if ($data === false) break;
echo $data;
flush();
$length -= strlen($data);
}
fclose($fp);
// done
?>


