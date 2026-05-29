# VillaPadel — Gestor de Torneos de Pádel

Plataforma web completa para gestionar torneos de pádel. Incluye inscripción de parejas, generación de fixtures, seguimiento de resultados en tiempo real, clasificación y categorización de jugadores.

---

## Tecnologías

| Categoría | Stack |
|-----------|-------|
| Frontend | React 19, Vite, React Router DOM 7 |
| Estilos | CSS Modules, Tailwind CSS 4 |
| Base de datos | Firebase Firestore |
| Autenticación | Firebase Authentication |
| Emails | EmailJS |
| Exportación | jsPDF, html2canvas, html-to-image |

---

## Variables de entorno

Crear `.env` en `padel-app/` con:

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Roles (separados por coma, sin espacios)
VITE_MASTER_EMAILS=tu@email.com
VITE_ADMIN_EMAILS=

# EmailJS
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

> **Importante**: En Netlify (u otro hosting) las mismas variables deben estar cargadas en la configuración del sitio, especialmente `VITE_MASTER_EMAILS`.

---

## Scripts

```bash
npm run dev       # Servidor local en localhost:5173
npm run build     # Compilar para producción
npm run preview   # Vista previa del build
npm run lint      # Lint con ESLint
```

---

## Rutas

### Públicas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing con estadísticas generales y últimos partidos |
| `/torneos` | Lista de todos los torneos |
| `/torneos/:id` | Detalle de torneo: grupos, tabla de posiciones y llave |
| `/categorizacion` | Listado de jugadores por categoría |
| `/login` | Inicio de sesión para administradores |

### Admin (`/admin`)

Requiere rol `admin` o `master`. Sección con barra lateral navegable:

| Sección | Rol mínimo |
|---------|-----------|
| Torneos | Admin |
| Duplas | Admin |
| Partidos | Admin |
| Categorización | Admin |
| Documentos | Admin |
| Solicitudes | **Master** |

---

## Funcionalidades por sección

### Torneos

- Crear torneo con:
  - Tipo: por categoría o por suma de categorías
  - Formato: tradicional o americano
  - Modalidad: masculino, femenino o mixto
  - Tamaño de zona (3 o 4 parejas) y clasificados por zona
  - Fechas y costo por jugador
- Agregar parejas (duplas) con control de pago
- Generar fixture automático (round-robin por zona)
- Generar llave de eliminación con seeding automático
- Gestionar colaboradores (admins con acceso al torneo)
- Editar y eliminar torneos

### Duplas

- Ver parejas inscritas por torneo
- Registrar pagos por jugador: estado, método (efectivo / transferencia) y monto
- Resumen financiero: total cobrado, pendientes, desglose por método

### Partidos

**Fase de grupos:**
- Filtrar por zona, jornada y estado
- Asignar horario (fecha, hora, cancha)
- Cambiar estado del partido (Programado, En juego, Demorado, Reprogramado, Finalizado, W.O., BYE)
- Cargar resultado manual (sets y games)
- **Marcador en vivo** punto a punto:
  - Puntuación real (0–15–30–40–Deuce–Oro)
  - Tiebreak (7 puntos) y Super Tiebreak (11 puntos)
  - Historial de sets con opción de deshacer
  - Cierre automático del set y del partido

**Llave (bracket):**
- Visualización del árbol de eliminación
- Mismas opciones de resultado y marcador en vivo
- Propagación automática del ganador a la siguiente ronda
- Generación automática de la llave cuando finalizan todos los partidos de grupos

### Categorización

- CRUD de jugadores
- Campos: nombre, apellido, localidad, sexo y categoría (8ª a 1ª, Femenino A, Mixto)
- Marcar ascenso de categoría
- Filtros por categoría y sexo
- Paginación (10 / 25 / 50 por página)

### Documentos

- Editor de texto libre con guardado automático en `localStorage`
- Plantillas predefinidas:
  - Nota de solicitud de cancha
  - Nota al municipio
- Acciones: descargar como `.txt`, imprimir / exportar a PDF

### Solicitudes *(solo master)*

**Panel de solicitudes:**
- Visitantes pueden solicitar acceso desde `/login`
- Se genera una solicitud en Firestore y se envía notificación por email al master (via EmailJS)
- El master puede: aprobar, rechazar, editar o eliminar solicitudes
- Al **aprobar**: se crea automáticamente la cuenta en Firebase Auth, el documento de usuario con `rol: admin` en Firestore, y se envía un email de restablecimiento de contraseña al nuevo administrador

**Panel de administradores:**
- Ver admins activos y pre-aprobados pendientes de primer login
- Revocar acceso de cualquier admin

---

## Roles y autenticación

| Rol | Cómo se asigna | Permisos |
|-----|---------------|----------|
| `viewer` | Por defecto | Solo acceso público |
| `admin` | Aprobación de solicitud o env `VITE_ADMIN_EMAILS` | Panel admin completo |
| `master` | Env `VITE_MASTER_EMAILS` o `rol: 'master'` en Firestore | Admin + gestión de solicitudes y admins |

Login disponible con **Google** o **email y contraseña**.

La detección de rol combina las variables de entorno con el campo `rol` del documento `users/{uid}` en Firestore, tomando siempre el nivel más alto.

---

## Sistema de puntuación (fase de grupos)

- **Win**: 2 puntos
- **Loss**: 1 punto
- **W.O. / sin victorias**: 0 puntos

Desempate en cascada: puntos → sets ganados → diferencia de games.

---

## Estructura Firestore

```
torneos/{torneoId}
  duplas/{duplaId}       — parejas inscritas con info de pagos
  zonas/{zonaId}         — grupos del torneo
  partidos/{partidoId}   — partidos de grupos con resultados y marcador
  llaves/{llaveId}       — bracket de eliminación con propagación de ganadores

players/{playerId}       — jugadores con categoría y datos
users/{uid}              — usuarios del sistema con rol
solicitudes/{id}         — solicitudes de acceso
config/admins            — emails pre-aprobados
```

---

## Estructura del proyecto

```
padel-app/
├── src/
│   ├── components/
│   │   ├── Admin/        # TorneosAdmin, DuplasAdmin, PartidosAdmin,
│   │   │                 # JugadoresAdmin, DocumentosAdmin, SolicitudesAdmin,
│   │   │                 # AdminLayout
│   │   ├── Auth/         # LoginView (login, solicitar acceso, reset password)
│   │   ├── Landing/      # LandingView
│   │   ├── Torneos/      # TorneosListView, TorneoDetailView
│   │   ├── Players/      # PlayersView
│   │   └── ui/           # Spinner, AppSelect, ShareButton
│   ├── contexts/
│   │   ├── AuthContext.jsx    # Estado de autenticación y roles
│   │   └── TorneoContext.jsx  # Estado global de torneos con listeners en tiempo real
│   ├── firebase/
│   │   ├── config.js          # Inicialización de Firebase
│   │   ├── auth.js            # signIn, signOut, resolveAdminStatus
│   │   └── torneoService.js   # Todo el CRUD + algoritmos de fixture y bracket
│   ├── hooks/
│   │   ├── useIsMobile.js
│   │   └── useFirestore.js
│   └── App.jsx                # Rutas principales
```
