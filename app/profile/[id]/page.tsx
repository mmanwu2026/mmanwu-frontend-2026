// rebuild 004
import ProfileClient from "./ProfileClient";

export default function Page({ params }: { params: { id: string } }) {
  return <ProfileClient userId={params.id} />;
}
