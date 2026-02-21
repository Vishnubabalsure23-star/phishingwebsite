import { useApp } from '@/contexts/AppContext';
import ParticleCanvas from './ParticleCanvas';
import { Shield } from 'lucide-react';

const RoleSelection = () => {
  const { setScreen } = useApp();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background overflow-hidden">
      <ParticleCanvas />
      <div className="relative z-10 text-center px-4">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <Shield className="w-20 h-20 text-primary float" />
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary/10 blur-xl" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-primary mb-3 tracking-wider">
          PhishGuard AI
        </h1>
        <p className="text-muted-foreground text-lg mb-12 font-inter">
          Advanced AI-Powered Phishing Detection
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button
            onClick={() => setScreen('admin-login')}
            className="glass glow-purple px-10 py-8 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 group min-w-[260px]"
          >
            <div className="text-4xl mb-3">🛡️</div>
            <h3 className="font-orbitron text-lg font-bold text-secondary mb-1">ADMIN LOGIN</h3>
            <p className="text-muted-foreground text-sm mb-4">OTP Authentication</p>
            <div className="btn-secondary-glow px-6 py-2.5 rounded-lg text-sm inline-block">
              Enter as Admin
            </div>
          </button>

          <button
            onClick={() => setScreen('user-login')}
            className="glass glow-cyan px-10 py-8 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105 group min-w-[260px]"
          >
            <div className="text-4xl mb-3">👤</div>
            <h3 className="font-orbitron text-lg font-bold text-primary mb-1">USER LOGIN</h3>
            <p className="text-muted-foreground text-sm mb-4">Scan & Detect</p>
            <div className="btn-primary-glow px-6 py-2.5 rounded-lg text-sm inline-block">
              Enter as User
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
