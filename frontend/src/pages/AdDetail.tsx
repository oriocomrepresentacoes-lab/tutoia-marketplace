import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Phone, MessageCircle, User, Calendar, Eye, ShieldCheck, Tag } from 'lucide-react';
import { fetchApi } from '../utils/api';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { useAuthStore } from '../store/authStore';
import './AdDetail.css';

export const AdDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();
    const [ad, setAd] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);

    useEffect(() => {
        fetchApi(`/ads/${id}`).then(data => {
            if (data) setAd(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="container mt-4 loading-spinner">Carregando anúncio...</div>;
    if (!ad) return <div className="container mt-4 empty-state">Anúncio não encontrado.</div>;

    const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ad.price);
    const date = new Date(ad.created_at).toLocaleDateString();

    const handleChatClick = () => {
        if (!user) {
            navigate('/login', { state: { from: location.pathname } });
            return;
        }
        navigate(`/messages?adId=${ad.id}&sellerId=${ad.user_id}`);
    };

    const handleWhatsappClick = (e: React.MouseEvent) => {
        if (!user) {
            e.preventDefault();
            navigate('/login', { state: { from: location.pathname } });
        }
    };

    return (
        <div className="ad-detail-page container">
            <div className="ad-header">
                <Link to="/explore" className="back-link">&larr; Voltar para explorar</Link>
                <div className="ad-category-badge">{ad.category.name}</div>
            </div>

            <div className="ad-content">
                <div className="ad-main">
                    <div className="ad-gallery">
                        {ad.images && ad.images.length > 0 ? (
                            <img src={getOptimizedImageUrl(ad.images[activeImage], 800)} alt={ad.title} className="ad-hero-img" />
                        ) : (
                            <div className="ad-placeholder-img">Sem imagem</div>
                        )}
                        {ad.images && ad.images.length > 1 && (
                            <div className="ad-thumbnails">
                                {ad.images.map((img: string, idx: number) => (
                                    <img
                                        key={idx}
                                        src={getOptimizedImageUrl(img, 200)}
                                        alt={`Thumbnail ${idx + 1}`}
                                        className={activeImage === idx ? 'active' : ''}
                                        onClick={() => setActiveImage(idx)}
                                        style={{ cursor: 'pointer', border: activeImage === idx ? '2px solid var(--primary)' : '2px solid transparent' }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="ad-info-section box-card">
                        <h1 className="ad-title">{ad.title}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <p className="ad-price">{formattedPrice}</p>
                            {ad.isExpiredPremium && (
                                <span style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '1rem',
                                    fontSize: '0.8rem',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    fontWeight: 'bold'
                                }}>
                                    Plano Premium Expirado
                                </span>
                            )}
                        </div>

                        <div className="ad-meta">
                            <span className="meta-item"><MapPin size={16} /> {ad.city}</span>
                            <span className="meta-item"><Calendar size={16} /> Publicado em {date}</span>
                            <span className="meta-item"><Eye size={16} /> {ad.views} visualizações</span>
                            <span className="meta-item"><Tag size={16} /> {ad.type === 'PRODUCT' ? 'Produto' : 'Serviço'}</span>
                        </div>

                        <div className="ad-description">
                            <h3>Descrição</h3>
                            <p>{ad.description}</p>
                        </div>
                    </div>
                </div>

                <div className="ad-sidebar">
                    <div className="seller-card box-card">
                        <h3>Informações do Anunciante</h3>
                        <div className="seller-profile">
                            <div className="seller-avatar">
                                {ad.user.profile_picture ? (
                                    <img src={getOptimizedImageUrl(ad.user.profile_picture, 150)} alt="Avatar" />
                                ) : (
                                    <User size={32} />
                                )}
                            </div>
                            <div>
                                <h4 className="seller-name">{ad.user.name}</h4>
                                <span className="seller-badge"><ShieldCheck size={14} /> Usuário verificado</span>
                            </div>
                        </div>

                        <div className="seller-actions">
                            {user ? (
                                <>
                                    <button
                                        className="btn btn-primary btn-block action-btn"
                                        onClick={handleChatClick}
                                    >
                                        <MessageCircle size={20} /> Chat
                                    </button>
                                    {ad.user.phone && (
                                        <a
                                            href={`https://wa.me/55${ad.user.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-outline btn-block action-btn whatsapp-btn"
                                            onClick={handleWhatsappClick}
                                        >
                                            <Phone size={20} /> WhatsApp
                                        </a>
                                    )}
                                </>
                            ) : (
                                <button
                                    className="btn btn-secondary btn-block action-btn"
                                    onClick={() => navigate('/login', { state: { from: location.pathname } })}
                                >
                                    <User size={20} /> Faça login para contatar
                                </button>
                            )}
                        </div>

                        <div className="safety-tips">
                            <h4>Dicas de Segurança</h4>
                            <ul>
                                <li>Não pague antecipadamente.</li>
                                <li>Encontre-se em local público e movimentado.</li>
                                <li>Verifique o produto pessoalmente.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
