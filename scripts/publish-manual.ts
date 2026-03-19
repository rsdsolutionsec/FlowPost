import 'dotenv/config';
import { processScheduledPosts } from '../lib/scheduler';

async function run() {
  console.log('🚀 Iniciando Publicación Manual...');
  console.log('📅 Hora del sistema:', new Date().toLocaleString());
  
  try {
    const result = await processScheduledPosts();
    console.log('\n--- 📊 Resumen de Ejecución ---');
    console.log(`✅ Éxitos: ${result.succeeded}`);
    console.log(`❌ Fallos: ${result.failed}`);
    console.log(`📝 Total procesados: ${result.processed}`);
    
    if (result.failed > 0) {
      console.log('\n⚠️ Hubo errores. Revisa los logs arriba o el estado en el Dashboard.');
    } else if (result.processed === 0) {
      console.log('\n✨ No había posts pendientes para publicar en este momento.');
    } else {
      console.log('\n🎉 ¡Publicación completada con éxito!');
    }
  } catch (error) {
    console.error('\n💥 Error fatal durante la ejecución:', error);
  }
}

run();
