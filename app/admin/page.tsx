import { AdminDashboard } from "@/components/admin-dashboard"
import { getServiceRoleClient } from "@/lib/supabase/admin"
import { getAllRegistrations } from "@/services/RegistrationService"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 10

export default async function AdminPage() {
  const db = getServiceRoleClient()

  const [rawActivities, rawNews, rawAssociations, rawRegistrations, rawMessages] = await Promise.all([
    db.from("activities")
      .select("id, title, date, location, description, images, videos, duration, status, categories, template, allow_association_registration, allow_participant_registration, max_participants, wilaya, created_at")
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1)
      .then(r => r.data ?? []),
    db.from("news")
      .select("id, title, excerpt, content, author, category, type, icon, color, bg_color, image, views, likes, featured, published_at, created_at, updated_at")
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1)
      .then(r => r.data ?? []),
    db.from("associations")
      .select("id, name, email, phone, city, wilaya, status, description, logo_url, rejection_reason, approved_by, approved_at, created_at, updated_at, institution_name, president_name, president_phone, secretary_name, secretary_phone, clerk_name, clerk_phone, office_approval_url")
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1)
      .then(r => r.data ?? []),
    getAllRegistrations().catch(err => {
      console.error("Failed to fetch registrations", err)
      return []
    }),
    db.from("contact_messages")
      .select("*")
      .neq("status", "replied")
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1)
      .then(r => r.data ?? [])
  ])

  const activities = rawActivities.map((a: any) => ({
    ...a,
    type: a.categories?.[0] || "عام",
    capacity: a.max_participants || 0,
    image: typeof a.images === 'string' ? a.images : ((a.images && a.images.length > 0) ? a.images[0] : "/placeholder.svg"),
    activityTemplate: a.template || "announcement",
    registered: 0,
    createdAt: a.created_at
  }))

  const news = rawNews.map((n: any) => ({
    ...n,
    status: n.published_at ? "published" : "draft",
    publishDate: n.published_at || n.created_at,
    tags: [],
    views: n.views || 0,
  }))

  const associations = rawAssociations.map((a: any) => ({
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
    notes: a.rejection_reason || undefined
  }))

  const registrations = rawRegistrations.map((r: any) => ({
    id: r.id,
    activityId: r.activities?.id,
    associationName: r.associations?.name || "غير معروف",
    associationEmail: r.associations?.email || "غير معروف",
    associationPhone: r.associations?.phone || "غير معروف",
    status: r.status,
    registrationDate: r.created_at,
    notes: r.notes || undefined,
    participants: (r.activity_participants || []).map((p: any) => ({
      id: p.id,
      registrationId: r.id,
      name: p.name,
      birthdate: p.birthdate,
      category: p.category || undefined
    }))
  }))

  const messages = rawMessages.map((m: any) => ({
    id: m.id,
    name: m.name,
    email: m.email || "غير محدد",
    phone: m.phone,
    subject: m.subject,
    message: m.message,
    department: m.contactReason,
    date: m.created_at,
    status: m.status,
    priority: "medium"
  }))

  return (
    <AdminDashboard
      initialActivities={activities as any}
      initialNews={news as any}
      initialAssociations={associations as any}
      initialRegistrations={registrations as any}
      initialMessages={messages as any}
      pageSize={PAGE_SIZE}
    />
  )
}
