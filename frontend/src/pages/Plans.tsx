import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export const Plans = () => {
    const navigate = useNavigate();

    const handleSelectPlan = (planId: string) => {
        navigate(`/checkout?plan=${planId}`);
    };

    return (
        <div className="container mt-4">
            <div className="text-center mb-5">
                <h1>Escolha seu Plano de Adesão</h1>
                <p className="text-light">Aumente sua visibilidade ou turbine seus anúncios com recursos premium.</p>
            </div>

            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {/* Banner Plan */}
                <div className="box-card" style={{ width: '350px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ textAlign: 'center', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>Destaque com Banner</h2>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '1rem 0' }}>R$ 0,10</div>
                        <p className="text-light">Válido por 20 dias</p>
                    </div>
                    <div style={{ padding: '1.5rem', flex: 1 }}>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={20} color="var(--success)" />
                                <span>Banner na Página Principal</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={20} color="var(--success)" />
                                <span>Alta Visibilidade</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={20} color="var(--success)" />
                                <span>Alcance milhares de clientes</span>
                            </li>
                        </ul>
                    </div>
                    <div style={{ padding: '1.5rem', paddingTop: 0 }}>
                        <button className="btn btn-primary btn-block" onClick={() => handleSelectPlan('BANNER')}>
                            Assinar Agora
                        </button>
                    </div>
                </div>

                {/* Images Plan */}
                <div className="box-card" style={{ width: '350px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ textAlign: 'center', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>Mais Imagens</h2>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '1rem 0' }}>R$ 1,00</div>
                        <p className="text-light">Válido até a desativação do anúncio</p>
                    </div>
                    <div style={{ padding: '1.5rem', flex: 1 }}>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={20} color="var(--success)" />
                                <span>Até 10 fotos por anúncio</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={20} color="var(--success)" />
                                <span>Mostre mais detalhes</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle size={20} color="var(--success)" />
                                <span>Maior chance de venda</span>
                            </li>
                        </ul>
                    </div>
                    <div style={{ padding: '1.5rem', paddingTop: 0 }}>
                        <button className="btn btn-primary btn-block" onClick={() => handleSelectPlan('AD_IMAGES')}>
                            Assinar Agora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
