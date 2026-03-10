import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import {
  Home, Explore, AdDetail, CreateAd, Login, Register,
  Profile, Dashboard, AdminPanel, Messages,
  Plans, Checkout, PlansTest
} from './pages';
import { BannerForm } from './pages/BannerForm';
import { InstallPrompt } from './components/InstallPrompt';

function App() {
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
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
