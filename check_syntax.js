const fs = require('fs');
const vm = require('vm');

try {
  let content = fs.readFileSync('h:\\My Drive\\Check-in-out By Watpon NAN1\\Script-html.html', 'utf8');
  // Strip <script> and </script>
  content = content.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, '');

  // Syntax check
  new vm.Script(content);
  console.log('Script-html.html syntax is VALID!');
} catch (err) {
  console.error('Syntax Error in Script-html.html:', err);
}
