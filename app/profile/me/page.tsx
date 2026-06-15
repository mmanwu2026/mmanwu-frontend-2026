import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function ProfileMeRedirect() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    redirect("/login");
  }

  redirect(`/profile/${userId}`);
}
