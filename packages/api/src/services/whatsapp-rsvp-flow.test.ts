import { describe, expect, it } from "bun:test";

import {
	advanceRsvpFlow,
	isConfirmationToken,
	parseAttendanceEdits,
	parseRsvpChoice,
} from "./whatsapp-rsvp-flow";

describe("whatsapp rsvp flow", () => {
	it("parses accept and decline choices from natural tokens", () => {
		expect(parseRsvpChoice("accept")).toBe("accept");
		expect(parseRsvpChoice("YES")).toBe("accept");
		expect(parseRsvpChoice("decline")).toBe("decline");
		expect(parseRsvpChoice("no")).toBe("decline");
		expect(parseRsvpChoice("maybe")).toBeNull();
	});

	it("moves new invitee from step 1 to step 2", () => {
		const output = advanceRsvpFlow({
			state: {
				step: 1,
				isCompleted: false,
				finalResponse: null,
				hasExistingResponse: false,
			},
			messageText: "accept",
		});

		expect(output.step).toBe(2);
		expect(output.finalResponse).toBe("accept");
		expect(output.nextAction).toBe("ask-for-attendance-details");
	});

	it("rejects invalid step 1 reply with explicit instruction", () => {
		const output = advanceRsvpFlow({
			state: {
				step: 1,
				isCompleted: false,
				finalResponse: null,
				hasExistingResponse: false,
			},
			messageText: "hello",
		});

		expect(output.step).toBe(1);
		expect(output.nextAction).toBe("invalid-input");
		expect(output.errorMessage).toContain("accept or decline");
	});

	it("parses per-person attendance edits in step 2", () => {
		const edits = parseAttendanceEdits("p1=accept,p2=decline, p3 = yes");
		expect(edits).toEqual([
			{ personId: "p1", response: "accept" },
			{ personId: "p2", response: "decline" },
			{ personId: "p3", response: "accept" },
		]);
	});

	it("moves step 2 to step 3 when per-person edits are supplied", () => {
		const output = advanceRsvpFlow({
			state: {
				step: 2,
				isCompleted: false,
				finalResponse: "accept",
				hasExistingResponse: false,
			},
			messageText: "p1=accept,p2=decline",
			personResponseCount: 2,
		});

		expect(output.step).toBe(3);
		expect(output.isCompleted).toBe(false);
		expect(output.requiresConfirmation).toBe(true);
		expect(output.nextAction).toBe("ask-for-confirmation");
	});

	it("enforces final confirmation at step 3", () => {
		const beforeConfirm = advanceRsvpFlow({
			state: {
				step: 3,
				isCompleted: false,
				finalResponse: "accept",
				hasExistingResponse: false,
			},
			messageText: "sure",
		});

		expect(beforeConfirm.isCompleted).toBe(false);
		expect(beforeConfirm.nextAction).toBe("invalid-input");

		const confirmed = advanceRsvpFlow({
			state: {
				step: 3,
				isCompleted: false,
				finalResponse: "accept",
				hasExistingResponse: false,
			},
			messageText: "confirm",
		});

		expect(confirmed.isCompleted).toBe(true);
		expect(confirmed.step).toBe(3);
		expect(confirmed.nextAction).toBe("show-final-confirmation");
	});

	it("supports update-flow reentry without opening new steps", () => {
		const output = advanceRsvpFlow({
			state: {
				step: 3,
				isCompleted: true,
				finalResponse: "decline",
				hasExistingResponse: false,
			},
			messageText: "confirm",
		});

		expect(output.isDuplicate).toBe(true);
		expect(output.nextAction).toBe("show-final-confirmation");
	});

	it("recognizes supported confirmation tokens", () => {
		expect(isConfirmationToken("confirm")).toBe(true);
		expect(isConfirmationToken("DONE")).toBe(true);
		expect(isConfirmationToken("later")).toBe(false);
	});
});
