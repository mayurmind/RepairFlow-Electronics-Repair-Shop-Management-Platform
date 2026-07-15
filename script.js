const { spawn } = require('child_process');
const p = spawn('pnpm.cmd', ['exec', 'prisma', 'migrate', 'dev', '--name', 'add_customer_device_branch_ownership', '--create-only'], { cwd: 'apps/api', stdio: ['pipe', 'pipe', 'pipe'] });
p.stdout.on('data', d => {
  const str = d.toString();
  console.log(str);
  if (str.toLowerCase().includes('yes')) p.stdin.write('y\n');
});
p.stderr.on('data', d => console.error(d.toString()));
p.on('close', code => console.log('Exited with code ' + code));
