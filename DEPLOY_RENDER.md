# Despliegue en Render (Conares Platform)

## 1. Requisitos

- Repositorio subido a GitHub con la rama actual.
- Cuenta en Render.

## 2. Despliegue recomendado (Blueprint)

1. En Render, ve a **New +** -> **Blueprint**.
2. Conecta tu repositorio.
3. Render detectara automaticamente el archivo `render.yaml`.
4. Crea el servicio.
5. Espera a que termine el primer build.

## 3. Configuracion de entorno

El despliegue ya define estas variables en `render.yaml`:

- `NODE_ENV=production`
- `CORS_ORIGIN=*`
- `NODE_VERSION=20`

Si luego separas frontend y backend en dominios distintos, cambia `CORS_ORIGIN` por el dominio real del frontend.

## 4. Healthcheck

Render usara este endpoint:

- `/api/health`

Respuesta esperada:

```json
{
  "status": "ok",
  "timestamp": "2026-07-21T00:00:00.000Z"
}
```

## 5. Validacion post deploy

1. Abre la URL publica de Render.
2. Verifica que cargue el frontend.
3. Verifica API de salud en `https://TU_URL.onrender.com/api/health`.
4. Revisa modulos: clientes, cotizaciones, proyectos y facturacion.

## 6. Importante sobre persistencia

Actualmente la logica usa almacenamiento en memoria (mock data). Esto significa:

- Al reiniciar el servicio se pueden perder cambios.
- Para produccion real se recomienda migrar a PostgreSQL.

## 7. Checklist de produccion minima

- [ ] Deploy en estado **Live**.
- [ ] Endpoint `/api/health` respondiendo OK.
- [ ] CORS ajustado al dominio final si aplica.
- [ ] Pruebas de flujo completas en frontend.
- [ ] Plan de base de datos definido para persistencia real.
