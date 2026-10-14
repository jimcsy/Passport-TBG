"use server";

import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import {
  setAdminSession,
  clearAdminSession,
  setTraineeSession,
  clearTraineeSession,
} from "./session";

export interface AuthResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Validates Employee ID and password for BEAT Trainer/Admin portal.
 */
export async function loginAdmin(
  prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const employeeId = formData.get("employeeId")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!employeeId || !password) {
    return { success: false, error: "Please enter your Employee ID and password." };
  }

  try {
    const admin = await prisma.adminUser.findUnique({
      where: { employeeId },
    });

    if (!admin) {
      return { success: false, error: "Invalid Employee ID or password." };
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return { success: false, error: "Invalid Employee ID or password." };
    }

    await setAdminSession({
      id: admin.id,
      employeeId: admin.employeeId,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
    });

    return { success: true, redirectTo: "/trainer/queue" };
  } catch (error) {
    console.error("Admin login error:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Passwordless lookup for Trainee Passport via Trainee Code + Email.
 */
export async function lookupTrainee(
  prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const traineeCode = formData.get("traineeCode")?.toString().trim().toUpperCase();
  const email = formData.get("email")?.toString().trim().toLowerCase();

  if (!traineeCode || !email) {
    return { success: false, error: "Please enter both your Trainee Code and Email." };
  }

  try {
    const trainee = await prisma.trainee.findUnique({
      where: { traineeCode },
    });

    if (!trainee || trainee.email.toLowerCase() !== email) {
      return {
        success: false,
        error: "No matching record found. Please verify your Trainee Code and Email.",
      };
    }

    await setTraineeSession({
      id: trainee.id,
      traineeCode: trainee.traineeCode,
      fullName: trainee.fullName,
      email: trainee.email,
      jobRole: trainee.jobRole,
      restaurantBrand: trainee.restaurantBrand,
      branchLocation: trainee.branchLocation,
      cohortBatch: trainee.cohortBatch,
    });

    return { success: true, redirectTo: "/trainee/dashboard" };
  } catch (error) {
    console.error("Trainee lookup error:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSession();
}

export async function logoutTrainee(): Promise<void> {
  await clearTraineeSession();
}
