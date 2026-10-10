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
} from "@/components/ui/dialog";
import {
  previewMemberImportAction,
  confirmMemberImportAction,
  type MemberImportPreview,
} from "../actions";

interface MemberImportViewProps {
  currentCount: number;
}

export default function MemberImportView({
  currentCount,
}: MemberImportViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<MemberImportPreview | null>(null);

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      setPreview(null);
      router.push("/members");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          엑셀로 전체 교체
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">현재 {currentCount}명</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-4 max-w-xl">
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1.5">
          <p>
            엑셀 파일을 업로드하면{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              현재 등록된 구성원 전체가 삭제되고 업로드한 내용으로 완전히 교체
            </strong>
            됩니다.
          </p>
          <p>
            필수 컬럼: <strong>이름</strong>, <strong>직분</strong>
            (초원지기/목자/목원/임원단). 목자/목원은{" "}
            <strong>상위리더이름</strong>(각각 초원지기/목자 이름)이 필요합니다.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isParsing}
        >
          <Upload size={15} className="mr-1.5" />
          {isParsing ? "파일 분석 중..." : "엑셀 파일 선택"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Dialog
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>업로드 내용 확인</DialogTitle>
            <DialogDescription>
              {preview &&
                `현재 ${preview.currentCount}명 → 업로드 후 ${preview.nextCount}명으로 전체 교체됩니다.`}
            </DialogDescription>
          </DialogHeader>

          {preview && preview.errors.length > 0 ? (
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
          ) : preview && preview.nextCount === 0 ? (
            <p className="text-sm font-medium text-red-600">
              반영할 구성원이 없습니다. 엑셀에 데이터 행이 있는지 확인해주세요.
            </p>
          ) : preview ? (
            <p className="text-sm text-green-600">
              오류가 없습니다. 확정하면 즉시 반영됩니다.
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreview(null)}
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={
                !preview ||
                preview.errors.length > 0 ||
                preview.nextCount === 0 ||
                isSubmitting
              }
              onClick={handleConfirm}
            >
              {isSubmitting ? "반영 중..." : "확정하고 전체 교체"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
