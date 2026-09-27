# 🛍️ Sistema Inv (FashionFlow) - Sistema Integral de Gestión e Inventario para Indumentaria

Sistema web integral de **Punto de Venta (POS)**, **Control de Stock por Talles y Colores**, **Gestión de Caja por Turnos**, **Auditoría de Precios** y **Administración Comercial** diseñado específicamente para tiendas de ropa y locales de indumentaria.

Desarrollado con arquitectura moderna en **React 19**, **Vite**, **TypeScript**, **Tailwind CSS**, **Firebase Firestore & Authentication** y **Cloudinary**.

---

## 📌 Tabla de Contenidos

1. [Características Principales](#-características-principales)
2. [Arquitectura del Código y Conexión de Capas](#-arquitectura-del-código-y-conexión-de-capas)
3. [Estructura y Relaciones de la Base de Datos (Firebase Firestore)](#-estructura-y-relaciones-de-la-base-de-datos-firebase-firestore)
4. [Módulos y Flujos Funcionales](#-módulos-y-flujos-funcionales)
5. [Seguridad, Roles y Sesiones](#-seguridad-roles-y-sesiones)
6. [Estructura de Archivos del Proyecto](#-estructura-de-archivos-del-proyecto)
7. [Scripts de Ejecución y Comandos](#-scripts-de-ejecución-y-comandos)

---

## 🌟 Características Principales

- **Control de Inventario por Talles y Colores**: Matriz dinámica de variantes (S, M, L, XL, talles numéricos, colores) con SKU individual y cálculo automático de stock consolidado.
- **Punto de Venta y Caja Integrada (POS)**: Apertura de turnos con monto inicial, registro de ventas con deducción atómica de inventario, ingresos, egresos y arqueo de caja con desglose por medios de pago (Efectivo, Transferencia, Débito, Crédito).
- **Emisión de Ticket Térmico**: Formato estándar de ticket de 80mm/58mm listo para imprimir o enviar, personalizable con datos fiscales, dirección y pie de ticket comercial.
- **Auditoría y Revisión Inteligente de Precios**: Detección de prendas con stock estancado, cálculo de rentabilidad por margen/mark-up y ajustes masivos o porcentuales de precios de venta y mayoristas.
- **Gestión de Compras y Proveedores**: Registro de órdenes de compra que actualizan inmediatamente el stock disponible y el costo promedio de las prendas.
- **Cartera de Clientes y Proveedores**: Ficha de contacto completa (DNI/CUIT, teléfono, dirección, email) vinculada con el historial de compras y ventas.
- **Sincronización en Tiempo Real & Modo Híbrido**: Respaldado en Firebase Firestore con listeners multiplexados (`onSnapshot`) y caché local (`localStorage`) que garantizan 0 ms de latencia inicial en el arranque.
- **Reportes y Exportación**: Generación de reportes ejecutivos en PDF descargable (`jsPDF`) y planillas de cálculo Excel (`XLSX`).

---

## 🏗️ Arquitectura del Código y Conexión de Capas

El sistema está estructurado bajo una arquitectura por capas limpia y desacoplada:

```
┌─────────────────────────────────────────────────────────────┐
│                       VISTAS / PÁGINAS                      │
│   (Dashboard, Caja/POS, Productos, Stock, Precios, etc.)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Consume estados y despacha acciones
┌──────────────────────────────▼──────────────────────────────┐
│                    CONTEXTOS & HOOKS                        │
│   - SettingsContext, AuthContext, CashContext, ThemeContext  │
│   - useProducts, useSales, usePurchases, useContacts, etc.   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Llama a servicios atómicos
┌──────────────────────────────▼──────────────────────────────┐
│                  SERVICIOS DE DATOS / CLOUD                  │
│   - src/services/firebase/firestore.ts (CRUD + Realtime)    │
│   - src/services/firebase/auth.ts (Sesiones + Roles)        │
│   - src/services/cloudinary/cloudinaryService.js (Fotos)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Sincronización bidireccional
┌──────────────────────────────▼──────────────────────────────┐
│                  INFRAESTRUCTURA DE DATOS                   │
│   - Firebase Firestore Cloud (Colecciones NoSQL en vivo)    │
│   - LocalStorage Mirror (Caché offline y fallback rápido)   │
└─────────────────────────────────────────────────────────────┘
```

### 1. Puntos de Entrada de Firebase
Para máxima compatibilidad en todo el proyecto, existen tres accesos normalizados:
- **`src/firebase.ts`**: Reexporta las instancias (`db`, `auth`, `storage`, `app`) y todas las funciones de `firestore.ts` y `auth.ts`.
- **`src/lib/firebase.ts`**: Alias estándar para bibliotecas que esperan rutas de tipo `@/lib/firebase`.
- **`src/firebaseConfig.ts`**: Configuración de credenciales del proyecto de Firebase.

### 2. Capa de Contextos Globales (`src/context/`)
- **`AuthContext.jsx`**: Gestiona la sesión del usuario conectado, su rol (`ADMIN`, `EMPLEADO`, `SUPERVISOR`), la validación de cuenta activa y la sincronización con Firebase Auth.
- **`CashContext.jsx`**: Centraliza el ciclo de vida de la caja registradora. Administra el turno activo (`cashRegisters`), balance actual, movimientos de caja (`cashMovements`), ventas y arqueo.
- **`SettingsContext.jsx`**: Carga y sincroniza el documento de configuración comercial de la tienda (`settings/general`: nombre, CUIT, moneda, dirección, pie de ticket).
- **`ThemeContext.jsx`**: Control del tema visual de la interfaz.

### 3. Capa de Hooks Personalizados (`src/hooks/`)
- **`useProducts.js`**: Operaciones CRUD sobre prendas, cálculo automático de stock sumando variantes (talles/colores), filtrado avanzado y cálculo de márgenes.
- **`useSales.js`**: Procesamiento de ventas con descuento atómico de unidades en las variantes de cada prenda vendida.
- **`usePurchases.js`**: Ingreso de mercadería de proveedores con incremento automático del stock y actualización del precio de costo.
- **`useContacts.js`**: Manejo de clientes (`customers`) y proveedores (`suppliers`).
- **`useCatalog.js`**: Manejo de categorías (`categories`) y marcas (`brands`).
- **`useSettingsAndUsers.js`**: Configuración institucional y administración de usuarios.

### 4. Capa de Servicios (`src/services/`)
- **`firestore.ts`**: Funciones CRUD tipadas con TypeScript (`getDocument<T>`, `getCollection<T>`, `addDocument<T>`, `updateDocument<T>`, `deleteDocument`). Implementa un **multiplexor de suscripciones** que previene conexiones duplicadas y entrega datos cacheados al instante (latencia 0 ms).
- **`auth.ts`**: Autenticación dual (intenta Firebase Auth y realiza fallback inteligente contra Firestore para garantizar que el negocio nunca se quede sin operar por problemas de conectividad externa).
- **`cloudinaryService.js`**: Subida de fotografías de prendas directamente a la nube de Cloudinary con optimización automática de peso y formato.

---

## 🗄️ Estructura y Relaciones de la Base de Datos (Firebase Firestore)

Firestore almacena la información en colecciones NoSQL de documentos JSON. A continuación se detalla la estructura y relación entre ellas:

### Diagrama de Relaciones Lógicas

```
 [categories] ──┐
                ├───> [products] (con array de variants: color, talle, stock)
    [brands]  ──┘         │
                          │ Se descuenta stock en cada venta
                          ▼
   [customers] ───> [sales] / [cashMovements] <─── [cashRegisters] (Turno de Caja)
                          ▲
   [suppliers] ───> [purchases] (Incrementa stock al recibir compra)

     [users]   ───> Responsable en apertura/cierre de turnos y ventas
    [settings] ───> Documento único "general" con datos del negocio
```

### Detalle de Colecciones

#### 1. `products` (Prendas del Catálogo)
```typescript
interface Product {
  id: string;
  name: string;               // Ej: "Remera Oversize Algodón"
  sku: string;                // Ej: "REM-001"
  barcode?: string;           // Código de barras
  categoryId: string;         // Relación con colección 'categories'
  categoryName: string;
  brandId?: string;           // Relación con colección 'brands'
  brandName?: string;
  costPrice: number;          // Precio de costo de compra
  salePrice: number;          // Precio de venta minorista
  wholesalePrice?: number;    // Precio mayorista
  stockMin: number;           // Alerta de stock mínimo
  stock: number;              // Suma calculada de todas las variantes
  variants: Array<{           // Matriz de talles y colores
    color: string;
    size: string;
    stock: number;
    sku?: string;
  }>;
  images: string[];           // URLs de Cloudinary o fotos
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### 2. `cashRegisters` (Turnos de Caja y Arqueos)
```typescript
interface CashRegister {
  id: string;
  status: 'OPEN' | 'CLOSED';
  initialAmount: number;      // Fondo inicial para cambio
  currentBalance: number;     // Saldo acumulado en el turno
  openedAt: string;
  closedAt?: string | null;
  openedBy: { uid: string; displayName: string; email: string };
  closedBy?: { uid: string; displayName: string; email: string };
  notes?: string;
}
```

#### 3. `cashMovements` (Movimientos de Dinero y Ventas)
```typescript
interface CashMovement {
  id: string;
  shiftId: string;            // Relación con el turno de 'cashRegisters'
  type: 'VENTA' | 'INGRESO' | 'EGRESO';
  amount: number;
  paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO';
  description: string;
  date: string;
  customerName?: string;
  customerId?: string;
  items?: Array<{             // Desglose de prendas vendidas
    productId: string;
    name: string;
    size: string;
    color: string;
    qty: number;
    price: number;
  }>;
}
```

#### 4. `purchases` (Ingreso de Mercadería de Proveedores)
```typescript
interface Purchase {
  id: string;
  supplierId: string;         // Relación con 'suppliers'
  supplierName: string;
  date: string;
  total: number;
  items: Array<{
    productId: string;
    name: string;
    size: string;
    color: string;
    qty: number;
    costPrice: number;
  }>;
}
```

#### 5. `customers` & `suppliers` (Contactos)
- **`customers`**: Datos del cliente (`name`, `dni`, `phone`, `email`, `address`).
- **`suppliers`**: Datos del proveedor mayorista (`name`, `cuit`, `contact`, `phone`, `email`).

#### 6. `settings` (Configuración de Tienda)
- **Documento único:** `general`
- Campos: `businessName`, `legalName`, `cuit`, `address`, `phone`, `email`, `currencyCode`, `currencySymbol`, `receiptFooter`.

#### 7. `users` (Usuarios y Roles)
- Campos: `uid`, `email`, `displayName`, `role` (`ADMIN`, `EMPLEADO`), `active`, `createdAt`.

---

## ⚡ Módulos y Flujos Funcionales

### 1. Flujo de Venta en Mostrador (Caja / POS)
1. El vendedor abre la pantalla de **Caja**. Si el turno está cerrado, el sistema solicita ingresar el **Monto Inicial de Apertura**.
2. Selecciona prendas usando el buscador por nombre, categoría o código.
3. Al seleccionar una prenda con variantes, el sistema despliega el selector de **Talle y Color** mostrando el stock real de cada combinación.
4. Se asigna el método de pago (Efectivo con cálculo de vuelto automático, Transferencia, Débito o Crédito) y opcionalmente el cliente.
5. Al confirmar la venta:
   - Se descuenta el stock de la variante específica en la colección `products`.
   - Se genera el registro de la venta en `cashMovements` vinculado al `shiftId` actual.
   - Se actualiza el balance de la caja.
   - Se emite el ticket térmico con opción de impresión directa o descarga.

### 2. Control y Ajuste de Stock
- Vista consolidada de inventario con filtros por estado: **Crítico** (por debajo del mínimo), **Normal**, o **Sin Stock**.
- Permite registrar ajustes rápidos (entradas por conteo físico o salidas por falla/merma).

### 3. Revisión de Precios y Rentabilidad
- Detección automática de prendas sin rotación para liquidación o promoción.
- Cálculo de rentabilidad en base al costo de compra vs. precio de venta.
- Herramienta de **actualización masiva de precios** por porcentaje (ej. +15% por inflación o cambio de temporada) aplicable a todo el catálogo o por categoría.

---

### 5. Seguridad y Reglas de Firestore (RBAC)

El archivo `firestore.rules` implementa reglas de seguridad a nivel base de datos:
- **`users`**: Cada usuario puede leer los perfiles; la creación inicial permite auto-registro pero ningún usuario puede auto-asignarse el rol `ADMIN` ni reactivar una cuenta desactivada (`active: false`). Únicamente el Administrador puede modificar roles o estados de activación.
- **`settings`**: Solo el rol `ADMIN` puede modificar parámetros de la tienda o credenciales.
- **`categories` & `brands`**: Administradores y supervisores pueden gestionar el catálogo. Los productos almacenan los **IDs reales** de Firestore de las colecciones `categories` y `brands` (no meros strings de nombre). La marca de prueba `AiXg60MMBKvHmfPX8Q8Z` (Nike) se encuentra protegida.
- **`products`**: Lectura para usuarios activos. Alta y baja restringida a administración/supervisión. Modificación de stock y variantes permitida a empleados durante las ventas o arqueos en caja.
- **`sales` & `cashMovements`**: Empleados autenticados y activos pueden registrar ventas y movimientos asociados a su turno de caja.
- **`purchases` & `costHistory`**: Los datos sensibles de costos de proveedores y facturas de compra son privados y accesibles únicamente por Supervisores y Administradores.

---

## 🔐 Seguridad, Roles y Sesiones

El sistema contempla control de acceso basado en roles (**RBAC**):

- **ADMIN**: Acceso total a todas las secciones (reportes financieros, modificación de costos, configuración del negocio, gestión de usuarios, reseteo del sistema). El sistema implementa la regla de **1 solo Administrador principal activo** a la vez (`admin@sistema.com` con UID `zvKPMDfIe0ZfwdikFBmhYCyq7w42`) para evitar inconsistencias de negocio.
- **EMPLEADO / VENDEDOR**: Acceso enfocado a la operatoria diaria (Punto de Venta, Caja, Consulta de Stock, Registro de Clientes). Bloqueo automático en caso de `active: false`. Bloqueo a métricas de costos de compra y configuración sensible.

---

## 📁 Estructura de Archivos del Proyecto

```
├── .env.example               # Declaración de variables de entorno
├── index.html                 # Punto de entrada HTML con meta tags
├── metadata.json              # Configuración y capacidades del applet
├── package.json               # Dependencias y scripts de npm
├── tsconfig.json              # Configuración del compilador TypeScript
├── vite.config.ts             # Configuración del empaquetador Vite y Tailwind
│
├── src/
│   ├── App.jsx                # Router principal, Providers y rutas protegidas
│   ├── main.jsx               # Render inicial de React 19
│   ├── firebase.ts            # Export principal universal de Firebase
│   ├── firebaseConfig.ts      # Export de credenciales de Firebase
│   │
│   ├── components/            # Componentes reutilizables de UI
│   │   ├── layout/            # Navbar, Sidebar, GlobalSearch
│   │   └── ui/                # Botones, Modales, Inputs, Tablas, Badges
│   │
│   ├── constants/             # Constantes del sistema
│   │   ├── collections.js     # Nombres canónicos de colecciones Firestore
│   │   └── roles.js           # Definición de roles y permisos
│   │
│   ├── context/               # Contextos de estado global
│   │   ├── AuthContext.jsx    # Autenticación y usuario activo
│   │   ├── CashContext.jsx    # Estado del turno de caja y balance
│   │   ├── SettingsContext.jsx# Configuración de tienda y moneda
│   │   └── ThemeContext.jsx   # Tema claro/oscuro
│   │
│   ├── hooks/                 # Hooks reactivos de negocio
│   │   ├── useProducts.js     # Inventario, variantes y stock
│   │   ├── useSales.js        # Despacho de ventas y stock
│   │   ├── usePurchases.js    # Compras a proveedores
│   │   ├── useContacts.js     # Clientes y proveedores
│   │   ├── useCatalog.js      # Categorías y marcas
│   │   └── useSettingsAndUsers.js # Parámetros del sistema
│   │
│   ├── layouts/
│   │   └── MainLayout.jsx     # Shell visual con barra lateral y superior
│   │
│   ├── lib/
│   │   └── firebase.ts        # Reexport para alias lib/firebase
│   │
│   ├── pages/                 # Páginas y vistas principales
│   │   ├── Caja/              # Punto de venta y arqueo de turnos
│   │   ├── Categorias/        # Catálogo de categorías
│   │   ├── Clientes/          # Directorio de clientes
│   │   ├── Compras/           # Facturación de compras de prendas
│   │   ├── Configuracion/     # Datos fiscales y ticket térmico
│   │   ├── Dashboard/         # Métricas ejecutivas y gráficos
│   │   ├── Login/             # Acceso de usuarios
│   │   ├── Marcas/            # Marcas de indumentaria
│   │   ├── Productos/         # Listado, variantes y stock
│   │   ├── Proveedores/       # Directorio de mayoristas
│   │   ├── Reportes/          # Exportaciones PDF / Excel
│   │   ├── RevisionPrecios/   # Auditoría y ajustes de precios
│   │   └── Usuarios/          # Gestión de accesos
│   │
│   ├── services/              # Integraciones externas
│   │   ├── api/seedData.js    # Catálogo inicial de muestra
│   │   ├── cloudinary/        # Servicio de fotos en la nube
│   │   └── firebase/          # Infraestructura Firestore & Auth (TypeScript)
│   │       ├── config.ts      # Inicialización de servicios
│   │       ├── firestore.ts   # CRUD y listeners en tiempo real
│   │       └── auth.ts        # Manejo de sesiones y roles
│   │
│   └── utils/                 # Utilidades de formato y cálculo
│       ├── calculations.js    # Fórmulas de márgenes y totales
│       ├── exportUtils.js     # Exportador a Excel (XLSX)
│       ├── formatters.js      # Formato de moneda, fechas y CUIT
│       └── pdfReportGenerator.js # Generador de reportes en PDF
```

---

## 🚀 Scripts de Ejecución y Comandos

| Comando | Acción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo local en `http://localhost:3000`. |
| `npm run build` | Compila y optimiza la aplicación para producción en la carpeta `/dist`. |
| `npm run lint` | Ejecuta el validador de tipos TypeScript (`tsc --noEmit`) sin emitir archivos. |
| `npm run preview` | Previsualiza localmente el build de producción. |
