"use server"

import { getServiceRoleClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { CreateRegistrationSchema, AddParticipantSchema, UpdateRegistrationStatusSchema, RegisterWithParticipantsSchema } from "@/types/dto"
import { handleSupabaseError } from "@/lib/utils/error-handler"

// ============================================================
// Verify Association Session
// ============================================================
async function verifyAssociationSession(associationId: string): Promise<boolean> {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) return false

        // Verify the association exists and belongs to this user
        // Using standard supabase client relies on RLS (Row Level Security)
        const { data: assoc } = await supabase
            .from("associations")
            .select("id, user_id")
            .eq("id", associationId)
            .eq("user_id", user.id)
            .single()

        return !!assoc
    } catch {
        return false
    }
}

// ============================================================
// Register for Activity (association)
// ============================================================
export async function registerForActivity(
    activityId: string,
    associationId: string,
    notes?: string
) {
    // Verify session first
    const isSessionValid = await verifyAssociationSession(associationId)
    if (!isSessionValid) {
        throw new Error("جلسة المستخدم منتهية الصلاحية. يرجى تسجيل الدخول مجدداً")
    }
    const parsed = CreateRegistrationSchema.safeParse({ activity_id: activityId, notes })
    if (!parsed.success) throw new Error(parsed.error.errors[0].message)

    const supabase = await createSupabaseServerClient()

    // Check activity allows registration
    const { data: activity } = await supabase
        .from("activities")
        .select("allow_association_registration, max_associations, template")
        .eq("id", activityId)
        .single()

    if (!activity) {
        throw new Error("النشاط غير موجود")
    }

    const isTemplateReg = ["announcement_reg", "announcement_reg_participants", "special"].includes(activity.template || "")
    if (!activity.allow_association_registration && !isTemplateReg) {
        throw new Error("هذا النشاط لا يقبل التسجيل")
    }

    // Check max associations limit
    if (activity.max_associations) {
        const { count } = await supabase
            .from("activity_registrations")
            .select("id", { count: "exact" })
            .eq("activity_id", activityId)
            .in("status", ["pending", "approved"])

        if ((count ?? 0) >= activity.max_associations) {
            throw new Error("اكتمل عدد الجمعيات المسجلة في هذا النشاط")
        }
    }

    const { data, error } = await supabase
        .from("activity_registrations")
        .insert({
            activity_id: activityId,
            association_id: associationId,
            notes: parsed.data.notes,
            status: "pending",
        })
        .select("id, activity_id, association_id, status, notes, created_at")
        .single()

    if (error) {
        if (error.code === "23505") throw new Error("لقد قمت بالتسجيل في هذا النشاط مسبقاً")
        throw new Error(handleSupabaseError(error))
    }

    return data
}

// ============================================================
// Get Registrations for Activity (admin)
// ============================================================
export async function getRegistrationsForActivity(activityId: string) {
    const db = getServiceRoleClient()
    const { data, error } = await db
        .from("activity_registrations")
        .select(`
      id, status, notes, rejection_reason, created_at, updated_at,
      associations (id, name, email, phone, wilaya, city),
      activity_participants (id, name, birthdate, category, notes)
    `)
        .eq("activity_id", activityId)
        .order("created_at", { ascending: false })

    if (error) throw new Error(handleSupabaseError(error))
    return data ?? []
}

// ============================================================
// Get All Registrations (admin)
// ============================================================
export async function getAllRegistrations() {
    const db = getServiceRoleClient()
    const { data, error } = await db
        .from("activity_registrations")
        .select(`
      id, status, notes, rejection_reason, created_at, updated_at,
      associations (id, name, email, phone),
      activities (id, title, date),
      activity_participants (id, name, birthdate, category)
    `)
        .order("created_at", { ascending: false })

    if (error) throw new Error(handleSupabaseError(error))
    return data ?? []
}

// ============================================================
// Get My Registrations (association)
// ============================================================
export async function getMyRegistrations(associationId: string) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
        .from("activity_registrations")
        .select(`
      id, status, notes, rejection_reason, created_at, updated_at,
      activities (id, title, date, location),
      activity_participants (id, name, birthdate, category)
    `)
        .eq("association_id", associationId)
        .order("created_at", { ascending: false })

    if (error) throw new Error(handleSupabaseError(error))
    return data ?? []
}

// ============================================================
// Get Recent Registrations for Dashboard (association — last 5)
// ============================================================
export async function getRecentRegistrations(associationId: string) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
        .from("activity_registrations")
        .select(`
      id, status, created_at,
      activities (id, title)
    `)
        .eq("association_id", associationId)
        .order("created_at", { ascending: false })
        .limit(5)

    if (error) throw new Error(handleSupabaseError(error))
    return data ?? []
}

// ============================================================
// Update Registration Status (admin)
// ============================================================
export async function updateRegistrationStatus(
    input: { id: string; status: "pending" | "approved" | "rejected" | "cancelled"; rejection_reason?: string }
) {
    const parsed = UpdateRegistrationStatusSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.errors[0].message)

    const db = getServiceRoleClient()
    const { data, error } = await db
        .from("activity_registrations")
        .update({
            status: parsed.data.status,
            rejection_reason: parsed.data.rejection_reason,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", parsed.data.id)
        .select("id, status, rejection_reason, reviewed_at")
        .single()

    if (error) throw new Error(handleSupabaseError(error))
    return data
}

// ============================================================
// Add Participants to Registration (association)
// ============================================================
export async function addParticipants(
    participants: Array<{ registration_id: string; name: string; birthdate?: string; category?: string; notes?: string }>,
    associationId: string
) {
    // Verify session first
    const isSessionValid = await verifyAssociationSession(associationId)
    if (!isSessionValid) {
        throw new Error("جلسة المستخدم منتهية الصلاحية. يرجى تسجيل الدخول مجدداً")
    }

    const supabase = await createSupabaseServerClient()

    // Verify all registrations belong to this association in a single bulk query
    const regIds = [...new Set(participants.map(p => p.registration_id))]
    const { data: regs } = await supabase
        .from("activity_registrations")
        .select("id, status")
        .in("id", regIds)
        .eq("association_id", associationId)

    const regMap = new Map((regs ?? []).map(r => [r.id, r]))

    for (const p of participants) {
        const parsed = AddParticipantSchema.safeParse(p)
        if (!parsed.success) throw new Error(parsed.error.errors[0].message)

        const reg = regMap.get(p.registration_id)
        if (!reg) throw new Error("التسجيل غير موجود أو غير مرتبط بجمعيتك")
        if (reg.status !== "approved") throw new Error("يجب أن تكون حالة التسجيل 'مقبول' لإضافة المشاركين")
    }

    const { data, error } = await supabase
        .from("activity_participants")
        .insert(participants)
        .select("id, name, birthdate, category")

    if (error) throw new Error(handleSupabaseError(error))
    return data
}

// ============================================================
// Register for Activity with Participants (Atomic)
// ============================================================
export async function registerWithParticipants(
    input: { activity_id: string; notes?: string; participants?: any[] },
    associationId: string
) {
    // Verify session first
    const isSessionValid = await verifyAssociationSession(associationId)
    if (!isSessionValid) {
        throw new Error("جلسة المستخدم منتهية الصلاحية. يرجى تسجيل الدخول مجدداً")
    }

    const parsed = RegisterWithParticipantsSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.errors[0].message)

    const supabase = await createSupabaseServerClient()

    // 1. Check activity limits
    const { data: activity } = await supabase
        .from("activities")
        .select("allow_association_registration, max_associations, max_participants, template")
        .eq("id", parsed.data.activity_id)
        .single()

    if (!activity) {
        throw new Error("النشاط غير موجود")
    }

    const isTemplateReg = ["announcement_reg", "announcement_reg_participants", "special"].includes(activity.template || "")
    if (!activity.allow_association_registration && !isTemplateReg) {
        throw new Error("هذا النشاط لا يقبل التسجيل")
    }

    if (activity.max_associations) {
        const { count } = await supabase
            .from("activity_registrations")
            .select("id", { count: "exact" })
            .eq("activity_id", parsed.data.activity_id)
            .in("status", ["pending", "approved"])

        if ((count ?? 0) >= activity.max_associations) {
            throw new Error("اكتمل عدد الجمعيات المسجلة في هذا النشاط")
        }
    }

    if (activity.max_participants && parsed.data.participants) {
        if (parsed.data.participants.length > activity.max_participants) {
            throw new Error(`الحد الأقصى للمشاركين هو ${activity.max_participants} مشارك(ين)`)
        }
    }

    // 2. Insert Registration
    const { data: regData, error: regError } = await supabase
        .from("activity_registrations")
        .insert({
            activity_id: parsed.data.activity_id,
            association_id: associationId,
            notes: parsed.data.notes,
            status: "pending",
        })
        .select("id")
        .single()

    if (regError) {
        if (regError.code === "23505") throw new Error("لقد قمت بالتسجيل في هذا النشاط مسبقاً")
        throw new Error(handleSupabaseError(regError))
    }

    // 3. Insert Participants if provided
    if (parsed.data.participants && parsed.data.participants.length > 0) {
        // Map participants to the generated registration_id
        const participantsToInsert = parsed.data.participants.map(p => ({
            registration_id: regData.id,
            name: p.name,
            birthdate: p.birthdate,
            category: p.category,
        }))

        // Verify with schema
        for (const p of participantsToInsert) {
            const partParsed = AddParticipantSchema.safeParse(p)
            if (!partParsed.success) throw new Error(partParsed.error.errors[0].message)
        }

        const { error: partError } = await supabase
            .from("activity_participants")
            .insert(participantsToInsert)

        if (partError) {
            // Manual rollback
            await supabase.from("activity_registrations").delete().eq("id", regData.id)
            throw new Error(handleSupabaseError(partError))
        }
    }

    return true
}
