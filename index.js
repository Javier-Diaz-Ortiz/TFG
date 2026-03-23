import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";

// 1. Configurar el cliente de PrestaShop directamente
const client = axios.create({
    baseURL: "http://localhost:8080/api", // URL Docker
    params: {
        output_format: "JSON",
        display: "full"
    },
    auth: {
        username: "QFHB3MNUS2CTTXI4Z7I21VK675VQL71V", // clave API
        password: ""
    },
});

// 2. Crear el servidor MCP
const server = new McpServer({
    name: "prestashop-agent",
    version: "1.0.0"
});

// 3. Definir y manejar la herramienta
server.registerTool(
    "get_all_products",
    {
        description: "Lista todos los productos de la tienda PrestaShop.",
        inputSchema: {}
    },
    async () => {
        try {
            const response = await client.get("/products");
            const products = response.data.products || [];

            const listado = products.map((p) => ({
                id: p.id,
                name: Array.isArray(p.name) ? p.name[0].value : p.name,
                price: `${parseFloat(p.price).toFixed(2)}€`
            }));

            return {
                content: [{ type: "text", text: JSON.stringify(listado, null, 2) }],
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error API: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// 5. Conectar (stderr para logs)
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Servidor conectado correctamente");
}

run();