const fs = require('fs');
let code = fs.readFileSync('new_landing.html', 'utf8');

code = code.replace(/https:\/\/students-erp\.vercel\.app\/login\.html/g, 'login.html');
code = code.replace(/https:\/\/students-erp\.vercel\.app\/register\.html/g, 'register.html');
code = code.replace(/https:\/\/students-erp\.vercel\.app\/plans\.html/g, 'plans.html');

const rootRegex = /:root\s*\{[\s\S]*?--font-mono:[^\}]*\}/;
const newRoot = `:root {
      --void: #0F172A;
      --deep: #0B1120;
      --panel: #1E293B;
      --pulse: #2563EB;
      --glow: #3B82F6;
      --neon: #60A5FA;
      --cream: #F3F4F6;
      --muted: #9CA3AF;
      --border: #334155;
      --font-head: 'Syne', sans-serif;
      --font-drama: 'DM Serif Display', serif;
      --font-mono: 'JetBrains Mono', monospace;
    }`;
code = code.replace(rootRegex, newRoot);

const redirectScript = `<script>
  if (localStorage.getItem('token')) {
      window.location.replace('dashboard.html');
  }
</script>`;
code = code.replace('<head>', '<head>\n  ' + redirectScript);

code = code.replace(/rgba\(79,142,247/g, 'rgba(37,99,235'); // 2563EB
code = code.replace(/rgba\(34,211,238/g, 'rgba(59,130,246'); // 3B82F6

fs.writeFileSync('index.html', code);
console.log('Converted and written to index.html');
