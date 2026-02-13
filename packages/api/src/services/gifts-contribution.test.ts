import { describe, expect, it } from "bun:test";

import {
	computeRemainingGiftAmount,
	validateContributionAgainstRemaining,
	validateContributionInput,
} from "./gifts-contribution";

describe("gifts contribution service", () => {
	it("accepts only positive integer paise contributions", () => {
		expect(() => validateContributionInput(1)).not.toThrow();
		expect(() => validateContributionInput(2500)).not.toThrow();

		expect(() => validateContributionInput(0)).toThrow(
			"Contribution amount must be a positive integer paise value.",
		);
		expect(() => validateContributionInput(-1)).toThrow(
			"Contribution amount must be a positive integer paise value.",
		);
		expect(() => validateContributionInput(10.2)).toThrow(
			"Contribution amount must be a positive integer paise value.",
		);
	});

	it("computes remaining amount deterministically", () => {
		expect(
			computeRemainingGiftAmount({
				targetAmountPaise: 500000,
				amountRaisedPaise: 125000,
			}),
		).toBe(375000);

		expect(
			computeRemainingGiftAmount({
				targetAmountPaise: 500000,
				amountRaisedPaise: 600000,
			}),
		).toBe(0);
	});

	it("rejects over-target and fully-funded contributions", () => {
		expect(() =>
			validateContributionAgainstRemaining({
				remainingAmountPaise: 0,
				amountPaise: 100,
			}),
		).toThrow("Gift item is already fully funded.");

		expect(() =>
			validateContributionAgainstRemaining({
				remainingAmountPaise: 1000,
				amountPaise: 1200,
			}),
		).toThrow("Contribution exceeds remaining target amount (1000 paise).");

		expect(() =>
			validateContributionAgainstRemaining({
				remainingAmountPaise: 1000,
				amountPaise: 1000,
			}),
		).not.toThrow();
	});
});
