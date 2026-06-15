import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function ProfileMeRedirect() {
  const cookieStore = cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    redirect("/login");
  }

  redirect(`/profile/${userId}`);
}
