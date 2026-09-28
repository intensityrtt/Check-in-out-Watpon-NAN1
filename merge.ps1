$index = Get-Content 'Index.html' -Raw
$style = Get-Content 'Style.html' -Raw
$dashboard = Get-Content 'Dashboard.html' -Raw
$admin = Get-Content 'Admin.html' -Raw
$attendance = Get-Content 'Attendance-html.html' -Raw
$export = Get-Content 'Export-html.html' -Raw
$script = Get-Content 'Script-html.html' -Raw

$index = $index.Replace("<?!= include('Style'); ?>", "<style>`n" + $style + "`n</style>")
$index = $index.Replace("<?!= include('Dashboard'); ?>", $dashboard)
$index = $index.Replace("<?!= include('Admin'); ?>", $admin)
$index = $index.Replace("<?!= include('Attendance-html'); ?>", $attendance)
$index = $index.Replace("<?!= include('Export-html'); ?>", $export)
$index = $index.Replace("<?!= include('Script-html'); ?>", $script)

# Mock Apps Script template variables
$index = $index.Replace('<?= appUrl ?>', 'https://script.google.com')
$index = $index.Replace('<?!= config ?>', '{}')
$index = $index.Replace('<?!= qrMode ? ''true'' : ''false'' ?>', 'false')
$index = $index.Replace('''<?!= qrToken ?>''', '''''')
$index = $index.Replace('<?!= qrEvent || ''null'' ?>', 'null')
$index = $index.Replace('''<?!= qrDefaultMode || "checkin" ?>''', '''checkin''')

Set-Content -Path 'test_local.html' -Value $index -Encoding utf8
Write-Output "Merged successfully!"
