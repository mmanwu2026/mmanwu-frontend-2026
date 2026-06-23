import { redirect } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function ProfileMeRedirect() {
  const { user, loading } = useUser();

  if (loading) return null;

  if (!user) {
    redirect("/login");
  }

  redirect(`/profile/${user.id}`);
}
