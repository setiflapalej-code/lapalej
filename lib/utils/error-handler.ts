/**
 * Centralized Supabase/PostgreSQL error handler.
 * Maps technical error codes and message patterns to user-friendly Arabic strings.
 * Use this in all service try/catch blocks and Server Actions.
 */
export function handleSupabaseError(error: unknown): string {
    // If the error already has an Arabic message (thrown deliberately by business logic),
    // pass it through unchanged.
    if (error instanceof Error && isArabic(error.message)) {
        return error.message
    }

    const err = error as { code?: string; message?: string }
    const code = err?.code ?? ""
    const message = (err?.message ?? "").toLowerCase()

    // ── PostgreSQL / Supabase PostgREST error codes ──────────────────────────

    // 23505 — Unique violation
    if (code === "23505") {
        return "عذراً، هذه البيانات (مثل البريد أو الهاتف) مسجلة مسبقاً في النظام. يرجى التأكد من عدم تكرار البيانات أو البحث عن السجل الموجود فعلياً."
    }

    // 42501 — Insufficient privilege / RLS violation
    if (code === "42501") {
        return "ليست لديك الصلاحية لتنفيذ هذا الإجراء. يرجى التأكد من تسجيل الدخول بحساب المشرف (Admin) أو المحاولة مرة أخرى بعد تسجيل الخروج."
    }

    // 23503 — Foreign key violation (usually: can't delete a referenced record)
    if (code === "23503") {
        return "لا يمكن حذف هذا السجل لأنه مرتبط ببيانات أخرى. يرجى حذف البيانات المرتبطة به أولاً ثم المحاولة مجدداً."
    }

    // 22P02 — Invalid text representation / malformed input
    if (code === "22P02") {
        return "صيغة البيانات المُدخلة غير صحيحة. يرجى مراجعة الخانات والتأكد من كتابتها بشكل سليم قبل الحفظ."
    }

    // ── Message pattern matching ─────────────────────────────────────────────

    // Network / connectivity issues
    if (message.includes("network") || message.includes("fetch") || message.includes("failed to fetch")) {
        return "فشل الاتصال بالخادم. يرجى التحقق من جودة الإنترنت لديك، أو قم بإعادة تحميل الصفحة، أو جرب استخدام متصفح آخر."
    }

    // Auth / session expiry
    if (message.includes("jwt") || message.includes("token") || message.includes("session")) {
        return "انتهت صلاحية جلسة العمل الحالية لدواعي أمنية. يرجى تسجيل الدخول مجدداً أو تحديث الصفحة للاستمرار في العمل."
    }

    // ── Generic fallback ─────────────────────────────────────────────────────
    return "حدث خطأ غير متوقع أثناء معالجة الطلب. يرجى المحاولة مرة أخرى، وفي حال استمرار المشكلة يرجى إبلاغ الدعم الفني بالرمز (Internal Error)."
}

/**
 * Returns true if the given string contains Arabic characters.
 * Used to detect deliberate Arabic business-logic errors so they pass through unchanged.
 */
function isArabic(text: string): boolean {
    return /[\u0600-\u06FF]/.test(text)
}
