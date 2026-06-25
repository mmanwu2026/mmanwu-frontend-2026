export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  console.log("ID:", id);

  return (
    <div className="w-full min-h-screen">
      Profile page for {id}
    </div>
  );
}
