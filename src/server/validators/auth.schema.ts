import { z } from "zod";

export const phoneNumberSchema = z
  .string()
  .trim()
  .min(10, "Enter a valid phone number.")
  .max(20, "Enter a valid phone number.")
  .regex(/^\+?[0-9\s()-]+$/, "Enter a valid phone number.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password is too long.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

const requiredTextSchema = z.string().trim().min(2, "This field is required.");

const optionalTextSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  });

const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  })
  .pipe(z.string().email("Enter a valid email address.").nullable());

const phonePasswordRegistrationSchema = z.object({
  fullName: requiredTextSchema,
  phoneNumber: phoneNumberSchema,
  password: passwordSchema,
});

export const phonePasswordLoginSchema = z.object({
  phoneNumber: phoneNumberSchema,
  password: passwordSchema,
});

export const emailPasswordLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const emailPasswordRegisterSchema = z.object({
  fullName: requiredTextSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const developerRegisterSchema = z.object({
  fullName: requiredTextSchema,
  email: emailSchema,
  password: passwordSchema,
  companyName: requiredTextSchema,
  companyPhone: phoneNumberSchema,
  companyEmail: optionalEmailSchema,
  rcNumber: optionalTextSchema,
  officeAddress: optionalTextSchema,
});

export const developerLoginSchema = emailPasswordLoginSchema;

export const registerDeveloperSchema = developerRegisterSchema;
export const loginDeveloperSchema = developerLoginSchema;

export const registerLandlordSchema = phonePasswordRegistrationSchema;
export const registerAgentSchema = phonePasswordRegistrationSchema;

export type PhonePasswordLoginInput = z.infer<typeof phonePasswordLoginSchema>;
export type EmailPasswordLoginInput = z.infer<typeof emailPasswordLoginSchema>;
export type EmailPasswordRegisterInput = z.infer<
  typeof emailPasswordRegisterSchema
>;
export type DeveloperRegisterInput = z.infer<typeof developerRegisterSchema>;
export type DeveloperLoginInput = z.infer<typeof developerLoginSchema>;
