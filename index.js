import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";

// 1. Configurar el cliente de PrestaShop
const client = axios.create({
    baseURL: process.env.PS_API_URL,
    params: {
        output_format: "JSON"
    },
    auth: {
        username: process.env.PS_API_KEY,
        password: ""
    },
});

// 2. Crear el servidor MCP
const server = new McpServer({
    name: "prestashop-mcp",
    version: "1.0.0"
});

// 3. Herramienta get_products
server.registerTool(
    "get_products",
    {
        description: "Lista los productos de la tienda PrestaShop.",
        inputSchema: {}
    },
    async () => {
        try {
            const response = await client.get("/products", {
                params: {
                    display: "[id,name,price,quantity]"
                }
            });
            const products = response.data.products || [];

            const listado = products.map((p) => ({
                id: p.id,
                name: Array.isArray(p.name) ? p.name[0].value : p.name,
                price: `${parseFloat(p.price).toFixed(2)}€`,
                quantity: p.quantity
            }));

            return {
                content: [{ type: "text", text: JSON.stringify(listado, null, 2) }],
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// 4. Herramienta get_orders
server.registerTool(
    "get_orders",
    {
        description: "Lista los pedidos de la tienda PrestaShop.",
        inputSchema: {}
    },
    async () => {
        try {
            const response = await client.get("/orders", {
                params: {
                    display: "[id,reference,current_state,date_add,total_paid]"
                }
            });
            const orders = response.data.orders || [];

            const listado = orders.map((o) => ({
                id: o.id,
                reference: o.reference,
                state: o.current_state,
                date: o.date_add,
                total: `${parseFloat(o.total_paid).toFixed(2)}€`
            }));

            return {
                content: [{ type: "text", text: JSON.stringify(listado, null, 2) }],
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// 5. Arrancar el servidor
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Servidor MCP conectado correctamente");
}

run();