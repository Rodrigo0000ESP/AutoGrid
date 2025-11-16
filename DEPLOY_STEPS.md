# 🚀 Pasos para Desplegar AutoGrid en DigitalOcean

## ✅ Preparación Completada

- ✅ Configuración `app.yaml` lista
- ✅ Variables de entorno configuradas
- ✅ `requirements.txt` actualizado con gunicorn
- ✅ Frontend usa `PUBLIC_API_URL`
- ✅ Backend usa `DB_URL`
- ✅ Archivo de secrets creado (no se subirá a GitHub)

## 📝 Pasos para Desplegar

### **1. Commit y Push a GitHub**

```bash
cd /Users/rodrigodiazmunoz/Programmer/AutoGrid

# Verifica qué archivos cambiarán
git status

# Añade todos los cambios
git add .

# Commit
git commit -m "Configuración para despliegue en DigitalOcean App Platform"

# Push
git push origin main
```

### **2. Crear App en DigitalOcean**

1. Ve a https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Selecciona **"GitHub"** como source
4. Si es la primera vez, autoriza DigitalOcean a acceder a tu GitHub
5. Selecciona el repositorio **"AutoGrid"**
6. Branch: **main**
7. Click **"Next"**

### **3. Importar Configuración**

1. En la pantalla de configuración, busca la opción **"Edit Plan"** o **"Import from app spec"**
2. Click en **"Edit as YAML"** o similar
3. Borra todo el contenido
4. Abre el archivo `.do/app.yaml` de tu proyecto
5. Copia TODO el contenido
6. Pégalo en DigitalOcean
7. Click **"Save"**

### **4. Configurar Secrets**

DigitalOcean te mostrará una lista de variables que necesitan valores.

**IMPORTANTE:** Abre el archivo `DIGITALOCEAN_SECRETS.md` (está en tu proyecto local, NO en GitHub)

Configura estos valores copiándolos de `DIGITALOCEAN_SECRETS.md`:

#### **Backend API:**
```
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PLAN_PRICE_ID
STRIPE_UNLIMITED_PLAN_PRICE_ID
MAIL_USERNAME
MAIL_PASSWORD
DO_SPACES_KEY
DO_SPACES_SECRET
```

#### **Frontend Web:**
```
PUBLIC_STRIPE_PUBLIC_KEY
PUBLIC_STRIPE_PORTAL_LOGIN_URL
STRIPE_PRICE_ID_PRO
STRIPE_PRICE_ID_UNLIMITED
```

### **5. Crear Recursos**

1. Revisa el resumen:
   - Backend API (Python)
   - Frontend Web (Node.js)
   - PostgreSQL Database
2. Click **"Create Resources"**
3. Espera **5-10 minutos** para el primer despliegue

### **6. Verificar Despliegue**

Una vez completado, verás 3 componentes:

#### **Backend API**
```bash
# URL temporal de DigitalOcean
https://backend-api-xxxxx.ondigitalocean.app

# Prueba el health check
curl https://backend-api-xxxxx.ondigitalocean.app/health
```

#### **Frontend Web**
```bash
# URL temporal de DigitalOcean
https://frontend-web-xxxxx.ondigitalocean.app

# Abre en el navegador para verificar
```

#### **Database**
```bash
# Se conecta automáticamente al backend
# Verifica en los logs del backend que conectó correctamente
```

### **7. Configurar CORS en Backend**

El backend necesita permitir el dominio del frontend:

1. Ve a tu repositorio local
2. Abre `backend/main.py`
3. Busca `allowed_origins`
4. Añade la URL del frontend de DigitalOcean:

```python
allowed_origins = [
    "http://localhost:4321",
    "https://autogrid.net",
    "https://frontend-web-xxxxx.ondigitalocean.app",  # ← Añade esta línea
    "chrome-extension://gmfhflhogdfhgegedmffabnejkcapcbj"
]
```

5. Commit y push:
```bash
git add backend/main.py
git commit -m "Añadir dominio de DigitalOcean a CORS"
git push origin main
```

DigitalOcean desplegará automáticamente los cambios.

### **8. Configurar Stripe Webhook (IMPORTANTE)**

El webhook actual es para localhost. Necesitas crear uno nuevo:

1. Ve a https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://backend-api-xxxxx.ondigitalocean.app/subscriptions/webhook`
4. **Events to send:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copia el **Signing secret** (empieza con `whsec_...`)
7. Ve a DigitalOcean → Tu App → backend-api → Settings → Environment Variables
8. Edita `STRIPE_WEBHOOK_SECRET` y pega el nuevo valor
9. Click **"Save"**

### **9. Configurar Dominios Personalizados (Opcional)**

Si quieres usar `autogrid.net` y `api.autogrid.net`:

#### **Para el Frontend:**
1. En DigitalOcean, ve a tu App
2. Click en **"Settings"** → **"Domains"**
3. Click **"Add Domain"**
4. Ingresa: `autogrid.net`
5. DigitalOcean te dará un registro CNAME
6. Ve a tu proveedor de DNS (donde compraste el dominio)
7. Añade el registro CNAME
8. Espera propagación (5-30 minutos)

#### **Para el Backend:**
1. Repite el proceso con `api.autogrid.net`
2. Actualiza `FRONTEND_URL` en backend para usar el dominio personalizado
3. Actualiza CORS en `main.py` con el dominio personalizado

### **10. Actualizar Extension de Chrome**

La extensión necesita apuntar al nuevo backend:

1. Abre `extension/Data/DataShareService.js`
2. Busca la URL del backend
3. Actualiza a: `https://backend-api-xxxxx.ondigitalocean.app` o `https://api.autogrid.net`
4. Actualiza CORS en backend para incluir el ID de la extensión

## 🎉 ¡Listo!

Tu aplicación está desplegada en:
- **Frontend:** https://frontend-web-xxxxx.ondigitalocean.app
- **Backend API:** https://backend-api-xxxxx.ondigitalocean.app
- **Database:** Managed PostgreSQL en DigitalOcean

## 💰 Costos Mensuales

- Backend API: $5/mes
- Frontend Web: $5/mes
- PostgreSQL: $15/mes
- Spaces: ~$5/mes
- **Total: ~$30/mes**

## 🔄 Despliegues Futuros

Cada vez que hagas push a `main`, DigitalOcean desplegará automáticamente:

```bash
git add .
git commit -m "Nueva funcionalidad"
git push origin main
# DigitalOcean despliega automáticamente en ~3-5 minutos
```

## 📊 Monitoreo

- **Logs:** DigitalOcean → Tu App → Logs
- **Métricas:** CPU, RAM, Requests en el dashboard
- **Alertas:** Configura alertas para errores o alto uso

## 🐛 Troubleshooting

### Backend no inicia
```bash
# Revisa logs en DigitalOcean
# Verifica que todas las variables SECRET estén configuradas
# Verifica que DB_URL esté conectada
```

### Frontend no carga
```bash
# Verifica PUBLIC_API_URL en variables de entorno
# Revisa logs del frontend
# Verifica que el build se completó correctamente
```

### Error de CORS
```bash
# Añade el dominio del frontend a allowed_origins en backend/main.py
# Commit y push para redesplegar
```

### Stripe webhook no funciona
```bash
# Verifica que creaste el webhook en Stripe con la URL correcta
# Verifica que STRIPE_WEBHOOK_SECRET esté actualizado
# Revisa logs del backend para ver errores de webhook
```

## 📚 Recursos

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [PostgreSQL en DigitalOcean](https://docs.digitalocean.com/products/databases/postgresql/)
