import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { siteSettingsToInput } from "@/lib/admin/form-values";
import { getSiteSettings } from "@/lib/firebase/repositories/site-settings-repository";

export const metadata = { title: "Site settings" };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <AdminPageHeader
        title="Site settings"
        description="Your name, contact details and links. These feed the hero, the footer and every page's metadata."
      />

      <SettingsForm initialValues={siteSettingsToInput(settings)} />
    </>
  );
}
