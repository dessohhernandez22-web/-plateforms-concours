import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";

import { finalizeVotePayment } from "../src/lib/vote-settlement";

function createTransaction(paymentUpdateCount = 1, orderUpdateCount = 1) {
  const calls: string[] = [];
  const tx = {
    payment: {
      updateMany: async () => {
        calls.push("payment");
        return { count: paymentUpdateCount };
      },
    },
    voteOrder: {
      updateMany: async () => {
        calls.push("order");
        return { count: orderUpdateCount };
      },
    },
    vote: {
      create: async () => {
        calls.push("vote");
      },
    },
    candidate: {
      update: async () => {
        calls.push("candidate");
      },
    },
    receipt: {
      upsert: async () => {
        calls.push("receipt");
      },
    },
  } as unknown as Prisma.TransactionClient;

  return { tx, calls };
}

const payment = {
  id: "payment-1",
  candidateId: "candidate-1",
  voteOrder: {
    id: "order-1",
    candidateId: "candidate-1",
    quantity: 5,
    unitPrice: 100,
    amount: 500,
    status: "AWAITING_PAYMENT",
  },
};

test("successful vote payment creates a vote, increments the counter and issues a receipt", async () => {
  const { tx, calls } = createTransaction();

  assert.equal(await finalizeVotePayment(tx, payment), true);
  assert.deepEqual(calls, ["payment", "order", "vote", "candidate", "receipt"]);
});

test("already-successful payment does not count the vote twice", async () => {
  const { tx, calls } = createTransaction(0);

  assert.equal(await finalizeVotePayment(tx, payment), false);
  assert.deepEqual(calls, ["payment"]);
});