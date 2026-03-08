import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchApi } from '../utils/api';
import { io as socketIO } from 'socket.io-client';
import './Checkout.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const Checkout = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const planId = searchParams.get('plan');

    const [loading, setLoading] = useState(false);
    const [pixData, setPixData] = useState<any>(null);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);

    // Socket.io for real-time confirmation
    useEffect(() => {
        if (!user) return;

        const socket = socketIO(API_URL);

        socket.on('connect', () => {
            socket.emit('join', user.id);
        });

        socket.on('payment_approved', (data) => {
            console.log('Real-time payment approved:', data);
            setPaymentConfirmed(true);
            setPixData(null); // Close QR code if open
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [cpf, setCpf] = useState('');

    // Formatters
    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 11) val = val.substring(0, 11);
        val = val.replace(/(\d{3})(\d)/, '$1.$2');
        val = val.replace(/(\d{3})(\d)/, '$1.$2');
        val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        setCpf(val);
    };

    if (!user) {
        return (
            <div className="container mt-4 text-center">
                <h3>Você precisa estar logado para assinar um plano.</h3>
                <Link to="/login" className="btn btn-primary mt-2">Fazer Login</Link>
            </div>
        );
    }

    if (!planId || (planId !== 'BANNER' && planId !== 'AD_IMAGES')) {
        return <div className="container mt-4 text-center">Plano inválido. <button onClick={() => navigate('/plans')} className="btn btn-secondary">Voltar</button></div>;
    }

    const planName = planId === 'BANNER' ? 'Destaque com Banner' : 'Mais Imagens';
    const planPrice = 1.00; // Original: planId === 'BANNER' ? 50.00 : 25.00;

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!firstName || !lastName || !cpf) {
            alert('Preencha os dados (Nome, Sobrenome e CPF)');
            setLoading(false);
            return;
        }

        const payload: any = {
            type: planId,
            payment_method_id: 'pix',
            payer_first_name: firstName,
            payer_last_name: lastName,
            payer_cpf: cpf.replace(/\D/g, '') // API exigence: numeric only
        };

        try {
            const data = await fetchApi('/payments/checkout', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (data && data.qr_code_base64) {
                setPixData(data);
            } else {
                alert('Erro ao gerar código PIX. Tente novamente.');
            }
        } catch (error: any) {
            console.error('Checkout Error:', error);
            const detailMsg = error.data?.details?.message || error.data?.details?.cause?.[0]?.description || '';
            alert('Erro ao processar PIX: ' + error.message + (detailMsg ? ` (${detailMsg})` : ''));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (paymentConfirmed) {
            const timer = setTimeout(() => {
                navigate(planId === 'BANNER' ? '/admin' : '/dashboard');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [paymentConfirmed, navigate, planId]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(pixData.qr_code);
        alert('Código PIX copiado com sucesso!');
    };

    if (paymentConfirmed) {
        return (
            <div className="container mt-4 text-center pix-success-screen" style={{ padding: '4rem 2rem' }}>
                <div style={{ background: 'var(--success)', color: 'white', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', fontSize: '2rem' }}>
                    ✓
                </div>
                <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>Pagamento Confirmado!</h2>
                <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
                    O seu plano **{planName}** já está ativo e pronto para uso.
                </p>
                <div className="box-card" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left', padding: '1.5rem' }}>
                    <p><strong>Recurso Liberado:</strong> {planId === 'BANNER' ? 'Criação de Banner' : '10 Fotos em Anúncio'}</p>
                    <p><strong>Validade:</strong> 20 dias</p>
                </div>
                <div className="mt-4">
                    <p className="text-light">Redirecionando em instantes...</p>
                    <br />
                    <button className="btn btn-primary" onClick={() => navigate(planId === 'BANNER' ? '/admin' : '/dashboard')}>
                        Ir para o Painel Agora
                    </button>
                </div>
            </div>
        );
    }

    if (pixData) {
        const qrImgSrc = pixData.qr_code_base64
            ? `data:image/png;base64,${pixData.qr_code_base64}`
            : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixData.qr_code)}`;

        return (
            <div className="container pix-success-screen">
                <h2>Escaneie o QR Code</h2>
                <p className="text-light">Abra o aplicativo do seu banco e escaneie o código abaixo para pagar via PIX.</p>
                <div className="qr-code-box">
                    <img src={qrImgSrc} alt="QR Code PIX" width="220" height="220" />
                </div>
                <div style={{ marginBottom: '2rem' }}>
                    <strong>Código PIX (Copia e Cola):</strong>
                    <div className="pix-copy-paste mt-2">
                        {pixData.qr_code}
                    </div>
                    <button className="btn btn-secondary mt-2" onClick={copyToClipboard}>
                        Copiar Código
                    </button>
                </div>
                <p className="text-light" style={{ marginTop: '1rem', color: '#10b981', fontWeight: 'bold' }}>
                    ⏳ Aguardando confirmação... Esta página atualizará automaticamente assim que o pagamento for recebido.
                </p>
            </div>
        );
    }

    return (
        <div className="container mt-4 checkout-page">
            <div className="checkout-grid">
                <div className="box-card order-summary">
                    <h2>Resumo do Pedido</h2>
                    <hr />
                    <div className="summary-item">
                        <span>Plano:</span>
                        <strong>{planName} (20 dias)</strong>
                    </div>
                    <div className="summary-item total">
                        <span>Total a pagar:</span>
                        <strong>R$ {planPrice.toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <span style={{
                                background: '#8b5cf6', // Purple for testing
                                color: 'white',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
                            }}>
                                VERSÃO V2.0.1 - TEST BRL 1.00
                            </span>

                        </div>
                    </div>
                </div>

                <div className="box-card payment-methods">
                    <h2>Dados do Pagador (Obrigatório)</h2>
                    <form onSubmit={handleCheckout}>
                        <div className="payer-info-shared" style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Nome</label>
                                    <input type="text" className="input" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Seu nome" />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Sobrenome</label>
                                    <input type="text" className="input" value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Seu sobrenome" />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                <label>CPF</label>
                                <input type="text" className="input" value={cpf} onChange={handleCpfChange} placeholder="000.000.000-00" required />
                            </div>
                        </div>

                        <h2>Método de Pagamento</h2>
                        <div className="payment-options">
                            <label className="payment-option selected" style={{ borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
                                <input type="radio" name="payment" value="pix" checked readOnly />
                                PIX (Aprovação Imediata)
                            </label>
                        </div>

                        <button type="submit" className="btn-checkout" disabled={loading}>
                            {loading ? 'Gerando PIX...' : 'Gerar Código PIX'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
