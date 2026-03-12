import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, X, ArrowLeft, Loader2 } from 'lucide-react';
import { fetchApi } from '../utils/api';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import './CreateAd.css'; // Reusing styles from CreateAd

export const EditAd = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [type, setType] = useState('PRODUCT');
    const [city, setCity] = useState('Tutoia');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState([]);

    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newImages, setNewImages] = useState<File[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<{ message: string; details?: string } | null>(null);
    const [maxImages, setMaxImages] = useState(4);
    const [hasImagePlan, setHasImagePlan] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [catsData, plansData, adData] = await Promise.all([
                    fetchApi('/categories'),
                    fetchApi('/user-plans/my-plans').catch(() => null),
                    fetchApi(`/ads/${id}`)
                ]);

                if (catsData) setCategories(catsData);

                if (plansData && plansData.transactions) {
                    const now = new Date();
                    const hasActivePlan = plansData.transactions.some((t: any) =>
                        t.type === 'AD_IMAGES' &&
                        t.status === 'APPROVED' &&
                        new Date(t.expires_at) >= now
                    );
                    if (hasActivePlan) {
                        setMaxImages(10);
                        setHasImagePlan(true);
                    }
                }

                if (adData) {
                    setTitle(adData.title);
                    setDescription(adData.description);
                    // Price format "1.234,56"
                    const formattedPrice = new Intl.NumberFormat('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }).format(adData.price);
                    setPrice(formattedPrice);
                    setType(adData.type);
                    setCity(adData.city);
                    setCategoryId(adData.category_id);
                    setExistingImages(adData.images || []);

                    // If ad already has more than 4 images, it's premium
                    const now = new Date();
                    const isAdAlreadyPremium = plansData?.transactions?.some((t: any) =>
                        t.ad_id === id &&
                        t.type === 'AD_IMAGES' &&
                        t.status === 'USED' &&
                        new Date(t.expires_at) >= now
                    );

                    if (isAdAlreadyPremium || (adData.images && adData.images.length > 4)) {
                        setMaxImages(10);
                        setHasImagePlan(true);
                    }
                }
            } catch (err: any) {
                setError({ message: 'Erro ao carregar dados do anúncio' });
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id]);

    const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            const totalCount = existingImages.length + newImages.length;
            const remaining = maxImages - totalCount;

            if (filesArray.length > remaining) {
                alert(`Você só pode adicionar mais ${remaining} imagens (Total: ${maxImages}).`);
            }

            const toAdd = filesArray.slice(0, remaining);
            setNewImages(prev => [...prev, ...toAdd]);
        }
    };

    const removeExistingImage = (imgUrl: string) => {
        setExistingImages(prev => prev.filter(img => img !== imgUrl));
    };

    const removeNewImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value === '') {
            setPrice('');
            return;
        }
        const numericValue = parseInt(value) / 100;
        const formatted = new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numericValue);
        setPrice(formatted);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        const numericPrice = parseFloat(price.replace(/\./g, '').replace(',', '.'));

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price', String(numericPrice));
        formData.append('type', type);
        formData.append('city', city);
        formData.append('category_id', categoryId);
        formData.append('keep_images', JSON.stringify(existingImages));

        newImages.forEach(img => formData.append('images', img));

        try {
            await fetchApi(`/ads/${id}`, {
                method: 'PUT',
                body: formData
            });
            navigate('/dashboard');
        } catch (err: any) {
            setError({
                message: err.message || 'Erro ao atualizar anúncio',
                details: err.data?.details
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mt-4 text-center" style={{ padding: '4rem' }}>
                <Loader2 className="animate-spin" size={48} style={{ margin: '0 auto', color: 'var(--primary)' }} />
                <p className="mt-2 text-light">Carregando dados...</p>
            </div>
        );
    }

    return (
        <div className="create-ad-page container">
            <div className="form-card box-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button onClick={() => navigate(-1)} className="btn btn-icon" title="Voltar">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title" style={{ margin: 0 }}>Editar Anúncio</h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>Atualize os detalhes do seu anúncio.</p>
                    </div>
                </div>

                {hasImagePlan && (
                    <div style={{ backgroundColor: '#ecfdf5', borderLeft: '4px solid #10b981', padding: '1rem', marginBottom: '1.5rem', borderRadius: '4px' }}>
                        <p style={{ color: '#065f46', margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
                            🚀 **Anúncio Premium Ativo:** Você pode usar até 10 fotos e seu anúncio aparece no topo!
                        </p>
                    </div>
                )}

                {!hasImagePlan && (
                    <div style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '1rem', marginBottom: '1.5rem', borderRadius: '4px' }}>
                        <p style={{ color: '#1e40af', margin: 0, fontSize: '0.9rem' }}>
                            💡 Sabia que pode adicionar até 10 fotos? <button onClick={() => navigate('/plans')} style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Confira os planos!</button>
                        </p>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        {error.message}
                        {error.details && <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>Detalhes: {error.details}</div>}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="ad-form">
                    <div className="image-upload-section">
                        <label className="upload-label" style={{ opacity: (existingImages.length + newImages.length) >= maxImages ? 0.5 : 1 }}>
                            <Upload size={32} />
                            <span>Adicionar fotos ({existingImages.length + newImages.length}/{maxImages})</span>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleNewImageChange}
                                disabled={(existingImages.length + newImages.length) >= maxImages}
                                hidden
                            />
                        </label>

                        <div className="image-preview-container">
                            {/* Existing Images */}
                            {existingImages.map((imgUrl, index) => (
                                <div key={`old-${index}`} className="image-preview">
                                    <img src={getOptimizedImageUrl(imgUrl)} alt={`Existing ${index}`} />
                                    <button type="button" className="remove-img-btn" onClick={() => removeExistingImage(imgUrl)}>
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}

                            {/* New Images */}
                            {newImages.map((file, index) => (
                                <div key={`new-${index}`} className="image-preview">
                                    <img src={URL.createObjectURL(file)} alt={`New ${index}`} />
                                    <button type="button" className="remove-img-btn" onClick={() => removeNewImage(index)}>
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group span-2">
                            <label>Título do Anúncio</label>
                            <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} required />
                        </div>

                        <div className="form-group">
                            <label>Categoria</label>
                            <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                                {categories.map((cat: any) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Tipo</label>
                            <select className="input" value={type} onChange={e => setType(e.target.value)} required>
                                <option value="PRODUCT">Produto</option>
                                <option value="SERVICE">Serviço</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Preço (R$)</label>
                            <input
                                type="text"
                                className="input"
                                value={price}
                                onChange={handlePriceChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Cidade</label>
                            <input type="text" className="input" value={city} onChange={e => setCity(e.target.value)} required />
                        </div>

                        <div className="form-group span-2">
                            <label>Descrição</label>
                            <textarea
                                className="input textarea"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={5}
                                required
                            ></textarea>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={saving}
                        >
                            {saving ? 'Salvando Alterações...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
