"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  previewMemberImportAction,
  confirmMemberImportAction,
  type MemberImportPreview,
} from "./actions";

interface MemberImportDialogProps {
  currentCount: number;
}

export default function MemberImportDialog({
  currentCount,
}: MemberImportDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<MemberImportPreview | null>(null);

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setPreview(null);
      resetFileInput();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error("엑셀(.xlsx, .xls) 또는 CSV 파일만 업로드할 수 있습니다.");
      resetFileInput();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다.");
      resetFileInput();
      return;
    }

    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await previewMemberImportAction(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setPreview(result);
    } finally {
      setIsParsing(false);
      resetFileInput();
    }
  };

  const handleConfirm = async () => {
    if (!preview || preview.errors.length > 0 || preview.nextCount === 0)
      return;
    setIsSubmitting(true);
    try {
      const result = await confirmMemberImportAction(preview.rows);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("구성원 전체 교체가 완료되었습니다.");
      handleOpenChange(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
        >
          <Upload size={15} />
          엑셀로 전체 교체
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {!preview ? (
          <>
            <DialogHeader>
              <DialogTitle>엑셀로 전체 교체</DialogTitle>
              <DialogDescription>현재 {currentCount}명</DialogDescription>
            </DialogHeader>

            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1.5 leading-relaxed">
              <p>
                엑셀 파일을 업로드하면{" "}
                <strong className="text-gray-900 dark:text-gray-100">
                  현재 등록된 구성원 전체가 삭제되고 업로드한 내용으로 완전히
                  교체
                </strong>
                됩니다.
              </p>
              <p>
                필수 컬럼: <strong>이름</strong>, <strong>직분</strong>
                (초원지기/목자/목원/임원단/목사/전도사). 목자/목원은{" "}
                <strong>상위리더이름</strong>(각각 초원지기/목자 이름)이
                필요합니다.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
              >
                <Upload size={15} className="mr-1.5" />
                {isParsing ? "파일 분석 중..." : "엑셀 파일 선택"}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>업로드 내용 확인</DialogTitle>
              <DialogDescription>
                {`현재 ${preview.currentCount}명 → 업로드 후 ${preview.nextCount}명으로 전체 교체됩니다.`}
              </DialogDescription>
            </DialogHeader>

            {preview.errors.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-600">
                  {preview.errors.length}건의 오류가 있어 확정할 수 없습니다.
                  엑셀을 수정한 뒤 다시 업로드해주세요.
                </p>
                <ul className="max-h-60 overflow-y-auto space-y-1 text-sm">
                  {preview.errors.map((err, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-gray-600 dark:text-gray-300"
                    >
                      <span className="font-mono text-gray-400 shrink-0">
                        {err.rowNumber}행
                      </span>
                      <span>{err.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : preview.nextCount === 0 ? (
              <p className="text-sm font-medium text-red-600">
                반영할 구성원이 없습니다. 엑셀에 데이터 행이 있는지
                확인해주세요.
              </p>
            ) : (
              <p className="text-sm text-green-600">
                오류가 없습니다. 확정하면 즉시 반영됩니다.
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreview(null)}
              >
                다시 선택
              </Button>
              <Button
                type="button"
                disabled={
                  preview.errors.length > 0 ||
                  preview.nextCount === 0 ||
                  isSubmitting
                }
                onClick={handleConfirm}
              >
                {isSubmitting ? "반영 중..." : "확정하고 전체 교체"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
