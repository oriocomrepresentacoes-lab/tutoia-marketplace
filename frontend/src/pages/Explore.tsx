import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, Tag } from 'lucide-react';
import { fetchApi } from '../utils/api';
import { AdCard } from '../components/AdCard';
import { LoadingState } from '../components/LoadingState';
import './Explore.css';

export const Explore = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);

    const q = searchParams.get('q') || '';
    const city = searchParams.get('city') || '';
    const category = searchParams.get('category') || '';
    const type = searchParams.get('type') || '';

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadAds();
    };

    const loadAds = async () => {
        setLoading(true);
        const query = new URLSearchParams({ search: q, city, category, type }).toString();
        const data = await fetchApi(`/ads?${query}`);
        if (data) setAds(data);
        setLoading(false);
    };

    useEffect(() => {
        loadAds();
    }, [q, city, category, type]);

    return (
        <div className="explore-page container">
            <h1 className="page-title">Explorar Anúncios</h1>

            <form onSubmit={handleSearch} className="search-filters">
                <div className="filter-group">
                    <Search className="filter-icon" />
                    <input
                        type="text"
                        placeholder="O que você procura?"
                        value={q}
                        onChange={(e) => setSearchParams(prev => { prev.set('q', e.target.value); return prev; })}
                        className="input"
                    />
                </div>

                <div className="filter-group">
                    <MapPin className="filter-icon" />
                    <select
                        className="input"
                        value={city}
                        onChange={(e) => setSearchParams(prev => { prev.set('city', e.target.value); return prev; })}
                    >
                        <option value="">Todas as Cidades</option>
                        <option value="Tutoia">Tutóia</option>
                    </select>
                </div>

                <div className="filter-group">
                    <Tag className="filter-icon" />
                    <select
                        className="input"
                        value={type}
                        onChange={(e) => setSearchParams(prev => { prev.set('type', e.target.value); return prev; })}
                    >
                        <option value="">Todos os Tipos</option>
                        <option value="PRODUCT">Produtos</option>
                        <option value="SERVICE">Serviços</option>
                    </select>
                </div>

                <button type="submit" className="btn btn-primary">Buscar</button>
            </form>

            <div className="results-container">
                {loading ? (
                    <LoadingState />
                ) : ads.length > 0 ? (
                    <div className="listing-grid">
                        {ads.map((ad: any) => <AdCard key={ad.id} ad={ad} />)}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>Nenhum anúncio encontrado com esses filtros.</p>
                        <button className="btn btn-secondary mt-2" onClick={() => setSearchParams({})}>Limpar Filtros</button>
                    </div>
                )}
            </div>
        </div>
    );
};
