export type DeveloperAuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialDeveloperAuthActionState: DeveloperAuthActionState = {
  status: "idle",
  message: "",
};
