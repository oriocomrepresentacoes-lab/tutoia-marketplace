import { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Users, Image, Shield, AlertTriangle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import './AdminPanel.css';

export const AdminPanel = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState<any[]>([]);
    const [banners, setBanners] = useState<any[]>([]);
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'ADMIN') {
            navigate('/dashboard');
            return;
        }
        loadData();
    }, [user, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'users') {
                const data = await fetchApi('/admin/users');
                if (data) setUsers(data);
            } else if (activeTab === 'banners') {
                const data = await fetchApi('/admin/banners');
                if (data) setBanners(data);
            } else if (activeTab === 'ads') {
                const data = await fetchApi('/admin/ads');
                if (data) setAds(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserStatus = async (id: string, currentStatus: boolean) => {
        if (!confirm(`Tem certeza que deseja ${currentStatus ? 'DESATIVAR' : 'ATIVAR'} este usuário? Ao desativar, anúncios dele também sumirão.`)) return;

        // Optimistic update
        setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !currentStatus } : u));

        try {
            await fetchApi(`/admin/users/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ active: !currentStatus })
            });
            // loadData(); 
        } catch (error) {
            // Revert on error
            setUsers(prev => prev.map(u => u.id === id ? { ...u, active: currentStatus } : u));
            alert('Erro ao alterar status do usuário');
        }
    };

    const toggleBannerStatus = async (id: string, currentStatus: boolean) => {
        if (!confirm(`Tem certeza que deseja ${currentStatus ? 'REMOVER' : 'REATIVAR'} este banner?`)) return;

        // Optimistic update
        setBanners(prev => prev.map(b => b.id === id ? { ...b, active: !currentStatus } : b));

        try {
            await fetchApi(`/admin/banners/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ active: !currentStatus })
            });
            // loadData();
        } catch (error: any) {
            // Revert on error
            setBanners(prev => prev.map(b => b.id === id ? { ...b, active: currentStatus } : b));
            console.error('Toggle banner error details:', error.message || error);
            alert(`Erro ao alterar status do banner: ${error?.message || 'Erro desconhecido'}`);
        }
    };

    const deleteBannerItem = async (id: string) => {
        if (!confirm('Tem certeza que deseja EXCLUIR DEFINITIVAMENTE este banner?')) return;

        // Optimistic update
        setBanners(prev => prev.filter(b => b.id !== id));

        try {
            await fetchApi(`/admin/banners/${id}`, {
                method: 'DELETE'
            });
            // Ensure synchronization with backend
            loadData();
        } catch (error: any) {
            console.error('Delete banner error details:', error.message || error);
            alert(`Erro ao excluir o banner: ${error?.message || 'Erro desconhecido'}`);
            // Revert optimistic update by reloading data
            loadData();
        }
    };

    const deleteAdItem = async (id: string) => {
        if (!confirm('Tem certeza que deseja EXCLUIR DEFINITIVAMENTE este anúncio? (Banir anúncio falso/golpe)')) return;

        // Optimistic update
        setAds(prev => prev.filter(ad => ad.id !== id));

        try {
            await fetchApi(`/ads/${id}`, {
                method: 'DELETE'
            });
            // Synchronization
            // loadData();
        } catch (error: any) {
            console.error('Delete ad error:', error);
            alert(`Erro ao excluir o anúncio: ${error?.message || 'Erro desconhecido'}`);
            loadData();
        }
    };

    if (loading && users.length === 0 && banners.length === 0 && ads.length === 0) {
        return <div className="container mt-4 loading-spinner">Carregando painel admin...</div>;
    }

    return (
        <div className="admin-page container">
            <div className="admin-header box-card">
                <div className="admin-header-title">
                    <Shield size={32} className="text-primary" />
                    <div>
                        <h1 className="page-title">Painel do Administrador</h1>
                        <p className="page-subtitle">Central de moderação e controle da plataforma.</p>
                    </div>
                </div>
            </div>

            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={20} /> Usuários Moderação
                </button>
                <button
                    className={`admin-tab ${activeTab === 'banners' ? 'active' : ''}`}
                    onClick={() => setActiveTab('banners')}
                >
                    <Image size={20} /> Controle de Banners
                </button>
                <button
                    className={`admin-tab ${activeTab === 'ads' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ads')}
                >
                    <AlertTriangle size={20} /> Moderação de Anúncios
                </button>
            </div>

            <div className="admin-content box-card">
                {activeTab === 'users' && (
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Contato</th>
                                    <th>Anúncios</th>
                                    <th>Status</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="font-medium">{u.name}</div>
                                            <div className="text-sm text-light">{u.email}</div>
                                        </td>
                                        <td>{u.phone || 'N/A'}</td>
                                        <td>{u._count?.ads || 0} ads / {u._count?.banners || 0} ban.</td>
                                        <td>
                                            {u.active ? (
                                                <span className="badge badge-success"><CheckCircle size={14} /> Ativo</span>
                                            ) : (
                                                <span className="badge badge-danger"><XCircle size={14} /> Banido</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className={`btn ${u.active ? 'btn-outline-danger' : 'btn-outline-success'} btn-sm`}
                                                onClick={() => toggleUserStatus(u.id, u.active)}
                                            >
                                                {u.active ? 'Banir Usuário' : 'Reativar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && <tr><td colSpan={5} className="text-center">Nenhum usuário</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'banners' && (
                    <div className="table-responsive">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/ad/new-banner')}
                            >
                                <Image size={18} style={{ marginRight: '8px' }} /> Novo Banner
                            </button>
                        </div>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Arte</th>
                                    <th>Título</th>
                                    <th>Anunciante</th>
                                    <th>Status Atual</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {banners.map(b => (
                                    <tr key={b.id}>
                                        <td>
                                            <div className="admin-banner-preview" style={{ backgroundImage: `url(${b.image.startsWith('http') ? b.image : `http://localhost:5000${b.image}`})` }}></div>
                                        </td>
                                        <td>
                                            <div className="font-medium">{b.title}</div>
                                            <div className="text-sm"><a href={b.link} target="_blank" rel="noreferrer">Ver Link</a></div>
                                        </td>
                                        <td>
                                            {b.user?.name}
                                            <div className="text-sm text-light">{b.user?.email}</div>
                                        </td>
                                        <td>
                                            {b.active ? (
                                                <span className="badge badge-success"><CheckCircle size={14} /> Rodando</span>
                                            ) : (
                                                <span className="badge badge-danger"><AlertTriangle size={14} /> Removido</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <button
                                                    className={`btn ${b.active ? 'btn-outline-danger' : 'btn-outline-success'} btn-sm`}
                                                    onClick={() => toggleBannerStatus(b.id, b.active)}
                                                >
                                                    {b.active ? 'Derrubar' : 'Reativar'}
                                                </button>
                                                <button
                                                    className="btn btn-outline-primary btn-sm"
                                                    onClick={() => navigate(`/ad/edit-banner/${b.id}`)}
                                                    title="Editar/Substituir"
                                                >
                                                    <Shield size={16} /> Substituir
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() => deleteBannerItem(b.id)}
                                                    title="Excluir Permanente"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {banners.length === 0 && <tr><td colSpan={5} className="text-center">Nenhum banner</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'ads' && (
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Capa</th>
                                    <th>Anúncio</th>
                                    <th>Anunciante</th>
                                    <th>Preço</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ads.map(ad => (
                                    <tr key={ad.id}>
                                        <td>
                                            <div className="admin-banner-preview" style={{ backgroundImage: `url(${ad.images[0]?.startsWith('http') ? ad.images[0] : `http://localhost:5000${ad.images[0]}`})`, width: '60px', height: '60px' }}></div>
                                        </td>
                                        <td>
                                            <div className="font-medium">{ad.title}</div>
                                            <div className="text-sm text-light">{ad.category?.name}</div>
                                        </td>
                                        <td>
                                            {ad.user?.name}
                                            <div className="text-sm text-light">{ad.user?.email}</div>
                                        </td>
                                        <td>R$ {ad.price.toLocaleString('pt-BR')}</td>
                                        <td>
                                            <button
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() => deleteAdItem(ad.id)}
                                            >
                                                <Trash2 size={16} /> Remover
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {ads.length === 0 && <tr><td colSpan={5} className="text-center">Nenhum anúncio encontrado</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div >
    );
};
