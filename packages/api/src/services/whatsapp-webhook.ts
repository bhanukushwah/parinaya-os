import { createHmac, timingSafeEqual } from "node:crypto";

import { db } from "@parinaya-os/db";
import {
	type inviteMessageLifecycleStatusEnum,
	inviteMessages,
	inviteWebhookReceipts,
} from "@parinaya-os/db/schema/whatsapp";
import { env } from "@parinaya-os/env/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { applyLifecycleTransition } from "./whatsapp-lifecycle";
import {
	buildRsvpConfirmationMessage,
	buildRsvpPromptMessage,
	sendRsvpPrompt,
} from "./whatsapp-provider";
import { handleWhatsAppRsvpInput } from "./whatsapp-rsvp-handler";

type LifecycleStatus =
	(typeof inviteMessageLifecycleStatusEnum.enumValues)[number];

const statusSchema = z.enum(["sent", "delivered", "read", "failed"]);

const webhookPayloadSchema = z.object({
	entry: z.array(
		z.object({
			changes: z.array(
				z.object({
					value: z.object({
						metadata: z
							.object({
								phone_number_id: z.string().optional(),
							})
							.optional(),
						statuses: z
							.array(
								z.object({
									id: z.string().min(1),
									status: statusSchema,
									timestamp: z.string().optional(),
								}),
							)
							.optional(),
						messages: z
							.array(
								z.object({
									id: z.string().min(1),
									from: z.string().min(1),
									timestamp: z.string().optional(),
									text: z
										.object({
											body: z.string().optional(),
										})
										.optional(),
									context: z
										.object({
											id: z.string().optional(),
										})
										.optional(),
								}),
							)
							.optional(),
					}),
				}),
			),
		}),
	),
});

type NormalizedWebhookStatus = {
	providerMessageId: string;
	status: LifecycleStatus;
	eventAt: Date | null;
};

type NormalizedInboundMessage = {
	fromPhone: string;
	providerMessageId: string;
	contextMessageId: string | null;
	messageText: string;
};

export type ProcessWebhookResult = {
	authenticated: boolean;
	processedEvents: number;
	ignoredEvents: number;
	rejectedEvents: number;
};

function verifyWebhookSignature(
	rawBody: string,
	signatureHeader: string | null,
) {
	if (!signatureHeader?.startsWith("sha256=")) {
		return false;
	}

	const expected = `sha256=${createHmac(
		"sha256",
		env.WHATSAPP_WEBHOOK_APP_SECRET,
	)
		.update(rawBody)
		.digest("hex")}`;

	const expectedBuffer = Buffer.from(expected);
	const signatureBuffer = Buffer.from(signatureHeader);

	if (expectedBuffer.length !== signatureBuffer.length) {
		return false;
	}

	return timingSafeEqual(expectedBuffer, signatureBuffer);
}

function normalizeWebhookStatuses(payload: unknown): NormalizedWebhookStatus[] {
	const parsed = webhookPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		return [];
	}

	const events: NormalizedWebhookStatus[] = [];
	for (const entry of parsed.data.entry) {
		for (const change of entry.changes) {
			for (const status of change.value.statuses ?? []) {
				events.push({
					providerMessageId: status.id,
					status: status.status,
					eventAt: status.timestamp
						? new Date(Number(status.timestamp) * 1000)
						: null,
				});
			}
		}
	}

	return events;
}

function normalizeInboundMessages(
	payload: unknown,
): NormalizedInboundMessage[] {
	const parsed = webhookPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		return [];
	}

	const events: NormalizedInboundMessage[] = [];
	for (const entry of parsed.data.entry) {
		for (const change of entry.changes) {
			for (const message of change.value.messages ?? []) {
				const body = message.text?.body?.trim();
				if (!body) {
					continue;
				}

				events.push({
					fromPhone: message.from,
					providerMessageId: message.id,
					contextMessageId: message.context?.id ?? null,
					messageText: body,
				});
			}
		}
	}

	return events;
}

function makeDedupeKey(event: NormalizedWebhookStatus) {
	return `${event.providerMessageId}:${event.status}:${event.eventAt?.toISOString() ?? "none"}`;
}

export async function processWhatsAppWebhook(input: {
	rawBody: string;
	headers: Headers;
}): Promise<ProcessWebhookResult> {
	const signatureHeader = input.headers.get("x-hub-signature-256");
	const authenticated = verifyWebhookSignature(input.rawBody, signatureHeader);

	if (!authenticated) {
		await db.insert(inviteWebhookReceipts).values({
			id: crypto.randomUUID(),
			weddingId: null,
			inviteMessageId: null,
			providerMessageId: null,
			eventStatus: null,
			eventAt: null,
			authResult: "invalid_signature",
			receiptStatus: "rejected",
			dedupeKey: `invalid-signature:${Date.now()}:${crypto.randomUUID()}`,
			payload: {
				rawBody: input.rawBody,
			},
			headers: {
				xHubSignature256: signatureHeader,
			},
			errorDetail: "Webhook signature verification failed.",
			processedAt: new Date(),
		});

		return {
			authenticated: false,
			processedEvents: 0,
			ignoredEvents: 0,
			rejectedEvents: 1,
		};
	}

	let payload: unknown;
	try {
		payload = JSON.parse(input.rawBody);
	} catch {
		await db.insert(inviteWebhookReceipts).values({
			id: crypto.randomUUID(),
			weddingId: null,
			inviteMessageId: null,
			providerMessageId: null,
			eventStatus: null,
			eventAt: null,
			authResult: "invalid_payload",
			receiptStatus: "rejected",
			dedupeKey: `invalid-payload:${Date.now()}:${crypto.randomUUID()}`,
			payload: {
				rawBody: input.rawBody,
			},
			headers: {
				xHubSignature256: signatureHeader,
			},
			errorDetail: "Webhook body was not valid JSON.",
			processedAt: new Date(),
		});

		return {
			authenticated: true,
			processedEvents: 0,
			ignoredEvents: 0,
			rejectedEvents: 1,
		};
	}

	const statuses = normalizeWebhookStatuses(payload);
	const inboundMessages = normalizeInboundMessages(payload);
	if (statuses.length === 0) {
		if (inboundMessages.length === 0) {
			return {
				authenticated: true,
				processedEvents: 0,
				ignoredEvents: 0,
				rejectedEvents: 0,
			};
		}
	}

	let processedEvents = 0;
	let ignoredEvents = 0;
	let rejectedEvents = 0;

	for (const statusEvent of statuses) {
		const dedupeKey = makeDedupeKey(statusEvent);

		const existing = await db.query.inviteWebhookReceipts.findFirst({
			where: eq(inviteWebhookReceipts.dedupeKey, dedupeKey),
			columns: {
				id: true,
			},
		});

		if (existing) {
			ignoredEvents += 1;
			continue;
		}

		const message = await db.query.inviteMessages.findFirst({
			where: eq(
				inviteMessages.providerMessageId,
				statusEvent.providerMessageId,
			),
			columns: {
				id: true,
				weddingId: true,
			},
		});

		const [receipt] = await db
			.insert(inviteWebhookReceipts)
			.values({
				id: crypto.randomUUID(),
				weddingId: message?.weddingId ?? null,
				inviteMessageId: message?.id ?? null,
				providerMessageId: statusEvent.providerMessageId,
				eventStatus: statusEvent.status,
				eventAt: statusEvent.eventAt,
				authResult: "verified",
				receiptStatus: "ignored",
				dedupeKey,
				payload,
				headers: {
					xHubSignature256: signatureHeader,
				},
			})
			.returning({
				id: inviteWebhookReceipts.id,
			});

		if (!receipt) {
			rejectedEvents += 1;
			continue;
		}

		if (!message) {
			await db
				.update(inviteWebhookReceipts)
				.set({
					receiptStatus: "ignored",
					errorDetail: "No invite message found for provider message id.",
					processedAt: new Date(),
				})
				.where(eq(inviteWebhookReceipts.id, receipt.id));

			ignoredEvents += 1;
			continue;
		}

		const transitionResult = await applyLifecycleTransition({
			providerMessageId: statusEvent.providerMessageId,
			toStatus: statusEvent.status,
			providerEventAt: statusEvent.eventAt,
			webhookReceiptId: receipt.id,
		});

		if (!transitionResult) {
			await db
				.update(inviteWebhookReceipts)
				.set({
					receiptStatus: "rejected",
					errorDetail: "Lifecycle transition could not be applied.",
					processedAt: new Date(),
				})
				.where(eq(inviteWebhookReceipts.id, receipt.id));
			rejectedEvents += 1;
			continue;
		}

		await db
			.update(inviteWebhookReceipts)
			.set({
				receiptStatus: transitionResult.applied ? "accepted" : "ignored",
				errorDetail: transitionResult.applied ? null : transitionResult.reason,
				processedAt: new Date(),
			})
			.where(
				and(
					eq(inviteWebhookReceipts.id, receipt.id),
					eq(inviteWebhookReceipts.dedupeKey, dedupeKey),
				),
			);

		if (transitionResult.applied) {
			processedEvents += 1;
		} else {
			ignoredEvents += 1;
		}
	}

	for (const inboundMessage of inboundMessages) {
		if (!inboundMessage.contextMessageId) {
			ignoredEvents += 1;
			continue;
		}

		const outboundInviteMessage = await db.query.inviteMessages.findFirst({
			where: eq(
				inviteMessages.providerMessageId,
				inboundMessage.contextMessageId,
			),
			columns: {
				weddingId: true,
				eventId: true,
			},
		});

		if (!outboundInviteMessage) {
			ignoredEvents += 1;
			continue;
		}

		const rsvpResult = await handleWhatsAppRsvpInput({
			weddingId: outboundInviteMessage.weddingId,
			eventId: outboundInviteMessage.eventId,
			phoneE164: inboundMessage.fromPhone,
			messageText: inboundMessage.messageText,
			providerMessageId: inboundMessage.providerMessageId,
		});

		const promptText =
			rsvpResult.status === "completed" && rsvpResult.summary
				? buildRsvpConfirmationMessage({
						accepted: rsvpResult.summary.accepted,
						declined: rsvpResult.summary.declined,
						nextActionLabel: "UPDATE",
					})
				: buildRsvpPromptMessage({
						step: rsvpResult.step,
						label: rsvpResult.label,
						guidance: rsvpResult.message,
					});

		await sendRsvpPrompt({
			recipientPhoneE164: inboundMessage.fromPhone,
			message: promptText,
			nextActionLabel:
				rsvpResult.nextAction === "attendance"
					? "Share person updates"
					: rsvpResult.nextAction === "confirm"
						? "Reply confirm"
						: rsvpResult.nextAction === "done"
							? "Reply update"
							: "Reply accept or decline",
		});

		processedEvents += 1;
	}

	return {
		authenticated: true,
		processedEvents,
		ignoredEvents,
		rejectedEvents,
	};
}
