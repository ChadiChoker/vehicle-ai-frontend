import type { ChangeEvent } from "react";
import { useState, useRef, useEffect } from "react";

interface Issue {
  id: string;
  photoId: string;
  label: string;
  confidence?: number;
  severity?: string;
  boundingBox?: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  estimatedCost?: number;
}

interface DamageResults {
  issues?: Issue[];
  summary?: {
    totalEstimatedCost?: number;
  };
}

interface Photo {
  photoId: string;
  url: string;
  issues: Issue[];
}

interface ResultsResponse {
  inspectionId: string;
  photos: Photo[];
  results: DamageResults;
}

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [side, setSide] = useState<string>("front");
  const [pickupFile, setPickupFile] = useState<File | null>(null);
  const [returnFile, setReturnFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DamageResults | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  const createInspection = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/inspections`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to create inspection");
      const json = await res.json();
      setInspectionId(json.inspectionId);
      setResults(null);
      setPhotos([]);
      alert(`Inspection created: ${json.inspectionId}`);
    } catch (err) {
      alert("Error creating inspection");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePickupFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPickupFile(e.target.files?.[0] ?? null);
  };

  const handleReturnFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setReturnFile(e.target.files?.[0] ?? null);
  };

  const uploadPhoto = async (file: File | null, type: "pickup" | "return") => {
    if (!inspectionId) {
      alert("Create an inspection first");
      return;
    }
    if (!file) {
      alert(`Select a ${type} photo to upload`);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("side", side);
      formData.append("type", type);

      const res = await fetch(`${API_URL}/api/inspections/${inspectionId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} photo uploaded`);
    } catch (err) {
      alert(`Error uploading ${type} photo`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeInspection = async () => {
    if (!inspectionId) {
      alert("Create an inspection first");
      return;
    }

    setLoading(true);
    try {
      const analyzeRes = await fetch(`${API_URL}/api/inspections/${inspectionId}/analyze`, { method: "POST" });
      if (!analyzeRes.ok) throw new Error("Analyze failed");

      const resultsRes = await fetch(`${API_URL}/api/inspections/${inspectionId}/results`);
      if (!resultsRes.ok) throw new Error("Failed to fetch results");

      const resultsData: ResultsResponse = await resultsRes.json();

      setResults(resultsData.results);

      const photosWithIssues: Photo[] = resultsData.photos.map((photo) => {
        const photoIssues = (resultsData.results?.issues || []).filter(
          (issue) => issue.photoId === photo.photoId
        );
        return { ...photo, issues: photoIssues };
      });

      setPhotos(photosWithIssues);
    } catch (err) {
      alert("Error analyzing inspection");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    photos.forEach((photo) => {
      const canvas = canvasRefs.current[photo.photoId];
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.src = photo.url;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        if (photo.issues.length > 0) {
          ctx.strokeStyle = "red";
          ctx.lineWidth = 3;
          photo.issues.forEach((issue) => {
            if (issue.boundingBox) {
              const { xmin, ymin, xmax, ymax } = issue.boundingBox;
              const centerX = (xmin + xmax) / 2;
              const centerY = (ymin + ymax) / 2;
              const radius = Math.max(xmax - xmin, ymax - ymin) / 2;

              ctx.beginPath();
              ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
              ctx.stroke();
            }
          });
        }
      };
    });
  }, [photos]);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-extrabold text-center text-gray-900">Vehicle Damage Assessment</h1>

      <button
        onClick={createInspection}
        disabled={loading}
        className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition"
      >
        {loading ? "Working..." : inspectionId ? `Inspection: ${inspectionId}` : "Create Inspection"}
      </button>

      <section className="space-y-4">
        <label className="block text-lg font-semibold text-gray-700">Select Pickup Photo Side:</label>
        <select
          value={side}
          onChange={(e) => setSide(e.target.value)}
          className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={!inspectionId || loading}
        >
          <option value="front">Front</option>
          <option value="rear">Rear</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>

        <input
          type="file"
          accept="image/*"
          onChange={handlePickupFileChange}
          disabled={!inspectionId || loading}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0 file:text-sm file:font-semibold
            file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />
        <button
          onClick={() => uploadPhoto(pickupFile, "pickup")}
          disabled={!pickupFile || loading || !inspectionId}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
        >
          Upload Pickup Photo
        </button>
      </section>

      <section className="space-y-4">
        <label className="block text-lg font-semibold text-gray-700">Upload Return Photo:</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleReturnFileChange}
          disabled={!inspectionId || loading}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0 file:text-sm file:font-semibold
            file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
        />
        <button
          onClick={() => uploadPhoto(returnFile, "return")}
          disabled={!returnFile || loading || !inspectionId}
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          Upload Return Photo
        </button>
      </section>

      <button
        onClick={analyzeInspection}
        disabled={loading || !inspectionId}
        className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 transition w-full"
      >
        Analyze Inspection
      </button>

      {photos.length > 0 && (
        <section className="mt-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Photos with Damage Highlights</h2>
          {photos.map((photo) => (
            <div key={photo.photoId} className="mb-6 border border-gray-200 rounded-md p-4 shadow-sm">
              <h3 className="mb-2 font-semibold text-gray-700">Photo ID: {photo.photoId}</h3>
              <canvas
                ref={(el) => {
                  canvasRefs.current[photo.photoId] = el;
                }}
                style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }}
              />
            </div>
          ))}
        </section>
      )}

      {results && (
        <section className="mt-6 p-4 border rounded-md bg-gray-50 shadow-inner">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Damage Report</h2>
          {results.issues && results.issues.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              {results.issues.map((issue) => (
                <li key={issue.id}>
                  {issue.label} — Severity: {issue.severity ?? "unknown"} — Estimated Cost: $
                  {issue.estimatedCost ?? 0}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No damage detected.</p>
          )}
          <p className="mt-4 font-semibold text-gray-800">
            Total Estimated Cost: ${results.summary?.totalEstimatedCost ?? 0}
          </p>
        </section>
      )}
    </div>
  );
}
