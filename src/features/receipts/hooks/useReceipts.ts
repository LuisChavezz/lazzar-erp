import { useQuery } from "@tanstack/react-query";
import { getReceipts } from "../services/actions";
import type { Receipt } from "../interfaces/receipt.interface";

export const useReceipts = () => {
  return useQuery<Receipt[]>({
    queryKey: ["receipts"],
    queryFn: getReceipts,
  });
};
