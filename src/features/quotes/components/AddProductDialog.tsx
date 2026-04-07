"use client";

import { useAddProductDialogState } from "../hooks/useAddProductDialogState";
import type { AddProductDialogProps, CatalogRow } from "../types";
import { AddProductDialogView } from "./AddProductDialogView";

export type { CatalogRow };

export function AddProductDialog(props: AddProductDialogProps) {
  const viewModel = useAddProductDialogState(props);
  return <AddProductDialogView {...viewModel} />;
}
