import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { User, Settings, Camera, Save, X } from 'lucide-react';
import { fetchApi } from '../utils/api';

export const Profile = () => {
    const { user, logout, setAuth } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        password: ''
    });
    const [profilePic, setProfilePic] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setFormData({ name: user.name, phone: user.phone || '', password: '' });
            setPreviewUrl(user.profile_picture || '');
        }
    }, [user]);

    if (!user) return <div className="container mt-4">Faça login para ver seu perfil.</div>;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfilePic(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('phone', formData.phone);
            if (formData.password) data.append('password', formData.password);
            if (profilePic) data.append('profile_picture', profilePic);

            const result = await fetchApi('/users/me', {
                method: 'PUT',
                body: data
            });

            if (result && result.user) {
                // Keep the token, just update the user data
                const token = localStorage.getItem('token');
                setAuth(token || '', result.user);
                setIsEditing(false);
                alert('Perfil atualizado com sucesso!');
            }
        } catch (error: any) {
            alert(error.message || 'Erro ao atualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div className="box-card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', transition: 'all 0.3s' }}>

                <div style={{ position: 'relative', margin: '0 auto 1.5rem', width: 120, height: 120 }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid #e2e8f0' }}>
                        {previewUrl ? (
                            <img src={previewUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <User size={64} color="var(--text-light)" />
                        )}
                    </div>

                    {isEditing && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                        >
                            <Camera size={18} />
                        </button>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                </div>

                {!isEditing ? (
                    <>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>{user.name}</h1>
                        <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>{user.email}</p>
                        {user.phone && <p style={{ color: '#64748b', marginBottom: '2rem' }}>📱 {user.phone}</p>}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                                <Settings size={20} style={{ marginRight: '0.5rem' }} /> Editar Perfil
                            </button>
                            <button onClick={logout} className="btn" style={{ background: '#ef4444', color: 'white' }}>
                                Sair da Conta
                            </button>
                        </div>
                    </>
                ) : (
                    <form onSubmit={handleSave} style={{ textAlign: 'left', animation: 'fadeIn 0.3s ease' }}>
                        <div className="form-group">
                            <label>Nome Completo</label>
                            <input type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        </div>

                        <div className="form-group">
                            <label>E-mail (Não editável)</label>
                            <input type="email" className="input" value={user.email} disabled style={{ background: '#f1f5f9', cursor: 'not-allowed' }} />
                        </div>

                        <div className="form-group">
                            <label>Telefone / WhatsApp</label>
                            <input type="tel" className="input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label>Nova Senha (deixe em branco para manter a atual)</label>
                            <input type="password" className="input" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={loading}>
                                <Save size={20} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => { setIsEditing(false); setProfilePic(null); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={loading}>
                                <X size={20} /> Cancelar
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
