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
            console.log('--- SINAL RECEBIDO: appinstalled ---');
            
            // Final smooth dash to 100%
            let finalProgress = 90;
            const finalInterval = setInterval(() => {
                finalProgress += 2;
                if (finalProgress >= 100) {
                    clearInterval(finalInterval);
                    setProgress(100);
                    setStatus('Instalado com sucesso! 🎉');
                    
                    // Give user time to see the success (3.5s)
                    setTimeout(() => {
                        onClose();
                        setIsInstalling(false);
                    }, 3500);
                } else {
                    setProgress(finalProgress);
                    setStatus('Finalizando no dispositivo...');
                }
            }, 50);
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', onInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, [onClose]);

    const startSimulation = () => {
        console.log('Iniciando "Ilusão" de progresso...');
        setIsInstalling(true);
        let currentProgress = 0;
        
        const interval = setInterval(() => {
            // Cap at 90% while waiting for signal
            if (currentProgress >= 90) {
                if (currentProgress < 94) {
                    currentProgress += 0.05; // Even slower crawl
                    setStatus('Aguardando resposta do Android...');
                    setProgress(currentProgress);
                } else {
                    setStatus('Quase lá...');
                    clearInterval(interval);
                }
                return;
            }

            // Simulated realistic, slower growth
            if (currentProgress < 30) {
                currentProgress += Math.random() * 3;
                setStatus('Iniciando transferência...');
            } else if (currentProgress < 80) {
                currentProgress += Math.random() * 1.5;
                setStatus('Processando pacotes...');
            } else {
                currentProgress += Math.random() * 0.8;
                setStatus('Extraindo arquivos...');
            }

            setProgress(currentProgress);
        }, 500);

        return () => clearInterval(interval);
    };

    const handleInstallClick = async () => {
        console.log('Botão Instalar clicado');
        const promptToUse = deferredPrompt || (window as any).deferredPrompt;
        
        if (!promptToUse) {
            console.warn('Prompt não disponível, tentando simulação direta...');
            startSimulation();
            return;
        }

        try {
            promptToUse.prompt();
            const { outcome } = await promptToUse.userChoice;
            console.log('Outcome do PWA:', outcome);

            if (outcome === 'accepted') {
                startSimulation();
            } else {
                onClose();
            }
        } catch (err) {
            console.error('Erro no fluxo PWA:', err);
            startSimulation(); // Fallback to simulation
        } finally {
            setDeferredPrompt(null);
            (window as any).deferredPrompt = null;
        }
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
