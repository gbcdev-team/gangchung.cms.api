"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createMinistryHistoryAction,
  updateMinistryHistoryAction,
} from "./actions";
import {
  ministryHistoryFormSchema,
  MAX_HISTORY_BUTTONS,
  type MinistryHistory,
  type MinistryHistoryFormInput,
} from "@/types/ministry-history";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const formSchema = ministryHistoryFormSchema;

type FormValues = MinistryHistoryFormInput;

interface HistoryFormProps {
  // 수정 시 기존 글, 새 글이면 생략
  history?: MinistryHistory;
  // 새 글의 슬러그 기본값(서버에서 만들어 내려 하이드레이션 불일치를 피한다)
  defaultSlug?: string;
}

export default function HistoryForm({
  history,
  defaultSlug = "",
}: HistoryFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    history?.thumbnail_url ?? null,
  );
  const [removeThumbnail, setRemoveThumbnail] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: history?.title ?? "",
      subtitle: history?.subtitle ?? "",
      slug: history?.slug ?? defaultSlug,
      category: history?.category ?? "",
      date_text: history?.date_text ?? "",
      summary: history?.summary ?? "",
      buttons: history?.buttons ?? [],
      is_published: history?.is_published ?? false,
    },
  });

  const {
    fields: buttonFields,
    append: appendButton,
    remove: removeButton,
  } = useFieldArray({ control: form.control, name: "buttons" });

  const slug = form.watch("slug");
  const isPublished = form.watch("is_published");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error("JPG, PNG, GIF, WebP 이미지만 사용할 수 있습니다.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("파일 크기는 5MB 이하여야 합니다.");
      return;
    }
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setThumbnailFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveThumbnail(false);
  };

  const handleRemoveThumbnail = () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setThumbnailFile(null);
    setPreviewUrl(null);
    setRemoveThumbnail(true);
  };

  const handleSubmit = async (values: FormValues) => {
    const formData = new FormData();
    if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

    try {
      if (history) {
        await updateMinistryHistoryAction(
          history.id,
          values,
          formData,
          removeThumbnail,
        );
      } else {
        await createMinistryHistoryAction(values, formData);
      }
      router.push("/ministry-history");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    }
  };

  const submitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col lg:flex-row gap-4 items-start"
      >
        <div className="w-full flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 sm:p-6 space-y-5">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  제목 <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="글 제목을 입력하세요" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subtitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>부제목</FormLabel>
                <FormControl>
                  <Input placeholder="예: 전도 대상자 기도" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  슬러그(URL) <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input className="font-mono" {...field} disabled />
                </FormControl>
                <p className="text-xs text-gray-400">
                  API URL: /api/v1/ministry-history/{slug}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">
              대표 이미지{" "}
              <span className="text-xs font-normal text-gray-400">
                권장 사이즈: 800 × 1200px (2 : 3) · JPG, PNG, GIF, WebP · 최대
                5MB
              </span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <div className="relative w-44 aspect-[2/3] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="대표 이미지 미리보기"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  aria-label="이미지 삭제"
                  onClick={handleRemoveThumbnail}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-44 aspect-[2/3] flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-gray-400 transition-colors"
              >
                <ImagePlus size={22} />
                <span className="text-xs">이미지 추가</span>
              </button>
            )}
          </div>

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>카테고리</FormLabel>
                <FormControl>
                  <Input placeholder="예: 2025 여름수련회" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date_text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>날짜</FormLabel>
                <FormControl>
                  <Input
                    placeholder="예: 2026.10.24 (토) 또는 2026.06.28 - 07.04"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>간단한 설명</FormLabel>
                <FormControl>
                  <textarea
                    rows={2}
                    placeholder="카드에 표시되는 한두 줄 설명"
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                버튼{" "}
                <span className="text-xs font-normal text-gray-400">
                  최대 {MAX_HISTORY_BUTTONS}개 · 첫 번째 버튼이 강조됩니다
                </span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={buttonFields.length >= MAX_HISTORY_BUTTONS}
                onClick={() => appendButton({ label: "", url: "" })}
              >
                <Plus size={14} className="mr-1" />
                버튼 추가
              </Button>
            </div>
            {buttonFields.map((item, index) => (
              <div key={item.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`buttons.${index}.label`}
                  render={({ field }) => (
                    <FormItem className="w-32 shrink-0">
                      <FormControl>
                        <Input placeholder="버튼 이름" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`buttons.${index}.url`}
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-0">
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="버튼 삭제"
                  onClick={() => removeButton(index)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-64 shrink-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "저장 중..." : isPublished ? "발행" : "임시저장"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.back()}
          >
            취소
          </Button>
          <FormField
            control={form.control}
            name="is_published"
            render={({ field }) => (
              <FormItem className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  발행 (프론트에 노출)
                </label>
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
