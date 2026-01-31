# 🛡️ Nexus Enterprise V5.0 - Sistema de Gestión Logística Seguro

![Estado](https://img.shields.io/badge/Estado-Producción-green)
![Seguridad](https://img.shields.io/badge/Seguridad-OAuth2.0%20%2B%20RBAC-blue)
![Tech](https://img.shields.io/badge/Stack-Firebase%20%7C%20JS%20%7C%20Tailwind-orange)

> **Nexus Enterprise** es una solución SaaS (Software as a Service) de arquitectura *Serverless* diseñada para la gestión de inventarios multi-bodega en tiempo real. Desarrollada con un enfoque *Security-First* (Seguridad desde el diseño), integra auditoría forense inmutable y control de acceso basado en identidad.

---

## 🚀 Características Principales

### 🔐 Módulo de Ciberseguridad
* **Autenticación Robusta:** Implementación de **Google OAuth 2.0** para gestión de identidades, eliminando el riesgo de contraseñas locales débiles.
* **Listas de Control de Acceso (ACL):** Sistema de *Whitelist* en Firebase Security Rules que bloquea cualquier conexión no autorizada a nivel de base de datos.
* **Auditoría Forense Inmutable:** Cada transacción (ingreso, egreso, creación) genera un registro permanente en la colección `audit_logs` con *timestamp*, ID de usuario y detalle de la operación.

### ⚡ Funcionalidades Operativas
* **Sincronización en Tiempo Real:** Uso de `WebSockets` (Firestore listeners) para reflejar cambios de stock en milisegundos en todos los dispositivos conectados.
* **Gestión Multi-Bodega:** Arquitectura escalable que permite aislar inventarios por sucursal física.
* **Analítica de Negocios:** Dashboard con KPIs financieros, alertas de stock crítico y visualización gráfica de tendencias (Chart.js).
* **Snapshots Históricos:** Sistema de "congelamiento" de base de datos para cierres semanales y reportabilidad comparativa.

---

## 🛠️ Stack Tecnológico

Este proyecto fue construido bajo una arquitectura desacoplada para maximizar rendimiento y seguridad:

* **Frontend:** HTML5 Semántico, JavaScript (ES6+ Modular), Tailwind CSS.
* **Backend as a Service (BaaS):** Google Firebase (Firestore NoSQL).
* **Infraestructura:** Despliegue en Netlify (CDN Global).
* **Librerías Clave:** `Chart.js` (Analítica), `jspdf` (Reportabilidad vectorial).

---

## 📸 Capturas de Pantalla

*(Aquí puedes subir tus imágenes a la carpeta del repo y enlazarlas, o dejar este espacio para el futuro)*

---

## 🔧 Instalación y Despliegue

Este proyecto no requiere servidores tradicionales. Para desplegar tu propia instancia:

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/tu-usuario/nexus-enterprise.git](https://github.com/tu-usuario/nexus-enterprise.git)
    ```
2.  **Configurar Firebase:**
    * Crear proyecto en [Firebase Console](https://console.firebase.google.com).
    * Habilitar **Authentication** (Google Provider) y **Firestore**.
    * Copiar las credenciales (`apiKey`, etc.) en `app.js`.
3.  **Aplicar Reglas de Seguridad:**
    * Copiar el contenido de `firestore.rules` (incluido en este repo) en la consola de Firebase para activar la *Whitelist*.
4.  **Desplegar:**
    * Arrastrar la carpeta a **Netlify Drop** o usar un servidor local.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

**Desarrollado por:** 👨‍💻 **Cristopher Palacios** *Ingeniería en Ciberseguridad & Desarrollo Full-Stack* [Tu LinkedIn o Correo de Contacto]