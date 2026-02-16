export interface BankAccount {
  id: string;
  accountNumber: string;
  bank: string;
  owner: string;
  status: "Activa" | "Inactiva";
  openingDate: string;
  currency: string;
  balance: string;
}

