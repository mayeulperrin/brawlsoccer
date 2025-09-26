class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.volume = 0.5;
        this.muted = false;
        this.context = null;
        this.soundFolders = {
            kick: ['1.mp3', '2.mp3', '3.mp3', '4.mp3', '5.mp3', '6.mp3'],
            goal: ['1.mp3', '2.mp3', '3.mp3', '4.mp3', '5.mp3', '6.mp3'],
            ko: ['1.mp3', '2.mp3', '3.mp3', '4.mp3', '5.mp3', '6.mp3'],
            ambient: ['ambient1.mp3', 'ambient2.mp3', 'crowd.mp3']
        };
        this.init();
    }
    init() {
        console.log('🔊 Gestionnaire de sons initialisé');
        this.preloadSounds();
    }
    async preloadSounds() {
        try {
            for (const [folder, files] of Object.entries(this.soundFolders)) {
                const firstSound = files[0];
                const audio = new Audio(`medias/${folder}/${firstSound}`);
                audio.preload = 'auto';
                audio.volume = 0; 
                this.sounds.set(`${folder}_${firstSound}`, audio);
            }
            console.log('🎵 Sons préchargés');
        } catch (error) {
            console.warn('⚠️ Erreur de préchargement des sons:', error);
        }
    }
    async playRandomSound(folder, volume = 0.5) {
        if (this.muted) return;
        try {
            const files = this.soundFolders[folder];
            if (!files || files.length === 0) {
                console.warn(`⚠️ Dossier de sons inconnu: ${folder}`);
                return;
            }
            const randomFile = files[Math.floor(Math.random() * files.length)];
            const soundKey = `${folder}_${randomFile}`;
            let audio = this.sounds.get(soundKey);
            if (!audio) {
                audio = new Audio(`medias/${folder}/${randomFile}`);
                this.sounds.set(soundKey, audio);
            }
            audio.currentTime = 0;
            audio.volume = Math.min(volume * this.volume, 1);
            const playPromise = audio.play();
            if (playPromise) {
                await playPromise.catch(() => {
                });
            }
        } catch (error) {
            console.warn(`⚠️ Erreur lecture son ${folder}:`, error);
        }
    }
    async playSpecificSound(folder, filename, volume = 0.5) {
        if (this.muted) return;
        try {
            const soundKey = `${folder}_${filename}`;
            let audio = this.sounds.get(soundKey);
            if (!audio) {
                audio = new Audio(`medias/${folder}/${filename}`);
                this.sounds.set(soundKey, audio);
            }
            audio.currentTime = 0;
            audio.volume = Math.min(volume * this.volume, 1);
            const playPromise = audio.play();
            if (playPromise) {
                await playPromise.catch(() => {});
            }
            console.log(`🎵 Son spécifique joué: ${folder}/${filename}`);
        } catch (error) {
            console.warn(`⚠️ Erreur lecture son spécifique ${folder}/${filename}:`, error);
        }
    }
    async playKickSound() {
        await this.playRandomSound('kick', 0.6);
    }
    async playGoalSound() {
        await this.playRandomSound('goal', 0.7);
    }
    async playKOSound() {
        await this.playRandomSound('ko', 0.8);
    }
    async playAmbientSound() {
    }
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        console.log(`🔊 Volume défini à ${Math.round(this.volume * 100)}%`);
    }
    getVolume() {
        return this.volume;
    }
    mute() {
        this.muted = true;
        console.log('🔇 Sons coupés');
    }
    unmute() {
        this.muted = false;
        console.log('🔊 Sons réactivés');
    }
    toggleMute() {
        if (this.muted) {
            this.unmute();
        } else {
            this.mute();
        }
        return this.muted;
    }
    isMuted() {
        return this.muted;
    }
    stopAllSounds() {
        for (const [key, audio] of this.sounds) {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (error) {
            }
        }
        console.log('⏹️ Tous les sons arrêtés');
    }
    clearCache() {
        this.stopAllSounds();
        this.sounds.clear();
        console.log('🗑️ Cache audio vidé');
    }
    playRandomSoundFallback(folder, volume = 0.5) {
        return this.playRandomSound(folder, volume);
    }
    handleAudioError(audio, error) {
        console.warn('⚠️ Erreur audio:', error);
    }
    getDiagnostics() {
        return {
            soundsLoaded: this.sounds.size,
            volume: this.volume,
            muted: this.muted,
            folders: Object.keys(this.soundFolders),
            totalFiles: Object.values(this.soundFolders).reduce((total, files) => total + files.length, 0)
        };
    }
}
const soundManager = new SoundManager();
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}
console.log('🎵 SoundManager chargé et prêt');
