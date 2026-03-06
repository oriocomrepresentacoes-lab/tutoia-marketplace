import { Link } from 'react-router-dom';
import './Footer.css';

export const Footer = () => {
    return (
        <footer className="footer">
            <div className="container footer-content">
                <div className="footer-brand">
                    <h2>TutShop</h2>
                    <p>Seu marketplace local confiável para comprar e vender tudo.</p>
                </div>
                <div className="footer-links">
                    <h3>Links Úteis</h3>
                    <ul>
                        <li><Link to="/explore">Explorar</Link></li>
                        <li><Link to="/termos">Termos de Uso</Link></li>
                        <li><Link to="/privacidade">Política de Privacidade</Link></li>
                        <li><Link to="/contato">Contato</Link></li>
                    </ul>
                </div>
                <div className="footer-monetization">
                    <h3>Anuncie Conosco</h3>
                    <p>Destaque sua marca para milhares de usuários ativos todos os dias.</p>
                    <Link to="/plans" className="btn btn-primary btn-sm mt-2">Ver Planos</Link>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} TutShop Marketplace. Todos os direitos reservados.</p>
            </div>
        </footer>
    );
};
