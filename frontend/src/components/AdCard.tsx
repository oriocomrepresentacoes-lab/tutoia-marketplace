import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import './AdCard.css';

interface AdCardProps {
    ad: {
        id: string;
        title: string;
        price: number;
        city: string;
        images: string[];
        category?: { name: string };
        isFeatured?: boolean;
        isExpiredPremium?: boolean;
    };
}

export const AdCard = ({ ad }: AdCardProps) => {
    const imageUrl = ad.images && ad.images.length > 0
        ? getOptimizedImageUrl(ad.images[0], 400)
        : 'https://via.placeholder.com/300x200?text=Sem+Imagem';

    return (
        <Link to={`/ad/${ad.id}`} className="listing-card">
            <div className={`listing-card-img-container ${ad.isFeatured ? 'featured-img' : ''}`}>
                <img
                    src={imageUrl}
                    alt={ad.title}
                    className="listing-card-img"
                    loading="lazy"
                />
                {ad.isFeatured && (
                    <div className="featured-badge">
                        <Star size={14} fill="currentColor" /> Destaque
                    </div>
                )}
                {ad.isExpiredPremium && (
                    <div className="expired-premium-badge">
                        Premium Expirado
                    </div>
                )}
            </div>
            <div className="listing-card-content">
                <h3 className="listing-card-title">{ad.title}</h3>
                <p className="listing-card-price">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ad.price)}
                </p>
                <div className="listing-card-footer">
                    <span className="listing-card-city">{ad.city}</span>
                    {ad.category && <span className="listing-card-category">{ad.category.name}</span>}
                </div>
            </div>
        </Link>
    );
};
