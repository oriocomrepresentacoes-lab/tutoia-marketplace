import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Phone, MessageCircle, User, Calendar, Eye, ShieldCheck, Tag, Star } from 'lucide-react';
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
    const [currentScrollIdx, setCurrentScrollIdx] = useState(0);

    const handleGalleryScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const scrollLeft = container.scrollLeft;
        const itemWidth = container.querySelector('.gallery-item-wrapper')?.clientWidth || container.clientWidth;
        const newIdx = Math.round(scrollLeft / itemWidth);
        if (newIdx !== currentScrollIdx) {
            setCurrentScrollIdx(newIdx);
        }
    };

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
                    <div className="featured-badge" style={{
                        marginLeft: '0.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'linear-gradient(135deg, #fef08a, #f59e0b)',
                        color: '#78350f',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                    }}>
                        <Star size={14} fill="currentColor" /> Destaque
                    </div>
                )}
            </div>

            <div className="ad-content">
                <div className="ad-main">
                    {/* Mosaic Gallery (Desktop) / Strip (Mobile) */}
                    <div className="ad-gallery-v2">
                        {ad.images && ad.images.length > 0 ? (
                            <>
                                {/* Mobile Strip view */}
                                <div className="ad-gallery-strip mobile-only" onScroll={handleGalleryScroll}>
                                    {ad.images.map((img: string, idx: number) => (
                                        <div
                                            key={idx}
                                            className="gallery-item-wrapper"
                                            onClick={() => {
                                                setModalImgIndex(idx);
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            <img
                                                src={getOptimizedImageUrl(img, 800)}
                                                alt={`${ad.title} - ${idx + 1}`}
                                                className="ad-gallery-img"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Mosaic view */}
                                <div className="ad-gallery-mosaic desktop-only">
                                    <div
                                        className="mosaic-main"
                                        onClick={() => {
                                            setModalImgIndex(0);
                                            setIsModalOpen(true);
                                        }}
                                    >
                                        <img src={getOptimizedImageUrl(ad.images[0], 1000)} alt={ad.title} />
                                    </div>
                                    <div className="mosaic-grid">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className={`mosaic-item ${i === 4 && ad.images.length > 5 ? 'has-more' : ''}`}
                                                onClick={() => {
                                                    if (ad.images[i]) {
                                                        setModalImgIndex(i);
                                                        setIsModalOpen(true);
                                                    }
                                                }}
                                            >
                                                {ad.images[i] ? (
                                                    <img src={getOptimizedImageUrl(ad.images[i], 500)} alt={`${ad.title} ${i}`} />
                                                ) : (
                                                    <div className="mosaic-placeholder"></div>
                                                )}
                                                {i === 4 && ad.images.length > 5 && (
                                                    <div className="more-overlay">
                                                        <span>+{ad.images.length - 5}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="ad-placeholder-img">Sem imagem</div>
                        )}

                        <div className="gallery-counter-tag mobile-only">
                            {ad.images && ad.images.length > 1 && (
                                <>
                                    {currentScrollIdx + 1} / {ad.images.length}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="ad-info-section box-card">
                        <h1 className="ad-title">{ad.title}</h1>
                        <div className="ad-price-row">
                            <p className="ad-price">{formattedPrice}</p>
                            {ad.isExpiredPremium && (
                                <span className="premium-expired-badge">
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

            {/* Image Lightbox Modal */}
            {isModalOpen && ad.images && ad.images.length > 0 && (
                <div className="lightbox-overlay" onClick={() => setIsModalOpen(false)}>
                    <button className="lightbox-close" onClick={() => setIsModalOpen(false)}>&times;</button>

                    {ad.images.length > 1 && (
                        <>
                            <button
                                className="lightbox-nav prev"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setModalImgIndex((prev) => (prev > 0 ? prev - 1 : ad.images.length - 1));
                                }}
                            >
                                &#10094;
                            </button>
                            <button
                                className="lightbox-nav next"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setModalImgIndex((prev) => (prev < ad.images.length - 1 ? prev + 1 : 0));
                                }}
                            >
                                &#10095;
                            </button>
                        </>
                    )}

                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <div className="lightbox-main-container">
                            <img
                                src={getOptimizedImageUrl(ad.images[modalImgIndex], 1200)}
                                alt={`Slide ${modalImgIndex + 1}`}
                                className="lightbox-img"
                            />
                            <div className="lightbox-counter">
                                {modalImgIndex + 1} / {ad.images.length}
                            </div>
                        </div>

                        {ad.images.length > 1 && (
                            <div className="lightbox-thumbs">
                                {ad.images.map((img: string, idx: number) => (
                                    <div
                                        key={idx}
                                        className={`lightbox-thumb ${modalImgIndex === idx ? 'active' : ''}`}
                                        onClick={() => setModalImgIndex(idx)}
                                    >
                                        <img src={getOptimizedImageUrl(img, 150)} alt={`Thumb ${idx}`} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Manual deploy trigger v6
