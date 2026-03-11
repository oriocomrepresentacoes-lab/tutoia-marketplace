import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import {
  Home, Explore, AdDetail, CreateAd, Login, Register,
  Profile, Dashboard, AdminPanel, Messages,
  Plans, Checkout, PlansTest, ForgotPassword,
  Terms, Privacy, Contact
} from './pages';
import { BannerForm } from './pages/BannerForm';
import { InstallPrompt } from './components/InstallPrompt';

import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { setupNotifications } from './utils/pushManager';

import { getSocket } from './utils/socket';

function App() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      const socket = getSocket(token || '');

      if (socket) {
        socket.on('new_ad', (ad: any) => {
          console.log('[App] New ad broadcast:', ad);
          // Simple browser notification or custom UI could go here
          // For now, let's keep it quiet in logs or use a simple alert if user prefers
        });

        socket.on('new_message', (msg: any) => {
          console.log('[App] Global new_message signal:', msg?.content || 'Signal');
          if (window.location.pathname !== '/messages') {
            console.log('[App] Background message received');
          }
        });
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
        <InstallPrompt />
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/ad/:id" element={<AdDetail />} />
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
