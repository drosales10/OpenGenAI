# Zero-Cost Self-Hosting Plan

## Objetivo

Independizar Open Generative AI de MuAPI para que la app funcione con coste marginal cero en generación local, usando solo:

- modelos open source ejecutados en la propia máquina;
- APIs externas controladas por tus propias claves y contratos;
- recursos gratuitos o de documentación de MuAPI si siguen siendo útiles, sin depender de su facturación ni de su capa de ejecución.

La prioridad es mantener la funcionalidad completa en un solo plan de trabajo, incluyendo video desde el inicio, aunque la GPU tenga solo 16 GB de VRAM.

## Principios

1. No usar MuAPI como proveedor de ejecución.
2. No almacenar claves de terceros en el navegador como fuente de verdad.
3. No depender de un único modelo o backend.
4. Separar control de desarrollo, control de API y control de inferencia.
5. Diseñar para fallback, no para bloqueo.

## Qué significa coste cero

Coste cero aquí significa coste cero por generación propia cuando el modelo corre localmente. No significa ausencia total de coste operativo.

Costes que siguen existiendo:

- electricidad;
- desgaste de hardware;
- almacenamiento NVMe;
- tiempo de mantenimiento;
- consumo de APIs externas que sí uses con tus propias suscripciones.

## Arquitectura objetivo

### 1. Capa de UI

La UI debe dejar de hablar con MuAPI directamente y pasar a un cliente interno neutro, por ejemplo:

- `generateImage()`;
- `generateVideo()`;
- `uploadAsset()`;
- `getBalance()`;
- `listModels()`;
- `runWorkflow()`;
- `runAgent()`.

Esa capa decide el proveedor en tiempo de ejecución.

### 2. Capa de control

Backend propio con:

- autenticación propia;
- usuarios y proyectos;
- base de datos PostgreSQL `genai`;
- llaves API propias;
- cuotas y límites;
- trazabilidad de consumo;
- registro de jobs.

### 3. Capa de inferencia

Tres rutas posibles:

- local en tu GPU para imagen y parte de audio;
- CPU o cuantización agresiva para tareas livianas o pruebas;
- APIs externas bajo tu control para lo que no convenga correr localmente.

### 4. Capa de almacenamiento

Todo archivo debe ir a almacenamiento propio:

- imágenes de entrada;
- videos;
- previews;
- resultados;
- logs de trabajo;
- artefactos de workflows.

La base de datos relacional principal debe ser PostgreSQL para:

- `genai` como esquema central de la app;
- usuarios y sesiones;
- proyectos y permisos;
- llaves API y rotación;
- catálogo de modelos y proveedores;
- estado de jobs y colas;
- historial de uso y coste;
- metadatos de workflows y agentes.

## Plan de implementación unificado

### Fase 1: desacoplar MuAPI sin romper la app

- Crear una interfaz de proveedor única.
- Encapsular las llamadas actuales a MuAPI detrás de adaptadores.
- Separar auth, uploads y polling del UI layer.
- Mantener fallback temporal a MuAPI solo como modo de transición.

### Fase 2: control propio de identidad y claves

- Reemplazar `muapi_key` como identidad de usuario.
- Crear sesión propia por usuario y proyecto.
- Emitir tus propias claves API para acceso a backend.
- Registrar consumo por usuario, endpoint y modelo.
- Persistir todo el control de acceso y estado operativo en PostgreSQL.

### Fase 3: imagen local como base

- Priorizar modelos abiertos que entren en 16 GB de VRAM.
- Usar cuantización y resolución dinámica.
- Añadir colas para evitar bloqueos de la GPU.
- Cachear pesos y limpiar temporales.

### Fase 4: video en el mismo plan

- No posponer video.
- Tratar video como ruta de mayor coste y mayor latencia.
- Usar presets más pequeños para la GPU local.
- Permitir fallback a proveedor externo controlado por ti para video pesado.
- Mantener una cola separada para jobs de video.

### Fase 5: workflows, agentes y herramientas

- Migrar agentes y workflows a backend propio.
- Guardar definición de agentes, grafos, ejecuciones y eventos en PostgreSQL.
- Separar ejecución síncrona de orquestación asíncrona.
- Registrar eventos y estados de cada job.

### Fase 6: acceso a APIs externas bajo tu control

- Cada proveedor externo debe entrar por un adapter propio.
- Tus claves viven en servidor o vault, no en frontend.
- Añadir rotación de claves, rate limit y observabilidad.
- Exponer al frontend solo respuestas ya normalizadas.

## Stack recomendado para tu máquina

Con una GPU de 16 GB de VRAM:

- imagen: modelos open source medianos y cuantizados;
- video: presets recortados, menor duración, menor resolución y colas;
- audio: local o híbrido;
- inferencia pesada: backend propio o proveedor externo con tus claves.

## Coste real por escenario

### Escenario A: seguir con MuAPI

- coste operativo simple;
- dependencia externa;
- sin control total de precios;
- no cumple objetivo de coste cero.

### Escenario B: híbrido con backend propio

- coste local casi cero por generación local;
- coste externo solo para lo que no corras localmente;
- más control;
- requiere más ingeniería.

### Escenario C: self-host completo

- máximo control;
- coste de API externo mínimo o nulo;
- más trabajo de operación y mantenimiento;
- mejor para largo plazo si aceptas la carga técnica.

## Control de desarrollo con Git

Para tener control real del desarrollo:

- trabajar en ramas de función;
- fijar versiones con lockfiles;
- pinnear submódulos o vendorizar dependencias críticas;
- registrar cambios arquitectónicos en `docs/`;
- evitar depender de commits flotantes en submódulos;
- separar claramente adaptadores, core y UI.

No usar reset destructivo como estrategia de operación; usar ramas limpias, etiquetas y cambios pequeños y verificables.

## Riesgos principales

- 16 GB de VRAM no alcanzan para todo, especialmente video de alta calidad.
- Los agentes y workflows pueden requerir bastante reescritura.
- Si no existe un contrato interno, cada proveedor termina con una integración distinta.
- Sin métricas, no podrás saber qué parte de la app consume más recursos.

## Orden recomendado de trabajo

1. Definir el contrato interno de generación y jobs.
2. Crear la base de datos PostgreSQL y el esquema central.
3. Mover auth, claves y balance a backend propio.
4. Migrar imagen local.
5. Migrar video en paralelo con presets recortados y fallback.
6. Migrar workflows y agentes.
7. Añadir observabilidad, cuotas y coste por proyecto.
8. Retirar MuAPI como dependencia funcional.

## Resultado esperado

Al final de este plan, la app debe poder:

- correr generación local sin coste por API;
- usar APIs externas solo con tus propias suscripciones;
- mantener video desde el inicio, aunque con presets más modestos;
- operar con control total sobre claves, cuotas y datos;
- evolucionar sin quedar atada a MuAPI.

## Avance implementado (2026-07-05)

Se implementaron piezas concretas de las fases 2 y 3 para habilitar control backend propio desde la app:

- contrato inicial de API key interna en backend (`POST /api/auth/internal-key`) que:
	- inicializa esquema DB si hace falta;
	- crea/actualiza usuario admin local;
	- emite una clave interna y la guarda hasheada en PostgreSQL;
- validación de clave interna (`x-internal-api-key` o `Authorization: Bearer`) para rutas de administración:
	- `POST /api/db/init`;
	- `GET /api/db/settings`;
	- `POST /api/db/settings`;
- panel backend en Settings (frontend) para:
	- configurar URL base del backend interno;
	- crear/guardar clave interna;
	- comprobar health de DB;
	- inicializar esquema;
	- cargar/guardar settings operativas;
- sincronización de jobs pendientes con `request_id` y actualización de estado en PostgreSQL (`PATCH /api/db/jobs`) al completar o fallar.

Esto no reemplaza todavía la autenticación completa por usuario final, pero ya establece el primer contrato de control de acceso propio para operación administrativa y trazabilidad de jobs.

### Continuación implementada (fases siguientes)

Se añadió una ruta de transición para reducir exposición de claves de proveedor en frontend:

- configuración server-side del proveedor MuAPI (`GET/POST /api/providers/muapi/key`), protegida con clave interna;
- proxy autenticado (`/api/providers/muapi/[...path]`) que:
	- valida clave interna;
	- toma la clave de proveedor desde PostgreSQL (`system_settings`);
	- reenvía llamadas a MuAPI sin exponer `x-api-key` en cliente;
- cliente `muapi` actualizado para usar automáticamente el proxy cuando existe `internal_api_key`, con fallback al modo directo legado;
- UI de Settings (tab Backend) extendida para:
	- verificar/guardar configuración del proveedor MuAPI en backend;
	- mantener base URL configurable;
- estudios y uploads adaptados para aceptar tanto `muapi_key` (legacy) como `internal_api_key` (nuevo flujo).

Resultado práctico de esta etapa:

- puedes operar generación remota con clave de proveedor almacenada en backend;
- frontend ya no necesita conocer la clave de proveedor cuando usa la clave interna;
- se mantiene compatibilidad durante la migración para no romper uso actual.
