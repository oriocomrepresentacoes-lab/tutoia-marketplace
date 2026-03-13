import { useState, useEffect, type FormEvent, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ExternalLink, MapPin, UploadCloud, Info, CheckCircle, Image as ImageIcon, Link as LinkIcon, Type, Pencil } from 'lucide-react';
import { fetchApi } from '../utils/api';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { useAuthStore } from '../store/authStore';
import { requestNotificationPermission, setupNotifications } from '../utils/pushManager';
import { PushPrompt } from '../components/PushPrompt';
import './Dashboard.css';
import './BannerForm.css';

export const Dashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [myAds, setMyAds] = useState([]);
    const [myPlans, setMyPlans] = useState<any[]>([]);
    const [myBanners, setMyBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerLink, setBannerLink] = useState('');
    const [linkType, setLinkType] = useState('internal'); // 'internal', 'external' or 'whatsapp'
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [bannerImage, setBannerImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [showPushPrompt, setShowPushPrompt] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        loadData();

        // Check if we should show push prompt
        if (Notification.permission === 'default' && !localStorage.getItem('pushPromptDismissed')) {
            const timer = setTimeout(() => setShowPushPrompt(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [user, navigate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [adsData, plansData, bannersData] = await Promise.all([
                fetchApi(`/ads?user_id=${user?.id}`),
                fetchApi('/user-plans/my-plans'),
                fetchApi('/banners/my-banners')
            ]);

            if (adsData && adsData.ads) setMyAds(adsData.ads);
            if (plansData) {
                setMyPlans(plansData.transactions || []);
            }
            if (bannersData) setMyBanners(bannersData);
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

    const handleDeleteBanner = async (bannerId: string) => {
        if (!confirm('Tem certeza que deseja excluir este banner?')) return;
        try {
            await fetchApi(`/banners/${bannerId}`, { method: 'DELETE' });
            loadData();
        } catch (error: any) {
            alert(error.message || 'Erro ao excluir banner');
        }
    };

    const handleFile = (selectedFile: File) => {
        if (!selectedFile.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }
        setBannerImage(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)} `;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)} -${numbers.slice(7, 11)} `;
    };

    const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        setWhatsappNumber(formatted);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleBannerSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!bannerImage) {
            alert('Selecione uma imagem para o banner.');
            return;
        }

        setUploadingBanner(true);
        try {
            let finalLink = bannerLink;
            if (linkType === 'whatsapp') {
                const cleanPhone = whatsappNumber.replace(/\D/g, '');
                if (cleanPhone.length < 10) {
                    throw new Error('Por favor, insira um número de WhatsApp válido.');
                }
                finalLink = `https://wa.me/55${cleanPhone}`;
            }

            const formData = new FormData();
            formData.append('title', bannerTitle);
            formData.append('link', finalLink);
            formData.append('image', bannerImage);
            formData.append('position', 'home_topo');

            await fetchApi('/banners', {
                method: 'POST',
                body: formData
            });

            alert('Banner enviado com sucesso! Ele já está sendo exibido na página principal.');
            setBannerTitle('');
            setBannerLink('');
            setWhatsappNumber('');
            setBannerImage(null);
            setLinkType('internal');
            setPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            loadData();
        } catch (error: any) {
            alert(error.message || 'Erro ao enviar banner');
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleRequestPush = async () => {
        const result = await requestNotificationPermission();
        if (result === 'granted') {
            await setupNotifications();
        }
    };

    const handleTestPush = async () => {
        try {
            const data = await fetchApi('/push/test', { method: 'POST' });
            alert(data.message || 'Teste enviado via servidor!');
        } catch (error: any) {
            console.error('[Diagnostic] Full error object:', error);
            const apiError = error.data?.error || error.message;
            alert(`FALHA NO SERVIDOR:\n\nErro: ${apiError}\n\nIsso significa que o sinal nem saiu do Render.`);
        }
    };

    const handleLocalNotificationTest = async () => {
        try {
            if (!('serviceWorker' in navigator)) {
                alert('Seu navegador não suporta Service Workers.');
                return;
            }

            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                alert('Nenhum Service Worker encontrado. Recarregue a página (F5).');
                return;
            }

            const title = '🔔 Teste Local (Sem Internet)';
            const options = {
                body: 'Se você está vendo isso, seu navegador e seu WINDOWS estão configurados corretamente! ✅',
                icon: '/app-icon-v3.png',
                tag: 'local-test-' + Date.now(),
                requireInteraction: true
            };

            await registration.showNotification(title, options);
            alert('Comando enviado ao navegador! Se o balão NÃO apareceu, o problema é no seu WINDOWS (Assistente de Foco ou bloqueio de notificações).');
        } catch (error: any) {
            alert('Erro no teste local: ' + error.message);
        }
    };

    if (loading) return <div className="container mt-4 loading-spinner">Carregando seus dados...</div>;

    const activeBannerPlan = myPlans.find(t => t.type === 'BANNER' && t.status === 'APPROVED');
    const isAdmin = user?.role === 'ADMIN';
    const canUploadBanner = isAdmin || activeBannerPlan;

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '5px' }}>
                        <h3 style={{ margin: 0 }}>Push</h3>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={handleLocalNotificationTest} className="btn-sm btn-outline-primary" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>Local 🖥️</button>
                            <button onClick={handleTestPush} className="btn-sm btn-primary" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>Nuvem 🔔</button>
                        </div>
                    </div>
                    <p className="stat-number" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                        {myPlans.filter(p => p.status === 'APPROVED').length}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem' }}>Ativas</span>
                        {myPlans.filter(p => p.status === 'APPROVED').length === 0 && (
                            <Link to="/plans" style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>Ver Planos</Link>
                        )}
                    </div>
                </div>
            </div>

            {isAdmin && (
                <div className="box-card mb-4" style={{ backgroundColor: 'rgba(147, 51, 234, 0.05)', border: '1px solid #9333ea' }}>
                    <h2 className="section-title" style={{ color: '#9333ea' }}>Painel Administrativo</h2>
                    <p>Você tem acesso total para criar e gerenciar banners sem restrições de pagamento.</p>
                </div>
            )}

            {canUploadBanner && (
                <div className="box-card mb-4" style={{ backgroundColor: 'rgba(37, 99, 235, 0.05)', border: '1px solid var(--primary)' }}>
                    <h2 className="section-title">
                        {isAdmin ? 'Enviar Novo Banner' : 'Adicionar Banner Destaque'}
                    </h2>
                    <p className="mb-4" style={{ marginBottom: '2.5rem', lineHeight: '1.5' }}>
                        {isAdmin
                            ? 'Como administrador, seus banners são publicados imediatamente.'
                            : 'Você possui uma assinatura ativa! Envie quantos banners desejar para serem exibidos rotativamente na página principal.'}
                    </p>

                    <form onSubmit={handleBannerSubmit} style={{ maxWidth: '680px' }}>
                        {/* ... (Form inputs same as before) */}
                        <div className="modern-input-group" style={{ marginBottom: '2rem' }}>
                            <Type className="icon" size={20} />
                            <input
                                type="text"
                                value={bannerTitle}
                                onChange={(e) => setBannerTitle(e.target.value)}
                                placeholder="Título Interno (Ex: Promoção de Fim de Ano)"
                                required
                                className="input"
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem', background: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '1rem', color: 'var(--text)' }}>
                                <LinkIcon size={18} style={{ verticalAlign: '-3px', marginRight: '0.5rem' }} />
                                Para onde o banner deve enviar o cliente?
                            </label>

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="linkType" checked={linkType === 'internal'} onChange={() => { setLinkType('internal'); setBannerLink(''); }} />
                                    Meu Anúncio (Interno)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="linkType" checked={linkType === 'whatsapp'} onChange={() => { setLinkType('whatsapp'); }} />
                                    WhatsApp
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="linkType" checked={linkType === 'external'} onChange={() => { setLinkType('external'); setBannerLink(''); }} />
                                    Link Externo (Site)
                                </label>
                            </div>

                            {linkType === 'internal' ? (
                                <select
                                    className="input"
                                    value={bannerLink}
                                    onChange={(e) => setBannerLink(e.target.value)}
                                    style={{ width: '100%' }}
                                    required
                                >
                                    <option value="" disabled>Selecione um dos seus anúncios ativos...</option>
                                    {myAds.length === 0 && <option value="" disabled>Você não tem anúncios ativos.</option>}
                                    {myAds.map((ad: any) => (
                                        <option key={ad.id} value={`/ad/${ad.id}`}>
                                            {ad.title} - R$ {ad.price.toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                            ) : linkType === 'whatsapp' ? (
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }}>+55</span>
                                    <input
                                        type="text"
                                        className="input"
                                        value={whatsappNumber}
                                        onChange={handleWhatsappChange}
                                        placeholder="(99) 99999-9999"
                                        style={{ width: '100%', paddingLeft: '3.5rem' }}
                                        required
                                    />
                                </div>
                            ) : (
                                <input
                                    type="url"
                                    className="input"
                                    value={bannerLink}
                                    onChange={(e) => setBannerLink(e.target.value)}
                                    placeholder="Ex: https://seusite.com ou instagram.com/loja"
                                    style={{ width: '100%' }}
                                    required
                                />
                            )}
                        </div>

                        <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                            {!preview ? (
                                <div
                                    className={`upload-dropzone ${isDragging ? 'drag-over' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ cursor: 'pointer', textAlign: 'center', border: '2px dashed var(--primary)', padding: '2rem', borderRadius: '12px' }}
                                >
                                    <UploadCloud size={48} className="upload-icon mx-auto" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                                    <h4 className="upload-text">Clique para buscar ou arraste a imagem aqui</h4>
                                    <p className="upload-hint" style={{ color: 'var(--primary)', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                        <Info size={16} style={{ verticalAlign: '-3px', marginRight: '4px' }} />
                                        Dimensões ideais: 1200 x 500 pixels
                                    </p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden-file-input"
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            ) : (
                                <div className="preview-container" style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                                    <img src={preview} alt="Preview Banner" className="preview-image" style={{ width: '100%', aspectRatio: '1200/500', objectFit: 'cover', display: 'block' }} />
                                    <div className="preview-overlay" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'rgba(0,0,0,0.7)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem' }}><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: '-2px' }} /> Imagem Preparada</span>
                                        <div
                                            className="btn btn-sm btn-outline-light"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                setPreview(null);
                                                setBannerImage(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                        >
                                            Trocar Arte
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary d-flex align-center gap-2" disabled={uploadingBanner} style={{ width: '100%', justifyContent: 'center', height: '3rem', fontSize: '1.1rem' }}>
                            <ImageIcon size={20} /> {uploadingBanner ? 'Enviando...' : 'Enviar Banner'}
                        </button>
                    </form>

                    {myBanners.length > 0 && (
                        <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Meus Banners Ativos ({myBanners.length})</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {myBanners.map((banner) => (
                                    <div key={banner.id} className="box-card" style={{ padding: '1rem', position: 'relative' }}>
                                        <img src={getOptimizedImageUrl(banner.image, 400)} alt={banner.title} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.75rem' }} />
                                        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{banner.title}</h4>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                            <span>{banner.clicks || 0} cliques</span>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => navigate(`/ad/edit-banner/${banner.id}`)}
                                                    className="text-primary"
                                                    title="Substituir Arte"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                >
                                                    <ImageIcon size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteBanner(banner.id)} className="text-danger" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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
                                    <Link to={`/ad/edit/${ad.id}`} className="btn-icon" title="Editar Anúncio" style={{ color: 'var(--primary)' }}><Pencil size={20} /></Link>
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
            {showPushPrompt && (
                <PushPrompt
                    onAccept={() => {
                        handleRequestPush();
                        setShowPushPrompt(false);
                    }}
                    onClose={() => {
                        setShowPushPrompt(false);
                        localStorage.setItem('pushPromptDismissed', 'true');
                    }}
                />
            )}
        </div>
    );
};
