import ProfileClient from "./ProfileClient";

export default function ProfilePage({ params }: { params: { userId: string } }) {
  return <ProfileClient userId={params.userId} />;
}
