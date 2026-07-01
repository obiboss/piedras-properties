export type DeveloperInvestorPayoutActionState = {
  status: "idle" | "success" | "error";
  message: string;
  whatsappHref?: string;
};

export const initialDeveloperInvestorPayoutActionState: DeveloperInvestorPayoutActionState =
  {
    status: "idle",
    message: "",
  };
