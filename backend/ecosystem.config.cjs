module.exports = {
  apps: [{
    name: 'olymp-backend',
    script: './dist/server.js',
    cwd: '/home/onioko/.openclaw/workspace/mission-control/backend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    // Log configuration
    log_file: '/home/onioko/.pm2/logs/olymp-backend.log',
    out_file: '/home/onioko/.pm2/logs/olymp-backend-out.log',
    error_file: '/home/onioko/.pm2/logs/olymp-backend-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Auto-restart settings
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 3000,
    // Health check
    health_check_grace_period: 30000,
    // Kill timeout
    kill_timeout: 5000,
    listen_timeout: 10000,
  }]
}
