<?php
require_once __DIR__ . '/includes/auth.php';
if (usuario_actual()) {
    header('Location: feed.php');
} else {
    header('Location: login.php');
}
exit;
