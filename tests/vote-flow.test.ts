import test from "node:test";
import assert from "node:assert/strict";

import { registerSchema } from "../src/lib/validations/auth";
import { calculateVoteSummary } from "../src/lib/vote-utils";
import { canCandidateBeApproved, hasContestCapacity } from "../src/lib/candidate-approval";
import { toCsv } from "../src/lib/csv";

test("calculateVoteSummary returns amount and total for a quantity", () => {
  const summary = calculateVoteSummary(5, 100);

  assert.equal(summary.quantity, 5);
  assert.equal(summary.unitPrice, 100);
  assert.equal(summary.amount, 500);
});

test("calculateVoteSummary rejects invalid quantities", () => {
  assert.throws(() => calculateVoteSummary(0, 100), /entre 1 et 100/i);
  assert.throws(() => calculateVoteSummary(101, 100), /entre 1 et 100/i);
});

test("candidate approval requires a successful registration payment", () => {
  assert.equal(
    canCandidateBeApproved({
      registrationFee: 0,
      registrationPaymentId: null,
      registrationPayment: null,
    }),
    true,
  );

  assert.equal(
    canCandidateBeApproved({
      registrationFee: 1000,
      registrationPaymentId: null,
      registrationPayment: null,
    }),
    false,
  );

  assert.equal(
    canCandidateBeApproved({
      registrationFee: 1000,
      registrationPaymentId: "pay_123",
      registrationPayment: { status: "PENDING" },
    }),
    false,
  );

  assert.equal(
    canCandidateBeApproved({
      registrationFee: 1000,
      registrationPaymentId: "pay_123",
      registrationPayment: { status: "SUCCESS" },
    }),
    true,
  );
});

test("public registration only allows candidate role", () => {
  const valid = registerSchema.safeParse({
    name: "Alice Test",
    email: "alice@example.com",
    phone: "0197000000",
    password: "secret123",
    confirmPassword: "secret123",
    role: "CANDIDATE",
    acceptTerms: true,
  });

  assert.equal(valid.success, true);

  const invalid = registerSchema.safeParse({
    name: "Alice Test",
    email: "alice@example.com",
    phone: "0197000000",
    password: "secret123",
    confirmPassword: "secret123",
    role: "ADMIN",
    acceptTerms: true,
  });

  assert.equal(invalid.success, false);
});

test("contest capacity respects an optional maximum", () => {
  assert.equal(hasContestCapacity(null, 999), true);
  assert.equal(hasContestCapacity(0, 999), true);
  assert.equal(hasContestCapacity(10, 9), true);
  assert.equal(hasContestCapacity(10, 10), false);
  assert.equal(hasContestCapacity(10, 11), false);
});

test("toCsv escapes separators, quotes and line breaks", () => {
  const csv = toCsv(
    ["Nom", "Note"],
    [
      ["Aicha", 'Très "motivée"'],
      ["Kora, duo", "Ligne 1\nLigne 2"],
      [null, 42],
    ],
  );

  assert.equal(
    csv,
    'Nom,Note\r\nAicha,"Très ""motivée"""\r\n"Kora, duo","Ligne 1\nLigne 2"\r\n,42\r\n',
  );
});
