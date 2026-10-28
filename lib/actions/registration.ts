"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/session";
import { createRegisteredTrainee, type RegistrationResult } from "@/lib/db/repositories/registration";
import { REGISTRATION_FIELDS, type RegistrationInput } from "@/lib/trainee-registration";

export async function registerTrainee(formData: FormData): Promise<RegistrationResult> {
  const session = await getAdminSession();
  if (!session) return { success: false as const, error: "Please sign in as a trainer to register trainees." };

  const input = Object.fromEntries(
    REGISTRATION_FIELDS.map((field) => [
      field,
      typeof formData.get(field) === "string" ? formData.get(field) : "",
    ])
  ) as RegistrationInput;

  const result = await createRegisteredTrainee(input, undefined, session.id);
  if (result.success) {
    revalidatePath("/trainer/trainees");
    revalidatePath("/trainer/batch");
  }
  return result;
}
