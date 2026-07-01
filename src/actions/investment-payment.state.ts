export type InvestmentPaymentActionState = {
  status: "idle" | "error" | "success";
  message: string;
  authorizationUrl?: string;
};

export const initialInvestmentPaymentActionState: InvestmentPaymentActionState =
  {
    status: "idle",
    message: "",
  };
