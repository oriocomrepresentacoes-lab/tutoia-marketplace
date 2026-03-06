import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import './Plans.css';

interface PlanCardProps {
    title: string;
    price: string;
    features: string[];
    onClick: () => void;
    primary?: boolean;
}

const PlanCard = ({ title, price, features, onClick, primary = true }: PlanCardProps) => (
    <div className="box-card plan-card" style={{ width: '350px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{title}</h2>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '1rem 0' }}>R$ {price}</div>
            <p className="text-light">Válido por 20 dias</p>
        </div>
        <div style={{ padding: '1.5rem', flex: 1 }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {features.map((feature, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={20} color="var(--success)" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
        </div>
        <div style={{ padding: '1.5rem', paddingTop: 0 }}>
            <button className={`btn ${primary ? 'btn-primary' : 'btn-secondary'} btn-block`} onClick={onClick}>
                Assinar Agora
            </button>
        </div>
    </div>
);

export const Plans = () => {
    const navigate = useNavigate();

    return (
        <div className="container mt-4">
            <div className="text-center mb-5">
                <h1>Escolha seu Plano de Adesão</h1>
                <p className="text-light">Aumente sua visibilidade ou turbine seus anúncios com recursos premium.</p>
            </div>

            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
                <PlanCard
                    title="Destaque com Banner"
                    price="1,00"
                    features={[
                        "Banner rotativo na home",
                        "Destaque no topo da lista",
                        "Link direto para seu anúncio",
                        "Válido por 20 dias"
                    ]}
                    onClick={() => navigate('/checkout?plan=BANNER')}
                    primary={true}
                />
                <PlanCard
                    title="Mais Imagens"
                    price="1,00"
                    features={[
                        "Até 10 fotos por anúncio",
                        "Selo de anúncio verificado",
                        "Melhor visibilidade na busca",
                        "Válido por 20 dias"
                    ]}
                    onClick={() => navigate('/checkout?plan=AD_IMAGES')}
                    primary={false}
                />
            </div>
        </div>
    );
};
