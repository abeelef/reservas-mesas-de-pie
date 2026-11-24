# Mesas de pie · Aqaia Igualada

Web de reservas para 4 mesas en disposición 2 × 2, enfrentadas. Incluye `public/index.html`, API en Cloudflare Workers y almacenamiento compartido en Cloudflare D1. No necesita Python, Docker ni un servidor propio. Se despliega como **Worker con Static Assets**, no como Pages estático.

Logo obtenido de la [web oficial de Aqaia](https://www.aqaia.com/wp-content/uploads/2020/02/cropped-Aqaia_color-1.png). La marca pertenece a Aqaia.

## Primer despliegue en Cloudflare

Necesitas una cuenta Cloudflare y Node.js 22 o superior en tu ordenador. Usa el plan gratuito; no hace falta activar Workers Paid para este proyecto. El servicio está sujeto a los límites de Workers y D1 del plan contratado.

### 1. Descargar e instalar

```sh
git clone https://github.com/abeelef/reservas-mesas-de-pie.git
cd reservas-mesas-de-pie
npm ci
npx wrangler login
```

El último comando abre Cloudflare en el navegador para autorizar Wrangler. No pegues credenciales ni tokens en el código o el chat.

### 2. Crear la base de datos

```sh
npx wrangler d1 create aqaia-mesas
```

Copia el `database_id` que devuelve Cloudflare y sustituye el valor `00000000-0000-0000-0000-000000000000` de `wrangler.jsonc`. Conserva el binding `DB`, el nombre `aqaia-mesas` y `migrations_dir`. El ID no es una contraseña y puede guardarse en GitHub. No crees otra base de datos si ya existe: consulta `npx wrangler d1 list`.

### 3. Crear las tablas en producción

```sh
npm run db:remote
```

Revisa la cuenta/base de datos indicada y confirma la aplicación de la migración. Este paso crea la tabla, índices y reglas de reservas. Las migraciones se registran y no se reaplican en futuras ejecuciones.

### 4. Publicar la web y API juntas

```sh
npm run deploy
```

Wrangler publica el Worker y la carpeta `public`, y muestra la dirección HTTPS `workers.dev` de la web. En esa dirección `/` muestra `public/index.html` y `/api/bookings` ejecuta la API. No tienes que configurar un directorio de salida, comando de build ni subir un ZIP de HTML a Pages.

Si ya habías creado un proyecto Pages, puedes dejar de usarlo: este despliegue crea un Worker independiente llamado `reservas-mesas-de-pie`. No borres recursos existentes para instalarlo.

### 5. Comprobar que funciona

1. Abre la URL HTTPS mostrada por Wrangler.
2. Elige un próximo día laborable y crea una reserva de 30 minutos.
3. Abre la misma URL en una ventana de incógnito: debe verse la reserva. Intentar reservar esa mesa a esa hora debe rechazarse.
4. Desde la primera ventana, cancela tu reserva. En incógnito no debe aparecer la opción de cancelarla.
5. En Cloudflare → Workers & Pages → `reservas-mesas-de-pie` → Settings / Bindings comprueba que `DB` apunta a `aqaia-mesas`. En D1 puedes comprobar los registros guardados.

### 6. Guardar la configuración y actualizar

```sh
git add wrangler.jsonc
git commit -m "Configura base de datos D1 de producción"
git push
```

Para publicar cambios posteriores:

```sh
git pull
npm ci
npm test
npm run db:remote
npm run deploy
```

Puedes conectar GitHub desde Workers & Pages → el Worker → Settings → Builds. Selecciona este repositorio y `main`; no se requiere build de frontend. Usa `npm run deploy` como deploy command. Aplica las migraciones remotas antes de publicar código que dependa de tablas nuevas. Desactiva despliegues de otras ramas contra la base de producción; para previews usa un Worker y D1 separados. El despliegue por terminal anterior es suficiente y no depende de esta integración opcional.

## Desarrollo local

```sh
npm ci
npm run db:local
npm run dev
```

Abre la dirección local que muestre Wrangler. La base local está en `.wrangler/` y es independiente de producción. `npm test` comprueba las validaciones del Worker; `python -m unittest discover -s tests -p 'test_*.py'` comprueba las restricciones SQL (solo para desarrollo). No se requieren credenciales Cloudflare para las pruebas locales.

## Reglas y acceso

- Lunes a viernes, 08:00–18:00, turnos de 30 minutos y hasta 14 días de antelación. Horario Europe/Madrid.
- Máximo 2 horas por navegador y día. No permite solapes de la misma mesa ni reservas simultáneas del mismo navegador.
- D1 impone solapes y cuota dentro del INSERT, incluso con peticiones concurrentes. Las cancelaciones solo se permiten a la cookie propietaria.
- Identidad mediante cookie aleatoria HttpOnly, SameSite=Strict y Secure en HTTPS. No hay login corporativo: borrar cookies o usar otro navegador permite eludir el límite y escribir otro nombre. Para cuotas reales por empleado hace falta añadir autenticación y asociar las reservas a la cuenta verificada.
- La URL desplegada es pública por defecto y la agenda muestra los nombres introducidos. Antes de usar nombres reales, protege el sitio con Cloudflare Access/Zero Trust y una política para la oficina, o añade autenticación corporativa. Access protege la entrada, pero esta versión sigue identificando las reservas por navegador.
- El repositorio no contiene reservas ni credenciales. Los registros permanecen en tu D1; el despliegue de código no los reinicia. Configura conservación y copias/exportaciones según las necesidades de la oficina.

## Problemas frecuentes

- **`no such table: bookings`**: ejecuta `npm run db:remote` en la base correcta.
- **Falta DB / base de datos no encontrada**: revisa `database_id` y el binding `DB`, y vuelve a desplegar.
- **Se ve la página pero falla la API**: despliega con `npm run deploy` como Worker con Static Assets; Pages estático no ejecuta `src/worker.js`.
- **No puedes cancelar**: usa el navegador donde reservaste y conserva sus cookies.

Referencias oficiales: [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [D1](https://developers.cloudflare.com/d1/get-started/), [migraciones](https://developers.cloudflare.com/d1/reference/migrations/), [límites Workers](https://developers.cloudflare.com/workers/platform/limits/), [precios D1](https://developers.cloudflare.com/d1/platform/pricing/).
