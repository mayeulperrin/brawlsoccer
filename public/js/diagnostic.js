// diagnostic.js - Outils de diagnostic pour SoccerBox
class DiagnosticManager {
    constructor() {
        this.startTime = Date.now();
        this.loadingSteps = [];
        this.errors = [];
    }

    logStep(step, status = 'success', details = null) {
        const timestamp = Date.now() - this.startTime;
        const logEntry = {
            timestamp,
            step,
            status,
            details,
            time: new Date().toLocaleTimeString()
        };
        
        this.loadingSteps.push(logEntry);
        
        const statusEmoji = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            loading: '⏳'
        };
        
        console.log(`${statusEmoji[status]} [${timestamp}ms] ${step}${details ? ': ' + details : ''}`);
        
        if (status === 'error') {
            this.errors.push(logEntry);
        }
        
        this.updateDiagnosticDisplay();
    }

    logError(error, context = '') {
        this.logStep(`Erreur ${context}`, 'error', error.message);
        this.errors.push({
            error: error.message,
            stack: error.stack,
            context,
            timestamp: Date.now() - this.startTime
        });
    }

    checkLibraries() {
        const libraries = [
            { name: 'Three.js', check: () => typeof THREE !== 'undefined', version: () => THREE?.REVISION },
            { name: 'Cannon.js', check: () => typeof CANNON !== 'undefined', version: () => CANNON?.version },
            { name: 'Socket.IO', check: () => typeof io !== 'undefined', version: () => 'Client' }
        ];

        libraries.forEach(lib => {
            if (lib.check()) {
                this.logStep(`${lib.name} chargé`, 'success', `Version: ${lib.version()}`);
            } else {
                this.logStep(`${lib.name} manquant`, 'error', 'Librairie non disponible');
            }
        });
    }

    checkBrowserSupport() {
        // WebGL
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                this.logStep('Support WebGL', 'success', `Version: ${gl.getParameter(gl.VERSION)}`);
            } else {
                this.logStep('Support WebGL', 'error', 'WebGL non supporté');
            }
        } catch (e) {
            this.logStep('Support WebGL', 'error', e.message);
        }

        // WebSocket
        if (window.WebSocket || window.MozWebSocket) {
            this.logStep('Support WebSocket', 'success');
        } else {
            this.logStep('Support WebSocket', 'error', 'WebSocket non supporté');
        }

        // Audio Context
        if (window.AudioContext || window.webkitAudioContext) {
            this.logStep('Support Audio', 'success');
        } else {
            this.logStep('Support Audio', 'warning', 'Audio Web API non supporté');
        }
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            loadTime: Date.now() - this.startTime,
            steps: this.loadingSteps,
            errors: this.errors,
            browser: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            },
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth,
                pixelRatio: window.devicePixelRatio
            },
            libraries: {
                three: typeof THREE !== 'undefined' ? THREE.REVISION : 'Non chargé',
                cannon: typeof CANNON !== 'undefined' ? CANNON.version : 'Non chargé',
                socketio: typeof io !== 'undefined' ? 'Disponible' : 'Non chargé'
            }
        };

        return report;
    }

    createDiagnosticDisplay() {
        const diagnosticDiv = document.createElement('div');
        diagnosticDiv.id = 'diagnostic-display';
        diagnosticDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            max-height: 400px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            overflow-y: auto;
            z-index: 10000;
            border: 1px solid rgba(255, 255, 255, 0.2);
            display: none;
        `;
        
        diagnosticDiv.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #4ecdc4;">
                🔧 Diagnostic SoccerBox
                <button onclick="this.parentElement.parentElement.style.display='none'" 
                        style="float: right; background: none; border: none; color: white; cursor: pointer;">✕</button>
            </div>
            <div id="diagnostic-content"></div>
            <div style="margin-top: 10px; text-align: center;">
                <button onclick="diagnostic.exportReport()" 
                        style="background: #4ecdc4; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                    📋 Exporter rapport
                </button>
            </div>
        `;
        
        document.body.appendChild(diagnosticDiv);
        
        // Raccourci clavier pour afficher/masquer
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
                e.preventDefault();
                const display = diagnosticDiv.style.display === 'none' ? 'block' : 'none';
                diagnosticDiv.style.display = display;
                if (display === 'block') {
                    this.updateDiagnosticDisplay();
                }
            }
        });
    }

    updateDiagnosticDisplay() {
        const content = document.getElementById('diagnostic-content');
        if (!content) return;

        const steps = this.loadingSteps.slice(-15); // Dernières 15 étapes
        content.innerHTML = steps.map(step => {
            const statusColor = {
                success: '#28a745',
                error: '#dc3545', 
                warning: '#ffc107',
                info: '#17a2b8',
                loading: '#6c757d'
            };
            
            return `
                <div style="margin: 2px 0; color: ${statusColor[step.status] || '#fff'};">
                    [${step.timestamp}ms] ${step.step}
                    ${step.details ? `<br><span style="font-size: 10px; opacity: 0.8;">${step.details}</span>` : ''}
                </div>
            `;
        }).join('');
        
        // Scroll vers le bas
        content.scrollTop = content.scrollHeight;
    }

    exportReport() {
        const report = this.generateReport();
        const reportText = JSON.stringify(report, null, 2);
        
        // Créer un blob et télécharger
        const blob = new Blob([reportText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `soccerbox-diagnostic-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.logStep('Rapport exporté', 'success');
    }

    showQuickDiagnostic() {
        const report = this.generateReport();
        const summary = `
🔧 DIAGNOSTIC SOCCERBOX

⏱️ Temps de chargement: ${report.loadTime}ms
📊 Étapes: ${report.steps.length} (${report.errors.length} erreurs)

📱 Navigateur: ${report.browser.userAgent.split(' ').pop()}
🖥️ Résolution: ${report.screen.width}×${report.screen.height}
🎮 Pixel Ratio: ${report.screen.pixelRatio}

📚 Librairies:
• Three.js: ${report.libraries.three}
• Cannon.js: ${report.libraries.cannon} 
• Socket.IO: ${report.libraries.socketio}

${report.errors.length > 0 ? `\n❌ Erreurs récentes:\n${report.errors.slice(-3).map(e => `• ${e.context}: ${e.error}`).join('\n')}` : '✅ Aucune erreur détectée'}

Appuyez sur Ctrl+Shift+D pour le diagnostic détaillé
        `;
        
        alert(summary);
    }
}

// Instance globale
const diagnostic = new DiagnosticManager();

// Démarrer le diagnostic
diagnostic.logStep('Diagnostic initialisé', 'success');
diagnostic.checkBrowserSupport();
diagnostic.createDiagnosticDisplay();

// Exposer globalement pour debug
window.diagnostic = diagnostic;