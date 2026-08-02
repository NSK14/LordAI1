import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileImage, Loader2, Send, Home } from "lucide-react";
import { streamChat } from "@/lib/study-chat";
import { StudyWorkspaceShell } from "@/components/study/StudyWorkspaceShell";
import type { StudyActivityInput } from "@/hooks/study/study-activity-types";

interface HomeworkHelpWorkspaceProps {
  recordActivity?: (activity: StudyActivityInput) => string;
  onReturnHome?: () => void;
}

interface UploadAreaProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  preview: string | null;
  onClear: () => void;
}

/**
 * HomeworkHelpWorkspace — upload a photo of a homework problem,
 * extract text via OCR, then get an AI Socratic step-by-step solution.
 */
export function HomeworkHelpWorkspace({
  recordActivity,
  onReturnHome,
}: HomeworkHelpWorkspaceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [solution, setSolution] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"upload" | "ocr" | "explaining">("upload");
  const startTimeRef = useState(() => Date.now())[0];

  const handleFileSelected = useCallback((selected: File) => {
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreview(url);
    setStep("ocr");
  }, []);

  const runOCR = useCallback(async () => {
    if (!file) return;
    setIsProcessing(true);
    setOcrText("");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch("/api/learning/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "process",
            sourceId: crypto.randomUUID(),
            mimeType: file.type,
            fileBase64: base64,
          }),
        });
        const result = await res.json();
        const jobId = result?.job?.id;
        if (jobId) {
          const poll = async () => {
            const statusRes = await fetch("/api/learning/ocr", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "status", jobId }),
            });
            const statusData = await statusRes.json();
            const job = statusData?.job;
            if (job?.status === "completed" && job.extracted_text) {
              setOcrText(job.extracted_text);
              getSolution(job.extracted_text);
            } else if (job?.status === "failed") {
              setIsProcessing(false);
              setOcrText("[OCR failed — try a clearer photo.]");
            } else {
              setTimeout(poll, 500);
            }
          };
          setTimeout(poll, 500);
        } else {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsProcessing(false);
      setOcrText("OCR service unavailable. Paste your problem below.");
    } finally {
      setIsProcessing(false);
    }
  }, [file, getSolution]);

  const getSolution = useCallback(
    async (text: string) => {
      setStep("explaining");
      const start = Date.now();
      let accumulated = "";
      try {
        await streamChat(
          {
            mode: "reasoning",
            messages: [
              {
                id: "u",
                role: "user",
                parts: [
                  {
                    type: "text",
                    text: `A student has this homework problem: "${text}". Solve it step-by-step in a Socratic manner — ask guiding questions, provide hints, then reveal the worked solution. Do not skip steps. Label any AI-generated content.`,
                  },
                ],
              },
            ],
          },
          (acc) => {
            accumulated = acc;
            setSolution(acc);
          },
        );

        if (accumulated.trim()) {
          const durationMinutes = Math.round((Date.now() - start) / 60000) + 1;
          recordActivity?.({
            type: "homework_help",
            subject: "Homework Help",
            title: text.slice(0, 80),
            durationMinutes,
            metadata: { ocrUsed: true },
          });
        }
      } catch {
        setSolution("Connection error. Please try again.");
      }
    },
    [recordActivity],
  );

  const handlePasteText = useCallback(() => {
    if (!ocrText.trim()) return;
    getSolution(ocrText);
  }, [ocrText, getSolution]);

  const handleClear = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setOcrText("");
    setSolution("");
    setStep("upload");
  }, [preview]);

  return (
    <StudyWorkspaceShell
      mode="tutor"
      title="Homework Help"
      subtitle="Snap a problem, get an AI Socratic walkthrough"
    >
      {onReturnHome && (
        <button
          onClick={onReturnHome}
          className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-background/50 px-3 py-1.5 text-xs text-cyan-200/70 hover:border-cyan-300/40 hover:text-cyan-300"
        >
          <Home className="h-3 w-3" />
          Back to Dashboard
        </button>
      )}

      <div className="space-y-6">
        {/* Upload / OCR step */}
        <AnimatePresence>
          {(step === "upload" || step === "ocr") && (
            <motion.div
              key="upload-step"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              {!preview ? (
                <UploadArea
                  onFileSelected={handleFileSelected}
                  isProcessing={isProcessing}
                  preview={null}
                  onClear={handleClear}
                />
              ) : (
                <div className="rounded-3xl border border-white/10 bg-background/70 p-5 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileImage className="h-8 w-8 text-cyan-300" />
                      <div>
                        <p className="font-medium text-sm text-white">{file?.name}</p>
                        <p className="text-xs text-cyan-200/50">
                          {(file?.size ?? 0) > 1024
                            ? `${Math.round((file?.size ?? 0) / 1024)} KB`
                            : `${file?.size ?? 0} B`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleClear}
                      className="rounded-xl border border-white/10 p-2 text-cyan-200/70 hover:border-cyan-300/40"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {preview && (
                    <motion.img
                      src={preview}
                      alt="Upload preview"
                      className="mt-4 max-h-48 w-full rounded-2xl object-contain"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={runOCR}
                      disabled={isProcessing}
                      className="rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(0,255,255,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isProcessing ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Processing
                        </span>
                      ) : (
                        "Extract Text (OCR)"
                      )}
                    </button>
                    <button
                      onClick={handleClear}
                      className="rounded-3xl border border-white/10 px-5 py-3 text-sm text-white hover:border-cyan-300"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Text input fallback */}
              <div className="rounded-3xl border border-white/10 bg-background/70 p-5 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
                <textarea
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  placeholder="Or paste your homework problem here..."
                  className="field min-h-32 w-full text-sm"
                />
                {ocrText.trim() && (
                  <button
                    onClick={handlePasteText}
                    disabled={isProcessing}
                    className="mt-3 inline-flex items-center gap-2 rounded-3xl bg-violet-500 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(136,0,255,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                    Get AI Solution
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Solution step */}
        {step === "explaining" && solution && (
          <motion.div
            key="solution-step"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="rounded-3xl border border-[rgba(0,255,255,0.12)] bg-[rgba(6,12,24,0.72)] backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
          >
            <div className="prose prose-invert max-w-none text-sm leading-7 whitespace-pre-wrap">
              {solution}
            </div>
          </motion.div>
        )}
      </div>
    </StudyWorkspaceShell>
  );
}

function UploadArea({ onFileSelected, isProcessing }: UploadAreaProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onFileSelected(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[rgba(0,255,255,0.2)] bg-[rgba(6,12,24,0.5)] p-8 text-center transition-colors hover:border-cyan-300/50"
      onClick={() => document.getElementById("homework-file-input")?.click()}
    >
      <input
        id="homework-file-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <Upload className="mb-4 h-10 w-10 text-cyan-300/60" />
      <p className="font-display text-sm font-bold uppercase tracking-wider text-white/80">
        Drop a photo or click to upload
      </p>
      <p className="mt-1 text-xs text-cyan-200/40">
        PNG, JPG, WEBP — homework problems, diagrams, or notes
      </p>
      {isProcessing && (
        <motion.div
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing…
        </motion.div>
      )}
    </div>
  );
}
