"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { CloudUpload, FileSpreadsheet, Play, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadDemoIntoSession } from "@/lib/demo-loader";

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const router = useRouter();

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
      setIsDragActive(false);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
      "text/tab-separated-values": [".tsv"],
    },
    maxFiles: 1,
    disabled,
  });

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative min-h-[320px] rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer",
          "bg-[#0f172a] px-6 py-10 text-center sm:px-8 sm:py-12 flex flex-col items-center justify-center",
          isDragActive
            ? "border-[#6366f1] bg-[#6366f1]/8 drop-active"
            : isDragReject
            ? "border-red-500/70 bg-red-500/8"
            : "border-white/12 hover:border-white/20 hover:bg-white/2",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-busy={disabled || demoLoading}
      >
        <input {...getInputProps()} />

        {/* Upload icon */}
        <div className={cn(
          "mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors",
          isDragActive ? "bg-[#6366f1]/20" : "bg-white/5"
        )}>
          <CloudUpload className={cn(
            "w-7 h-7 transition-colors",
            isDragActive ? "text-[#818cf8]" : "text-slate-500"
          )} />
        </div>

        {isDragActive ? (
          <p className="text-sm font-medium text-[#818cf8] mb-1">Drop your file here</p>
        ) : isDragReject ? (
          <p className="text-sm font-medium text-red-400 mb-1">File type not supported</p>
        ) : (
          <p className="text-sm font-medium text-white mb-1">
            Drag & drop your inventory file
          </p>
        )}

        <p className="text-xs text-slate-500 mb-3">
          {isDragReject ? "Use an Excel, CSV, or TSV file." : "Or click to browse your files"}
        </p>

        <p className="mb-2 text-xs text-slate-500">
          Supports .xlsx, .xls, .csv and .tsv | Maximum file size: 10 MB
        </p>

        <p className="mb-6 inline-flex items-center gap-1.5 text-[11px] text-slate-600">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/70" />
          Your file is processed securely and never shared.
        </p>

        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Choose file
        </button>
      </div>

      {/* Helper links */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
        <a
          href="/sample-inventory-template.csv"
          download
          className="inline-flex items-center gap-1.5 hover:text-slate-300 transition-colors"
          title="Download a pre-formatted sample file"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Download sample
        </a>
        <span className="text-slate-700">|</span>
        <button
          disabled={demoLoading}
          onClick={async () => {
            setDemoLoading(true);
            loadDemoIntoSession();
            router.push("/dashboard");
          }}
          className="inline-flex items-center gap-1.5 hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
          <Play className="w-3 h-3 fill-current" />
          {demoLoading ? "Loading..." : "Try demo dataset"}
        </button>
      </div>
    </div>
  );
}
