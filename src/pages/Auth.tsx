import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        alert('Check your email for confirmation!');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[480px] bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 p-10 md:p-16 border border-slate-100 z-10"
      >
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-slate-900/20">
            <span className="material-symbols-outlined text-3xl">flow_chart</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight font-headline mb-3">
            {isLogin ? '¡Bienvenido!' : 'Crea tu cuenta'}
          </h1>
          <p className="text-slate-400 font-medium">Gestiona tu contenido de forma inteligente.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nombre Completo</label>
                <input
                  type="text"
                  required={!isLogin}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm font-bold transition-all"
                  placeholder="Tu nombre"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm font-bold transition-all"
              placeholder="nombre@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm font-bold transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:translate-y-[-2px] hover:shadow-xl hover:shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Ingresar' : 'Registrarme')}
          </button>
        </form>

        <div className="mt-12 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
