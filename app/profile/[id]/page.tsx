import ProfileClient from "@/app/components/ProfileClient";

export default async function Page({ params }) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-white text-gray-900 pt-20 p-6">
      <ProfileClient profileId={id} />
    </div>
  );
}
