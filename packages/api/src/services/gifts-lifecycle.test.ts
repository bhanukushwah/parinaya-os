import { describe, expect, it } from "bun:test";

import {
	canManageGiftsRole,
	resolveGiftsModeTransition,
	validatePrePublishNoteForPublish,
} from "./gifts-lifecycle";

describe("gifts lifecycle service", () => {
	it("enforces allowed transition matrix", () => {
		expect(
			resolveGiftsModeTransition({
				action: "publish",
				currentStatus: "draft",
			}),
		).toBe("published");

		expect(
			resolveGiftsModeTransition({
				action: "publish",
				currentStatus: "hidden",
			}),
		).toBe("published");

		expect(
			resolveGiftsModeTransition({
				action: "hide",
				currentStatus: "published",
			}),
		).toBe("hidden");

		expect(
			resolveGiftsModeTransition({
				action: "disable",
				currentStatus: "published",
			}),
		).toBe("disabled");

		expect(
			resolveGiftsModeTransition({
				action: "disable",
				currentStatus: "hidden",
			}),
		).toBe("disabled");
	});

	it("rejects invalid transitions", () => {
		expect(() =>
			resolveGiftsModeTransition({
				action: "hide",
				currentStatus: "draft",
			}),
		).toThrow("Gifts can only be hidden when currently published.");

		expect(() =>
			resolveGiftsModeTransition({
				action: "publish",
				currentStatus: "published",
			}),
		).toThrow("Gifts can only be published from draft or hidden state.");

		expect(() =>
			resolveGiftsModeTransition({
				action: "disable",
				currentStatus: "draft",
			}),
		).toThrow("Gifts can only be disabled from published or hidden state.");
	});

	it("requires pre-publish note only for publish action", () => {
		expect(() =>
			validatePrePublishNoteForPublish({
				action: "publish",
				prePublishNote: null,
			}),
		).toThrow("Pre-publish note is required before publishing gifts mode.");

		expect(() =>
			validatePrePublishNoteForPublish({
				action: "publish",
				prePublishNote: "  ",
			}),
		).toThrow("Pre-publish note is required before publishing gifts mode.");

		expect(() =>
			validatePrePublishNoteForPublish({
				action: "hide",
				prePublishNote: null,
			}),
		).not.toThrow();
	});

	it("allows only admin and coordinator gift operators", () => {
		expect(canManageGiftsRole("admin")).toBe(true);
		expect(canManageGiftsRole("coordinator")).toBe(true);
		expect(canManageGiftsRole("owner")).toBe(false);
		expect(canManageGiftsRole(null)).toBe(false);
	});
});
