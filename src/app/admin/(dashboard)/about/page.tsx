import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AboutForm } from "@/components/admin/about-form";
import { aboutToInput } from "@/lib/admin/form-values";
import { getAbout } from "@/lib/firebase/repositories/about-repository";

export const metadata = { title: "About" };

export default async function AdminAboutPage() {
  const about = await getAbout();

  return (
    <>
      <AdminPageHeader
        title="About"
        description="The narrative section of the home page. Write it in your own voice — placeholder copy reads like placeholder copy."
      />

      <AboutForm initialValues={aboutToInput(about)} />
    </>
  );
}
