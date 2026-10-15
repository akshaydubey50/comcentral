import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ImportPreview } from "@/shared/contracts";

const maxBytes = 2 * 1024 * 1024;

export type ImportCommitInput = Readonly<{ text: string; hash: string }>;

interface ReviewedImport {
  preview: ImportPreview;
  commitInput: ImportCommitInput;
}

/** Owns the selected file, ordered reads, and the exact content reviewed by the server. */
export function useCsvImportState() {
  const fileReadSequence = useRef(0);
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const preview = useMutation({
    mutationFn: async (text: string): Promise<ReviewedImport> => {
      const result = await api.previewImport(text);
      return {
        preview: result,
        commitInput: Object.freeze({ text, hash: result.previewHash }),
      };
    },
  });

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const readSequence = ++fileReadSequence.current;
    const file = event.target.files?.[0];
    preview.reset();
    setFileError(null);
    setCsvText("");
    setReading(false);
    setFileName(file?.name ?? "");
    if (!file) return;
    if (file.size > maxBytes) {
      setFileError(
        "The file is larger than 2 MB. Split it into a batch of at most 10,000 employees.",
      );
      return;
    }
    setReading(true);
    try {
      const text = await file.text();
      if (readSequence !== fileReadSequence.current) return;
      if (!text.trim()) {
        setFileError("The CSV file is empty. Choose a completed template.");
        return;
      }
      setCsvText(text);
    } catch {
      if (readSequence === fileReadSequence.current) {
        setFileError("The CSV file could not be read. Choose a different file.");
      }
    } finally {
      if (readSequence === fileReadSequence.current) setReading(false);
    }
  }

  return {
    csvText,
    fileError,
    fileName,
    preview,
    reading,
    reviewed: preview.data,
    selectFile,
    validate: () => preview.mutate(csvText),
  };
}
