module.exports = {
  apps: [
    {
      // Configuration BrawlSoccer
      name: 'brawlsoccer',
      script: 'server.js',
      cwd: './dist',
      
      // Mode d'exécution
      instances: 1,  // Une seule instance pour éviter les problèmes de WebSocket
      exec_mode: 'fork',
      
      // Surveillance et redémarrage
      watch: false,  // Désactivé pour la production
      ignore_watch: ['node_modules', 'logs', '*.log'],
      watch_options: {
        followSymlinks: false
      },
      
      // Gestion mémoire
      max_memory_restart: '300M',
      
      // Redémarrage automatique
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Variables d'environnement par défaut
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOST: '127.0.0.1',
        MAX_PLAYERS: 8
      },
      
      // Variables d'environnement production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1',
        MAX_PLAYERS: 8,
        GAME_TIMEOUT: 600000,
        PLAYER_RESPAWN_TIME: 3000
      },
      
      // Gestion des logs
      log_file: './logs/brawlsoccer-combined.log',
      out_file: './logs/brawlsoccer-out.log',
      error_file: './logs/brawlsoccer-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      
      // Options avancées
      node_args: '--max-old-space-size=512',
      
      // Healthcheck
      health_check_grace_period: 3000,
      
      // Gestion des signaux
      kill_timeout: 5000,
      listen_timeout: 8000,
      
      // Métadonnées
      version: '1.0.0',
      description: 'BrawlSoccer - Jeu de Football-Boxe Multijoueur 3D'
    }
  ],

  // Configuration de déploiement (optionnel)
  deploy: {
    production: {
      user: 'invidia',
      host: 'brawlsoccer.com',
      ref: 'origin/main',
      repo: 'https://github.com/mayeulperrin/brawlsoccer.git',
      path: '/var/www/brawlsoccer',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install --production && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': 'mkdir -p /var/www/brawlsoccer/logs'
    }
  }
};