import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOutIcon } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { requireViewer } from "@/lib/auth/dal";
import { signOut } from "@/features/auth/actions";
import { getMyProfile } from "@/features/account/queries";
import { ProfileForm } from "@/features/account/components/profile-form";
import { SectionHeader, SectionSkeleton } from "@/features/account/components/section";

export const metadata: Metadata = { title: "الإعدادات" };

async function Settings() {
  const viewer = await requireViewer("/account/settings");
  const profile = await getMyProfile(viewer.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="sketch-card grid gap-1 p-6">
        <p className="text-sm text-muted-foreground">مرتبط بحساب Google</p>
        <p className="text-xl font-bold">{profile.name}</p>
        <p dir="ltr" className="text-end text-muted-foreground">
          {profile.email}
        </p>
      </div>
      <ProfileForm
        profile={{
          phone: profile.phone,
          contactByEmail: profile.contactByEmail,
          contactByPhone: profile.contactByPhone,
          deletionRequested: Boolean(profile.deletionRequestedAt),
        }}
      />
      <form action={signOut}>
        <SubmitButton
          variant="outline"
          className="rounded-full border-2 border-foreground"
          icon={<LogOutIcon className="rtl:-scale-x-100" />}
        >
          تسجيل الخروج
        </SubmitButton>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <SectionHeader title="الإعدادات" />
      <Suspense fallback={<SectionSkeleton />}>
        <Settings />
      </Suspense>
    </>
  );
}
