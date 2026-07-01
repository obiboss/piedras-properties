export type DeveloperInvestmentPlanActionState = {
  status: "idle" | "success" | "error";
  message: string;
  investmentLink?: string;
};

export const initialDeveloperInvestmentPlanActionState: DeveloperInvestmentPlanActionState =
  {
    status: "idle",
    message: "",
  };
