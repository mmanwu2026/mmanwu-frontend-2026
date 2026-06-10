"use client";

export default function GatekeeperModal({
  options,
  onSelect,
  onClose,
}: {
  options: any[];
  onSelect: (text: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl max-w-md w-full space-y-4 shadow-xl">
        <h2 className="text-xl font-bold">Choose Your Voice</h2>

        {options.map((opt) => (
          <div
            key={opt.id}
            className="border p-3 rounded-lg shadow-sm space-y-2"
          >
            <h3 className="font-semibold">{opt.label}</h3>
            <p className="text-gray-700">{opt.text}</p>

            <button
              className="w-full bg-blue-600 text-white py-2 rounded-lg"
              onClick={() => onSelect(opt.text)}
            >
              Use this version
            </button>
          </div>
        ))}

        <button
          className="w-full text-gray-600 underline"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
