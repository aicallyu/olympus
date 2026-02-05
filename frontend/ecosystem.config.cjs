module.exports = {
  apps: [{
    name: 'olymp-frontend',
    script: 'npm',
    args: 'run dev',
    cwd: '/home/onioko/.openclaw/workspace/mission-control/frontend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    log_file: '/tmp/olymp-frontend.log',
    out_file: '/tmp/olymp-frontend-out.log',
    error_file: '/tmp/olymp-frontend-error.log'
  }]
}
