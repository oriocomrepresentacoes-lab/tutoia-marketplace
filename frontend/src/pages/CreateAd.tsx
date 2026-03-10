import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X } from 'lucide-react';
import { fetchApi } from '../utils/api';
import './CreateAd.css';

export const CreateAd = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [type, setType] = useState('PRODUCT');
    const [city, setCity] = useState('Tutoia');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState([]);
    const [images, setImages] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<{ message: string; details?: string } | null>(null);
    const [maxImages, setMaxImages] = useState(4);
    const [hasImagePlan, setHasImagePlan] = useState(false);

    useEffect(() => {
        // Load categories and user plans
        Promise.all([
            fetchApi('/categories'),
            fetchApi('/user-plans/my-plans').catch(() => null)
        ]).then(([catsData, plansData]) => {
            if (catsData) {
                setCategories(catsData);
                if (catsData.length > 0) setCategoryId(catsData[0].id);
            }
            if (plansData && plansData.transactions) {
                const hasPlan = plansData.transactions.some((t: any) => t.type === 'AD_IMAGES');
                if (hasPlan) {
                    setMaxImages(10);
                    setHasImagePlan(true);
                }
            }
        });
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setImages(prev => {
                const total = [...prev, ...filesArray];
                if (total.length > maxImages) {
                    alert(`Você pode enviar no máximo ${maxImages} imagens.`);
                }
                return total.slice(0, maxImages);
            });
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
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
        setLoading(true);

        // Convert "20.000,00" to 20000.00
        const numericPrice = parseFloat(price.replace(/\./g, '').replace(',', '.'));

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price', String(numericPrice));
        formData.append('type', type);
        formData.append('city', city);
        formData.append('category_id', categoryId);

        images.forEach(img => formData.append('images', img));

        try {
            await fetchApi('/ads', {
                method: 'POST',
                body: formData // No custom headers, fetchApi handles FormData correctly by NOT setting Content-Type
            });
            navigate('/dashboard');
        } catch (err: any) {
            setError({
                message: err.message || 'Erro ao criar anúncio',
                details: err.data?.details
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-ad-page container">
            <div className="form-card box-card">
                <h1 className="page-title">Criar Novo Anúncio</h1>
                <p className="page-subtitle">Preencha os detalhes para anunciar seu produto ou serviço.</p>

                {hasImagePlan && (
                    <div style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: '1rem', marginBottom: '1.5rem', borderRadius: '4px' }}>
                        <p style={{ color: '#92400e', margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
                            <strong>Atenção:</strong> Revise bem seus dados e fotos antes de publicar. Por segurança e para manter a integridade das regras de planos, <strong>não é possível editar anúncios</strong> após a publicação.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        {error.message}
                        {/* Exibir detalhes técnicos caso existam para ajudar no diagnóstico */}
                        {error.details && (
                            <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>
                                Detalhes: {error.details}
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="ad-form">
                    <div className="image-upload-section">
                        <label className="image-upload-label">
                            <Upload size={32} />
                            <span>Adicione fotos (Máx {maxImages})</span>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                disabled={images.length >= maxImages}
                                hidden
                            />
                        </label>

                        {images.length > 0 && (
                            <div className="image-preview-grid">
                                {images.map((file, index) => (
                                    <div key={index} className="preview-item">
                                        <img src={URL.createObjectURL(file)} alt={`Preview ${index}`} />
                                        <button type="button" className="remove-btn" onClick={() => removeImage(index)}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
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
                                placeholder="0,00"
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
                            disabled={loading}
                        >
                            {loading ? 'Publicando...' : 'Publicar Anúncio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
