import 'dotenv/config';
import { processScheduledPosts } from '../lib/scheduler.js';

async function run() {
  console.log('🚀 Iniciando Publicación Manual...');
  console.log(`📅 Hora del sistema: ${new Date().toLocaleString()}`);

  try {
    const result = await processScheduledPosts();

    console.log('\n--- 📊 Resumen de Ejecución ---');
    console.log(`✅ Éxitos: ${result.succeeded}`);
    console.log(`❌ Fallos: ${result.failed}`);
    console.log(`📝 Total procesados: ${result.processed}`);

    if (result.processed === 0) {
      console.log('\n✨ No había posts pendientes para publicar en este momento.');
    } else {
      console.log('\n✅ Proceso completado.');
    }
  } catch (error: any) {
    console.error('\n❌ Error crítico en la ejecución:', error.message);
    process.exit(1);
  }
}

run();
