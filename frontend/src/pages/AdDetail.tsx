import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Phone, MessageCircle, User, Calendar, Eye, ShieldCheck, Star } from 'lucide-react';
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalImgIndex, setModalImgIndex] = useState(0);

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
        if (user.id === ad.user_id) {
            alert("Você não pode iniciar um chat com seu próprio anúncio.");
            return;
        }
        navigate(`/messages?adId=${ad.id}&sellerId=${ad.user_id}`, {
            state: {
                tempChat: {
                    ad_id: ad.id,
                    ad_title: ad.title,
                    other_user_id: ad.user_id,
                    other_user_name: ad.user.name
                }
            }
        });
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
                {ad.isFeatured && (
                    <div className="featured-badge">
                        <Star size={14} fill="currentColor" /> Destaque
                    </div>
                )}
            </div>

            <div className="ad-content">
                <div className="ad-main">
                    {/* Unified Gallery Section */}
                    <div className="ad-gallery-container-v4">
                        {ad.images && ad.images.length > 0 ? (
                            <div className="gallery-v4">
                                <div
                                    className="gallery-main-frame"
                                    onClick={() => setIsModalOpen(true)}
                                >
                                    <img
                                        src={getOptimizedImageUrl(ad.images[modalImgIndex], 1000)}
                                        alt={ad.title}
                                        className="gallery-main-img"
                                    />
                                    {ad.images.length > 1 && (
                                        <div className="gallery-index-tag">
                                            {modalImgIndex + 1} / {ad.images.length}
                                        </div>
                                    )}
                                </div>

                                {ad.images.length > 1 && (
                                    <div className="gallery-thumbs-row">
                                        {ad.images.map((img: string, idx: number) => (
                                            <div
                                                key={idx}
                                                className={`gallery-thumb-box ${modalImgIndex === idx ? 'active' : ''}`}
                                                onClick={() => setModalImgIndex(idx)}
                                            >
                                                <img src={getOptimizedImageUrl(img, 200)} alt={`Thumb ${idx}`} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="ad-placeholder-frame">Sem imagens disponíveis</div>
                        )}
                    </div>

                    <div className="ad-description-box box-card">
                        <h3>Descrição</h3>
                        <p>{ad.description}</p>
                    </div>

                    {/* Safety Tips removed from sidebar to main for better flow if needed, OR keep in sidebar */}
                </div>

                <div className="ad-sidebar">
                    {/* Primary Info Sidebar - High visibility */}
                    <div className="ad-visual-sidebar box-card sticky-element">
                        <h1 className="ad-title-v4">{ad.title}</h1>
                        <p className="ad-price-v4">{formattedPrice}</p>

                        <div className="ad-meta-v4">
                            <span className="meta-row"><MapPin size={18} /> {ad.city}</span>
                            <span className="meta-row"><Calendar size={18} /> Publicado em {date}</span>
                            <span className="meta-row"><Eye size={18} /> {ad.views} visualizações</span>
                        </div>

                        {ad.isExpiredPremium && (
                            <div className="premium-alert-v4">
                                Plano Premium Expirado
                            </div>
                        )}

                        <div className="contact-buttons-v4">
                            {user ? (
                                <>
                                    <button
                                        className="btn btn-primary btn-block contact-btn"
                                        onClick={handleChatClick}
                                    >
                                        <MessageCircle size={20} /> Chat Agora
                                    </button>
                                    {ad.user.phone && (
                                        <a
                                            href={`https://wa.me/55${ad.user.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-outline btn-block contact-btn whatsapp"
                                            onClick={handleWhatsappClick}
                                        >
                                            <Phone size={20} /> WhatsApp
                                        </a>
                                    )}
                                </>
                            ) : (
                                <button
                                    className="btn btn-secondary btn-block contact-btn"
                                    onClick={() => navigate('/login', { state: { from: location.pathname } })}
                                >
                                    <User size={20} /> Entrar para contatar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Seller Details */}
                    <div className="seller-box-v4 box-card">
                        <div className="seller-intro">
                            <div className="seller-pfp">
                                {ad.user.profile_picture ? (
                                    <img src={getOptimizedImageUrl(ad.user.profile_picture, 150)} alt="Avatar" />
                                ) : (
                                    <User size={28} />
                                )}
                            </div>
                            <div className="seller-info">
                                <h4 className="name">{ad.user.name}</h4>
                                <span className="verified"><ShieldCheck size={14} /> Verificado</span>
                            </div>
                        </div>

                        <div className="safety-box-v4">
                            <h5>Segurança</h5>
                            <ul>
                                <li>Não pague antecipadamente.</li>
                                <li>Encontre-se em local público.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox Modal */}
            {isModalOpen && ad.images && ad.images.length > 0 && (
                <div className="lightbox-overlay" onClick={() => setIsModalOpen(false)}>
                    <button className="lightbox-close" onClick={() => setIsModalOpen(false)}>&times;</button>

                    {ad.images.length > 1 && (
                        <>
                            <button
                                className="lightbox-nav-btn prev"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setModalImgIndex(prev => prev > 0 ? prev - 1 : ad.images.length - 1);
                                }}
                            >
                                &#10094;
                            </button>
                            <button
                                className="lightbox-nav-btn next"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setModalImgIndex(prev => prev < ad.images.length - 1 ? prev + 1 : 0);
                                }}
                            >
                                &#10095;
                            </button>
                        </>
                    )}

                    <div className="lightbox-wrap" onClick={e => e.stopPropagation()}>
                        <img
                            src={getOptimizedImageUrl(ad.images[modalImgIndex], 1200)}
                            alt="Zoom view"
                            className="lightbox-zoom-img"
                        />
                        <div className="lightbox-pagination">
                            {modalImgIndex + 1} / {ad.images.length}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
