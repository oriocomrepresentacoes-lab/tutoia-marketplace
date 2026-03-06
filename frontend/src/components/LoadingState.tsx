import './LoadingState.css';

export const LoadingState = () => {
    return (
        <div className="loading-container">
            <div className="loading-content">
                <div className="cube-loader">
                    <div className="cube-top"></div>
                    <div className="cube-bottom"></div>
                    <div className="cube-left"></div>
                    <div className="cube-right"></div>
                    <div className="cube-front"></div>
                    <div className="cube-back"></div>
                </div>
                <h3 className="loading-text">Carregando as melhores ofertas...</h3>
            </div>
        </div>
    );
};
