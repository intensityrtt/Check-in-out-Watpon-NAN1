$body = @{ action = 'getEventByQRToken'; data = @{ qrToken = 'dummy' } } | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'https://script.google.com/a/macros/ednan1.go.th/s/AKfycby2DveB1Y8oz07Fz9trT4nLHsgkM0zwk9rcA5oVE3RQ2_xXyCmcnW-XxK_ovirIDCQvdg/exec' -Method Post -Body $body -ContentType 'text/plain'
$response | ConvertTo-Json
