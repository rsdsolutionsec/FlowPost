import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { signUp, signIn } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        alert('Revisa tu email para confirmar tu cuenta');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 font-manrope">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-surface-container-lowest rounded-[3rem] p-12 shadow-2xl ghost-border overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-3xl">auto_awesome</span>
          </div>
          <h1 className="text-3xl font-black text-on-surface font-headline tracking-tight">The Curator</h1>
          <p className="text-slate-500 font-medium mt-2">Gestiona tu presencia social con IA</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-4">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 bg-surface-container-low border-none rounded-3xl focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
              placeholder="tu@email.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-4">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-surface-container-low border-none rounded-3xl focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
              placeholder="********"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-primary text-white rounded-3xl font-black text-lg hover:translate-y-[-2px] transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : isLogin ? 'Entrar' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm font-bold text-slate-500">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-primary hover:underline"
          >
            {isLogin ? 'Regístrate' : 'Inicia Sesión'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
