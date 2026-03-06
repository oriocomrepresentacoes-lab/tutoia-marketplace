import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchApi } from '../utils/api';
import './Auth.css';

export const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        city: 'Tutoia'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await fetchApi('/auth/register', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Erro ao realizar cadastro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page container">
            <div className="auth-card box-card">
                <h1 className="auth-title">Crie sua conta</h1>
                <p className="auth-subtitle">Junte-se à nossa comunidade para comprar e vender</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Nome completo</label>
                        <input
                            type="text" name="name" className="input"
                            value={formData.name} onChange={handleChange} required
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email" name="email" className="input"
                            value={formData.email} onChange={handleChange} required
                        />
                    </div>
                    <div className="form-group">
                        <label>Telefone / WhatsApp</label>
                        <input
                            type="tel" name="phone" className="input"
                            value={formData.phone} onChange={handleChange} required
                        />
                    </div>
                    <div className="form-group">
                        <label>Cidade</label>
                        <select name="city" className="input" value={formData.city} onChange={handleChange} required>
                            <option value="Tutoia">Tutóia</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Senha</label>
                        <input
                            type="password" name="password" className="input"
                            value={formData.password} onChange={handleChange} required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
                        {loading ? 'Cadastrando...' : 'Cadastrar'}
                    </button>
                </form>

                <p className="auth-link">
                    Já tem uma conta? <Link to="/login">Faça Login</Link>
                </p>
            </div>
        </div>
    );
};
