import { ShoppingBag } from 'lucide-react';
import './LoadingState.css';

export const LoadingState = () => {
    return (
        <div className="loading-container">
            <div className="loading-content">
                <div className="bag-loader">
                    <ShoppingBag size={64} className="loading-icon" />
                    <div className="loading-shadow"></div>
                </div>
                <h3 className="loading-text">Carregando as melhores ofertas...</h3>
            </div>
        </div>
    );
};
