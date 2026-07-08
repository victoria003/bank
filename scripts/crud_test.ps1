$ErrorActionPreference = 'Stop'

$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/auth/login' -ContentType 'application/json' -Body '{"username":"admin","password":"admin123"}'
$token = $login.token
Write-Output 'LOGIN_RESPONSE:'
$login | ConvertTo-Json -Depth 5

$create = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/records' -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body (ConvertTo-Json @{ name='Test User'; email='test@example.com'; details='created via script' })
Write-Output 'CREATE_RESPONSE:'
$create | ConvertTo-Json -Depth 5

$id = $create.id
$read = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/records/$id" -Headers @{ Authorization = "Bearer $token" }
Write-Output 'READ_RESPONSE:'
$read | ConvertTo-Json -Depth 5

$update = Invoke-RestMethod -Method Put -Uri "http://localhost:3000/api/records/$id" -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body (ConvertTo-Json @{ name='Test User Updated'; email='test@example.com'; details='updated via script' })
Write-Output 'UPDATE_RESPONSE:'
$update | ConvertTo-Json -Depth 5

$del = Invoke-RestMethod -Method Delete -Uri "http://localhost:3000/api/records/$id" -Headers @{ Authorization = "Bearer $token" }
Write-Output 'DELETE_RESPONSE:'
$del | ConvertTo-Json -Depth 5
