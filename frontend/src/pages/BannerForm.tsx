import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchApi } from '../utils/api';
import { UploadCloud, Link as LinkIcon, Type, Image as ImageIcon, Shield, Star, CheckCircle, Info } from 'lucide-react';
import './Dashboard.css';
import './BannerForm.css';

export const BannerForm = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { id: editId } = useParams();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [linkType, setLinkType] = useState('internal'); // 'internal', 'external' or 'whatsapp'
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [myAds, setMyAds] = useState<any[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [myBanners, setMyBanners] = useState<any[]>([]);

    const [hasBannerRights, setHasBannerRights] = useState(false);
    const [verifyingRights, setVerifyingRights] = useState(true);

    const isEditing = !!editId;

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

        const fetchMyBanners = async () => {
            if (isEditing) return;
            try {
                const banners = await fetchApi('/banners/my-banners');
                if (banners) setMyBanners(banners);
            } catch (err) {
                console.error("Erro ao puxar banners do usuário", err);
            }
        };

        const loadBannerToEdit = async () => {
            if (!editId) return;
            setLoading(true);
            try {
                // Ao editar buscamos especificamente o banner. Como o user pode estar editando o seu ou admin editando qualquer um.
                const banners = user.role === 'ADMIN' ? await fetchApi('/admin/banners') : await fetchApi('/banners/my-banners');
                const banner = banners?.find((b: any) => b.id === editId);
                if (banner) {
                    setTitle(banner.title);
                    setLink(banner.link || '');
                    setPreview(banner.image.startsWith('http') ? banner.image : `http://localhost:5000${banner.image}`);
                    const bannerLink = banner.link || '';
                    if (bannerLink.startsWith('/anuncio/')) {
                        setLinkType('internal');
                        setLink(bannerLink);
                    } else if (bannerLink.includes('wa.me/')) {
                        setLinkType('whatsapp');
                        const phone = bannerLink.split('wa.me/')[1]?.replace(/\D/g, '');
                        // Remove 55 if present to show only local number
                        const localPhone = phone?.startsWith('55') ? phone.slice(2) : phone;
                        setWhatsappNumber(localPhone || '');
                    } else {
                        setLinkType('external');
                        setLink(bannerLink);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar banner para edição", err);
            } finally {
                setLoading(false);
            }
        };

        verifyRights();
        fetchMyAds();
        fetchMyBanners();
        if (isEditing) loadBannerToEdit();
    }, [user.role, editId]);

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

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file && !isEditing) {
            alert('Por favor, selecione uma imagem para o banner.');
            return;
        }

        setLoading(true);
        try {
            let finalLink = link;
            if (linkType === 'whatsapp') {
                const cleanPhone = whatsappNumber.replace(/\D/g, '');
                if (cleanPhone.length < 10) {
                    throw new Error('Por favor, insira um número de WhatsApp válido.');
                }
                finalLink = `https://wa.me/55${cleanPhone}`;
            }

            const formData = new FormData();
            formData.append('title', title);
            formData.append('link', finalLink);
            formData.append('position', 'home_topo');
            if (file) formData.append('image', file);
            if (editId) formData.append('id', editId);

            await fetchApi('/banners', {
                method: 'POST',
                body: formData
            });

            alert(isEditing ? 'Banner substituído com sucesso!' : 'Banner enviado com sucesso!');
            if (user.role === 'ADMIN') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (error: any) {
            console.error('Submission Error:', error);
            const detailMsg = error.data ? JSON.stringify(error.data) : error.message;
            alert(`Erro ao enviar: ${detailMsg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="banner-form-page container" style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div className="banner-form-card">

                <div className="banner-form-header">
                    <h2>{isEditing ? 'Substituir Banner' : 'Adicionar Destaque'}</h2>
                    <p>{isEditing ? 'Altere as informações do banner selecionado abaixo.' : 'Suba uma arte para aparecer no carrossel da Página Inicial.'}</p>
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
                            <strong>Vantagem do Plano:</strong> Você possui o plano Destaque ativo! Envie quantos banners desejar para aparecerem rotativamente para todos.
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
                ) : !isEditing && myBanners.length > 0 && user.role !== 'ADMIN' ? (
                    <div className="banner-selector-view">
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', marginTop: '1rem' }}>Escolha qual banner deseja substituir:</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {myBanners.map(banner => (
                                <div key={banner.id} className="box-card" style={{ display: 'flex', gap: '1rem', padding: '1rem', alignItems: 'center' }}>
                                    <img src={banner.image.startsWith('http') ? banner.image : `http://localhost:5000${banner.image}`} alt={banner.title} style={{ width: '120px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: '1rem', marginBottom: '4px' }}>{banner.title}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Criado em: {new Date(banner.created_at).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => navigate(`/ad/edit-banner/${banner.id}`)}
                                        style={{ height: '2.5rem', padding: '0 1rem' }}
                                    >
                                        Substituir Este
                                    </button>
                                </div>
                            ))}
                            <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem' }}>Ou se preferir, crie um novo usando do seu plano ilimitado pelo Dashboard.</p>
                                <button className="btn btn-outline-secondary" onClick={() => navigate('/dashboard')}>
                                    Voltar ao Dashboard
                                </button>
                            </div>
                        </div>
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

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="linkType" checked={linkType === 'internal'} onChange={() => { setLinkType('internal'); setLink(''); }} />
                                    Meu Anúncio (Interno)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="linkType" checked={linkType === 'whatsapp'} onChange={() => { setLinkType('whatsapp'); }} />
                                    WhatsApp
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" name="linkType" checked={linkType === 'external'} onChange={() => { setLinkType('external'); setLink(''); }} />
                                    Link Externo (Site)
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
                                    />
                                </div>
                            ) : (
                                <input
                                    type="url"
                                    className="input"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    placeholder="Ex: https://seusite.com ou instagram.com/loja"
                                    style={{ width: '100%' }}
                                />
                            )}
                        </div>

                        <div className="form-group mb-4">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden-file-input"
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            {!preview ? (
                                <div
                                    className={`upload-dropzone ${isDragging ? 'drag-over' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <UploadCloud size={48} className="upload-icon mx-auto" />
                                    <h4 className="upload-text">Clique para buscar ou arraste a imagem aqui</h4>
                                    <p className="upload-hint" style={{ color: 'var(--primary)', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                        <Info size={16} style={{ verticalAlign: '-3px', marginRight: '4px' }} />
                                        Dimensões ideais: 1200 x 500 pixels
                                    </p>
                                </div>
                            ) : (
                                <div className="preview-container" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer', aspectRatio: '1200/500', borderRadius: '12px', overflow: 'hidden' }}>
                                    <img src={preview} alt="Preview Banner" className="preview-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div className="preview-overlay">
                                        <span style={{ fontSize: '0.85rem' }}><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: '-2px' }} /> Imagem Preparada</span>
                                        <div
                                            className="change-file-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreview(null);
                                                setFile(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
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
                                {loading ? 'Processando envio...' : <><ImageIcon size={18} /> {isEditing ? 'Salvar Alterações' : 'Publicar Novo Banner'}</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
