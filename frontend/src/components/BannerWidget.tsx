import { useEffect, useState, useRef } from 'react';
import { fetchApi } from '../utils/api';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './BannerWidget.css';

interface Banner {
    id: string;
    title: string;
    image: string;
    link?: string;
    position: string;
}

export const BannerWidget = ({ position }: { position: string }) => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;
        fetchApi('/banners/active').then(data => {
            if (isMounted && data) {
                const active = data.filter((b: Banner) => b.position === position);
                if (active.length > 0) {
                    setBanners(active);
                } else {
                    // Injecting demo slider items if no banners exist
                    setBanners([
                        {
                            id: 'demo-1',
                            title: 'Seu banner aqui',
                            image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&h=350&q=80',
                            position: position,
                            isDemo: true
                        } as unknown as Banner,
                        {
                            id: 'demo-2',
                            title: 'Mais Visibilidade',
                            image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&h=350&q=80',
                            position: position,
                            isDemo: true
                        } as unknown as Banner
                    ]);
                }
            }
        });
        return () => { isMounted = false; };
    }, [position]);

    const resetTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    useEffect(() => {
        resetTimeout();
        if (banners.length > 1) {
            timeoutRef.current = setTimeout(() => {
                setCurrentIndex((prevIndex) =>
                    prevIndex === banners.length - 1 ? 0 : prevIndex + 1
                );
            }, 5000); // 5 seconds interval
        }

        return () => {
            resetTimeout();
        };
    }, [currentIndex, banners.length]);

    const nextSlide = () => {
        setCurrentIndex(prev => (prev === banners.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = () => {
        setCurrentIndex(prev => (prev === 0 ? banners.length - 1 : prev - 1));
    };

    const handleBannerClick = (banner: Banner) => {
        if ((banner as any).isDemo) {
            window.location.href = '/plans';
            return;
        }
        fetchApi(`/banners/click/${banner.id}`, { method: 'POST' }).catch(() => { });
        if (banner.link) {
            window.open(banner.link, '_blank');
        }
    };

    if (banners.length === 0) return null;

    const getImageUrl = (img: string) => getOptimizedImageUrl(img, 1200);

    return (
        <div className={`banner-slider banner-${position}`}>
            <div
                className="banner-track"
                style={{ transform: `translateX(${-currentIndex * 100}%)` }}
            >
                {banners.map((banner) => (
                    <div
                        key={banner.id}
                        className="banner-slide"
                        onClick={() => handleBannerClick(banner)}
                    >
                        <div
                            className="banner-image"
                            style={{ backgroundImage: `url(${getImageUrl(banner.image)})` }}
                            aria-label={banner.title}
                        />
                    </div>
                ))}
            </div>

            {banners.length > 1 && (
                <>
                    <button className="slider-btn prev-btn" onClick={(e) => { e.stopPropagation(); prevSlide(); }}>
                        <ChevronLeft size={24} />
                    </button>
                    <button className="slider-btn next-btn" onClick={(e) => { e.stopPropagation(); nextSlide(); }}>
                        <ChevronRight size={24} />
                    </button>

                    <div className="slider-dots">
                        {banners.map((_, idx) => (
                            <div
                                key={idx}
                                className={`slider-dot ${currentIndex === idx ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
