import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, ExternalLink, MapPin, Upload } from 'lucide-react';
import { fetchApi } from '../utils/api';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { useAuthStore } from '../store/authStore';
import './Dashboard.css';

export const Dashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [myAds, setMyAds] = useState([]);
    const [myPlans, setMyPlans] = useState<any[]>([]);
    const [hasBanner, setHasBanner] = useState(false);
    const [loading, setLoading] = useState(true);

    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerLink, setBannerLink] = useState('');
    const [bannerImage, setBannerImage] = useState<File | null>(null);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        loadData();
    }, [user, navigate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [adsData, plansData] = await Promise.all([
                fetchApi(`/ads?user_id=${user?.id}`),
                fetchApi('/user-plans/my-plans')
            ]);

            if (adsData) setMyAds(adsData);
            if (plansData) {
                setMyPlans(plansData.transactions || []);
                setHasBanner(plansData.hasBanner);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (adId: string) => {
        if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;
        try {
            await fetchApi(`/ads/${adId}`, { method: 'DELETE' });
            loadData();
        } catch (error) {
            alert('Erro ao excluir o anúncio');
        }
    };

    const handleBannerSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!bannerImage) {
            alert('Selecione uma imagem para o banner.');
            return;
        }

        setUploadingBanner(true);
        const formData = new FormData();
        formData.append('title', bannerTitle);
        formData.append('link', bannerLink);
        formData.append('image', bannerImage);
        formData.append('position', 'home_topo');

        try {
            await fetchApi('/banners', {
                method: 'POST',
                body: formData
            });
            alert('Banner enviado com sucesso! Ele já está sendo exibido na página principal.');
            setBannerTitle('');
            setBannerLink('');
            setBannerImage(null);
            loadData();
        } catch (error: any) {
            alert(error.message || 'Erro ao enviar banner');
        } finally {
            setUploadingBanner(false);
        }
    };

    if (loading) return <div className="container mt-4 loading-spinner">Carregando seus dados...</div>;

    const activeBannerPlan = myPlans.find(t => t.type === 'BANNER' && t.status === 'APPROVED');
    const isAdmin = user?.role === 'ADMIN';
    const canUploadBanner = isAdmin || (activeBannerPlan && !hasBanner);

    return (
        <div className="dashboard-page container">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Meu Painel</h1>
                    <p className="page-subtitle">Gerencie seus anúncios e adesões.</p>
                </div>
                <Link to="/create-ad" className="btn btn-primary d-flex align-center gap-2">
                    <Plus size={20} /> Novo Anúncio
                </Link>
            </div>

            <div className="dashboard-stats mb-4" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div className="stat-card box-card" style={{ flex: '1', minWidth: '250px' }}>
                    <h3>Total de Anúncios</h3>
                    <p className="stat-number" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{myAds.length}</p>
                </div>
                <div className="stat-card box-card" style={{ flex: '1', minWidth: '250px' }}>
                    <h3>Visualizações</h3>
                    <p className="stat-number" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {myAds.reduce((acc: number, curr: any) => acc + (curr.views || 0), 0)}
                    </p>
                </div>
                <div className="stat-card box-card" style={{ flex: '1', minWidth: '250px' }}>
                    <h3>Meus Planos Ativos</h3>
                    <p className="stat-number" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                        {myPlans.length}
                    </p>
                    {myPlans.length === 0 && (
                        <Link to="/plans" style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>Ver Planos</Link>
                    )}
                </div>
            </div>

            {canUploadBanner && (
                <div className="box-card mb-4" style={{ backgroundColor: 'rgba(37, 99, 235, 0.05)', border: '1px solid var(--primary)' }}>
                    <h2 className="section-title">
                        {isAdmin ? 'Envio Administrativo de Banners' : 'Você possui um Plano de Banner Ativo!'}
                    </h2>
                    <p className="mb-4">
                        {isAdmin
                            ? 'Como administrador, você tem envio livre de banners sem checagem de pagamento.'
                            : 'Envie agora a imagem que deseja exibir na página principal para milhares de visitantes.'}
                    </p>

                    <form onSubmit={handleBannerSubmit} style={{ maxWidth: '600px' }}>
                        <div className="form-group mb-3">
                            <label>Título / Referência</label>
                            <input type="text" className="input" value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} required />
                        </div>
                        <div className="form-group mb-3">
                            <label>Link de Destino (Opcional, ex: https://seu-site.com ou Link do Anúncio)</label>
                            <input type="url" className="input" value={bannerLink} onChange={e => setBannerLink(e.target.value)} />
                        </div>
                        <div className="form-group mb-4">
                            <label>Imagem do Banner (Recomendado: 1200x400px)</label>
                            <input type="file" className="input" accept="image/*" onChange={e => setBannerImage(e.target.files?.[0] || null)} required />
                        </div>
                        <button type="submit" className="btn btn-primary d-flex align-center gap-2" disabled={uploadingBanner}>
                            <Upload size={20} /> {uploadingBanner ? 'Enviando...' : 'Enviar Banner'}
                        </button>
                    </form>
                </div>
            )}

            {hasBanner && (
                <div className="box-card mb-4">
                    <h3 style={{ color: 'var(--success)' }}>✔ Seu Banner promocional está ativo na página principal!</h3>
                </div>
            )}

            <div className="dashboard-listings box-card">
                <h2 className="section-title">Meus Anúncios</h2>

                {myAds.length > 0 ? (
                    <div className="listing-list">
                        {myAds.map((ad: any) => (
                            <div key={ad.id} className="listing-list-item">
                                <div className="listing-item-img">
                                    {ad.images && ad.images.length > 0 ? (
                                        <img src={getOptimizedImageUrl(ad.images[0], 200)} alt={ad.title} />
                                    ) : (
                                        <div className="placeholder">Sem foto</div>
                                    )}
                                </div>
                                <div className="listing-item-info">
                                    <Link to={`/ad/${ad.id}`} className="listing-item-title">{ad.title}</Link>
                                    <p className="listing-item-price">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ad.price)}
                                    </p>
                                    <span className="listing-item-meta"><MapPin size={14} /> {ad.city}</span>
                                    <div className="listing-status-badge">
                                        {ad.status === 'ACTIVE' ? 'Ativo' : ad.status}
                                    </div>
                                </div>
                                <div className="listing-item-actions">
                                    <Link to={`/ad/${ad.id}`} className="btn-icon" title="Ver Anúncio"><ExternalLink size={20} /></Link>
                                    <button onClick={() => handleDelete(ad.id)} className="btn-icon text-danger" title="Excluir">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>Você ainda não tem anúncios publicados.</p>
                        <Link to="/create-ad" className="btn btn-primary mt-2">Começar a Vender</Link>
                    </div>
                )}
            </div>
        </div>
    );
};
