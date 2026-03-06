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

    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
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
    const [cardNumber, setCardNumber] = useState(''); // mock
    const [cardExpiry, setCardExpiry] = useState(''); // mock
    const [cardCvv, setCardCvv] = useState(''); // mock
    const [installments, setInstallments] = useState(1);

    // Formatters
    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 11) val = val.substring(0, 11);
        val = val.replace(/(\d{3})(\d)/, '$1.$2');
        val = val.replace(/(\d{3})(\d)/, '$1.$2');
        val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        setCpf(val);
    };

    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 16) val = val.substring(0, 16);
        val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
        setCardNumber(val);
    };

    const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 4) val = val.substring(0, 4);
        val = val.replace(/(\d{2})(\d{1,2})/, '$1/$2');
        setCardExpiry(val);
    };

    const handleCardCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 4) val = val.substring(0, 4);
        setCardCvv(val);
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
    const planPrice = 1.00; // Preço de teste. Original: planId === 'BANNER' ? 50.0 : 25.0;

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload: any = {
            type: planId,
            payment_method_id: paymentMethod,
        };

        if (paymentMethod === 'pix') {
            if (!firstName || !lastName || !cpf) {
                alert('Preencha os dados do PIX');
                setLoading(false);
                return;
            }
            payload.payer_first_name = firstName;
            payload.payer_last_name = lastName;
            payload.payer_cpf = cpf.replace(/\D/g, ''); // API exigence: numeric only
        } else {
            // Credit card REAL tokenization
            try {
                if (!(window as any).MercadoPago) {
                    alert('Erro ao carregar o SDK do Mercado Pago. Recarregue a página.');
                    setLoading(false);
                    return;
                }

                const mp = new (window as any).MercadoPago('APP_USR-21862437-3c94-4795-99e1-aa23c7aebc84');

                const [expiryMonth, expiryYear] = cardExpiry.split('/');
                const fullExpiryYear = `20${expiryYear}`;

                const cardData = {
                    cardNumber: cardNumber.replace(/\s/g, ''),
                    cardholderName: `${firstName} ${lastName}`,
                    cardExpirationMonth: expiryMonth,
                    cardExpirationYear: fullExpiryYear,
                    securityCode: cardCvv,
                    identificationType: 'CPF',
                    identificationNumber: cpf.replace(/\D/g, ''),
                };

                const cardToken = await mp.createCardToken(cardData);

                if (!cardToken || !cardToken.id) {
                    throw new Error('Não foi possível gerar o token do cartão. Verifique os dados.');
                }

                payload.token = cardToken.id;
                payload.payment_method_id = 'master'; // brand - could be dynamic but fixed for test
                payload.installments = installments;
            } catch (err: any) {
                console.error('Tokenization Error:', err);
                alert('Erro na validação do cartão: ' + err.message);
                setLoading(false);
                return;
            }
        }

        try {
            const data = await fetchApi('/payments/checkout', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (data) {
                if (paymentMethod === 'pix' && data.qr_code_base64) {
                    setPixData(data);
                } else if (data.status === 'approved' || data.status === 'in_process') {
                    alert(data.status === 'approved' ? 'Pagamento aprovado com sucesso!' : 'Pagamento em processamento. Verifique em instantes.');
                    navigate('/dashboard');
                } else {
                    alert('Pagamento pendente ou recusado. Verifique o status depois.');
                    navigate('/dashboard');
                }
            }
        } catch (error: any) {
            console.error('Checkout Error:', error);
            console.error('Error Details:', error.data);
            const detailMsg = error.data?.details?.message || error.data?.details?.cause?.[0]?.description || '';
            alert('Erro ao processar pagamento: ' + error.message + (detailMsg ? ` (${detailMsg})` : ''));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (paymentConfirmed) {
            const timer = setTimeout(() => {
                navigate(planId === 'BANNER' ? '/admin' : '/dashboard');
            }, 6000);
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
                <button className="btn-checkout" onClick={() => navigate('/dashboard')}>Confirmar e Ir para o Dashboard</button>
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
                </div>

                <div className="box-card payment-methods">
                    <h2>Método de Pagamento</h2>
                    <form onSubmit={handleCheckout}>
                        <div className="payment-options">
                            <label className={`payment-option ${paymentMethod === 'pix' ? 'selected' : ''}`}>
                                <input type="radio" name="payment" value="pix" checked={paymentMethod === 'pix'} onChange={() => setPaymentMethod('pix')} />
                                PIX
                            </label>
                            <label className={`payment-option ${paymentMethod === 'credit_card' ? 'selected' : ''}`}>
                                <input type="radio" name="payment" value="credit_card" checked={paymentMethod === 'credit_card'} onChange={() => setPaymentMethod('credit_card')} />
                                Cartão de Crédito
                            </label>
                        </div>

                        {paymentMethod === 'pix' && (
                            <div className="pix-form">
                                <div className="form-group">
                                    <label>Nome</label>
                                    <input type="text" className="input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Sobrenome</label>
                                    <input type="text" className="input" value={lastName} onChange={e => setLastName(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>CPF</label>
                                    <input type="text" className="input" value={cpf} onChange={handleCpfChange} placeholder="000.000.000-00" required />
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'credit_card' && (
                            <div className="card-form">
                                <p className="text-light" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    (Modo Simulação: Token de cartão gerado automaticamente para testes local)
                                </p>
                                <div className="form-group">
                                    <label>Número do Cartão (Simulado)</label>
                                    <input type="text" className="input" value={cardNumber} onChange={handleCardNumberChange} placeholder="0000 0000 0000 0000" />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Validade</label>
                                        <input type="text" className="input" value={cardExpiry} onChange={handleCardExpiryChange} placeholder="MM/AA" />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>CVV</label>
                                        <input type="text" className="input" value={cardCvv} onChange={handleCardCvvChange} placeholder="123" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Parcelas</label>
                                    <select className="input" value={installments} onChange={e => setInstallments(Number(e.target.value))}>
                                        <option value={1}>1x de R$ {planPrice.toFixed(2)}</option>
                                        <option value={2}>2x de R$ {(planPrice / 2).toFixed(2)}</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <button type="submit" className="btn-checkout" disabled={loading}>
                            {loading ? 'Processando Pagamento...' : 'Pagar e Assinar o Plano'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
