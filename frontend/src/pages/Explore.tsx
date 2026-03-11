import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, Tag } from 'lucide-react';
import { fetchApi } from '../utils/api';
import { AdCard } from '../components/AdCard';
import { LoadingState } from '../components/LoadingState';
import './Explore.css';

export const Explore = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);

    const q = searchParams.get('q') || '';
    const city = searchParams.get('city') || '';
    const category = searchParams.get('category') || '';
    const type = searchParams.get('type') || '';

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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setAds([]);
        setPage(1);
        loadAds(1, false);
    };

    const loadAds = async (pageNum: number, append: boolean) => {
        if (append) setLoadingMore(true);
        else setLoading(true);

        try {
            const query = new URLSearchParams({
                search: q,
                city,
                category,
                type,
                page: String(pageNum),
                limit: '20'
            }).toString();

            const data = await fetchApi(`/ads?${query}`);
            if (data && data.ads) {
                setAds(prev => append ? [...prev, ...data.ads] : data.ads);
                setHasMore(data.meta.hasNextPage);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (page > 1) {
            loadAds(page, true);
        }
    }, [page]);

    useEffect(() => {
        setAds([]);
        setPage(1);
        loadAds(1, false);
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
                    <>
                        <div className="listing-grid">
                            {ads.map((ad: any) => <AdCard key={ad.id} ad={ad} />)}
                        </div>

                        {/* Sentinel for Infinite Scroll */}
                        <div ref={lastAdElementRef} style={{ height: '20px', margin: '1rem 0' }} />

                        {loadingMore && (
                            <div className="loading-more-spinner" style={{ textAlign: 'center', padding: '1rem' }}>
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Carregando mais...</span>
                                </div>
                                <p className="text-muted mt-2">Buscando mais anúncios...</p>
                            </div>
                        )}
                    </>
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
