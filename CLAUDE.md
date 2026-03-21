# Flowpost — Instrucciones para Claude Code

## Proyecto
Flowpost es una aplicación SaaS de programación y análisis de publicaciones para redes sociales (Facebook e Instagram), construida con React + TypeScript + Supabase + Vercel.

## Skills de marketing disponibles

Hay 33 skills de marketing en `.claude/skills/`. **Úsalas automáticamente** cuando el pedido del usuario encaje con el dominio de la skill — no hace falta que el usuario las invoque explícitamente.

| Skill | Cuándo usarla |
|---|---|
| `paid-ads` | Anuncios pagados, Google Ads, Meta Ads, presupuesto, ROAS, CPA |
| `social-content` | Crear o sugerir contenido para redes sociales |
| `copywriting` | Redactar textos, headlines, CTAs, mensajes persuasivos |
| `copy-editing` | Revisar, mejorar o corregir textos existentes |
| `content-strategy` | Planificación de contenido, calendarios editoriales |
| `ad-creative` | Creatividades para anuncios, imágenes, videos |
| `email-sequence` | Secuencias de emails, nurturing, automatizaciones |
| `cold-email` | Emails en frío, outreach, prospección |
| `analytics-tracking` | Métricas, KPIs, tracking, eventos |
| `seo-audit` | Auditoría SEO, diagnóstico de sitio web |
| `ai-seo` | SEO con IA, contenido optimizado para buscadores |
| `programmatic-seo` | SEO programático, páginas a escala |
| `schema-markup` | Datos estructurados, rich snippets |
| `site-architecture` | Estructura de sitio, navegación, UX |
| `page-cro` | Optimización de páginas de destino, conversión |
| `form-cro` | Optimización de formularios |
| `onboarding-cro` | Flujo de onboarding, activación de usuarios |
| `signup-flow-cro` | Flujo de registro, reducción de fricción |
| `paywall-upgrade-cro` | Conversión freemium a pago, upsell |
| `popup-cro` | Popups, exit-intent, captación de leads |
| `ab-test-setup` | Diseño y análisis de tests A/B |
| `pricing-strategy` | Estrategia de precios, modelos de monetización |
| `lead-magnets` | Imanes de leads, recursos gratuitos |
| `launch-strategy` | Lanzamiento de producto o feature |
| `marketing-ideas` | Brainstorming de ideas de marketing |
| `marketing-psychology` | Psicología del consumidor, sesgos cognitivos |
| `competitor-alternatives` | Análisis de competidores, posicionamiento |
| `referral-program` | Programas de referidos, viralidad |
| `free-tool-strategy` | Estrategia de herramientas gratuitas como lead gen |
| `churn-prevention` | Retención, reducción de churn, recuperación |
| `sales-enablement` | Materiales de ventas, objeciones, demos |
| `revops` | Revenue operations, procesos de ventas |
| `product-marketing-context` | Contexto general de marketing de producto |

### Cómo aplicar las skills
1. Identifica si el pedido del usuario tiene relación con alguna de las skills anteriores
2. Lee el archivo `.claude/skills/{nombre}.md` correspondiente
3. Aplica el marco de trabajo y principios de esa skill en tu respuesta
4. Puedes combinar varias skills si el pedido lo requiere
