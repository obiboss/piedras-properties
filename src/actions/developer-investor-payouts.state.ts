export type DeveloperInvestorPayoutActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialDeveloperInvestorPayoutActionState: DeveloperInvestorPayoutActionState =
  {
    status: "idle",
    message: "",
  };
