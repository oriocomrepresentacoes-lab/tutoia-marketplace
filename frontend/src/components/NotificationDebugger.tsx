import { useState } from 'react';
import { ShieldCheck, Send, RefreshCw, Terminal } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { messaging, VAPID_KEY } from '../utils/firebase';
import { fetchApi } from '../utils/api';

export const NotificationDebugger = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [permission, setPermission] = useState(Notification.permission);

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
    };

    const runCheck = async () => {
        setLoading(true);
        addLog('Iniciando verificação...');
        
        try {
            if (!('serviceWorker' in navigator)) {
                throw new Error('Service Worker não suportado neste navegador.');
            }

            const perm = await Notification.requestPermission();
            setPermission(perm);
            addLog(`Permissão: ${perm}`);

            if (perm !== 'granted') {
                throw new Error('Permissão de notificação negada.');
            }

            addLog('Aguardando Service Worker...');
            const registration = await navigator.serviceWorker.ready;
            addLog(`SW Ativo: ${registration.active ? 'Sim' : 'Não'}`);

            addLog('Solicitando token FCM...');
            const currentToken = await getToken(messaging, {
                serviceWorkerRegistration: registration,
                vapidKey: VAPID_KEY
            });

            if (currentToken) {
                setToken(currentToken);
                addLog('Token obtido com sucesso!');
                
                addLog('Sincronizando com o servidor...');
                await fetchApi('/push/subscribe', {
                    method: 'POST',
                    body: JSON.stringify({ token: currentToken })
                });
                addLog('Servidor sincronizado ✅');
            } else {
                addLog('Nenhum token retornado pelo Firebase.');
            }
        } catch (error: any) {
            addLog(`ERRO: ${error.message}`);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const sendTest = async () => {
        if (!token) {
            addLog('Obtenha o token primeiro!');
            return;
        }
        setLoading(true);
        addLog('Solicitando notificação de teste...');
        try {
            const res = await fetchApi('/push/test-notification', { method: 'POST' });
            addLog(`Resposta: ${JSON.stringify(res)}`);
            addLog('Verifique se o balão apareceu agora!');
        } catch (error: any) {
            addLog(`ERRO no teste: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="box-card mb-4" style={{ background: '#0f172a', color: '#f8fafc', border: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={20} /> Central de Diagnóstico Push
                </h3>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>v2.2.0</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>Permissão</div>
                    <div style={{ fontWeight: 'bold', color: permission === 'granted' ? '#4ade80' : '#f87171' }}>
                        {permission.toUpperCase()}
                    </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>Status Token</div>
                    <div style={{ fontWeight: 'bold', color: token ? '#4ade80' : '#fbbf24' }}>
                        {token ? 'GERADO' : 'AUSENTE'}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button 
                    onClick={runCheck} 
                    disabled={loading}
                    className="btn btn-sm"
                    style={{ background: '#38bdf8', color: '#0f172a', border: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> {token ? 'Recarregar' : 'Configurar Agora'}
                </button>
                <button 
                    onClick={sendTest} 
                    disabled={loading || !token}
                    className="btn btn-sm btn-outline-light"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <Send size={16} /> Testar Push
                </button>
            </div>

            <div style={{ background: 'black', padding: '1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                    <Terminal size={14} /> LOGS DE DEPURAÇÃO
                </div>
                {logs.length === 0 ? (
                    <div style={{ fontStyle: 'italic', opacity: 0.4, fontSize: '0.85rem' }}>Nenhum evento registrado.</div>
                ) : (
                    <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.4' }}>
                        {logs.map((log, i) => (
                            <div key={i} style={{ color: log.includes('ERRO') ? '#fb7185' : '#cbd5e1' }}>{log}</div>
                        ))}
                    </div>
                )}
            </div>

            {token && (
                <div style={{ marginTop: '1rem', fontSize: '0.7rem', opacity: 0.5, wordBreak: 'break-all' }}>
                    TOKEN: {token}
                </div>
            )}
        </div>
    );
};
