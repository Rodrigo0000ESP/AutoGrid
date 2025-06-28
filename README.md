# AutoGrid Job Saver

AutoGrid Job Saver es una extensión para navegador que te permite guardar ofertas de trabajo con un solo clic.

## Características

- Interfaz intuitiva con diseño limpio en azul y blanco
- Autenticación de usuarios
- Guardado rápido de ofertas de trabajo
- Atajo de teclado configurable (Ctrl+Shift+S por defecto)
- Diseño responsive

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:

1. **Extensión para navegador**: Ubicada en la carpeta `/extension`
2. **Backend API**: Ubicada en la carpeta `/backend`

## Tecnologías Utilizadas

- Frontend: HTML, CSS, JavaScript (Vanilla)
- Backend: FastAPI (Python)
- Autenticación: JWT

## Instalación

### Requisitos previos

- Python 3.7+
- Node.js (opcional, para desarrollo)

### Configuración del Backend

1. Navega a la carpeta del backend:
   ```
   cd backend
   ```

2. Crea un entorno virtual:
   ```
   python -m venv venv
   ```

3. Activa el entorno virtual:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`

4. Instala las dependencias:
   ```
   pip install -r requirements.txt
   ```

5. Inicia el servidor:
   ```
   uvicorn main:app --reload
   ```

### Instalación de la Extensión

1. Abre Chrome y navega a `chrome://extensions/`
2. Habilita el "Modo desarrollador"
3. Haz clic en "Cargar descomprimida" y selecciona la carpeta `/extension`

## Uso

1. Inicia sesión o regístrate en la extensión
2. Navega a una oferta de trabajo
3. Haz clic en el botón "Guardar oferta" o utiliza el atajo de teclado (Ctrl+Shift+S)

## Licencia

Este proyecto está bajo la licencia MIT.
