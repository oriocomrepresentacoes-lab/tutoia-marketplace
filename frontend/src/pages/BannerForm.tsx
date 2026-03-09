import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchApi } from '../utils/api';
import { UploadCloud, Link as LinkIcon, Type, Image as ImageIcon, Shield, Star, CheckCircle } from 'lucide-react';
import './Dashboard.css';
import './BannerForm.css';

export const BannerForm = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [linkType, setLinkType] = useState('internal'); // 'internal' or 'external'
    const [myAds, setMyAds] = useState<any[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const [hasBannerRights, setHasBannerRights] = useState(false);
    const [hasActiveBanner, setHasActiveBanner] = useState(false);
    const [verifyingRights, setVerifyingRights] = useState(true);

    // Redirect se não logado
    if (!user) {
        navigate('/login');
        return null;
    }

    useEffect(() => {
        const verifyRights = async () => {
            try {
                const plansData = await fetchApi('/user-plans/my-plans');
                if (plansData) {
                    const hasRights = user.role === 'ADMIN' || plansData.transactions.some((t: any) => t.type === 'BANNER');
                    setHasBannerRights(hasRights);
                    setHasActiveBanner(plansData.hasBanner);
                }
            } catch (err) {
                console.error("Erro ao checar planos", err);
            } finally {
                setVerifyingRights(false);
            }
        };

        const fetchMyAds = async () => {
            try {
                const ads = await fetchApi('/ads/my-ads');
                if (ads) setMyAds(ads);
            } catch (err) {
                console.error("Erro ao puxar anúncios do usuário", err);
            }
        };

        verifyRights();
        fetchMyAds();
    }, [user.role]);

    const handleFile = (selectedFile: File) => {
        if (!selectedFile.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }
        setFile(selectedFile);
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

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            alert('Por favor, selecione uma imagem para o banner.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('link', link);
            formData.append('position', 'home_topo');
            formData.append('image', file);

            await fetchApi('/banners', {
                method: 'POST',
                body: formData
            });

            alert('Banner enviado com sucesso!');
            if (user.role === 'ADMIN') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Erro de conexão ao enviar o banner.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="banner-form-page container" style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div className="banner-form-card">

                <div className="banner-form-header">
                    <h2>Adicionar Destaque</h2>
                    <p>Suba uma arte para aparecer no carrossel da Página Inicial.</p>
                </div>

                {user.role === 'ADMIN' ? (
                    <div className="privilege-alert privilege-admin">
                        <Shield size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <strong>Privilégio Admin:</strong> Seu envio será publicado imediatamente na plataforma sem necessidade de verificação de pagamento.
                        </div>
                    </div>
                ) : hasBannerRights ? (
                    <div className="privilege-alert privilege-user">
                        <Star size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <strong>Vantagem do Plano:</strong> Você possui o plano Destaque ativo por 20 dias e já pode {hasActiveBanner ? 'atualizar sua arte' : 'enviar a sua arte finalizada'} para todos verem!
                        </div>
                    </div>
                ) : null}

                {verifyingRights ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Verificando permissões...</p>
                ) : !hasBannerRights ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <Star size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.8 }} />
                        <h3 style={{ marginBottom: '1rem' }}>Recurso Bloqueado</h3>
                        <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>O Destaque com Banner fica no topo da tela de todos os clientes por 20 dias ininterruptos, uma ótima forma de conseguir mais vendas.<br />Você precisa de uma assinatura ativa para usar essa ferramenta.</p>
                        <button className="btn btn-primary" onClick={() => navigate('/plans')} style={{ padding: '0.75rem 2rem' }}>Assinar Agora</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="modern-input-group" style={{ marginBottom: '2rem' }}>
                            <Type className="icon" size={20} />
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
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

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="linkType" checked={linkType === 'internal'} onChange={() => { setLinkType('internal'); setLink(''); }} />
                                    Meu Anúncio (Interno)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="linkType" checked={linkType === 'external'} onChange={() => { setLinkType('external'); setLink(''); }} />
                                    Link Externo (Site/WhatsApp)
                                </label>
                            </div>

                            {linkType === 'internal' ? (
                                <select
                                    className="input"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    <option value="" disabled>Selecione um dos seus anúncios ativos...</option>
                                    {myAds.length === 0 && <option value="" disabled>Você não tem anúncios ativos.</option>}
                                    {myAds.map(ad => (
                                        <option key={ad.id} value={`/anuncio/${ad.id}`}>
                                            {ad.title} - R$ {ad.price.toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="url"
                                    className="input"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    placeholder="Ex: https://wa.me/5586999999999 ou seupipa.com"
                                    style={{ width: '100%' }}
                                />
                            )}
                        </div>

                        <div className="form-group mb-4">
                            {!preview ? (
                                <div
                                    className={`upload-dropzone ${isDragging ? 'drag-over' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <UploadCloud size={48} className="upload-icon mx-auto" />
                                    <h4 className="upload-text">Clique para buscar ou arraste a imagem aqui</h4>
                                    <p className="upload-hint">Recomendamos formato retangular horizontal (<b>1200x350px</b>) - JPG, PNG ou WEBP</p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden-file-input"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            ) : (
                                <div className="preview-container">
                                    <img src={preview} alt="Preview Banner" className="preview-image" />
                                    <div className="preview-overlay">
                                        <span style={{ fontSize: '0.85rem' }}><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: '-2px' }} /> Imagem Preparada</span>
                                        <div
                                            className="change-file-btn"
                                            onClick={() => {
                                                setPreview(null);
                                                setFile(null);
                                            }}
                                        >
                                            Trocar Arte
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                            <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: '0.75rem', height: '3rem', padding: '0 2rem' }} onClick={() => navigate(-1)} disabled={loading}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary submit-banner-btn" disabled={loading} style={{ width: 'auto', padding: '0 2rem', margin: 0, height: '3rem' }}>
                                {loading ? 'Processando envio...' : <><ImageIcon size={18} /> {hasActiveBanner ? 'Atualizar Banner' : 'Publicar Banner'}</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
