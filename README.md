# Mesas de pie · Aqaia Igualada

Web estática con 4 mesas enfrentadas, diseño azul y logo de Aqaia. El punto de entrada es `public/index.html`. No necesita instalar dependencias, servidor, Workers ni D1.

**Es una agenda local:** los datos se guardan en localStorage de cada navegador. No se comparten entre compañeros, no garantizan disponibilidad real y se pierden si borras los datos del navegador. La interfaz lo indica expresamente. Permite añadir y cancelar turnos locales, comprobar solapes locales y un máximo local de 2 horas por nombre y día.

## Publicar en Cloudflare Pages desde GitHub

1. En Cloudflare, abre Workers & Pages y crea un proyecto **Pages** conectado a GitHub.
2. Selecciona `abeelef/reservas-mesas-de-pie` y la rama `main`.
3. Framework: **None**. Comando de compilación: **vacío**. Directorio de salida: **public**.
4. Guarda y despliega. Abre la dirección `.pages.dev` que devuelve Cloudflare.

Cada push a `main` actualizará la web si has conectado el repositorio. No uses el antiguo Worker ni su configuración de D1: esta versión se sirve como archivos estáticos. Los recursos anteriores de Cloudflare no se eliminan con este cambio.

También puedes subir directamente el contenido de `public` a un proyecto Pages por carga de archivos. `index.html` debe quedar en la raíz de lo que subas.

## Vista local

```sh
python -m http.server 8000 --directory public
```

Abre http://localhost:8000. Python solo sirve los archivos durante el desarrollo; no es necesario en Cloudflare. Para comprobarlo, guarda un turno, recarga la página y cancélalo. En otro navegador no aparecerá.

Logo descargado de https://www.aqaia.com/wp-content/uploads/2020/02/cropped-Aqaia_color-1.png; la marca pertenece a Aqaia.
