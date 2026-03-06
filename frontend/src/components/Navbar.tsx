import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, User as UserIcon, LogIn, PlusCircle, Menu, X } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import './Navbar.css';

export const Navbar = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        setIsMobileMenuOpen(false);
        logout();
        navigate('/');
    };

    const closeMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <nav className="navbar">
            <div className="container nav-content">
                <Link to="/" className="nav-logo" onClick={closeMenu}>
                    <img src="/logo.png" alt="TutShop Logo" className="logo-img" />
                </Link>

                <button
                    className="mobile-menu-btn"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                    <Link to="/explore" className="nav-link" onClick={closeMenu}>Explorar</Link>

                    {user ? (
                        <>
                            <Link to="/create-ad" className="btn btn-primary nav-btn" onClick={closeMenu}>
                                <PlusCircle size={18} style={{ marginRight: '6px' }} />
                                Anunciar
                            </Link>
                            <div className="nav-dropdown">
                                <button className="nav-user-btn">
                                    {user.profile_picture ? (
                                        <img src={getOptimizedImageUrl(user.profile_picture, 100)} alt="Avatar" className="nav-avatar" />
                                    ) : (
                                        <UserIcon size={20} />
                                    )}
                                    <span>{user.name.split(' ')[0]}</span>
                                </button>
                                <div className="dropdown-menu">
                                    <Link to="/dashboard" className="dropdown-item" onClick={closeMenu}>Meus Anúncios</Link>
                                    <Link to="/profile" className="dropdown-item" onClick={closeMenu}>Perfil</Link>
                                    <Link to="/messages" className="dropdown-item" onClick={closeMenu}>Mensagens</Link>
                                    <Link to="/ad/new-banner" className="dropdown-item" onClick={closeMenu}>Destaque com Banner</Link>
                                    {user.role === 'ADMIN' && (
                                        <Link to="/admin" className="dropdown-item" onClick={closeMenu}>Painel Admin</Link>
                                    )}
                                    <button onClick={handleLogout} className="dropdown-item text-error">
                                        <LogOut size={16} style={{ marginRight: '6px' }} /> Sair
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-secondary nav-btn" onClick={closeMenu}>
                                <LogIn size={18} style={{ marginRight: '6px' }} />
                                Entrar
                            </Link>
                            <Link to="/register" className="btn btn-primary nav-btn" onClick={closeMenu}>Criar Conta</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};
