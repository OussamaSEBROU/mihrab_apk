<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#000a00">

    <!-- SECURITY: Content Security Policy (Optimized for 100% Offline Integrity) -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:;">

    <title>Sanctuary - المحراب</title>
    <link rel="icon" type="image/png" href="/icon.png">
    
    <!-- LOCAL ASSETS (Offline First Architecture) -->
    <script src="/vendor/tailwind.js"></script>
    <link href="/fonts/fonts.css" rel="stylesheet">
    <script src="/vendor/pdf.min.js"></script>
    <style>
        :root {
            --accent-red: #ff0000;
            --bg-dark: #000a00;
        }
        html, body {
            background-color: var(--bg-dark);
            color: #ffffff;
            margin: 0;
            padding: 0;
            overflow: hidden;
            height: 100%;
            width: 100%;
            position: fixed;
            -webkit-user-select: none;
            user-select: none;
            touch-action: manipulation;
        }
        #root { height: 100%; width: 100%; overflow: hidden; position: relative; }
        .font-en { font-family: 'Montserrat', sans-serif; }
        .font-ar { font-family: 'Alexandria', 'Tajawal', sans-serif; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
</body>
</html>
