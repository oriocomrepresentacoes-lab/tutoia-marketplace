import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fetchApi } from '../utils/api';
import { AdCard } from '../components/AdCard';
import { BannerWidget } from '../components/BannerWidget';
import { LoadingState } from '../components/LoadingState';
import './Home.css';

export const Home = () => {
    const [ads, setAds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        fetchApi('/ads?sort=recent').then(data => {
            if (data) setAds(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

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
                <BannerWidget position="home_topo" />
            </div>

            <div className="container mt-4">
                <h2 className="section-title">Anúncios Recentes</h2>

                {loading ? (
                    <LoadingState />
                ) : (
                    <div className="listing-grid">
                        {ads.length > 0 ? (
                            ads.map((ad: any) => <AdCard key={ad.id} ad={ad} />)
                        ) : (
                            <p className="empty-state">Nenhum anúncio encontrado. Seja o primeiro a anunciar!</p>
                        )}
                    </div>
                )}
            </div>

            <div className="container">
                <BannerWidget position="home_topo" />
            </div>
        </div>
    );
};
