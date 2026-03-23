import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fetchApi } from '../utils/api';
import { AdCard } from '../components/AdCard';
import { BannerWidget } from '../components/BannerWidget';
import { LoadingState } from '../components/LoadingState';
import './Home.css';

export const Home = () => {
    const [ads, setAds] = useState<any[]>([]);
    const [banners, setBanners] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);
    const navigate = useNavigate();

    const lastAdElementRef = useCallback((node: HTMLDivElement) => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [adsData, bannerData] = await Promise.all([
                    fetchApi('/ads?sort=recent&limit=12&page=1'),
                    fetchApi('/banners/active')
                ]);
                if (adsData && adsData.ads) {
                    setAds(adsData.ads);
                    setHasMore(adsData.meta.hasNextPage);
                }
                if (bannerData) {
                    setBanners(bannerData);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (page > 1) {
            const loadMoreAds = async () => {
                setLoadingMore(true);
                try {
                    const data = await fetchApi(`/ads?sort=recent&limit=12&page=${page}`);
                    if (data && data.ads) {
                        setAds(prev => [...prev, ...data.ads]);
                        setHasMore(data.meta.hasNextPage);
                    }
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoadingMore(false);
                }
            };
            loadMoreAds();
        }
    }, [page]);

    return (
        <div className="home-page">
            <section className="hero-section">
                <div className="container">
                    <h1 className="hero-title">O que você está procurando hoje?</h1>
                    <form
                        className="search-bar"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (searchQuery.trim()) navigate(`/explore?q=${encodeURIComponent(searchQuery)}`);
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Buscar produtos, serviços, marcas..."
                            className="input search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="btn search-btn"><Search size={20} /></button>
                    </form>
                </div>
            </section>

            <div className="container">
                <BannerWidget position="home_topo" initialBanners={banners} />
            </div>

            <div className="container mt-4">
                <h2 className="section-title">Anúncios Recentes</h2>

                {loading ? (
                    <LoadingState />
                ) : ads.length > 0 ? (
                    <>
                        <div className="listing-grid">
                            {ads.map((ad: any, index: number) => <AdCard key={`${ad.id}-${index}`} ad={ad} />)}
                        </div>

                        {/* Sentinel for Infinite Scroll */}
                        <div ref={lastAdElementRef} style={{ height: '20px', margin: '1rem 0' }} />

                        {loadingMore && (
                            <div className="loading-more-spinner" style={{ textAlign: 'center', padding: '1rem' }}>
                                <div className="spinner-border text-primary" role="status" style={{ width: '1.5rem', height: '1.5rem' }}>
                                    <span className="visually-hidden">Carregando mais...</span>
                                </div>
                                <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>Buscando mais anúncios...</p>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="empty-state">Nenhum anúncio encontrado. Seja o primeiro a anunciar!</p>
                )}
            </div>

            <div className="container">
                <BannerWidget position="home_topo" initialBanners={banners} />
            </div>
        </div>
    );
};
