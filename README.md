
# Instrucciones de Configuración del Proyecto

Instrucciones necesarias para configurar y ejecutar el proyecto.

## Configuración Inicial

### Instalación de Dependencias en `/web_src/`

Para configurar la parte del proyecto que se encuentra en la ruta `/web_src/`:

1. Navegar al directorio `/web_src/`:
   ```bash
   cd web_src/
   ```

2. Instalar las dependencias de Node.js usando npm:
   ```bash
   npm install
   ```

### Compilación del Código

Compilar usando Gulp de las siguientes maneras:

- **Build**: Para construir el proyecto y prepararlo para la producción:
  ```bash
  gulp build
  ```

- **Watch**: para que Gulp monitoree los cambios y recompile automáticamente:
  ```bash
  gulp watch
  ```

## Ejecución del Proyecto

Para ejecutar el proyecto completo, es necesario instalar las dependencias y arrancar la aplicación desde la raíz del repositorio.

1. Navegar a la raíz del repositorio:
   ```bash
   cd ..
   ```

2. Instalar las dependencias de Node.js:
   ```bash
   npm install
   ```

3. Ejecutar la aplicación:
   ```bash
   node app.js
   ```
