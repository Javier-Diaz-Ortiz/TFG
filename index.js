import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import { z } from "zod";
// 1. Configurar el cliente de PrestaShop
const client = axios.create({
    baseURL: process.env.PS_API_URL,
    params: { output_format: "JSON" },
    auth: {
        username: process.env.PS_API_KEY,
        password: ""
    },
    validateStatus: (status) => status < 500
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
// Herramienta update_stock
server.registerTool(
    "update_stock",
    {
        description: "Actualiza el stock de un producto de la tienda PrestaShop.",
        inputSchema: z.object({
            product_id: z.number().describe("ID del producto a actualizar"),
            quantity: z.number().describe("Nueva cantidad en stock")
        })
    },
    async ({ product_id, quantity }) => {
        try {
            const stockResponse = await client.get("/stock_availables", {
                params: {
                    "filter[id_product]": `[${product_id}]`,
                    display: "[id]"
                }
            });

            const stockAvailables = stockResponse.data.stock_availables;
            if (!stockAvailables || stockAvailables.length === 0) {
                return {
                    content: [{ type: "text", text: `No se encontró stock para el producto ${product_id}` }],
                    isError: true,
                };
            }

            const stockId = stockAvailables[0].id;

            await client.patch(`/stock_availables/${stockId}`,
                `<?xml version="1.0" encoding="UTF-8"?><prestashop xmlns:xlink="http://www.w3.org/1999/xlink"><stock_available><id><![CDATA[${stockId}]]></id><quantity><![CDATA[${quantity}]]></quantity></stock_available></prestashop>`,
                { headers: { "Content-Type": "application/xml" } }
            );

            return {
                content: [{ type: "text", text: `Stock del producto ${product_id} actualizado a ${quantity} unidades` }],
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// Herramienta update_order_status
server.registerTool(
    "update_order_status",
    {
        description: "Cambia el estado de un pedido de la tienda PrestaShop.",
        inputSchema: {
            order_id: z.number().describe("ID del pedido a actualizar"),
            state_id: z.number().describe("ID del nuevo estado del pedido")
        }
    },
    async ({ order_id, state_id }) => {
        try {
            await client.post("/order_histories",
                `<?xml version="1.0" encoding="UTF-8"?><prestashop xmlns:xlink="http://www.w3.org/1999/xlink"><order_history><id_order><![CDATA[${order_id}]]></id_order><id_order_state><![CDATA[${state_id}]]></id_order_state></order_history></prestashop>`,
                { headers: { "Content-Type": "application/xml" } }
            );

            return {
                content: [{ type: "text", text: `Estado del pedido ${order_id} actualizado al estado ${state_id}` }],
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "create_product",
    {
        description: "Crea un nuevo producto en la tienda PrestaShop.",
        inputSchema: {
            name: z.string().describe("Nombre del producto"),
            price: z.number().describe("Precio del producto"),
            description: z.string().describe("Descripción del producto"),
            quantity: z.number().describe("Cantidad en stock")
        }
    },
    async ({ name, price, description, quantity }) => {
        try {
            // 1. Crear el producto
            const response = await client.post("/products",
                `<?xml version="1.0" encoding="UTF-8"?>
    <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
        <product>
            <price><![CDATA[${price}]]></price>
            <active><![CDATA[1]]></active>
            <id_category_default><![CDATA[2]]></id_category_default>
            <id_tax_rules_group><![CDATA[1]]></id_tax_rules_group>
            <name>
                <language id="1"><![CDATA[${name}]]></language>
            </name>
            <description>
                <language id="1"><![CDATA[${description}]]></language>
            </description>
            <description_short>
                <language id="1"><![CDATA[${description}]]></language>
            </description_short>
        </product>
    </prestashop>`,
                {
                    headers: { "Content-Type": "application/xml" },
                    params: { output_format: "XML" }
                }
            );

            // 2. Obtener el stock ID del xlink de la respuesta
            const xmlResponse = response.data;
            const productIdMatch = xmlResponse.match(/<product>[\s\S]*?<id>[\s\S]*?<!\[CDATA\[(\d+)\]\]>/);
            const stockIdMatch = xmlResponse.match(/stock_availables\/(\d+)/);
            const productId = productIdMatch ? productIdMatch[1] : null;
            const stockId = stockIdMatch ? stockIdMatch[1] : null;

            // 3. Actualizar el stock
            if (stockId && quantity > 0) {
                await client.patch(`/stock_availables/${stockId}`,
                    `<?xml version="1.0" encoding="UTF-8"?><prestashop xmlns:xlink="http://www.w3.org/1999/xlink"><stock_available><id><![CDATA[${stockId}]]></id><quantity><![CDATA[${quantity}]]></quantity></stock_available></prestashop>`,
                    { headers: { "Content-Type": "application/xml" } }
                );
            }

            return {
                content: [{ type: "text", text: `Producto "${name}" creado correctamente con ID ${productId} y stock de ${quantity} unidades` }],
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }
);

server.registerTool(
    "search_orders",
    {
        description: "Busca pedidos en la tienda PrestaShop filtrando por estado y/o fecha.",
        inputSchema: {
            state_id: z.number().optional().describe("ID del estado del pedido (opcional)"),
            date_from: z.string().optional().describe("Fecha de inicio en formato YYYY-MM-DD (opcional)"),
            date_to: z.string().optional().describe("Fecha de fin en formato YYYY-MM-DD (opcional)")
        }
    },
    async ({ state_id, date_from, date_to }) => {
        try {
            const params = {
                display: "[id,reference,current_state,date_add,total_paid]"
            };

            if (state_id) {
                params["filter[current_state]"] = `[${state_id}]`;
            }

            if (date_from || date_to) {
                params["date"] = 1;
                const from = date_from ? `${date_from} 00:00:00` : "2000-01-01 00:00:00";
                const to = date_to ? `${date_to} 23:59:59` : "2099-12-31 23:59:59";
                params["filter[date_add]"] = `[${from},${to}]`;
            }

            const response = await client.get("/orders", { params });
            const orders = response.data.orders || [];

            if (orders.length === 0) {
                return {
                    content: [{ type: "text", text: "No se encontraron pedidos con los filtros especificados." }],
                };
            }

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