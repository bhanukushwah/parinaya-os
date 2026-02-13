import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { audienceRouter } from "./audience";
import { auditRouter } from "./audit";
import { eventsRouter } from "./events";
import { governanceRouter } from "./governance";
import { guestImportsRouter } from "./guest-imports";
import { guestsRouter } from "./guests";
import { invitesRouter } from "./invites";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	events: eventsRouter,
	governance: governanceRouter,
	guests: guestsRouter,
	guestImports: guestImportsRouter,
	audit: auditRouter,
	audience: audienceRouter,
	invites: invitesRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
