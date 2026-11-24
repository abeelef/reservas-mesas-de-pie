# Mesas de pie · Aqaia Igualada

Aplicación de reservas compartidas para cuatro mesas en disposición 2 × 2, enfrentadas. Interfaz en español, azul y con logo obtenido de https://www.aqaia.com/wp-content/uploads/2020/02/cropped-Aqaia_color-1.png (marca de Aqaia; sin cesión de derechos).

## Arrancar

Python 3.9 o superior, sin dependencias externas:

```sh
python server.py
```

Abre http://localhost:8000. Para que la oficina comparta las reservas, todos deben acceder al mismo servidor. SQLite guarda los datos en `data/bookings.sqlite3`; realiza copias de seguridad de ese archivo. No usar GitHub Pages: solo sirve archivos estáticos y no ejecuta la API.

```sh
docker build -t aqaia-mesas .
docker run -p 8000:8000 -v aqaia-mesas:/data aqaia-mesas
```

## Funcionamiento

- Cuatro mesas, agenda por día, reserva y cancelación propia.
- Laborables de 08:00 a 18:00, intervalos de 30 minutos y hasta 14 días de antelación.
- Hasta 2 horas por navegador y día; evita solapes de mesa y del mismo navegador con una transacción SQLite.
- Hora de referencia Europe/Madrid. Actualización cada 30 segundos.
- No contiene reservas ficticias ni información de empleados en el repositorio.

## Antes del uso real

Esta primera versión identifica al usuario con una cookie aleatoria HttpOnly. La cancelación se limita a ese navegador. No hay login corporativo: borrar la cookie permite eludir el límite diario y escribir otro nombre. Para garantizar cuotas por empleado, añadir SSO corporativo e identificar reservas por su cuenta verificada.

Desplegar detrás de HTTPS, configurar `COOKIE_SECURE=1` y restringir el acceso a la red de oficina/VPN o autenticación del proxy: la agenda contiene los nombres introducidos. No exponer directamente el servidor Python a Internet. `PORT` y `DATABASE_PATH` son configurables. La publicación del código no publica la aplicación ni sus datos.

## Pruebas

```sh
python -m unittest discover -s tests -v
```
