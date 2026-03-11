import { Bell, X } from 'lucide-react';
import './PushPrompt.css';

interface PushPromptProps {
    onAccept: () => void;
    onClose: () => void;
}

export const PushPrompt = ({ onAccept, onClose }: PushPromptProps) => {
    return (
        <div className="push-prompt-overlay">
            <div className="push-prompt-modal">
                <button className="close-push-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="push-prompt-icon-container">
                    <Bell size={40} />
                </div>

                <h3 className="push-prompt-title">Não perca nada! 💬</h3>
                <p className="push-prompt-desc">
                    Ative as notificações para receber alertas instantâneos quando alguém te enviar uma mensagem ou mostrar interesse nos seus produtos.
                </p>

                <div className="push-prompt-actions">
                    <button className="btn btn-primary" onClick={onAccept}>
                        Ativar Notificações
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Agora não
                    </button>
                </div>
            </div>
        </div>
    );
};
