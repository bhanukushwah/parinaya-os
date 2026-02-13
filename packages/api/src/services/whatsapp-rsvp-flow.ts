export type RsvpChoice = "accept" | "decline";

export type RsvpFlowStep = 1 | 2 | 3;

export type RsvpFlowState = {
	step: RsvpFlowStep;
	isCompleted: boolean;
	finalResponse: RsvpChoice | null;
	hasExistingResponse: boolean;
};

export type RsvpFlowInput = {
	state: RsvpFlowState;
	messageText: string;
	personResponseCount?: number;
};

export type RsvpFlowOutput = {
	step: RsvpFlowStep;
	isCompleted: boolean;
	finalResponse: RsvpChoice | null;
	isDuplicate: boolean;
	requiresAttendanceDetails: boolean;
	requiresConfirmation: boolean;
	nextAction:
		| "ask-for-initial-choice"
		| "ask-for-attendance-details"
		| "ask-for-confirmation"
		| "show-final-confirmation"
		| "invalid-input";
	errorMessage?: string;
};

const ACCEPT_TOKENS = new Set(["accept", "accepted", "yes", "going", "a"]);
const DECLINE_TOKENS = new Set(["decline", "declined", "no", "not-going", "d"]);
const CONFIRM_TOKENS = new Set([
	"confirm",
	"confirmed",
	"done",
	"submit",
	"finish",
]);

function normalizeText(value: string) {
	return value.trim().toLowerCase();
}

export function parseRsvpChoice(value: string): RsvpChoice | null {
	const normalized = normalizeText(value);
	if (ACCEPT_TOKENS.has(normalized)) {
		return "accept";
	}

	if (DECLINE_TOKENS.has(normalized)) {
		return "decline";
	}

	return null;
}

export function isConfirmationToken(value: string) {
	return CONFIRM_TOKENS.has(normalizeText(value));
}

export function parseAttendanceEdits(text: string) {
	const entries = text
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);

	const edits: Array<{ personId: string; response: RsvpChoice }> = [];

	for (const entry of entries) {
		const [rawPersonId, rawResponse] = entry
			.split("=")
			.map((part) => part.trim());
		if (!rawPersonId || !rawResponse) {
			continue;
		}

		const parsed = parseRsvpChoice(rawResponse);
		if (!parsed) {
			continue;
		}

		edits.push({
			personId: rawPersonId,
			response: parsed,
		});
	}

	return edits;
}

export function advanceRsvpFlow(input: RsvpFlowInput): RsvpFlowOutput {
	const normalized = normalizeText(input.messageText);

	if (input.state.isCompleted && !input.state.hasExistingResponse) {
		return {
			step: 3,
			isCompleted: true,
			finalResponse: input.state.finalResponse,
			isDuplicate: true,
			requiresAttendanceDetails: false,
			requiresConfirmation: false,
			nextAction: "show-final-confirmation",
		};
	}

	if (input.state.step === 1) {
		const choice = parseRsvpChoice(normalized);
		if (!choice) {
			return {
				step: 1,
				isCompleted: false,
				finalResponse: null,
				isDuplicate: false,
				requiresAttendanceDetails: false,
				requiresConfirmation: false,
				nextAction: "invalid-input",
				errorMessage: "Reply with accept or decline to begin RSVP.",
			};
		}

		return {
			step: 2,
			isCompleted: false,
			finalResponse: choice,
			isDuplicate: false,
			requiresAttendanceDetails: true,
			requiresConfirmation: false,
			nextAction: "ask-for-attendance-details",
		};
	}

	if (input.state.step === 2) {
		if (
			isConfirmationToken(normalized) ||
			(input.personResponseCount ?? 0) > 0
		) {
			return {
				step: 3,
				isCompleted: false,
				finalResponse: input.state.finalResponse,
				isDuplicate: false,
				requiresAttendanceDetails: false,
				requiresConfirmation: true,
				nextAction: "ask-for-confirmation",
			};
		}

		return {
			step: 2,
			isCompleted: false,
			finalResponse: input.state.finalResponse,
			isDuplicate: false,
			requiresAttendanceDetails: true,
			requiresConfirmation: false,
			nextAction: "invalid-input",
			errorMessage:
				"Share per-person updates in format personId=accept,personId=decline or reply confirm.",
		};
	}

	if (input.state.step === 3) {
		if (!isConfirmationToken(normalized)) {
			return {
				step: 3,
				isCompleted: false,
				finalResponse: input.state.finalResponse,
				isDuplicate: false,
				requiresAttendanceDetails: false,
				requiresConfirmation: true,
				nextAction: "invalid-input",
				errorMessage: "Reply confirm to finalize RSVP.",
			};
		}

		return {
			step: 3,
			isCompleted: true,
			finalResponse: input.state.finalResponse,
			isDuplicate: false,
			requiresAttendanceDetails: false,
			requiresConfirmation: false,
			nextAction: "show-final-confirmation",
		};
	}

	return {
		step: input.state.step,
		isCompleted: input.state.isCompleted,
		finalResponse: input.state.finalResponse,
		isDuplicate: false,
		requiresAttendanceDetails: false,
		requiresConfirmation: false,
		nextAction: "ask-for-initial-choice",
	};
}
