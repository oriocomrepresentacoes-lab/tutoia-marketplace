import { Phone, MessageCircle, Mail, MapPin } from 'lucide-react';
import './StaticPages.css';

export const Contact = () => {
    const phoneNumber = "64992136508";
    const formattedPhone = "(64) 99213-6508";

    return (
        <div className="static-page container">
            <h1 className="static-title">Contato</h1>
            <div className="static-content box-card contact-grid">
                <div className="contact-info">
                    <h2>Fale Conosco</h2>
                    <p className="mb-4">Dúvidas, sugestões ou suporte técnico? Nossa equipe está pronta para te ajudar.</p>

                    <div className="contact-item">
                        <div className="contact-icon">
                            <Phone size={24} />
                        </div>
                        <div>
                            <h3>Telefone</h3>
                            <p>{formattedPhone}</p>
                        </div>
                    </div>

                    <div className="contact-item">
                        <div className="contact-icon">
                            <MessageCircle size={24} />
                        </div>
                        <div>
                            <h3>WhatsApp</h3>
                            <p>Atendimento imediato via chat</p>
                            <a
                                href={`https://wa.me/55${phoneNumber}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-success btn-sm mt-2"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                            >
                                <MessageCircle size={18} /> Iniciar Conversa
                            </a>
                        </div>
                    </div>

                    <div className="contact-item">
                        <div className="contact-icon">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h3>E-mail</h3>
                            <p>suporte@tutshop.com.br</p>
                        </div>
                    </div>

                    <div className="contact-item">
                        <div className="contact-icon">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h3>Localização</h3>
                            <p>Tutóia - Maranhão</p>
                        </div>
                    </div>
                </div>

                <div className="contact-map-placeholder">
                    <img
                        src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80"
                        alt="Suporte TutShop"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                    />
                </div>
            </div>
        </div>
    );
};
