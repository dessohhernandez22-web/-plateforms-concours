export function calculateVoteSummary(quantity: number, unitPrice: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error("La quantité de votes doit être comprise entre 1 et 100.");
  }

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new Error("Le prix unitaire doit être supérieur à 0.");
  }

  return {
    quantity,
    unitPrice,
    amount: quantity * unitPrice,
  };
}
