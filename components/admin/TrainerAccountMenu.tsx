"use client";

import { AccountMenu } from "@/components/navigation/AccountMenu";

export function TrainerAccountMenu({ admin, signOut }: {
  admin: { fullName: string; employeeId: string; role: string };
  signOut: () => Promise<void>;
}) {
  const role = admin.role.toLowerCase().replace(/_/g, " ");
  return <AccountMenu fullName={admin.fullName} label="Trainer account" detail={<>{admin.employeeId} · <span className="capitalize">{role}</span></>} signOut={signOut} />;
}
