// Deployment Trigger - Edit Ad Fix
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import {
  Home, Explore, AdDetail, CreateAd, Login, Register,
  Profile, Dashboard, AdminPanel, Messages,
  Plans, Checkout, PlansTest, ForgotPassword,
  Terms, Privacy, Contact, EditAd
} from './pages';
import { BannerForm } from './pages/BannerForm';
import { InstallPrompt } from './components/InstallPrompt';

import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { setupNotifications, requestNotificationPermission } from './utils/pushManager';
import { PushPrompt } from './components/PushPrompt';

import { getSocket } from './utils/socket';

// Nagging Manager for Prompts
const PromptManager = ({ user }: { user: any }) => {
  const location = useLocation();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // 1. Installation Listener
    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    // Check if they are already stashed
    if ((window as any).deferredPrompt) {
      setShowInstallPrompt(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    // 2. Persistent Logic (Navigation trigger)
    
    // Push nagging: Only for logged in users, always if permission is default
    if (user && Notification.permission === 'default') {
      setShowPushPrompt(true);
    } else {
      setShowPushPrompt(false);
    }

    // Install nagging: Always if browser allows
    if ((window as any).deferredPrompt) {
      setShowInstallPrompt(true);
    }
  }, [location.pathname, user]);

  const handlePushAccept = async () => {
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      await setupNotifications();
    }
    setShowPushPrompt(false);
  };

  return (
    <>
      {showPushPrompt && (
        <PushPrompt 
          onAccept={handlePushAccept}
          onClose={() => setShowPushPrompt(false)}
          isMandatory={!!user}
        />
      )}
      
      {showInstallPrompt && <InstallPrompt onClose={() => setShowInstallPrompt(false)} />}
    </>
  );
};

function App() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      const socket = getSocket(token || '');

      if (socket) {
        const onConnect = () => {
          console.log('[App] Socket connected, joining room:', user.id);
          socket.emit('join', user.id);
        };

        if (socket.connected) {
          onConnect();
        } else {
          socket.on('connect', onConnect);
        }

        socket.on('new_ad', (ad: any) => {
          console.log('[App] New ad broadcast:', ad);
          const currentUser = useAuthStore.getState().user;
          // Filter if I created it
          if (!currentUser || ad.user_id === currentUser.id) return;

          if (Notification.permission === 'granted' && navigator.serviceWorker) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification('🎉 Novo Anúncio!', {
                body: `${ad.title} acaba de ser postado. Confira agora!`,
                icon: '/app-icon-v3.png',
                badge: '/app-icon-v3.png',
                tag: `ad_${ad.id}`,
                data: { url: `/ad/${ad.id}` },
                renotify: true
              } as any);
            });
          }
        });

        socket.on('new_banner', (banner: any) => {
          console.log('[App] New banner broadcast:', banner);
          const currentUser = useAuthStore.getState().user;
          // Filter if I created it
          if (!currentUser || banner.user_id === currentUser.id) return;

          if (Notification.permission === 'granted' && navigator.serviceWorker) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification('📢 Novo Destaque!', {
                body: `${banner.title} entrou em destaque agora. Veja!`,
                icon: '/app-icon-v3.png',
                badge: '/app-icon-v3.png',
                tag: `banner_${banner.id}`,
                data: { url: banner.link || '/' },
                renotify: true
              } as any);
            });
          }
        });

        const onNewMessage = (msg: any) => {
          console.log('[App] Global new_message signal:', msg?.content || 'Signal');
          
          const currentUser = useAuthStore.getState().user;
          
          // 1. SECURITY: Only show if I am the receiver and NOT the sender
          if (!currentUser || msg.sender_id === currentUser.id || msg.receiver_id !== currentUser.id) {
            return;
          }

          // 2. CONTEXT: Show visual notification if not in the messages screen
          if (window.location.pathname !== '/messages') {
            if (Notification.permission === 'granted' && navigator.serviceWorker) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(`💬 Mensagem de ${msg.sender_name || 'Alguém'}`, {
                  body: msg.content,
                  icon: '/app-icon-v3.png',
                  badge: '/app-icon-v3.png',
                  tag: `chat_${msg.ad_id}_${msg.sender_id}`, // Tag deduplicates across tabs
                  data: { url: `/messages?adId=${msg.ad_id}&otherId=${msg.sender_id}` },
                  renotify: true // Ensures it pops again if a second message comes
                } as any);
              });
            }
          }
        };

        socket.on('new_message', onNewMessage);

        return () => {
          socket.off('connect', onConnect);
          socket.off('new_message', onNewMessage);
        };
      }

      console.log('[App] User detected, initializing notifications...');
      // Small delay to ensure service worker is ready
      setTimeout(() => {
        setupNotifications();
      }, 5000); // 5s delay to be safe
    }
  }, [user]);

  return (
    <BrowserRouter>
      <div className="app-container">
        <PromptManager user={user} />
        
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/ad/:id" element={<AdDetail />} />
            <Route path="/anuncio/:id" element={<AdDetail />} />
            <Route path="/ad/edit/:id" element={<EditAd />} />
            <Route path="/create-ad" element={<CreateAd />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/plans-test" element={<PlansTest />} />
            <Route path="/ad/new" element={<CreateAd />} />
            <Route path="/ad/new-banner" element={<BannerForm />} />
            <Route path="/ad/edit-banner/:id" element={<BannerForm />} />
            <Route path="/termos" element={<Terms />} />
            <Route path="/privacidade" element={<Privacy />} />
            <Route path="/contato" element={<Contact />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
