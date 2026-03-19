import 'dotenv/config';
import { processScheduledPosts } from '../lib/scheduler.js';

async function run() {
  console.log('🚀 Iniciando Publicacin Manual...');
  console.log('📅 Hora del sistema:', new Date().toLocaleString());
  
  try {
    const result = await processScheduledPosts();
    console.log('\n--- 📊 Resumen de Ejecucin ---');
    console.log(`✅ xitos: ${result.succeeded}`);
    console.log(`❌ Fallos: ${result.failed}`);
    console.log(`📝 Total procesados: ${result.processed}`);
    
    if (result.failed > 0) {
      console.log('\n⚠️ Hubo errores. Revisa los logs arriba o el estado en el Dashboard.');
    } else if (result.processed === 0) {
      console.log('\n😴 No haba posts pendientes para publicar en este momento.');
    } else {
      console.log('\n✨ ¡Publicacin completada con xito!');
    }
  } catch (error) {
    console.error('\n🚨 Error fatal durante la ejecucin:', error);
  }
}

run();
