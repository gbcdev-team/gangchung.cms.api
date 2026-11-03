"use client";

import { useState } from "react";
import { toast } from "sonner";
import { changePasswordAction } from "./actions";
import PasswordInput from "@/components/ui/password-input";

const inputClass =
  "w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-black transition-colors";

export default function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) {
      setError("새 비밀번호 확인이 일치하지 않습니다");
      return;
    }

    setSaving(true);
    try {
      const result = await changePasswordAction(current, next);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("비밀번호가 변경되었습니다");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col gap-5"
    >
      <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
        비밀번호 변경
      </h2>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          현재 비밀번호
        </span>
        <PasswordInput
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          새 비밀번호 (6자 이상)
        </span>
        <PasswordInput
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          새 비밀번호 확인
        </span>
        <PasswordInput
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </label>

      <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
        <button
          type="submit"
          disabled={saving || !current || !next || !confirm}
          className="bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
        >
          {saving ? "변경 중..." : "비밀번호 변경"}
        </button>
      </div>
    </form>
  );
}
