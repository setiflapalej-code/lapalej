"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getServiceRoleClient } from "@/lib/supabase/admin"
import { LoginAssociationSchema, RegisterAssociationSchema } from "@/types/dto"
import type { AuthResult, AssociationSession } from "@/types/auth"
import { handleSupabaseError } from "@/lib/utils/error-handler"

// ============================================================
// Association Register (via Supabase Auth)
// ============================================================
export async function associationRegister(
    formData: unknown,
): Promise<AuthResult<AssociationSession>> {
    const parsed = RegisterAssociationSchema.safeParse(formData)
    if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0].message }
    }
    const { email, password, name, phone, address, city, wilaya, registration_number, description, institution_name, president_name, president_phone, secretary_name, secretary_phone, clerk_name, clerk_phone, office_approval_url } = parsed.data

    const supabase = await createSupabaseServerClient()
    const adminDb = getServiceRoleClient()

    try {
        // 1. Create auth user using Admin API to bypass email rate limits
        // We set email_confirm: true so they can login immediately once approved
        const { data: authData, error: authError } = await adminDb.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name,
            }
        })

        if (authError) {
            if (authError.code === "user_already_exists" || authError.status === 422) {
                return {
                    success: false,
                    error: "عذراً، هذا البريد الإلكتروني مسجل مسبقاً في النظام. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول بالحساب الموجود.",
                    code: "EMAIL_EXISTS"
                }
            }
            return { success: false, error: handleSupabaseError(authError), code: "AUTH_ERROR" }
        }

        if (!authData.user) {
            return { success: false, error: "فشل إنشاء الحساب", code: "USER_NOT_CREATED" }
        }

        // 2. Create association profile
        const { data: assoc, error: assocError } = await adminDb
            .from("associations")
            .insert({
                user_id: authData.user.id,
                email,
                name,
                phone,
                address,
                city,
                wilaya,
                registration_number,
                description,
                status: "pending",
                institution_name,
                president_name,
                president_phone,
                secretary_name,
                secretary_phone,
                clerk_name,
                clerk_phone,
                office_approval_url,
            })
            .select("id, name, email, status")
            .single()

        if (assocError || !assoc) {
            // Rollback auth user if association creation fails
            await adminDb.auth.admin.deleteUser(authData.user.id)
            return { success: false, error: "فشل إنشاء ملف الجمعية", code: "PROFILE_ERROR" }
        }

        // 3. Auto-login the user so they don't have to manually log in immediately after registration
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (signInError) {
            console.error("[AuthService] Auto login after registration failed:", signInError)
            // We don't fail the registration if auto-login fails, they can just manually log in.
        }

        return {
            success: true,
            data: {
                userId: authData.user.id,
                email: assoc.email,
                associationId: assoc.id,
                associationName: assoc.name,
                status: assoc.status,
            },
        }
    } catch (err) {
        console.error("[AuthService] Register error:", err)
        return { success: false, error: "خطأ في الخادم", code: "SERVER_ERROR" }
    }
}

// ============================================================
// Association Login (via Supabase Auth)
// ============================================================
export async function associationLogin(
    formData: unknown,
): Promise<AuthResult<AssociationSession>> {
    const parsed = LoginAssociationSchema.safeParse(formData)
    if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0].message }
    }
    const { email, password } = parsed.data

    const supabase = await createSupabaseServerClient()
    const adminDb = getServiceRoleClient()

    try {
        // --- RATE LIMITING CHECK ---
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
        const { count, error: countError } = await adminDb
            .from("login_attempts")
            .select("*", { count: 'exact', head: true })
            .eq("email", email)
            .gte("attempted_at", fifteenMinutesAgo)

        if (countError) {
            console.error("[AuthService] Rate limit count error:", countError)
            return { success: false, error: "خطأ في التحقق من الحماية", code: "SERVER_ERROR" }
        }

        if (count && count >= 5) {
            return {
                success: false,
                error: "لقد تجاوزت عدد محاولات الدخول المسموح بها، يرجى الانتظار 15 دقيقة",
                code: "RATE_LIMITED"
            }
        }
        // ---------------------------

        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            // Log the failed attempt
            await adminDb.from("login_attempts").insert({ email })
            return { success: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة", code: "INVALID_CREDENTIALS" }
        }

        if (!data.user) {
            return { success: false, error: "فشل تسجيل الدخول", code: "AUTH_ERROR" }
        }

        // --- CLEAR RATE LIMITS ON SUCCESS ---
        await adminDb.from("login_attempts").delete().eq("email", email)
        // ------------------------------------

        // Get association profile
        const { data: assoc } = await adminDb
            .from("associations")
            .select("id, name, email, status")
            .eq("user_id", data.user.id)
            .single()

        if (!assoc) {
            await supabase.auth.signOut()
            return { success: false, error: "لم يتم العثور على ملف الجمعية", code: "NO_PROFILE" }
        }

        return {
            success: true,
            data: {
                userId: data.user.id,
                email: assoc.email,
                associationId: assoc.id,
                associationName: assoc.name,
                status: assoc.status,
            },
        }
    } catch (err) {
        console.error("[AuthService] Login error:", err)
        return { success: false, error: "خطأ في الخادم", code: "SERVER_ERROR" }
    }
}

// ============================================================
// Association Logout
// ============================================================
export async function associationLogout(): Promise<void> {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
}

// ============================================================
// Get Association Session (from Supabase cookie session)
// ============================================================
export async function getAssociationSession(): Promise<AssociationSession | null> {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return null

        const { data: assoc } = await supabase
            .from("associations")
            .select("id, name, email, status")
            .eq("user_id", user.id)
            .single()

        if (!assoc) return null

        return {
            userId: user.id,
            email: assoc.email,
            associationId: assoc.id,
            associationName: assoc.name,
            status: assoc.status,
        }
    } catch {
        return null
    }
}
