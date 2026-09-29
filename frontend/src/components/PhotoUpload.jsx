import { useRef, useState } from "react";
import { Upload, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api, API_BASE, formatApiErrorDetail } from "../lib/api";

const BACKEND_ORIGIN = process.env.REACT_APP_BACKEND_URL;

export const photoSrcOf = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/api/")) return `${BACKEND_ORIGIN}${url}`;
  return `${API_BASE}${url}`;
};

export default function PhotoUpload({ value, onChange, testIdPrefix = "photo-upload" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const preview = photoSrcOf(value);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      toast.error("Please choose a JPG, PNG or WebP image");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8 MB");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/upload", fd);
      onChange(data.url);
      toast.success("Photo uploaded — processed to a 500×500 square");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Upload failed, please try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-royal/40 ring-offset-2 ring-offset-panel">
        {preview ? (
          <img src={preview} alt="Preview" className="h-full w-full object-cover" data-testid={`${testIdPrefix}-preview`} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/40">
            <UserRound size={34} className="text-royal/60" />
          </div>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-ghost !px-4 !py-2 !text-xs"
          data-testid={`${testIdPrefix}-button`}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {busy ? "Uploading…" : "Upload Photo"}
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          JPG / PNG / WebP up to 8 MB — auto-cropped square &amp; optimised to 500×500
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFile}
        data-testid={`${testIdPrefix}-input`}
      />
    </div>
  );
}
