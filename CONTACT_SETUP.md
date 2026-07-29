# Conexión del formulario

El formulario envía un `POST /api/contact` a una función de Vercel. La función
valida los datos, aplica protecciones básicas contra spam y envía el encargo
mediante Resend.

## Variables de entorno

Configurar en Vercel para `Preview` y `Production`:

- `RESEND_API_KEY`: clave privada de Resend. La función también reconoce
  `resend_RESEND_API_KEY`, el nombre prefijado que puede crear la integración
  nativa de Resend en Vercel Marketplace.
- `CONTACT_TO`: correo que recibirá los encargos.
- `CONTACT_FROM`: remitente de un dominio verificado.
- `CONTACT_CONFIRMATION_ENABLED`: `true` para enviar también una confirmación
  al visitante; mantener `false` hasta verificar el dominio.

Nunca se debe copiar `RESEND_API_KEY` a una variable `VITE_*` ni incluirla en el
repositorio.

## Activación recomendada

1. Crear o conectar Resend desde el Marketplace de Vercel.
2. Añadir `donkeyindustrial.com` en Resend y publicar sus registros SPF y DKIM.
3. Configurar `CONTACT_FROM`, por ejemplo:
   `DONKEY Industrial <proyectos@donkeyindustrial.com>`.
4. Mantener `CONTACT_CONFIRMATION_ENABLED=false` durante la primera prueba.
5. Enviar un encargo real desde la preview y comprobar su llegada.
6. Activar la confirmación y repetir la prueba.

Sin `RESEND_API_KEY`, el endpoint responde con `503` y el formulario indica que
se puede escribir directamente a `hola@donkeyindustrial.com`.
