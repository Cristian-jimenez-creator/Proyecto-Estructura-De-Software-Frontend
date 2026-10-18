# Frontend

Panel web responsive de monitoreo para operadores. React + Vite; consulta la API del backend y recibe cambios en vivo mediante Socket.IO.

## Desarrollo local

1. Copia `.env.example` a `.env` y verifica `VITE_API_URL` y `VITE_SOCKET_URL`.
2. Ejecuta `npm install` y `npm run dev`.
3. Inicia backend y base de datos siguiendo `../backend/README.md`.
4. Accede con el usuario y la contraseña configurados para el seed.

Las variables `VITE_*` se incorporan al paquete público del navegador; solo deben contener URLs públicas. Nunca guardes secretos del dispositivo, contraseñas de base de datos ni claves JWT aquí.

## Despliegue

Despliega esta carpeta en un hosting estático o mediante Docker. Define `VITE_API_URL` como la URL HTTPS del backend con `/api/v1` y `VITE_SOCKET_URL` como el origen HTTPS del backend. La URL debe configurarse antes de ejecutar la compilación del frontend. Añade el origen del sitio a `FRONTEND_ORIGIN` en el backend.
