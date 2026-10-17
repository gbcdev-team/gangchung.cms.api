"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format, isValid, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDescendantIds } from "@/libs/member-tree";
import { MEMBER_POSITIONS, TOP_LEVEL_POSITIONS } from "@/libs/member-roles";
import { cn } from "@/libs/utils";
import type { Member, MemberFormInput, MemberPosition } from "@/types/member";

const BIRTH_DATE_FORMAT = "yyyy-MM-dd";

function BirthDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const parsedDate = value
    ? parse(value, BIRTH_DATE_FORMAT, new Date())
    : undefined;
  const selectedDate =
    parsedDate && isValid(parsedDate) ? parsedDate : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate
              ? format(selectedDate, "yyyy년 M월 d일")
              : "생년월일 선택"}
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={ko}
          selected={selectedDate}
          defaultMonth={selectedDate}
          captionLayout="dropdown"
          onSelect={(date) => {
            onChange(date ? format(date, BIRTH_DATE_FORMAT) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

const memberFormSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력해주세요."),
    phone: z.string().trim(),
    gender: z.union([z.literal("남"), z.literal("여"), z.literal("")]),
    age_group: z.string().trim(),
    birth_date: z.string(),
    position: z.enum(["초원지기", "목자", "목원", "임원단", "목사", "전도사"]),
    parent_id: z.string().uuid().nullable(),
  })
  .refine(
    (v) =>
      TOP_LEVEL_POSITIONS.includes(v.position)
        ? v.parent_id === null
        : !!v.parent_id,
    {
      message: "목자/목원은 상위 리더를 선택해야 합니다.",
      path: ["parent_id"],
    },
  );

type MemberFormValues = z.infer<typeof memberFormSchema>;

interface MemberFormProps {
  initialValues?: Partial<MemberFormInput>;
  currentMemberId?: string;
  allMembers: Member[];
  onSubmit: (input: MemberFormInput) => Promise<void>;
  submitLabel?: string;
}

export default function MemberForm({
  initialValues,
  currentMemberId,
  allMembers,
  onSubmit,
  submitLabel = "등록",
}: MemberFormProps) {
  const router = useRouter();

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      phone: initialValues?.phone ?? "",
      gender: initialValues?.gender ?? "",
      age_group: initialValues?.age_group ?? "",
      birth_date: initialValues?.birth_date ?? "",
      position: initialValues?.position ?? "목원",
      parent_id: initialValues?.parent_id ?? null,
    },
  });

  const position = form.watch("position");

  const excludedIds = currentMemberId
    ? new Set([
        currentMemberId,
        ...getDescendantIds(currentMemberId, allMembers),
      ])
    : new Set<string>();

  const leaderOptions = allMembers.filter((m) => {
    if (excludedIds.has(m.id)) return false;
    if (position === "목자") return m.position === "초원지기";
    if (position === "목원") return m.position === "목자";
    return false;
  });

  const handlePositionChange = (next: MemberPosition) => {
    form.setValue("position", next);
    if (TOP_LEVEL_POSITIONS.includes(next)) {
      form.setValue("parent_id", null);
      return;
    }
    const stillValid = leaderOptions.some(
      (m) => m.id === form.getValues("parent_id"),
    );
    if (!stillValid) form.setValue("parent_id", null);
  };

  const handleSubmit = async (values: MemberFormValues) => {
    try {
      await onSubmit({
        name: values.name,
        phone: values.phone,
        gender: values.gender,
        age_group: values.age_group,
        birth_date: values.birth_date,
        position: values.position,
        parent_id: TOP_LEVEL_POSITIONS.includes(values.position)
          ? null
          : values.parent_id,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 sm:p-6 space-y-5"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                이름 <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="이름을 입력하세요" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>전화번호</FormLabel>
              <FormControl>
                <Input placeholder="010-0000-0000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>성별</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="성별 선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="남">남</SelectItem>
                  <SelectItem value="여">여</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="age_group"
          render={({ field }) => (
            <FormItem>
              <FormLabel>나이(또래)</FormLabel>
              <FormControl>
                <Input placeholder="예: 20대, 은혜또래" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="birth_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>생년월일</FormLabel>
              <BirthDatePicker value={field.value} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                직분 <span className="text-red-500">*</span>
              </FormLabel>
              <Select
                value={field.value}
                onValueChange={(v) => handlePositionChange(v as MemberPosition)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MEMBER_POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {!TOP_LEVEL_POSITIONS.includes(position) && (
          <FormField
            control={form.control}
            name="parent_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  상위 리더 <span className="text-red-500">*</span>
                </FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          position === "목자" ? "초원지기 선택" : "목자 선택"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {leaderOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "저장 중..." : submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </form>
    </Form>
  );
}
