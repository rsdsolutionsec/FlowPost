import { motion } from 'framer-motion';

export default function Settings() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Configuración</h2>
          <p className="text-slate-500 mt-2 font-medium">Personaliza tu cuenta y preferencias del sistema.</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-8">
        <div className="p-8 bg-surface-container-lowest rounded-[2.5rem] ghost-border">
          <h3 className="text-xl font-black mb-6 font-headline">Preferencia de Idioma</h3>
          <div className="flex gap-4">
            <button className="px-6 py-2 bg-primary text-white rounded-full font-bold">Español</button>
            <button className="px-6 py-2 bg-slate-100 text-slate-500 rounded-full font-bold hover:bg-slate-200 transition-all">English</button>
          </div>
        </div>

        <div className="p-8 bg-surface-container-lowest rounded-[2.5rem] ghost-border">
          <h3 className="text-xl font-black mb-6 font-headline">Notificaciones</h3>
          <div className="space-y-4">
            {['Email al publicar', 'Resumen semanal', 'Alertas de error'].map(opt => (
              <label key={opt} className="flex justify-between items-center cursor-pointer group">
                <span className="font-bold text-slate-700 group-hover:text-primary transition-colors">{opt}</span>
                <input type="checkbox" className="w-6 h-6 rounded-lg text-primary focus:ring-primary/20 border-slate-200" defaultChecked />
              </label>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
