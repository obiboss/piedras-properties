export type DeveloperInvestmentLeadActionState = {
  status: "idle" | "success" | "error";
  message: string;
  whatsappHref?: string;
};

export const initialDeveloperInvestmentLeadActionState: DeveloperInvestmentLeadActionState =
  {
    status: "idle",
    message: "",
  };
