# API-CUADERNO

Cuaderno de campo apícola **local-first, offline y orientado a la trazabilidad**.

Sitio: https://ttttooonni.github.io/api-cuaderno-032/

## Regla absoluta
Los datos del apicultor son prioritarios. Ninguna actualización puede borrar, sustituir, renombrar o perder registros existentes. Los cambios de estructura requieren migraciones explícitas.

## Arquitectura V1
- React + TypeScript + Vite.
- IndexedDB como almacenamiento principal.
- Capa de repositorios aislada de la interfaz.
- Backup JSON completo.
- Migraciones versionadas.
- Fotos como `Blob` en IndexedDB, nunca en `localStorage`.
- PWA con service worker local.
- Sin servidor necesario para las funciones básicas.
- Sin fuentes externas ni Google Fonts.

## Entidades
Apiarios, colmenas/núcleos, reinas, acciones históricas, tratamientos, cosechas, tareas, pérdidas y fotografías.

## Acciones de campo
Inspección, cosecha, cambio de reina, añadir cuadros, retirar cuadros, alza, tratamiento, dividir/crear núcleo, mover colmena y nota.

## Política de actualizaciones
1. Detectar nueva versión.
2. Crear copia de seguridad antes de una migración importante.
3. Ejecutar migración explícita.
4. Validar integridad.
5. Mantener historial y campos desconocidos.
6. Mostrar aviso visible de nueva versión.

## CI previsto
`npm ci` → `npm run typecheck` → `npm test` → `npm run build`.

La publicación en GitHub Pages la hace `.github/workflows/pages.yml` en cada push a `main`.

### Material
La ficha distingue cuatro cantidades independientes: cuadros normales, cuadros de media alza, medias alzas y alzas. Los ajustes rápidos se registran en el histórico y no sobrescriben acciones anteriores.
