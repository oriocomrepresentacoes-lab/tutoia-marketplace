import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import './InstallPrompt.css';

interface InstallPromptProps {
    onClose: () => void;
}

export const InstallPrompt = ({ onClose }: InstallPromptProps) => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalling, setIsInstalling] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Preparando instalação...');

    useEffect(() => {
        // Use the global prompt if available
        if ((window as any).deferredPrompt) {
            setDeferredPrompt((window as any).deferredPrompt);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const onInstalled = () => {
            console.log('PWA detectado como instalado com sucesso!');
            setProgress(100);
            setStatus('Instalado com sucesso! 🎉');
            setTimeout(() => {
                onClose();
                setIsInstalling(false);
            }, 1500);
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', onInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, [onClose]);

    const startSimulation = () => {
        setIsInstalling(true);
        let currentProgress = 0;
        
        const interval = setInterval(() => {
            if (currentProgress >= 98) {
                clearInterval(interval);
                return;
            }

            // Simulated realistic growth
            if (currentProgress < 30) {
                currentProgress += Math.random() * 5;
                setStatus('Preparando sistema...');
            } else if (currentProgress < 85) {
                currentProgress += Math.random() * 2;
                setStatus('Baixando arquivos do App...');
            } else {
                currentProgress += 0.5;
                setStatus('Finalizando instalação no dispositivo...');
            }

            setProgress(Math.min(currentProgress, 98));
        }, 300);
    };

    const handleInstallClick = async () => {
        const promptToUse = deferredPrompt || (window as any).deferredPrompt;
        if (!promptToUse) return;

        promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;

        if (outcome === 'accepted') {
            startSimulation();
        }
        
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
    };

    if (!deferredPrompt && !(window as any).deferredPrompt && !isInstalling) return null;

    return (
        <div className="install-prompt-overlay">
            <div className="install-prompt-modal">
                {!isInstalling && (
                    <button className="close-prompt-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                )}

                <img src="/logo.png" alt="TutShop Logo" className="install-prompt-logo" />

                <h3 className="install-prompt-title">Instale o TutShop!</h3>
                
                {isInstalling ? (
                    <div className="install-progress-container">
                        <p className="install-status">{status}</p>
                        <div className="progress-bar-bg">
                            <div 
                                className="progress-bar-fill" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="progress-percentage">{Math.round(progress)}%</p>
                    </div>
                ) : (
                    <>
                        <p className="install-prompt-desc">Tenha a melhor experiência! Instale nosso aplicativo no seu celular para acessar mais rápido e receber novidades.</p>

                        <button className="btn btn-primary install-btn" onClick={handleInstallClick}>
                            <Download size={20} /> Instalar Aplicativo
                        </button>

                        <button className="btn btn-secondary later-btn" onClick={onClose}>
                            Agora não
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
