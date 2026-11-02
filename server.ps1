param (
    [int]$Port = 3001,
    [string]$Root = "$PSScriptRoot\public"
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "   GhostSensix Script Hub - Standalone Dev Server" -ForegroundColor Cyan
Write-Host "   👉 http://localhost:$Port/" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Magenta

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".webp" = "image/webp"
}

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $rawPath = $request.Url.LocalPath
            if ($rawPath -eq "/") { $rawPath = "/index.html" }
            if ($rawPath -eq "/admin" -or $rawPath -eq "/admin/") { $rawPath = "/admin.html" }

            # Set CORS & prevent browser cache during development
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
            $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 200
                $response.Close()
                continue
            }

            # Local backup API for scripts.json
            if ($rawPath -eq "/api/save-scripts" -and $request.HttpMethod -eq "POST") {
                try {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                    $body = $reader.ReadToEnd()
                    $scriptsPath = Join-Path $Root "data\scripts.json"
                    [System.IO.File]::WriteAllText($scriptsPath, $body, [System.Text.Encoding]::UTF8)
                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true}')
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.StatusCode = 200
                    $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                } catch {
                    $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false,"error":"' + $_.Exception.Message + '"}')
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.StatusCode = 500
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
                $response.Close()
                continue
            }

            # WEAO API Reverse Proxy
            if ($rawPath -eq "/api/exploits") {
                try {
                    $client = New-Object System.Net.WebClient
                    $client.Headers.Add("User-Agent", "Mozilla/5.0 GhostSensix/1.0")
                    $json = $client.DownloadString("https://weao.xyz/api/status/exploits")
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $bytes.Length
                    $response.StatusCode = 200
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                } catch {
                    $err = [System.Text.Encoding]::UTF8.GetBytes("[]")
                    $response.ContentType = "application/json"
                    $response.StatusCode = 502
                    $response.OutputStream.Write($err, 0, $err.Length)
                }
                $response.Close()
                continue
            }

            if ($rawPath -eq "/api/sunc") {
                try {
                    $q = $request.Url.Query
                    $client = New-Object System.Net.WebClient
                    $client.Headers.Add("User-Agent", "Mozilla/5.0 GhostSensix/1.0")
                    $json = $client.DownloadString("https://weao.xyz/api/sunc$q")
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $bytes.Length
                    $response.StatusCode = 200
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                } catch {
                    $err = [System.Text.Encoding]::UTF8.GetBytes("{}")
                    $response.ContentType = "application/json"
                    $response.StatusCode = 502
                    $response.OutputStream.Write($err, 0, $err.Length)
                }
                $response.Close()
                continue
            }

            $relPath = $rawPath.TrimStart("/").Replace("/", "\")
            $filePath = Join-Path $Root $relPath

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mime = $mimeTypes[$ext]
                if (-not $mime) { $mime = "application/octet-stream" }

                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $mime
                $response.ContentLength64 = $bytes.Length
                $response.StatusCode = 200
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $msg = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 Not Found</h1><p>$rawPath</p>")
                $response.ContentType = "text/html; charset=utf-8"
                $response.ContentLength64 = $msg.Length
                $response.StatusCode = 404
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($msg, 0, $msg.Length)
                }
            }

            $response.Close()
        } catch {
            # Catch client aborted or pipeline errors and keep server running
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}

