export default function VisionSquareIndex() {
  return (
    <div className="max-w-2xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">Vision Square</h1>

      <p className="text-gray-300 mb-6">
        Upload images and videos, react to visual posts, and explore the Vision feed.
      </p>

      <div className="flex gap-4">
        <a
          href="/vision-square/create"
          className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-500"
        >
          + Create Vision Post
        </a>

        <a
          href="/vision-square/feed"
          className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600"
        >
          View Feed
        </a>
      </div>
    </div>
  );
}
