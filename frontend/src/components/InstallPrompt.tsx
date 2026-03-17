import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import './InstallPrompt.css';

interface InstallPromptProps {
    onClose: () => void;
}

export const InstallPrompt = ({ onClose }: InstallPromptProps) => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        // Use the global prompt if available
        if ((window as any).deferredPrompt) {
            setDeferredPrompt((window as any).deferredPrompt);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        const promptToUse = deferredPrompt || (window as any).deferredPrompt;
        if (!promptToUse) return;

        promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;

        if (outcome === 'accepted') {
            onClose();
        }
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
    };

    if (!deferredPrompt && !(window as any).deferredPrompt) return null;

    return (
        <div className="install-prompt-overlay">
            <div className="install-prompt-modal">
                <button className="close-prompt-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                <img src="/logo.png" alt="TutShop Logo" className="install-prompt-logo" />

                <h3 className="install-prompt-title">Instale o TutShop!</h3>
                <p className="install-prompt-desc">Tenha a melhor experiência! Instale nosso aplicativo no seu celular para acessar mais rápido e receber novidades.</p>

                <button className="btn btn-primary install-btn" onClick={handleInstallClick}>
                    <Download size={20} /> Instalar Aplicativo
                </button>

                <button className="btn btn-secondary later-btn" onClick={onClose}>
                    Agora não
                </button>
            </div>
        </div>
    );
};
