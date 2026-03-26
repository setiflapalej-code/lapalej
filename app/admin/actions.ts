// app/admin/actions.ts — Server actions for admin dashboard
"use server"

import { adminLogout, verifyAdminAction, revokeAdminSessions } from "@/services/AdminAuthService"
import { redirect } from "next/navigation"
import { updateRegistrationStatus } from "@/services/RegistrationService"
import { createActivity, updateActivity, deleteActivity } from "@/services/ActivityService"
import { createNews, updateNews, deleteNews } from "@/services/NewsService"
import { approveAssociation, deleteAssociation, rejectAssociation, undoRejectAssociation } from "@/services/AdminService"
import type { CreateActivityDTO, UpdateActivityDTO, CreateNewsDTO, UpdateNewsDTO } from "@/types/dto"
import { handleSupabaseError } from "@/lib/utils/error-handler"

// ============================================================
// Auth Actions
// ============================================================
export async function logoutAction() {
    await adminLogout()
    redirect("/admin/login")
}

/**
 * Emergency action — invalidates ALL active sessions for the admin user.
 * Call this if the admin account is suspected to be compromised.
 */
export async function revokeAllSessionsAction() {
    await verifyAdminAction() // Must be called from a valid admin session
    const result = await revokeAdminSessions()
    if (result.success) {
        redirect("/admin/login")
    }
    return result
}

// ============================================================
// Activity Actions
// ============================================================
export async function addActivityAction(data: CreateActivityDTO) {
    try {
        await verifyAdminAction()
        const result = await createActivity(data)
        return { success: true, data: result }
    } catch (err) {
        console.error("[addActivityAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

export async function editActivityAction(id: string, data: UpdateActivityDTO) {
    try {
        await verifyAdminAction()
        const result = await updateActivity(id, data)
        return { success: true, data: result }
    } catch (err) {
        console.error("[editActivityAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

export async function removeActivityAction(id: string) {
    try {
        await verifyAdminAction()
        await deleteActivity(id)
        return { success: true }
    } catch (err) {
        console.error("[removeActivityAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

// ============================================================
// News Actions
// ============================================================
export async function addNewsAction(data: CreateNewsDTO) {
    try {
        await verifyAdminAction()
        const result = await createNews(data)
        return { success: true, data: result }
    } catch (err) {
        console.error("[addNewsAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

export async function editNewsAction(id: string, data: UpdateNewsDTO) {
    try {
        await verifyAdminAction()
        const result = await updateNews(id, data)
        return { success: true, data: result }
    } catch (err) {
        console.error("[editNewsAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

export async function removeNewsAction(id: string) {
    try {
        await verifyAdminAction()
        await deleteNews(id)
        return { success: true }
    } catch (err) {
        console.error("[removeNewsAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

// ============================================================
// Association Actions
// ============================================================
export async function approveAssociationAction(id: string) {
    try {
        await verifyAdminAction()
        const result = await approveAssociation(id)
        return { success: true, data: result }
    } catch (err) {
        console.error("[approveAssociationAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

export async function rejectAssociationAction(id: string, reason?: string) {
    try {
        await verifyAdminAction()
        const result = await rejectAssociation(id, reason)
        return { success: true, data: result }
    } catch (err) {
        console.error("[rejectAssociationAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

export async function undoRejectAssociationAction(id: string) {
    try {
        await verifyAdminAction()
        const result = await undoRejectAssociation(id)
        return { success: true, data: result }
    } catch (err) {
        console.error("[undoRejectAssociationAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

export async function deleteAssociationAction(id: string) {
    try {
        await verifyAdminAction()
        await deleteAssociation(id)
        return { success: true }
    } catch (err) {
        console.error("[deleteAssociationAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

// ============================================================
// Registration Status Actions (activity registrations)
// ============================================================

export async function updateRegistrationStatusAction(
    id: string,
    status: "pending" | "approved" | "rejected",
    rejection_reason?: string
) {
    try {
        await verifyAdminAction()
        const result = await updateRegistrationStatus({ id, status, rejection_reason })
        return { success: true, data: result }
    } catch (err) {
        console.error("[updateRegistrationStatusAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

// ============================================================
// Contact / Message Actions
// ============================================================
import { ContactService } from "@/services/ContactService"

export async function getMessagesAction() {
    try {
        await verifyAdminAction()
        const data = await ContactService.getAllContactMessages()
        return { success: true, data }
    } catch (err) {
        console.error("[getMessagesAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

export async function replyMessageAction(id: string, replyText: string) {
    try {
        await verifyAdminAction()
        const data = await ContactService.replyToContactMessage(id, replyText)
        return { success: true, data }
    } catch (err) {
        console.error("[replyMessageAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

export async function markMessageReadAction(id: string) {
    try {
        await verifyAdminAction()
        const data = await ContactService.markMessageRead(id)
        return { success: true, data }
    } catch (err) {
        console.error("[markMessageReadAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

export async function deleteMessageAction(id: string) {
    try {
        await verifyAdminAction()
        await ContactService.deleteContactMessage(id)
        return { success: true }
    } catch (err) {
        console.error("[deleteMessageAction]", err)
        return { success: false, message: handleSupabaseError(err) }
    }
}

// ============================================================
// Load More (Pagination) Actions
// ============================================================
import { getServiceRoleClient } from "@/lib/supabase/admin"

const PAGE_SIZE = 10

export async function loadMoreActivitiesAction(offset: number) {
    await verifyAdminAction()
    const db = getServiceRoleClient()
    const { data } = await db
        .from("activities")
        .select("id, title, date, location, description, images, videos, duration, status, categories, template, allow_association_registration, allow_participant_registration, max_participants, wilaya, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
    return (data ?? []).map((a: any) => ({
        ...a,
        type: a.categories?.[0] || "عام",
        capacity: a.max_participants || 0,
        image: a.images ? a.images : "/placeholder.svg",
        activityTemplate: a.template || "announcement",
        registered: 0,
        createdAt: a.created_at,
    }))
}

export async function loadMoreNewsAction(offset: number) {
    await verifyAdminAction()
    const db = getServiceRoleClient()
    const { data } = await db
        .from("news")
        .select("id, title, excerpt, content, author, category, type, icon, color, bg_color, image, views, likes, featured, published_at, created_at, updated_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
    return (data ?? []).map((n: any) => ({
        ...n,
        status: n.published_at ? "published" : "draft",
        publishDate: n.published_at || n.created_at,
        tags: [],
        views: n.views || 0,
    }))
}

export async function loadMoreAssociationsAction(offset: number) {
    await verifyAdminAction()
    const db = getServiceRoleClient()
    const { data } = await db
        .from("associations")
        .select("id, name, email, phone, city, wilaya, status, description, logo_url, rejection_reason, approved_by, approved_at, created_at, updated_at, institution_name, president_name, president_phone, secretary_name, secretary_phone, clerk_name, clerk_phone, office_approval_url")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
    return (data ?? []).map((a: any) => ({
        id: a.id,
        associationName: a.name,
        institutionName: a.institution_name || a.city || "غير محدد",
        presidentName: a.president_name || "غير محدد",
        presidentPhone: a.president_phone || a.phone || "غير محدد",
        secretaryName: a.secretary_name || "غير محدد",
        secretaryPhone: a.secretary_phone || "غير محدد",
        clerkName: a.clerk_name || "غير محدد",
        clerkPhone: a.clerk_phone || "غير محدد",
        officeApprovalUrl: a.office_approval_url || undefined,
        email: a.email,
        phone: a.phone || "غير محدد",
        submissionDate: a.created_at,
        status: a.status,
        rejectedAt: a.status === 'rejected' ? a.updated_at : undefined,
        reviewedBy: a.approved_by || "المدير العام",
        reviewDate: a.approved_at,
        notes: a.rejection_reason || undefined,
    }))
}

export async function loadMoreMessagesAction(offset: number) {
    await verifyAdminAction()
    const db = getServiceRoleClient()
    const { data } = await db
        .from("contact_messages")
        .select("*")
        .neq("status", "replied")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
    return (data ?? []).map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email || "غير محدد",
        phone: m.phone,
        subject: m.subject,
        message: m.message,
        department: m.contactReason,
        date: m.created_at,
        status: m.status,
        priority: "medium",
    }))
}


// ============================================================
// Dashboard Stats (real total counts — no row data fetched)
// ============================================================
export async function getAdminDashboardStats() {
    await verifyAdminAction()
    const db = getServiceRoleClient()

    const [
        { count: totalActivities },
        { count: activeActivities },
        { count: totalAssociations },
        { count: approvedAssociations },
        { count: pendingAssociations },
        { count: totalNews },
        { count: publishedNews },
        { count: draftNews },
        { count: totalMessages },
        { count: unreadMessages },
        { count: totalRegistrations },
        { count: pendingRegistrations },
    ] = await Promise.all([
        db.from("activities").select("*", { count: "exact", head: true }),
        db.from("activities").select("*", { count: "exact", head: true }).eq("status", "active"),
        db.from("associations").select("*", { count: "exact", head: true }),
        db.from("associations").select("*", { count: "exact", head: true }).eq("status", "approved"),
        db.from("associations").select("*", { count: "exact", head: true }).eq("status", "pending"),
        db.from("news").select("*", { count: "exact", head: true }),
        db.from("news").select("*", { count: "exact", head: true }).not("published_at", "is", null),
        db.from("news").select("*", { count: "exact", head: true }).is("published_at", null),
        db.from("contact_messages").select("*", { count: "exact", head: true }),
        db.from("contact_messages").select("*", { count: "exact", head: true }).eq("status", "unread"),
        db.from("activity_registrations").select("*", { count: "exact", head: true }),
        db.from("activity_registrations").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ])

    return {
        activities: { total: totalActivities ?? 0, active: activeActivities ?? 0 },
        associations: {
            total: totalAssociations ?? 0,
            approved: approvedAssociations ?? 0,
            pending: pendingAssociations ?? 0,
        },
        news: {
            total: totalNews ?? 0,
            published: publishedNews ?? 0,
            draft: draftNews ?? 0,
        },
        messages: { total: totalMessages ?? 0, unread: unreadMessages ?? 0 },
        registrations: { total: totalRegistrations ?? 0, pending: pendingRegistrations ?? 0 },
    }
}
