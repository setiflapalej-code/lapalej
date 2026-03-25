// app/admin/actions.ts — Server actions for admin dashboard
"use server"

import { adminLogout, verifyAdminAction, revokeAdminSessions } from "@/services/AdminAuthService"
import { redirect } from "next/navigation"
import { updateRegistrationStatus } from "@/services/RegistrationService"
import { createActivity, updateActivity, deleteActivity } from "@/services/ActivityService"
import { createNews, updateNews, deleteNews } from "@/services/NewsService"
import { approveAssociation, deleteAssociation, rejectAssociation, undoRejectAssociation } from "@/services/AdminService"
import type { CreateActivityDTO, UpdateActivityDTO, CreateNewsDTO, UpdateNewsDTO } from "@/types/dto"

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
    await verifyAdminAction()
    return createActivity(data)
}

export async function editActivityAction(id: string, data: UpdateActivityDTO) {
    await verifyAdminAction()
    return updateActivity(id, data)
}

export async function removeActivityAction(id: string) {
    await verifyAdminAction()
    return deleteActivity(id)
}

// ============================================================
// News Actions
// ============================================================
export async function addNewsAction(data: CreateNewsDTO) {
    await verifyAdminAction()
    return createNews(data)
}

export async function editNewsAction(id: string, data: UpdateNewsDTO) {
    await verifyAdminAction()
    return updateNews(id, data)
}

export async function removeNewsAction(id: string) {
    await verifyAdminAction()
    return deleteNews(id)
}

// ============================================================
// Association Actions
// ============================================================
export async function approveAssociationAction(id: string) {
    await verifyAdminAction()
    return approveAssociation(id)
}

export async function rejectAssociationAction(id: string, reason?: string) {
    await verifyAdminAction()
    return rejectAssociation(id, reason)
}

export async function undoRejectAssociationAction(id: string) {
    await verifyAdminAction()
    return undoRejectAssociation(id)
}

export async function deleteAssociationAction(id: string) {
    await verifyAdminAction()
    return deleteAssociation(id)
}

// ============================================================
// Registration Status Actions (activity registrations)
// ============================================================

export async function updateRegistrationStatusAction(
    id: string,
    status: "pending" | "approved" | "rejected",
    rejection_reason?: string
) {
    await verifyAdminAction()
    return updateRegistrationStatus({ id, status, rejection_reason })
}

// ============================================================
// Contact / Message Actions
// ============================================================
import { ContactService } from "@/services/ContactService"

export async function getMessagesAction() {
    await verifyAdminAction()
    return ContactService.getAllContactMessages()
}

export async function replyMessageAction(id: string, replyText: string) {
    await verifyAdminAction()
    return ContactService.replyToContactMessage(id, replyText)
}

export async function markMessageReadAction(id: string) {
    await verifyAdminAction()
    return ContactService.markMessageRead(id)
}

export async function deleteMessageAction(id: string) {
    await verifyAdminAction()
    return ContactService.deleteContactMessage(id)
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

