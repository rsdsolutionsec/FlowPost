import { motion } from 'framer-motion';

export default function Automation() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Automatización</h2>
          <p className="text-slate-500 mt-2 font-medium">Configura flujos de trabajo inteligentes.</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-[3rem] p-16 ghost-border flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-8 animate-pulse">
          <span className="material-symbols-outlined text-5xl">smart_toy</span>
        </div>
        <h3 className="text-3xl font-black text-on-surface mb-4 font-headline tracking-tighter">Motor de IA en Construcción</h3>
        <p className="text-slate-500 max-w-md font-medium text-lg leading-relaxed">
          Estamos integrando modelos avanzados para automatizar tus respuestas y generación de contenido según tendencias en tiempo real.
        </p>
      </div>
    </motion.div>
  );
}
