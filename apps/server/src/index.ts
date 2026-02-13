import { cors } from "@elysiajs/cors";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@parinaya-os/api/context";
import { appRouter } from "@parinaya-os/api/routers/index";
import { processWhatsAppWebhook } from "@parinaya-os/api/services/whatsapp-webhook";
import { auth } from "@parinaya-os/auth";
import { env } from "@parinaya-os/env/server";
import { Elysia } from "elysia";

const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});
const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

new Elysia()
	.use(
		cors({
			origin: env.CORS_ORIGIN,
			methods: ["GET", "POST", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.all("/api/auth/*", async (context) => {
		const { request, status } = context;
		if (["POST", "GET"].includes(request.method)) {
			return auth.handler(request);
		}
		return status(405);
	})
	.get("/webhooks/whatsapp", ({ request }) => {
		const url = new URL(request.url);
		const mode = url.searchParams.get("hub.mode");
		const token = url.searchParams.get("hub.verify_token");
		const challenge = url.searchParams.get("hub.challenge");

		if (
			mode === "subscribe" &&
			token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
			challenge
		) {
			return new Response(challenge, { status: 200 });
		}

		return new Response("Forbidden", { status: 403 });
	})
	.post("/webhooks/whatsapp", async ({ request }) => {
		const rawBody = await request.text();
		const result = await processWhatsAppWebhook({
			rawBody,
			headers: request.headers,
		});

		if (!result.authenticated) {
			return new Response("Unauthorized", { status: 401 });
		}

		return new Response("EVENT_RECEIVED", { status: 200 });
	})
	.all("/rpc*", async (context) => {
		const { response } = await rpcHandler.handle(context.request, {
			prefix: "/rpc",
			context: await createContext({ context }),
		});
		return response ?? new Response("Not Found", { status: 404 });
	})
	.all("/api*", async (context) => {
		const { response } = await apiHandler.handle(context.request, {
			prefix: "/api-reference",
			context: await createContext({ context }),
		});
		return response ?? new Response("Not Found", { status: 404 });
	})
	.get("/", () => "OK")
	.listen(3000, () => {
		console.log("Server is running on http://localhost:3000");
	});
