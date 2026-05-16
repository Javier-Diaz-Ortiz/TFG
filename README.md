# Servidor MCP para PrestaShop (Dockerizado)

Este proyecto levanta un entorno completo de pruebas con **PrestaShop 8.1**, **MariaDB** y un **Servidor MCP** en Node.js que permite a la IA (como Claude Desktop) interactuar directamente con la base de datos de tu tienda.

## 🚀 Requisitos Previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado y en ejecución.
- [Claude Desktop](https://claude.ai/download) instalado.

---

## 🛠️ Paso 1: Despliegue del entorno

Abre una terminal en la carpeta raíz del proyecto y ejecuta:

```bash
docker-compose up -d --build
```

Esto descargará las imágenes e iniciará 3 contenedores:
1. `mcp-server-mariadb-1`: Base de datos.
2. `mcp-server-prestashop-1`: Tienda online.
3. `mcp-server`: El servidor intermediario (MCP) que usará Claude.

*(Nota: La primera vez que lo ejecutes, PrestaShop tardará un par de minutos en instalarse por completo. Ten paciencia antes de intentar acceder).*

---

## ⚙️ Paso 2: Configuración de la API en PrestaShop

Por defecto, PrestaShop trae su API (Webservice) desactivada por seguridad. Tienes que habilitarla manualmente para que el servidor MCP pueda "hablar" con la tienda.

1. Entra al panel de administración de PrestaShop:
   👉 **URL:** [http://localhost:8090/admin_panel](http://localhost:8090/admin_panel)
   👉 **Email:** `admin@prestashop.com`
   👉 **Contraseña:** `password123`

2. Ve a **Parámetros Avanzados > Webservice**.

3. **Activa el Webservice globalmente:**
   Ve abajo del todo, en la sección *Configuración*, marca **"Activar el webservice de PrestaShop" en SÍ** y dale a Guardar.

4. **Configura la clave de la API:**
   - En la misma pantalla, dale a **Añadir una nueva clave del webservice**.
   - En el campo "Clave", pega exactamente la clave que tienes en tu `docker-compose.yml`
   - En **Estado**, marca **SÍ**.
   - En la tabla de **Permisos**, marca la casilla de la cabecera para seleccionar **todos los permisos** (Ver, Modificar, Añadir, Eliminar) para todos los recursos.
   - Dale a **Guardar**.

---

## 🤖 Paso 3: Conectar Claude Desktop

Claude necesita saber cómo hablar con tu servidor MCP. Para ello, tienes que decirle que ejecute un comando dentro de tu contenedor de Docker.

1. Abre la configuración de Claude Desktop. En Windows, normalmente está en:
   `%APPDATA%\Claude\claude_desktop_config.json`

2. Asegúrate de que el archivo tenga la siguiente estructura:

```json
{
  "mcpServers": {
    "prestashop-agent": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "mcp-server",
        "node",
        "index.js"
      ]
    }
  }
}
```

3. **Reinicia Claude Desktop** por completo (ciérralo desde la bandeja del sistema y vuelve a abrirlo) para que lea la nueva configuración.

---

## 🎯 Paso 4: ¡A probar!

Con todo configurado y activo, abre un chat con Claude y dale una instrucción natural, como por ejemplo:

- *"¿Puedes listar los productos de mi tienda?"*
- *"Crea un producto nuevo que se llame 'Gafas de Sol' por 20€ con 10 unidades de stock."*
- *"Busca si tengo algún pedido pendiente."*

Claude utilizará el contenedor `mcp-server` de fondo para ejecutar la acción en PrestaShop y te devolverá el resultado al instante.
