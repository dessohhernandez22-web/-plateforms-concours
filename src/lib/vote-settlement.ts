import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

type VotePayment = {
  id: string;
  candidateId: string | null;
  voteOrder: {
    id: string;
    candidateId: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    status: string;
    ipHash?: string | null;
    deviceHash?: string | null;
  } | null;
};

export async function finalizeVotePayment(
  tx: Prisma.TransactionClient,
  payment: VotePayment,
  verifiedById?: string,
): Promise<boolean> {
  const order = payment.voteOrder;
  if (!order || !payment.candidateId || order.candidateId !== payment.candidateId) {
    throw new Error("Commande de vote invalide.");
  }

  const updatedPayment = await tx.payment.updateMany({
    where: { id: payment.id, status: { not: "SUCCESS" } },
    data: {
      status: "SUCCESS",
      verifiedAt: new Date(),
      verifiedById,
      paidAt: new Date(),
      failureReason: null,
    },
  });
  if (updatedPayment.count === 0) return false;

  const updatedOrder = await tx.voteOrder.updateMany({
    where: { id: order.id, status: { not: "PAID" } },
    data: { status: "PAID" },
  });
  if (updatedOrder.count === 0) {
    throw new Error("Cette commande de vote est déjà comptabilisée.");
  }

  await tx.vote.create({
    data: {
      candidateId: order.candidateId,
      voteOrderId: order.id,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      amount: order.amount,
      ipHash: order.ipHash ?? null,
      deviceHash: order.deviceHash ?? null,
    },
  });
  await tx.candidate.update({
    where: { id: order.candidateId },
    data: { votesCount: { increment: order.quantity } },
  });
  await tx.receipt.upsert({
    where: { paymentId: payment.id },
    update: {},
    create: {
      paymentId: payment.id,
      number: `RCPT-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`,
      issuedAt: new Date(),
    },
  });

  return true;
}