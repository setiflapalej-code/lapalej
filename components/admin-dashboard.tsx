"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  addActivityAction, editActivityAction, removeActivityAction,
  addNewsAction, editNewsAction, removeNewsAction,
  approveAssociationAction, deleteAssociationAction, rejectAssociationAction, undoRejectAssociationAction
} from "@/app/admin/actions"

import { useRouter } from "next/navigation"
import { adminLogout } from "@/services/AdminAuthService"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// --- Export Helpers ---
const exportToWord = (htmlContent: string, filename: string) => {
  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${filename}</title></head><body>`;
  const footer = "</body></html>";
  const sourceHTML = header + htmlContent + footer;

  const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
  const fileDownload = document.createElement("a");
  document.body.appendChild(fileDownload);
  fileDownload.href = source;
  fileDownload.download = `${filename}.doc`;
  fileDownload.click();
  document.body.removeChild(fileDownload);
};

const exportToPDF = (htmlContent: string, title: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
            th { background-color: #f2f2f2; font-weight: bold; }
            h1, h2, h3 { text-align: center; color: #333; }
            p { text-align: center; color: #555; }
            .header-info { margin-bottom: 20px; text-align: center; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }
};

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Calendar,
  MessageSquare,
  UserCheck,
  Newspaper,
  Settings,
  BarChart3,
  Shield,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Clock,

  Mail,
  Reply,
  Search,
  Filter,
  Phone,
  User,
  CheckCircle,
  XCircle,
  Download,
  FileText,
  Globe,
  EyeIcon,
  Check,
  X,
  Crown,
  Building2,
  Undo2,
  AlertTriangle,
  Printer,
  FileDown,
  Link2,
  Upload,
  ExternalLink,
  LogOut,
} from "lucide-react"

type ActivityTemplate =
  | "announcement"
  | "announcement_reg"
  | "announcement_reg_participants"
  | "special"

const ACTIVITY_TEMPLATES: { value: ActivityTemplate; label: string; description: string; color: string }[] = [
  {
    value: "announcement",
    label: "إعلان فقط",
    description: "عرض معلومات النشاط فقط، بدون تسجيل",
    color: "bg-gray-100 text-gray-700",
  },
  {
    value: "announcement_reg",
    label: "إعلان + تسجيل جمعيات",
    description: "يمكن للجمعيات التسجيل في هذا النشاط",
    color: "bg-blue-100 text-blue-700",
  },
  {
    value: "announcement_reg_participants",
    label: "إعلان + جمعيات + مشاركون",
    description: "يمكن للجمعيات التسجيل وإضافة مشاركين",
    color: "bg-purple-100 text-purple-700",
  },
  {
    value: "special",
    label: "نشاط خاص (بطولة / مسابقة)",
    description: "تسجيل جمعيات ومشاركين مع تصنيفات قابلة للتخصيص (مثل U12، U16، Senior)",
    color: "bg-orange-100 text-orange-700",
  },
]

interface Activity {
  id: string
  title: string
  description: string
  type: string
  date: string
  location: string
  duration: string
  capacity: number
  registered: number
  status: "active" | "completed" | "cancelled"
  image: string
  // --- Template fields ---
  activityTemplate: ActivityTemplate
  categories: string[]   // for "special" type, e.g. ["U12", "U16", "Senior"]
}

interface ActivityRegistration {
  id: string
  activityId: string
  associationName: string
  associationEmail: string
  associationPhone: string
  status: "pending" | "approved" | "rejected"
  registrationDate: string
  notes?: string
  participants: ActivityParticipant[]
}

interface ActivityParticipant {
  id: string
  registrationId: string
  name: string
  birthdate: string
  category?: string
}

interface Message {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  department: string
  date: string
  status: "unread" | "read" | "replied"
  priority: "low" | "medium" | "high"
}

interface AssociationPartnership {
  id: string
  associationName: string
  institutionName: string
  presidentName: string
  presidentPhone: string
  secretaryName: string
  secretaryPhone: string
  clerkName: string
  clerkPhone: string
  officeApprovalUrl?: string
  email: string
  phone: string
  submissionDate: string
  status: "pending" | "approved" | "rejected"
  rejectedAt?: string
  reviewedBy?: string
  reviewDate?: string
  notes?: string
}

interface NewsArticle {
  id: string
  title: string
  content: string
  excerpt: string
  category: string
  author: string
  publishDate: string
  status: "draft" | "published" | "archived"
  image: string
  tags: string[]
  views: number
  featured: boolean
}

interface Member {
  id: number
  name: string
  email: string
  phone: string
  memberType: "Association Member" | "Staff" | string
  role: "President" | "Treasurer" | "Secretary" | "Staff" | string
  bio: string
  joinDate: string
  lastActive: string
  status: "active" | "inactive" | "pending"
  avatar: string
}

export function AdminDashboard({
  initialActivities = [],
  initialNews = [],
  initialAssociations = [],
  initialRegistrations = [],
  initialMessages = [],
  pageSize = 10,
}: {
  initialActivities?: Activity[]
  initialNews?: NewsArticle[]
  initialAssociations?: AssociationPartnership[]
  initialRegistrations?: ActivityRegistration[]
  initialMessages?: Message[]
  pageSize?: number
}) {
  const { toast } = useToast()
  const router = useRouter()

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await adminLogout()
      router.push("/admin/login")
      router.refresh()
    } catch {
      toast({ title: "خطأ", description: "فشل تسجيل الخروج", variant: "destructive" })
      setIsLoggingOut(false)
    }
  }

  const [showPassword, setShowPassword] = useState(false)
  const [activeSection, setActiveSection] = useState("dashboard")

  const [activities, setActivities] = useState<Activity[]>(initialActivities)

  // --- New Activity Registration State ---
  const [activityRegistrations, setActivityRegistrations] = useState<ActivityRegistration[]>(initialRegistrations)

  // --- UI state for new features ---
  const [activityDeleteConfirmId, setActivityDeleteConfirmId] = useState<string | null>(null)
  const [viewingRegistrationsActivity, setViewingRegistrationsActivity] = useState<Activity | null>(null)
  const [expandedRegistrationId, setExpandedRegistrationId] = useState<string | null>(null)
  const [newCategoryInput, setNewCategoryInput] = useState("")

  const [activityFile, setActivityFile] = useState<File | null>(null)
  const [isAddingActivity, setIsAddingActivity] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    title: "",
    description: "",
    type: "",
    date: "",
    location: "",
    duration: "",
    capacity: 0,
    status: "active",
    image: "",
    activityTemplate: "announcement",
    categories: [],
  })

  const [messages, setMessages] = useState<Message[]>(initialMessages)

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyText, setReplyText] = useState("")
  const [messageFilter, setMessageFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  const [partnerships, setPartnerships] = useState<AssociationPartnership[]>(initialAssociations)

  const [selectedPartnership, setSelectedPartnership] = useState<AssociationPartnership | null>(null)
  const [partnershipFilter, setPartnershipFilter] = useState("all")
  const [partnershipSearchTerm, setPartnershipSearchTerm] = useState("")
  const [reviewNotes, setReviewNotes] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [messageDeleteConfirmId, setMessageDeleteConfirmId] = useState<string | null>(null)
  const [newsDeleteConfirmId, setNewsDeleteConfirmId] = useState<string | null>(null)
  const [exportFormatOpen, setExportFormatOpen] = useState(false)

  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>(initialNews)

  const [newsFile, setNewsFile] = useState<File | null>(null)
  const [isAddingNews, setIsAddingNews] = useState(false)
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null)

  // Loading states
  const [isActivityActionLoading, setIsActivityActionLoading] = useState(false)
  const [isNewsActionLoading, setIsNewsActionLoading] = useState(false)
  const [isAssociationActionLoading, setIsAssociationActionLoading] = useState(false)
  const [isMessageActionLoading, setIsMessageActionLoading] = useState(false)
  const [isMemberActionLoading, setIsMemberActionLoading] = useState(false)

  // --- Load More state ---
  const [activitiesOffset, setActivitiesOffset] = useState(initialActivities.length)
  const [hasMoreActivities, setHasMoreActivities] = useState(initialActivities.length === pageSize)
  const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false)

  const [newsOffset, setNewsOffset] = useState(initialNews.length)
  const [hasMoreNews, setHasMoreNews] = useState(initialNews.length === pageSize)
  const [isLoadingMoreNews, setIsLoadingMoreNews] = useState(false)

  const [assocOffset, setAssocOffset] = useState(initialAssociations.length)
  const [hasMoreAssoc, setHasMoreAssoc] = useState(initialAssociations.length === pageSize)
  const [isLoadingMoreAssoc, setIsLoadingMoreAssoc] = useState(false)

  const [messagesOffset, setMessagesOffset] = useState(initialMessages.length)
  const [hasMoreMessages, setHasMoreMessages] = useState(initialMessages.length === pageSize)
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false)

  // --- Global stats (real DB counts, not paginated slice lengths) ---
  const [dashboardStats, setDashboardStats] = useState<{
    activities: { total: number; active: number }
    associations: { total: number; approved: number; pending: number }
    news: { total: number; published: number; draft: number }
    messages: { total: number; unread: number }
    registrations: { total: number; pending: number }
  } | null>(null)

  useEffect(() => {
    import("@/app/admin/actions").then(({ getAdminDashboardStats }) => {
      getAdminDashboardStats()
        .then((s) => { if (s) setDashboardStats(s) })
        .catch(() => { /* silently ignore — counts fall back to list lengths */ })
    })
  }, [])

  const handleLoadMoreActivities = async () => {
    setIsLoadingMoreActivities(true)
    try {
      const { loadMoreActivitiesAction } = await import("@/app/admin/actions")
      const batch = await loadMoreActivitiesAction(activitiesOffset)
      setActivities(prev => [...prev, ...batch as any])
      setActivitiesOffset(prev => prev + batch.length)
      if (batch.length < pageSize) setHasMoreActivities(false)
    } catch {
      toast({ title: "خطأ", description: "تعذّر تحميل المزيد من الأنشطة", variant: "destructive" })
    } finally {
      setIsLoadingMoreActivities(false)
    }
  }

  const handleLoadMoreNews = async () => {
    setIsLoadingMoreNews(true)
    try {
      const { loadMoreNewsAction } = await import("@/app/admin/actions")
      const batch = await loadMoreNewsAction(newsOffset)
      setNewsArticles(prev => [...prev, ...batch as any])
      setNewsOffset(prev => prev + batch.length)
      if (batch.length < pageSize) setHasMoreNews(false)
    } catch {
      toast({ title: "خطأ", description: "تعذّر تحميل المزيد من الأخبار", variant: "destructive" })
    } finally {
      setIsLoadingMoreNews(false)
    }
  }

  const handleLoadMoreAssoc = async () => {
    setIsLoadingMoreAssoc(true)
    try {
      const { loadMoreAssociationsAction } = await import("@/app/admin/actions")
      const batch = await loadMoreAssociationsAction(assocOffset)
      setPartnerships(prev => [...prev, ...batch as any])
      setAssocOffset(prev => prev + batch.length)
      if (batch.length < pageSize) setHasMoreAssoc(false)
    } catch {
      toast({ title: "خطأ", description: "تعذّر تحميل المزيد من الجمعيات", variant: "destructive" })
    } finally {
      setIsLoadingMoreAssoc(false)
    }
  }

  const handleLoadMoreMessages = async () => {
    setIsLoadingMoreMessages(true)
    try {
      const { loadMoreMessagesAction } = await import("@/app/admin/actions")
      const batch = await loadMoreMessagesAction(messagesOffset)
      setMessages(prev => [...prev, ...batch as any])
      setMessagesOffset(prev => prev + batch.length)
      if (batch.length < pageSize) setHasMoreMessages(false)
    } catch {
      toast({ title: "خطأ", description: "تعذّر تحميل المزيد من الرسائل", variant: "destructive" })
    } finally {
      setIsLoadingMoreMessages(false)
    }
  }
  const [newNews, setNewNews] = useState<Partial<NewsArticle>>({
    title: "",
    content: "",
    excerpt: "",
    category: "",
    author: "",
    status: "draft",
    image: "",
    tags: [],
    featured: false,
  })
  const [newsFilter, setNewsFilter] = useState("all")
  const [newsSearchTerm, setNewsSearchTerm] = useState("")
  const [selectedNews, setSelectedNews] = useState<NewsArticle | null>(null)


  const [members, setMembers] = useState<Member[]>([
    {
      id: 1,
      name: "أحمد محمد",
      email: "ahmed@example.com",
      phone: "+961 70 123 456",
      memberType: "Association Member",
      role: "President",
      bio: "رئيس الجمعية ومؤسسها.",
      joinDate: "2024-01-15",
      lastActive: "منذ 5 دقائق",
      status: "active",
      avatar: "/young-arab-president.png",
    },
    {
      id: 2,
      name: "فاطمة علي",
      email: "fatima@example.com",
      phone: "+961 71 987 654",
      memberType: "Staff",
      role: "Secretary",
      bio: "مسؤولة العمليات.",
      joinDate: "2024-02-20",
      lastActive: "منذ ساعة",
      status: "active",
      avatar: "/young-arab-woman-leader.png",
    },
    {
      id: 3,
      name: "محمد حسن",
      email: "mohammed@example.com",
      phone: "+961 76 555 123",
      memberType: "Association Member",
      role: "Treasurer",
      bio: "أمين الصندوق المعني بالمالية.",
      joinDate: "2024-03-10",
      lastActive: "منذ يومين",
      status: "pending",
      avatar: "/young-arab-man-sports.png",
    },
  ])

  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [selectedMemberObj, setSelectedMemberObj] = useState<Member | null>(null)
  const [newMemberObj, setNewMemberObj] = useState<Partial<Member>>({
    name: "",
    email: "",
    phone: "",
    memberType: "Association Member",
    role: "Staff",
    bio: "",
    status: "active",
    avatar: "",
  })

  const handleAddMemberObj = () => {
    if (!newMemberObj.name || !newMemberObj.email) return;
    const newM = {
      ...(newMemberObj as Member),
      id: members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1,
      joinDate: new Date().toISOString().split("T")[0],
      lastActive: "الآن",
      avatar: newMemberObj.avatar || "/placeholder.svg",
    }
    setMembers([...members, newM])
    setShowAddMemberModal(false)
    setNewMemberObj({ name: "", email: "", phone: "", memberType: "Association Member", role: "Staff", bio: "", status: "active", avatar: "" })
  }

  const handleEditMemberObj = () => {
    if (selectedMemberObj) {
      setMembers(members.map((m) => (m.id === selectedMemberObj.id ? { ...m, ...selectedMemberObj } : m)))
      setSelectedMemberObj(null)
    }
  }

  const handleDeleteMemberObj = (id: number) => {
    setMembers(members.filter((m) => m.id !== id))
  }



  // --- Activity helper ---
  const getTemplateMeta = (template: ActivityTemplate) =>
    ACTIVITY_TEMPLATES.find((t) => t.value === template) || ACTIVITY_TEMPLATES[0]

  const templateNeedsReg = (t?: ActivityTemplate) =>
    t === "announcement_reg" || t === "announcement_reg_participants" || t === "special"

  const templateNeedsParticipants = (t?: ActivityTemplate) =>
    t === "announcement_reg_participants" || t === "special"

  const templateNeedsCategories = (t?: ActivityTemplate) => t === "special"

  const resetNewActivity = () => {
    setActivityFile(null)
    setNewActivity({
      title: "",
      description: "",
      type: "",
      date: "",
      location: "",
      duration: "",
      capacity: 0,
      status: "active",
      image: "",
      activityTemplate: "announcement",
      categories: [],
    })
  }

  const handleAddActivity = async () => {
    if (newActivity.title && newActivity.description) {
      setIsActivityActionLoading(true)
      try {
        let imageUrl = newActivity.image || "";
        if (activityFile) {
          const supabase = getSupabaseBrowserClient();
          const fileExt = activityFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, activityFile);
            
          if (uploadError) throw new Error("فشل رفع الصورة: " + uploadError.message);
          
          const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;
        }

        const result = await addActivityAction({
          title: newActivity.title,
          description: newActivity.description,
          date: newActivity.date || new Date().toISOString().split("T")[0],
          location: newActivity.location || "غير محدد",
          duration: newActivity.duration || "يوم واحد",
          max_participants: newActivity.capacity || 0,
          status: newActivity.status || "upcoming",
          images: imageUrl || "",
          template: newActivity.activityTemplate || "announcement",
          categories: [newActivity.type || "عام", ...(newActivity.categories || [])],
        } as any)

        if (!result.success) {
          toast({ title: "خطأ", description: result.message, variant: "destructive" })
          return
        }

        // Ensure UI types match DB types
        const activity: Activity = {
          ...(result.data as any),
          id: (result.data as any).id,
          type: newActivity.type || "عام",
          capacity: newActivity.capacity || 0,
          image: imageUrl || "/placeholder.svg",
          activityTemplate: newActivity.activityTemplate || "announcement",
          registered: 0
        } as unknown as Activity
        setActivities([activity, ...activities])
        resetNewActivity()
        setIsAddingActivity(false)
        toast({ title: "تم الإضافة", description: "تمت إضافة النشاط بنجاح" })
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" })
      } finally {
        setIsActivityActionLoading(false)
      }
    }
  }

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity)
    setNewActivity(activity)
  }

  const handleUpdateActivity = async () => {
    if (editingActivity && newActivity.title && newActivity.description) {
      setIsActivityActionLoading(true)
      try {
        let imageUrl = newActivity.image || "";
        if (activityFile) {
          const supabase = getSupabaseBrowserClient();
          const fileExt = activityFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, activityFile);
            
          if (uploadError) throw new Error("فشل رفع الصورة: " + uploadError.message);
          
          const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;
        }

        const result = await editActivityAction(editingActivity.id, {
          title: newActivity.title,
          description: newActivity.description,
          date: newActivity.date,
          location: newActivity.location,
          duration: newActivity.duration,
          max_participants: newActivity.capacity,
          status: newActivity.status,
          images: imageUrl || "",
          template: newActivity.activityTemplate,
          categories: newActivity.type ? [newActivity.type, ...(newActivity.categories || [])] : newActivity.categories,
        } as any)

        if (!result.success) {
          toast({ title: "خطأ", description: result.message, variant: "destructive" })
          return
        }

        setActivities(
          activities.map((activity) =>
            activity.id === editingActivity.id ? ({ ...activity, ...newActivity, image: imageUrl || "/placeholder.svg" } as Activity) : activity
          )
        )
        setEditingActivity(null)
        resetNewActivity()
        toast({ title: "تم التعديل", description: "تم تعديل النشاط بنجاح" })
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" })
      } finally {
        setIsActivityActionLoading(false)
      }
    }
  }

  const handleDeleteActivityConfirmed = async () => {
    if (activityDeleteConfirmId) {
      setIsActivityActionLoading(true)
      try {
        const result = await removeActivityAction(activityDeleteConfirmId)
        if (!result.success) {
          toast({ title: "خطأ", description: result.message, variant: "destructive" })
          return
        }
        setActivities(activities.filter((a) => a.id !== activityDeleteConfirmId))
        setActivityRegistrations(activityRegistrations.filter((r) => r.activityId !== activityDeleteConfirmId))
        setActivityDeleteConfirmId(null)
        toast({ title: "تم الحذف", description: "تم حذف النشاط بنجاح" })
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" })
      } finally {
        setIsActivityActionLoading(false)
      }
    }
  }

  // --- Registration handlers ---
  const handleApproveRegistration = async (registrationId: string) => {
    setIsActivityActionLoading(true)
    try {
      const { updateRegistrationStatusAction } = await import("@/app/admin/actions")
      const result = await updateRegistrationStatusAction(registrationId, "approved")
      if (!result.success) {
        toast({ title: "خطأ", description: result.message, variant: "destructive" })
        return
      }
      setActivityRegistrations((prev) =>
        prev.map((r) => (r.id === registrationId ? { ...r, status: "approved" as const } : r)),
      )
      toast({ title: "تم القبول", description: "تم قبول طلب التسجيل بنجاح" })
    } catch {
      toast({ title: "خطأ", description: "تعذّر قبول الطلب، يرجى المحاولة مجدداً", variant: "destructive" })
    } finally {
      setIsActivityActionLoading(false)
    }
  }

  const handleRejectRegistration = async (registrationId: string) => {
    setIsActivityActionLoading(true)
    try {
      const { updateRegistrationStatusAction } = await import("@/app/admin/actions")
      const result = await updateRegistrationStatusAction(registrationId, "rejected")
      if (!result.success) {
        toast({ title: "خطأ", description: result.message, variant: "destructive" })
        return
      }
      setActivityRegistrations((prev) => prev.filter((r) => r.id !== registrationId))
      toast({ title: "تم الرفض", description: "تم رفض طلب التسجيل" })
    } catch {
      toast({ title: "خطأ", description: "تعذّر رفض الطلب، يرجى المحاولة مجدداً", variant: "destructive" })
    } finally {
      setIsActivityActionLoading(false)
    }
  }

  const getActivityRegistrations = (activityId: string) =>
    activityRegistrations.filter((r) => r.activityId === activityId)

  const getRegistrationStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "approved": return "bg-green-100 text-green-800"
      case "rejected": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getRegistrationStatusText = (status: string) => {
    switch (status) {
      case "pending": return "قيد المراجعة"
      case "approved": return "مقبول"
      case "rejected": return "مرفوض"
      default: return "غير محدد"
    }
  }

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const { markMessageReadAction } = await import('@/app/admin/actions')
      const result = await markMessageReadAction(messageId)
      if (!result.success) {
        toast({ title: "خطأ", description: result.message, variant: "destructive" })
        return
      }
      setMessages(messages.map((msg) => (msg.id === messageId ? { ...msg, status: "read" } : msg)))
    } catch (error) {
      toast({ title: "خطأ", description: "تعذر تحديث حالة الرسالة", variant: "destructive" })
    }
  }

  const handleDeleteMessage = (messageId: string) => {
    setMessageDeleteConfirmId(messageId)
  }

  const handleDeleteMessageConfirmed = async () => {
    if (messageDeleteConfirmId) {
      setIsMessageActionLoading(true)
      try {
        const { deleteMessageAction } = await import('@/app/admin/actions')
        const result = await deleteMessageAction(messageDeleteConfirmId)
        if (!result.success) {
          toast({ title: "خطأ", description: result.message, variant: "destructive" })
          return
        }
        setMessages(messages.filter((msg) => msg.id !== messageDeleteConfirmId))
        setMessageDeleteConfirmId(null)
        toast({ title: "تم الحذف", description: "تم حذف الرسالة بنجاح" })
      } catch (error) {
        toast({ title: "خطأ", description: "تعذر حذف الرسالة", variant: "destructive" })
      } finally {
        setIsMessageActionLoading(false)
      }
    }
  }

  const handleReplyMessage = async (messageId: string) => {
    if (replyText.trim()) {
      setIsMessageActionLoading(true)
      try {
        const { replyMessageAction } = await import('@/app/admin/actions')
        const result = await replyMessageAction(messageId, replyText)
        if (!result.success) {
          toast({ title: "خطأ", description: result.message, variant: "destructive" })
          return
        }
        setMessages(messages.map((msg) => (msg.id === messageId ? { ...msg, status: "replied" } : msg)))
        setReplyText("")
        setSelectedMessage(null)
        toast({
          title: "تم الإرسال",
          description: "تم إرسال الرد بنجاح",
        })
      } catch (error) {
        toast({ title: "خطأ", description: "تعذر إرسال الرد", variant: "destructive" })
      } finally {
        setIsMessageActionLoading(false)
      }
    }
  }

  const handleApprovePartnership = async (partnershipId: string) => {
    setIsAssociationActionLoading(true)
    try {
      const result = await approveAssociationAction(partnershipId)
      if (!result.success) {
        toast({ title: "خطأ", description: result.message, variant: "destructive" })
        return
      }
      setPartnerships((prev) =>
        prev.map((p) =>
          p.id === partnershipId
            ? {
              ...p,
              status: "approved" as const,
              reviewedBy: "المدير العام",
              reviewDate: new Date().toISOString(),
              notes: reviewNotes || "تمت الموافقة على الشراكة",
              rejectedAt: undefined,
            }
            : p,
        ),
      )
      setReviewNotes("")
      setSelectedPartnership(null)
      toast({ title: "تم", description: "تمت الموافقة بنجاح" })
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" })
    } finally {
      setIsAssociationActionLoading(false)
    }
  }

  const handleRejectPartnership = async (partnershipId: string) => {
    setIsAssociationActionLoading(true)
    try {
      const result = await rejectAssociationAction(partnershipId, reviewNotes)
      if (!result.success) {
        toast({ title: "خطأ", description: result.message, variant: "destructive" })
        return
      }
      setPartnerships((prev) =>
        prev.map((p) =>
          p.id === partnershipId
            ? {
              ...p,
              status: "rejected" as const,
              reviewedBy: "المدير العام",
              reviewDate: new Date().toISOString(),
              rejectedAt: new Date().toISOString(),
              notes: reviewNotes || "تم رفض طلب الشراكة",
            }
            : p,
        ),
      )
      setReviewNotes("")
      setSelectedPartnership(null)
      toast({ title: "تم", description: "تم رفض الشراكة" })
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" })
    } finally {
      setIsAssociationActionLoading(false)
    }
  }

  const handleUndoReject = async (partnershipId: string) => {
    setIsAssociationActionLoading(true)
    try {
      const result = await undoRejectAssociationAction(partnershipId)
      if (!result.success) {
        toast({ title: "خطأ", description: result.message, variant: "destructive" })
        return
      }
      setPartnerships((prev) =>
        prev.map((p) =>
          p.id === partnershipId
            ? { ...p, status: "pending" as const, rejectedAt: undefined, reviewedBy: undefined, reviewDate: undefined, notes: undefined }
            : p,
        ),
      )
      toast({ title: "تم", description: "تم التراجع عن الرفض" })
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" })
    } finally {
      setIsAssociationActionLoading(false)
    }
  }

  const handleDeletePartnership = async (partnershipId: string) => {
    setIsAssociationActionLoading(true)
    try {
      const result = await deleteAssociationAction(partnershipId)
      if (!result.success) {
        toast({ title: "خطأ", description: result.message, variant: "destructive" })
        return
      }
      setPartnerships((prev) => prev.filter((p) => p.id !== partnershipId))
      setDeleteConfirmId(null)
      setSelectedPartnership(null)
      toast({ title: "تم الحذف", description: "تم حذف الشراكة بنجاح" })
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" })
    } finally {
      setIsAssociationActionLoading(false)
    }
  }

  const handleAddNews = async () => {
    if (newNews.title && newNews.content) {
      setIsNewsActionLoading(true)
      try {
        let imageUrl = newNews.image || "/placeholder.svg";
        if (newsFile) {
          const supabase = getSupabaseBrowserClient();
          const fileExt = newsFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, newsFile);
            
          if (uploadError) throw new Error("فشل رفع الصورة: " + uploadError.message);
          
          const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;
        }

        const isPublished = newNews.status === "published"
        const result = await addNewsAction({
          title: newNews.title,
          content: newNews.content,
          excerpt: newNews.excerpt || newNews.content.substring(0, 150) + "...",
          category: newNews.category || "عام",
          author: newNews.author || "إدارة الجمعية",
          published_at: isPublished ? new Date().toISOString() : undefined,
          image: imageUrl,
          featured: newNews.featured || false,
        } as any)

        if (!result.success) {
          toast({ title: "خطأ", description: result.message, variant: "destructive" })
          return
        }

        const article: NewsArticle = {
          ...(result.data as any),
          id: (result.data as any).id,
          status: isPublished ? "published" : "draft",
          tags: [],
          views: 0
        } as unknown as NewsArticle
        setNewsArticles([article, ...newsArticles])
        setNewsFile(null)
        setNewNews({
          title: "",
          content: "",
          excerpt: "",
          category: "",
          author: "",
          status: "draft",
          image: "",
          tags: [],
          featured: false,
        })
        setIsAddingNews(false)
        toast({ title: "تم الإضافة", description: "تمت إضافة الخبر بنجاح" })
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" })
      } finally {
        setIsNewsActionLoading(false)
      }
    }
  }

  const handleEditNews = (article: NewsArticle) => {
    setEditingNews(article)
    setNewNews(article)
  }

  const handleUpdateNews = async () => {
    if (editingNews && newNews.title && newNews.content) {
      setIsNewsActionLoading(true)
      try {
        let imageUrl = newNews.image;
        if (newsFile) {
          const supabase = getSupabaseBrowserClient();
          const fileExt = newsFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, newsFile);
            
          if (uploadError) throw new Error("فشل رفع الصورة: " + uploadError.message);
          
          const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;
        }

        const isPublished = newNews.status === "published"
        const result = await editNewsAction(editingNews.id, {
          title: newNews.title,
          content: newNews.content,
          excerpt: newNews.excerpt,
          category: newNews.category,
          author: newNews.author,
          published_at: isPublished ? (newNews.publishDate || new Date().toISOString()) : undefined,
          image: imageUrl,
          featured: newNews.featured,
        } as any)

        if (!result.success) {
          toast({ title: "خطأ", description: result.message, variant: "destructive" })
          return
        }

        setNewsArticles(
          newsArticles.map((article) =>
            article.id === editingNews.id ? ({
              ...article,
              ...newNews,
              image: imageUrl || "/placeholder.svg",
              publishDate: (result.data as any).published_at || article.publishDate
            } as NewsArticle) : article,
          ),
        )
        setNewsFile(null)
        setEditingNews(null)
        setNewNews({
          title: "",
          content: "",
          excerpt: "",
          category: "",
          author: "",
          status: "draft",
          image: "",
          tags: [],
          featured: false,
        })
        toast({ title: "تم التعديل", description: "تم تعديل الخبر بنجاح" })
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" })
      } finally {
        setIsNewsActionLoading(false)
      }
    }
  }

  const handleDeleteNews = (id: string) => {
    setNewsDeleteConfirmId(id)
  }

  const handleDeleteNewsConfirmed = async () => {
    if (newsDeleteConfirmId) {
      setIsNewsActionLoading(true)
      try {
        const result = await removeNewsAction(newsDeleteConfirmId)
        if (!result.success) {
          toast({ title: "خطأ", description: result.message, variant: "destructive" })
          return
        }
        setNewsArticles(newsArticles.filter((article) => article.id !== newsDeleteConfirmId))
        setNewsDeleteConfirmId(null)
        toast({ title: "تم الحذف", description: "تم حذف الخبر بنجاح" })
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" })
      } finally {
        setIsNewsActionLoading(false)
      }
    }
  }

  const handlePublishNews = async (id: string) => {
    try {
      const result = await editNewsAction(id, { published_at: new Date().toISOString() } as any)
      if (!result.success) {
        toast({ title: "خطأ", description: result.message, variant: "destructive" })
        return
      }
      setNewsArticles(
        newsArticles.map((article) =>
          article.id === id ? { ...article, status: "published", publishDate: new Date().toISOString() } : article,
        ),
      )
      toast({ title: "تم", description: "تم نشر الخبر بنجاح" })
    } catch { toast({ title: "خطأ", description: "فشل نشر الخبر", variant: "destructive" }) }
  }

  const handleArchiveNews = async (id: string) => {
    try {
      const result = await editNewsAction(id, { published_at: undefined } as any)
      if (!result.success) {
        toast({ title: "خطأ", description: result.message, variant: "destructive" })
        return
      }
      setNewsArticles(newsArticles.map((article) => (article.id === id ? { ...article, status: "archived" } : article)))
      toast({ title: "تم", description: "تم أرشفة الخبر بنجاح" })
    } catch { toast({ title: "خطأ", description: "فشل أرشفة الخبر", variant: "destructive" }) }
  }

  const handleToggleFeatured = async (id: string) => {
    const article = newsArticles.find(a => a.id === id)
    if (article) {
      try {
        const result = await editNewsAction(id, { featured: !article.featured } as any)
        if (!result.success) {
          toast({ title: "خطأ", description: result.message, variant: "destructive" })
          return
        }
        setNewsArticles(
          newsArticles.map((a) => (a.id === id ? { ...a, featured: !a.featured } : a)),
        )
      } catch { toast({ title: "خطأ", description: "فشل تغيير حالة التمييز", variant: "destructive" }) }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "unread":
        return "bg-red-100 text-red-800"
      case "read":
        return "bg-blue-100 text-blue-800"
      case "replied":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "نشط"
      case "completed":
        return "مكتمل"
      case "cancelled":
        return "ملغي"
      case "unread":
        return "غير مقروءة"
      case "read":
        return "مقروءة"
      case "replied":
        return "تم الرد"
      default:
        return "غير محدد"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getApplicationStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "قيد المراجعة"
      case "approved":
        return "مقبول"
      case "rejected":
        return "مرفوض"
      default:
        return "غير محدد"
    }
  }

  const getNewsStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-yellow-100 text-yellow-800"
      case "archived":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getNewsStatusText = (status: string) => {
    switch (status) {
      case "published":
        return "منشور"
      case "draft":
        return "مسودة"
      case "archived":
        return "مؤرشف"
      default:
        return "غير محدد"
    }
  }

  const filteredMessages = messages.filter((message) => {
    const matchesFilter = messageFilter === "all" || message.status === messageFilter
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      (message.name || "").toLowerCase().includes(term) ||
      (message.subject || "").toLowerCase().includes(term) ||
      (message.email || "").toLowerCase().includes(term)
    return matchesFilter && matchesSearch
  })

  const filteredPartnerships = partnerships.filter((p) => {
    if (p.status === "rejected") return false // rejected entries shown separately
    const matchesFilter = partnershipFilter === "all" || p.status === partnershipFilter
    const term = partnershipSearchTerm.toLowerCase()
    const matchesSearch =
      (p.associationName || "").toLowerCase().includes(term) ||
      (p.institutionName || "").toLowerCase().includes(term) ||
      (p.presidentName || "").toLowerCase().includes(term) ||
      (p.email || "").toLowerCase().includes(term)
    return matchesFilter && matchesSearch
  })

  const rejectedPartnerships = partnerships.filter((p) => p.status === "rejected")

  const GRACE_DAYS = 5
  const getRemainingDays = (rejectedAt: string) => {
    const diff = Date.now() - new Date(rejectedAt).getTime()
    const daysPassed = diff / (1000 * 60 * 60 * 24)
    return Math.max(0, Math.ceil(GRACE_DAYS - daysPassed))
  }

  const filteredNews = newsArticles.filter((article) => {
    const matchesFilter = newsFilter === "all" || article.status === newsFilter
    const term = newsSearchTerm.toLowerCase()
    const matchesSearch =
      (article.title || "").toLowerCase().includes(term) ||
      (article.content || "").toLowerCase().includes(term) ||
      (article.category || "").toLowerCase().includes(term)
    return matchesFilter && matchesSearch
  })

  const stats = [
    {
      title: "إجمالي الأعضاء",
      value: (dashboardStats?.associations.approved ?? partnerships.filter((p) => p.status === "approved").length).toString(),
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "الأنشطة النشطة",
      value: (dashboardStats?.activities.active ?? activities.filter((a) => a.status === "active").length).toString(),
      icon: Calendar,
      color: "text-green-600",
    },
    {
      title: "الرسائل الجديدة",
      value: (dashboardStats?.messages.unread ?? messages.filter((m) => m.status === "unread").length).toString(),
      icon: MessageSquare,
      color: "text-amber-600",
    },
    {
      title: "طلبات الشراكة",
      value: (dashboardStats?.associations.pending ?? partnerships.filter((p) => p.status === "pending").length).toString(),
      icon: UserCheck,
      color: "text-purple-600",
    },
  ]


  const sidebarItems = [
    { id: "dashboard", label: "لوحة التحكم", icon: BarChart3 },
    { id: "activities", label: "إدارة الأنشطة", icon: Calendar },
    { id: "messages", label: "الرسائل", icon: MessageSquare },
    { id: "memberships", label: "إدارة العضويات", icon: UserCheck },
    // { id: "members", label: "إدارة الأعضاء", icon: Users },
    { id: "news", label: "إدارة الأخبار", icon: Newspaper },
    { id: "settings", label: "الإعدادات", icon: Settings },
  ]

  // --- Export Handlers for Activities ---
  const generateAssociationsHTML = (activity: any, regs: any[]) => {
    return `
      <div class="header-info">
        <h1>الجمعيات المسجلة</h1>
        <h2>النشاط: ${activity.title}</h2>
        <p>تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-DZ')}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>اسم الجمعية</th>
            <th>البريد الإلكتروني</th>
            <th>الهاتف</th>
            <th>تاريخ التسجيل</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${regs.map((reg, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${reg.associationName}</td>
              <td>${reg.associationEmail}</td>
              <td>${reg.associationPhone}</td>
              <td>${new Date(reg.registrationDate).toLocaleDateString('ar-DZ')}</td>
              <td>${reg.status === 'approved' ? 'مقبول' : reg.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateParticipantsHTML = (activity: any, regs: any[]) => {
    const approvedRegs = regs.filter(r => r.status === 'approved');
    let participantsRows = '';
    let counter = 1;
    approvedRegs.forEach(reg => {
      reg.participants.forEach((p: any) => {
        const birthDisplay = p.birthdate ? new Date(p.birthdate).toLocaleDateString('ar-DZ') : '—';
        participantsRows += `
          <tr>
            <td>${counter++}</td>
            <td>${p.name ?? '—'}</td>
            <td>${birthDisplay}</td>
            <td>${reg.associationName}</td>
          </tr>
        `;
      });
    });

    return `
      <div class="header-info">
        <h1>المشاركون المسجلون</h1>
        <h2>النشاط: ${activity.title}</h2>
        <p>تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-DZ')}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم الكامل</th>
            <th>تاريخ الميلاد</th>
            <th>الجمعية</th>
          </tr>
        </thead>
        <tbody>
          ${participantsRows || '<tr><td colspan="4" style="text-align:center;">لا يوجد مشاركين</td></tr>'}
        </tbody>
      </table>
    `;
  };

  const generateGroupedParticipantsHTML = (activity: any, regs: any[]) => {
    const approvedRegs = regs.filter(r => r.status === 'approved');
    if (!activity.categories || activity.categories.length === 0) return generateParticipantsHTML(activity, regs);

    let html = `
      <div class="header-info">
        <h1>المشاركون المسجلون (حسب الفئة)</h1>
        <h2>النشاط: ${activity.title}</h2>
        <p>تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-DZ')}</p>
      </div>
    `;

    activity.categories.forEach((cat: any) => {
      let participantsRows = '';
      let counter = 1;
      approvedRegs.forEach(reg => {
        const catParticipants = reg.participants.filter((p: any) => p.category === cat);
        catParticipants.forEach((p: any) => {
          const birthDisplay = p.birthdate ? new Date(p.birthdate).toLocaleDateString('ar-DZ') : '—';
          participantsRows += `
            <tr>
              <td>${counter++}</td>
              <td>${p.name ?? '—'}</td>
              <td>${birthDisplay}</td>
              <td>${reg.associationName}</td>
            </tr>
          `;
        });
      });

      html += `
        <h3>الفئة: ${cat}</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم الكامل</th>
              <th>تاريخ الميلاد</th>
              <th>الجمعية</th>
            </tr>
          </thead>
          <tbody>
            ${participantsRows || '<tr><td colspan="4" style="text-align:center;">لا يوجد مشاركين في هذه الفئة</td></tr>'}
          </tbody>
        </table>
        <br/>
      `;
    });

    return html;
  };

  const handleExportAssociations = (format: 'pdf' | 'word') => {
    if (!viewingRegistrationsActivity) return;
    const regs = getActivityRegistrations(viewingRegistrationsActivity.id);
    const html = generateAssociationsHTML(viewingRegistrationsActivity, regs);
    const filename = `الجمعيات_المسجلة_${viewingRegistrationsActivity.title.replace(/\s+/g, '_')}`;
    if (format === 'pdf') exportToPDF(html, filename);
    else exportToWord(html, filename);
  };

  const handleExportParticipants = (format: 'pdf' | 'word') => {
    if (!viewingRegistrationsActivity) return;
    const regs = getActivityRegistrations(viewingRegistrationsActivity.id);
    let html = '';
    if (templateNeedsCategories(viewingRegistrationsActivity.activityTemplate)) {
      html = generateGroupedParticipantsHTML(viewingRegistrationsActivity, regs);
    } else {
      html = generateParticipantsHTML(viewingRegistrationsActivity, regs);
    }
    const filename = `المشاركون_${viewingRegistrationsActivity.title.replace(/\s+/g, '_')}`;
    if (format === 'pdf') exportToPDF(html, filename);
    else exportToWord(html, filename);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row" dir="rtl">
      {/* Sidebar */}
      <div className="fixed right-0 bottom-0 md:top-0 w-full md:h-full md:w-64 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-lg border-t md:border-t-0 md:border-l border-gray-200 z-50 flex flex-col overflow-hidden">
        <div className="hidden md:block p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-amber-600">لوحة التحكم</h1>
          <p className="text-sm text-gray-600">الرابطة الولائية</p>
        </div>

        <nav className="flex-1 flex overflow-x-auto md:overflow-y-auto md:flex-col p-2 md:p-4 gap-2 md:gap-0 md:space-y-2 items-center md:items-stretch [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "ghost"}
                className={`flex-shrink-0 md:w-full justify-center md:justify-start ${activeSection === item.id ? "bg-amber-600 hover:bg-amber-700 text-white" : "hover:bg-gray-100"
                  }`}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon className="md:ml-2 h-5 w-5 md:h-4 md:w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Button>
            )
          })}

          <div className="flex-shrink-0 pt-0 md:pt-4 border-l md:border-l-0 md:border-t border-gray-200 md:mt-4 pl-2 md:pl-0">
            <Button
              variant="ghost"
              className="w-full justify-center md:justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              <LogOut className="md:ml-2 h-5 w-5 md:h-4 md:w-4" />
              <span className="hidden md:inline">تسجيل الخروج</span>
            </Button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="w-full md:w-auto md:flex-1 md:mr-64 p-4 md:p-6 mb-20 md:mb-0 overflow-x-hidden min-w-0">

        {activeSection === "dashboard" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                        <Icon className={`h-8 w-8 ${stat.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="p-6 pb-0">
                <CardTitle className="text-lg">النشاط الأخير</CardTitle>
                <CardDescription>آخر العمليات في النظام</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {(() => {
                    const timeline: { action: string; user: string; time: string; type: "member" | "message" | "activity" | "membership"; date: Date }[] = []

                    // 1. Members/Partnerships
                    partnerships.forEach(p => {
                      timeline.push({
                        action: p.status === 'approved' ? 'تم قبول جمعية' : 'طلب انضمام جمعية',
                        user: p.associationName,
                        type: p.status === 'approved' ? 'member' : 'membership',
                        date: new Date(p.submissionDate),
                        time: new Date(p.submissionDate).toLocaleDateString('ar-DZ')
                      })
                    })

                    // 2. Messages
                    messages.forEach(m => {
                      timeline.push({
                        action: "رسالة اتصال جديدة",
                        user: m.name,
                        type: "message",
                        date: new Date(m.date),
                        time: new Date(m.date).toLocaleDateString('ar-DZ')
                      })
                    })

                    // 3. Activity Registrations
                    activityRegistrations.forEach(r => {
                      timeline.push({
                        action: "تسجيل في نشاط",
                        user: r.associationName,
                        type: "activity",
                        date: new Date(r.registrationDate),
                        time: new Date(r.registrationDate).toLocaleDateString('ar-DZ')
                      })
                    })

                    // 4. New Activities created
                    activities.forEach(a => {
                      if ((a as any).createdAt) {
                        timeline.push({
                          action: "إضافة نشاط جديد",
                          user: a.title,
                          type: "activity",
                          date: new Date((a as any).createdAt),
                          time: new Date((a as any).createdAt).toLocaleDateString('ar-DZ')
                        })
                      }
                    })

                    // Sort descending and take top 5
                    const sortedTimeline = timeline.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)

                    if (sortedTimeline.length === 0) {
                      return <p className="text-gray-500 text-sm text-center py-4">لا توجد سجلات حديثة</p>
                    }

                    return sortedTimeline.map((activity, index) => (
                      <div key={index} className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <Badge
                            variant={
                              activity.type === "member"
                                ? "default"
                                : activity.type === "message"
                                  ? "secondary"
                                  : activity.type === "activity"
                                    ? "outline"
                                    : "destructive"
                            }
                          >
                            {activity.type === "member"
                              ? "عضو"
                              : activity.type === "message"
                                ? "رسالة"
                                : activity.type === "activity"
                                  ? "نشاط"
                                  : "طلب"}
                          </Badge>
                          <div className="mr-2">
                            <p className="font-medium text-gray-900">{activity.action}</p>
                            <p className="text-sm text-gray-600">{activity.user}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{activity.time}</span>
                      </div>
                    ))
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "activities" && (
          <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-0 justify-between md:items-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {sidebarItems.find((item) => item.id === activeSection)?.label}
                </h2>
                <p className="text-black-600">مرحباً بك في النظام الإداري لالرابطة الولائية</p>
              </div>
              <Dialog open={isAddingActivity} onOpenChange={(open) => { setIsAddingActivity(open); if (!open) resetNewActivity() }}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة نشاط جديد
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl md:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 md:p-8" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>إضافة نشاط جديد</DialogTitle>
                    <DialogDescription>اختر نمط النشاط ثم أدخل البيانات المطلوبة</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {/* Activity Template Selector */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">نمط النشاط</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ACTIVITY_TEMPLATES.map((tmpl) => (
                          <button
                            key={tmpl.value}
                            type="button"
                            onClick={() => setNewActivity({ ...newActivity, activityTemplate: tmpl.value, categories: tmpl.value !== "special" ? [] : (newActivity.categories || []) })}
                            className={`p-3 rounded-lg border-2 text-right transition-all ${newActivity.activityTemplate === tmpl.value ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-gray-300"}`}
                          >
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1 ${tmpl.color}`}>{tmpl.label}</span>
                            <p className="text-xs text-gray-500 mt-1">{tmpl.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-title">عنوان النشاط</Label>
                        <Input id="add-title" value={newActivity.title} onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })} placeholder="مثال: المخيم الصيفي" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-type">تصنيف النشاط</Label>
                        <Select dir="rtl" value={newActivity.type} onValueChange={(value) => setNewActivity({ ...newActivity, type: value })}>
                          <SelectTrigger><SelectValue placeholder="اختر تصنيف النشاط" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="مخيم">مخيم</SelectItem>
                            <SelectItem value="ورشة">ورشة</SelectItem>
                            <SelectItem value="رياضة">رياضة</SelectItem>
                            <SelectItem value="ثقافي">ثقافي</SelectItem>
                            <SelectItem value="اجتماعي">اجتماعي</SelectItem>
                            <SelectItem value="تطوعي">تطوعي</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-description">وصف النشاط</Label>
                      <Textarea id="add-description" value={newActivity.description} onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })} placeholder="وصف مفصل عن النشاط وأهدافه" rows={3} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2" >
                        <Label htmlFor="add-date">تاريخ النشاط</Label>
                        <Input id="add-date" type="date" value={newActivity.date} onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-location">المكان</Label>
                        <Input id="add-location" value={newActivity.location} onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })} placeholder="مثال: مركز الجمعية" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="add-duration">المدة</Label>
                        <Input id="add-duration" value={newActivity.duration} onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })} placeholder="مثال: 3 أيام" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="add-capacity">السعة القصوى</Label>
                        <Input id="add-capacity" type="number" value={newActivity.capacity} onChange={(e) => setNewActivity({ ...newActivity, capacity: parseInt(e.target.value) || 0 })} placeholder="50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>صورة النشاط</Label>
                      <div className="flex items-center gap-3">
                        <label htmlFor="add-image-upload" className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 border-dashed border-gray-300 flex-1 justify-center">
                          <Upload className="h-4 w-4 text-amber-600" />
                          {newActivity.image ? "تغيير الصورة" : "رفع صورة"}
                        </label>
                        <input id="add-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setActivityFile(file);
                            setNewActivity({ ...newActivity, image: URL.createObjectURL(file) })
                          }
                        }} />
                        {newActivity.image && (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                            <img src={newActivity.image} alt="preview" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setNewActivity({ ...newActivity, image: "" })} className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-bl-lg">×</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conditional: Registration Settings */}
                    {templateNeedsReg(newActivity.activityTemplate) && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-1">
                        <h4 className="font-medium text-blue-900 flex items-center gap-2"><Users className="h-4 w-4" />إعدادات تسجيل الجمعيات</h4>
                        <p className="text-sm text-blue-700">سيُتاح للجمعيات التسجيل في هذا النشاط. يمكنك مراجعة وقبول أو رفض التسجيلات لاحقاً.</p>
                      </div>
                    )}

                    {/* Conditional: Participant Config */}
                    {templateNeedsParticipants(newActivity.activityTemplate) && (
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-1">
                        <h4 className="font-medium text-purple-900 flex items-center gap-2"><UserCheck className="h-4 w-4" />تكوين المشاركين</h4>
                        <p className="text-sm text-purple-700">سيتمكن ممثلو الجمعيات المقبولة من إضافة قوائم المشاركين إلى النشاط.</p>
                      </div>
                    )}

                    {/* Conditional: Categories Editor */}
                    {templateNeedsCategories(newActivity.activityTemplate) && (
                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-3">
                        <h4 className="font-medium text-orange-900 flex items-center gap-2"><Shield className="h-4 w-4" />تصنيفات المشاركين</h4>
                        <p className="text-sm text-orange-700">أضف التصنيفات المطلوبة لهذا النشاط (مثل U12، U16، Senior)</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="أدخل اسم التصنيف..."
                            value={newCategoryInput}
                            onChange={(e) => setNewCategoryInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newCategoryInput.trim()) {
                                setNewActivity({ ...newActivity, categories: [...(newActivity.categories || []), newCategoryInput.trim()] })
                                setNewCategoryInput("")
                              }
                            }}
                          />
                          <Button type="button" variant="outline" onClick={() => {
                            if (newCategoryInput.trim()) {
                              setNewActivity({ ...newActivity, categories: [...(newActivity.categories || []), newCategoryInput.trim()] })
                              setNewCategoryInput("")
                            }
                          }}>إضافة</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(newActivity.categories || []).map((cat, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                              {cat}
                              <button onClick={() => setNewActivity({ ...newActivity, categories: (newActivity.categories || []).filter((_, i) => i !== idx) })} className="text-orange-600 hover:text-orange-900 font-bold ml-1">×</button>
                            </span>
                          ))}
                          {(newActivity.categories || []).length === 0 && <p className="text-xs text-orange-600">لم تُضف أي تصنيفات بعد</p>}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2 space-x-reverse">
                    <Button variant="outline" onClick={() => { resetNewActivity(); setIsAddingActivity(false) }} disabled={isActivityActionLoading}>إلغاء</Button>
                    <Button onClick={handleAddActivity} className="mr-2 bg-amber-600 hover:bg-amber-700" isLoading={isActivityActionLoading}>إضافة النشاط</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Activities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity) => {
                const tmplMeta = getTemplateMeta(activity.activityTemplate)
                const regs = getActivityRegistrations(activity.id)
                return (
                  <Card key={activity.id} className="hover:shadow-lg transition-shadow flex flex-col">
                    <div className="relative">
                      <img src={activity.image || "/placeholder.svg"} alt={activity.title} className="w-full h-48 object-cover rounded-t-lg" />
                      <Badge className={`absolute top-2 right-2 ${getStatusColor(activity.status)}`}>{getStatusText(activity.status)}</Badge>
                      <span className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-medium ${tmplMeta.color}`}>{tmplMeta.label}</span>
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <div className="space-y-3 flex-1">
                        <div>
                          <h4 className="font-semibold text-lg text-gray-900">{activity.title}</h4>
                          <Badge variant="outline" className="mt-1">{activity.type}</Badge>
                          {activity.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {activity.categories.map((cat, i) => (
                                <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{cat}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{activity.description}</p>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center"><Calendar className="h-4 w-4 ml-2 flex-shrink-0" />{activity.date}</div>
                          <div className="flex items-center"><MapPin className="h-4 w-4 ml-2 flex-shrink-0" />{activity.location}</div>
                          <div className="flex items-center"><Clock className="h-4 w-4 ml-2 flex-shrink-0" />{activity.duration}</div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 md:gap-0 justify-between md:items-center pt-2 border-t">
                          {templateNeedsReg(activity.activityTemplate) && (
                            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                              <Users className="h-3 w-3" />{regs.length} جمعية
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditActivity(activity)}>
                          <Edit className="h-4 w-4 ml-1" />تعديل
                        </Button>
                        {templateNeedsReg(activity.activityTemplate) && (
                          <Button size="sm" variant="outline" className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => setViewingRegistrationsActivity(activity)}>
                            <EyeIcon className="h-4 w-4 ml-1" />التسجيلات
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setActivityDeleteConfirmId(activity.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Edit Activity Dialog */}
            <Dialog open={!!editingActivity} onOpenChange={(open) => { if (!open) { setEditingActivity(null); resetNewActivity() } }}>
              <DialogContent className="max-w-5xl md:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 md:p-8" dir="rtl">
                <DialogHeader>
                  <DialogTitle>تعديل النشاط</DialogTitle>
                  <DialogDescription>تعديل بيانات النشاط</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Template Selector */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">نمط النشاط</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ACTIVITY_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.value}
                          type="button"
                          onClick={() => setNewActivity({ ...newActivity, activityTemplate: tmpl.value, categories: tmpl.value !== "special" ? [] : (newActivity.categories || []) })}
                          className={`p-3 rounded-lg border-2 text-right transition-all ${newActivity.activityTemplate === tmpl.value ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-gray-300"}`}
                        >
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1 ${tmpl.color}`}>{tmpl.label}</span>
                          <p className="text-xs text-gray-500 mt-1">{tmpl.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>عنوان النشاط</Label>
                      <Input value={newActivity.title} onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>تصنيف النشاط</Label>
                      <Select value={newActivity.type} onValueChange={(value) => setNewActivity({ ...newActivity, type: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="مخيم">مخيم</SelectItem>
                          <SelectItem value="ورشة">ورشة</SelectItem>
                          <SelectItem value="رياضة">رياضة</SelectItem>
                          <SelectItem value="ثقافي">ثقافي</SelectItem>
                          <SelectItem value="اجتماعي">اجتماعي</SelectItem>
                          <SelectItem value="تطوعي">تطوعي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>وصف النشاط</Label>
                    <Textarea value={newActivity.description} onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })} rows={3} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>تاريخ النشاط</Label>
                      <Input type="date" value={newActivity.date} onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>المكان</Label>
                      <Input value={newActivity.location} onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>صورة النشاط</Label>
                    <div className="flex items-center gap-3">
                      <label htmlFor="edit-image-upload" className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 border-dashed border-gray-300 flex-1 justify-center">
                        <Upload className="h-4 w-4 text-amber-600" />
                        {newActivity.image ? "تغيير الصورة" : "رفع صورة"}
                      </label>
                      <input id="edit-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setActivityFile(file);
                          setNewActivity({ ...newActivity, image: URL.createObjectURL(file) })
                        }
                      }} />
                      {newActivity.image && (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                          <img src={newActivity.image} alt="preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setNewActivity({ ...newActivity, image: "" })} className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-bl-lg">×</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>المدة</Label>
                      <Input value={newActivity.duration} onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>السعة القصوى</Label>
                      <Input type="number" value={newActivity.capacity} onChange={(e) => setNewActivity({ ...newActivity, capacity: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>الحالة</Label>
                      <Select value={newActivity.status} onValueChange={(value) => setNewActivity({ ...newActivity, status: value as "active" | "completed" | "cancelled" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">نشط</SelectItem>
                          <SelectItem value="completed">مكتمل</SelectItem>
                          <SelectItem value="cancelled">ملغي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Conditional sections */}
                  {templateNeedsReg(newActivity.activityTemplate) && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 flex items-center gap-2"><Users className="h-4 w-4" />تسجيل الجمعيات مُفعَّل</h4>
                      <p className="text-sm text-blue-700 mt-1">الجمعيات يمكنها التسجيل في هذا النشاط.</p>
                    </div>
                  )}
                  {templateNeedsParticipants(newActivity.activityTemplate) && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-medium text-purple-900 flex items-center gap-2"><UserCheck className="h-4 w-4" />تسجيل المشاركين مُفعَّل</h4>
                      <p className="text-sm text-purple-700 mt-1">الجمعيات المقبولة يمكنها إضافة مشاركين.</p>
                    </div>
                  )}
                  {templateNeedsCategories(newActivity.activityTemplate) && (
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-3">
                      <h4 className="font-medium text-orange-900 flex items-center gap-2"><Shield className="h-4 w-4" />تصنيفات المشاركين</h4>
                      <div className="flex gap-2">
                        <Input placeholder="أدخل اسم التصنيف..." value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && newCategoryInput.trim()) { setNewActivity({ ...newActivity, categories: [...(newActivity.categories || []), newCategoryInput.trim()] }); setNewCategoryInput("") } }} />
                        <Button type="button" variant="outline" onClick={() => { if (newCategoryInput.trim()) { setNewActivity({ ...newActivity, categories: [...(newActivity.categories || []), newCategoryInput.trim()] }); setNewCategoryInput("") } }}>إضافة</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(newActivity.categories || []).map((cat, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                            {cat}
                            <button onClick={() => setNewActivity({ ...newActivity, categories: (newActivity.categories || []).filter((_, i) => i !== idx) })} className="text-orange-600 hover:text-orange-900 font-bold ml-1">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2 space-x-reverse">
                  <Button variant="outline" onClick={() => { setEditingActivity(null); resetNewActivity() }} disabled={isActivityActionLoading}>إلغاء</Button>
                  <Button onClick={handleUpdateActivity} className="mr-2 bg-amber-600 hover:bg-amber-700" isLoading={isActivityActionLoading}>حفظ التغييرات</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!activityDeleteConfirmId} onOpenChange={(open) => { if (!open) setActivityDeleteConfirmId(null) }}>
              <DialogContent dir="rtl" className="max-w-lg w-[95vw] p-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    تأكيد حذف النشاط
                  </DialogTitle>
                  <DialogDescription>
                    هل أنت متأكد من حذف النشاط{" "}
                    <strong>{activities.find((a) => a.id === activityDeleteConfirmId)?.title}</strong>؟
                    <br />
                    سيتم حذف جميع التسجيلات المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setActivityDeleteConfirmId(null)} disabled={isActivityActionLoading}>إلغاء</Button>
                  <Button variant="destructive" onClick={handleDeleteActivityConfirmed} isLoading={isActivityActionLoading}>
                    <Trash2 className="h-4 w-4 ml-2" />
                    حذف النشاط
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Registrations Panel Dialog */}
            <Dialog open={!!viewingRegistrationsActivity} onOpenChange={(open) => { if (!open) { setViewingRegistrationsActivity(null); setExpandedRegistrationId(null) } }}>
              <DialogContent className="max-w-5xl md:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 md:p-8" dir="rtl">
                <DialogHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-amber-600" />
                        تسجيلات النشاط: {viewingRegistrationsActivity?.title}
                      </DialogTitle>
                      <DialogDescription>
                        إدارة طلبات تسجيل الجمعيات — القبول يحفظ التسجيل، الرفض يحذفه نهائياً
                      </DialogDescription>
                    </div>
                    {/* Export Buttons */}
                    {viewingRegistrationsActivity && templateNeedsReg(viewingRegistrationsActivity.activityTemplate) && (
                      <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700 ml-2">
                            تصدير الجمعيات:
                          </span>
                          <Button size="sm" className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-2" onClick={() => handleExportAssociations('word')}>
                            <FileDown className="h-4 w-4" /> Word
                          </Button>
                          <Button size="sm" className="h-9 px-3 bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all flex items-center gap-2" onClick={() => handleExportAssociations('pdf')}>
                            <Printer className="h-4 w-4" /> PDF
                          </Button>
                        </div>
                        {templateNeedsParticipants(viewingRegistrationsActivity.activityTemplate) && (
                          <div className="flex items-center gap-2 border-r pr-3 border-gray-300">
                            <span className="text-sm font-semibold text-gray-700 ml-2">
                              تصدير المشاركين:
                            </span>
                            <Button size="sm" className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-2" onClick={() => handleExportParticipants('word')}>
                              <FileDown className="h-4 w-4" /> Word
                            </Button>
                            <Button size="sm" className="h-9 px-3 bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all flex items-center gap-2" onClick={() => handleExportParticipants('pdf')}>
                              <Printer className="h-4 w-4" /> PDF
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  {viewingRegistrationsActivity && getActivityRegistrations(viewingRegistrationsActivity.id).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>لا توجد تسجيلات لهذا النشاط بعد</p>
                    </div>
                  )}
                  {viewingRegistrationsActivity && getActivityRegistrations(viewingRegistrationsActivity.id).map((reg) => (
                    <div key={reg.id} className="border rounded-lg overflow-hidden">
                      {/* Registration Row */}
                      <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between p-4 bg-gray-50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">{reg.associationName}</p>
                            <p className="text-sm text-gray-500 truncate">{reg.associationEmail} · {reg.associationPhone}</p>
                            <p className="text-xs text-gray-400">{new Date(reg.registrationDate).toLocaleDateString("ar-DZ")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={getRegistrationStatusColor(reg.status)}>{getRegistrationStatusText(reg.status)}</Badge>
                          {reg.status === "pending" && (
                            <>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveRegistration(reg.id)} isLoading={isActivityActionLoading}>
                                <Check className="h-4 w-4 ml-1" />قبول
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRejectRegistration(reg.id)} disabled={isActivityActionLoading}>
                                <X className="h-4 w-4 ml-1" />رفض
                              </Button>
                            </>
                          )}
                          {reg.status === "approved" && templateNeedsParticipants(viewingRegistrationsActivity.activityTemplate) && (
                            <Button size="sm" variant="outline" onClick={() => setExpandedRegistrationId(expandedRegistrationId === reg.id ? null : reg.id)}>
                              <Users className="h-4 w-4 ml-1" />{reg.participants.length} مشارك
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Participants Expandable */}
                      {expandedRegistrationId === reg.id && (
                        <div className="p-4 bg-white border-t">
                          <h5 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />قائمة المشاركين
                          </h5>
                          {reg.participants.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">لم تُضف أي مشاركين بعد</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-right text-gray-500 border-b">
                                    <th className="pb-2 font-medium">الاسم</th>
                                    <th className="pb-2 font-medium">تاريخ الميلاد</th>
                                    {viewingRegistrationsActivity.activityTemplate === "special" && <th className="pb-2 font-medium">الفئة</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {reg.participants.map((p) => (
                                    <tr key={p.id} className="border-b last:border-0">
                                      <td className="py-2 font-medium">{p.name}</td>
                                      <td className="py-2 text-gray-600">{p.birthdate}</td>
                                      {viewingRegistrationsActivity.activityTemplate === "special" && (
                                        <td className="py-2">
                                          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{p.category || "—"}</span>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="outline" onClick={() => { setViewingRegistrationsActivity(null); setExpandedRegistrationId(null) }}>إغلاق</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Load More — Activities */}
            {hasMoreActivities && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={handleLoadMoreActivities} isLoading={isLoadingMoreActivities} className="gap-2">
                  تحميل المزيد من الأنشطة
                </Button>
              </div>
            )}
          </div>
        )}

        {activeSection === "messages" && (
          <div className="space-y-6">
            {/* Header with Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {sidebarItems.find((item) => item.id === activeSection)?.label}
                </h2>
                <p className="text-black-600">إدارة رسائل الزوار والاستفسارات</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="البحث في الرسائل..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 w-64"
                  />
                </div>
                <Select dir="rtl" value={messageFilter} onValueChange={setMessageFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الرسائل</SelectItem>
                    <SelectItem value="unread">غير مقروءة</SelectItem>
                    <SelectItem value="read">مقروءة</SelectItem>
                    <SelectItem value="replied">تم الرد عليها</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Messages Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">إجمالي الرسائل</p>
                      <p className="text-2xl font-bold text-gray-900">{dashboardStats?.messages.total ?? messages.length}</p>
                    </div>
                    <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">غير مقروءة</p>
                      <p className="text-2xl font-bold text-red-600">
                        {dashboardStats?.messages.unread ?? messages.filter((m) => m.status === "unread").length}
                      </p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">تم الرد عليها</p>
                      <p className="text-2xl font-bold text-green-600">
                        {messages.filter((m) => m.status === "replied").length}
                      </p>
                    </div>
                    <Reply className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="p-6">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">عالية الأولوية</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {messages.filter((m) => m.priority === "high").length}
                      </p>
                    </div>
                    <Filter className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Messages List */}
            <Card >
              <CardHeader className="p-6 pb-0">
                <CardTitle className="text-lg">قائمة الرسائل</CardTitle>
                <CardDescription>جميع الرسائل الواردة من نموذج الاتصال</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 ">
                  {filteredMessages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>لا توجد رسائل تطابق البحث</p>
                    </div>
                  ) : (
                    filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${message.status === "unread" ? "bg-blue-50 border-blue-200" : "bg-white"
                          }`}
                        onClick={() => setSelectedMessage(message)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-3 h-3 rounded-full ${getPriorityColor(message.priority)}`} />
                              <h4 className="font-semibold text-gray-900">{message.name}</h4>
                              <Badge className={getStatusColor(message.status)}>{getStatusText(message.status)}</Badge>
                              <Badge variant="outline">{message.department}</Badge>
                            </div>
                            <p className="font-medium text-gray-800 mb-1">{message.subject}</p>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{message.message}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {message.email}
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {message.phone}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(message.date).toLocaleDateString("ar-SA")}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {message.status === "unread" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkAsRead(message.id)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedMessage(message)
                              }}
                              className="text-amber-600 hover:text-amber-700 gap-1"
                            >
                              <Reply className="h-4 w-4" />
                              رد
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteMessage(message.id)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Message Detail Dialog */}
            <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
              <DialogContent className="max-w-3xl w-[95vw] p-6 md:p-8" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedMessage?.name}
                  </DialogTitle>
                  <DialogDescription>{selectedMessage?.subject}</DialogDescription>
                </DialogHeader>
                {selectedMessage && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">البريد الإلكتروني</Label>
                        <p className="text-sm">{selectedMessage.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">رقم الهاتف</Label>
                        <p className="text-sm">{selectedMessage.phone}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">القسم</Label>
                        <p className="text-sm">{selectedMessage.department}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">التاريخ</Label>
                        <p className="text-sm">{new Date(selectedMessage.date).toLocaleString("ar-SA")}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-600">الرسالة</Label>
                      <div className="mt-2 p-4 bg-white border rounded-lg">
                        <p className="text-gray-800 leading-relaxed">{selectedMessage.message}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reply">الرد على الرسالة</Label>
                      <Textarea
                        id="reply"
                        placeholder="اكتب ردك هنا..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setSelectedMessage(null)} disabled={isMessageActionLoading}>
                        إغلاق
                      </Button>
                      <Button
                        onClick={() => handleReplyMessage(selectedMessage.id)}
                        className="bg-amber-600 hover:bg-amber-700"
                        disabled={!replyText.trim() || isMessageActionLoading}
                        isLoading={isMessageActionLoading}
                      >
                        <Reply className="ml-2 h-4 w-4" />
                        إرسال الرد
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Message Delete Confirmation Dialog */}
            <Dialog open={!!messageDeleteConfirmId} onOpenChange={(open) => { if (!open) setMessageDeleteConfirmId(null) }}>
              <DialogContent className="max-w-md w-[95vw] p-6" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="h-5 w-5" />
                    تأكيد حذف الرسالة
                  </DialogTitle>
                  <DialogDescription>
                    هل أنت متأكد من حذف هذه الرسالة؟ هذا الإجراء لا يمكن التراجع عنه.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setMessageDeleteConfirmId(null)} disabled={isMessageActionLoading}>إلغاء</Button>
                  <Button variant="destructive" onClick={handleDeleteMessageConfirmed} isLoading={isMessageActionLoading}>
                    <Trash2 className="ml-2 h-4 w-4" />
                    حذف الرسالة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Load More — Messages */}
            {hasMoreMessages && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={handleLoadMoreMessages} isLoading={isLoadingMoreMessages} className="gap-2">
                  تحميل المزيد من الرسائل
                </Button>
              </div>
            )}
          </div>
        )}

        {activeSection === "memberships" && (
          <div className="space-y-6">
            {/* ── Export Print Styles (hidden except when printing) ── */}
            <style>{`
                  @media print {
                    body > *:not(#membership-print-area) { display: none !important; }
                    #membership-print-area { display: block !important; }
                    .no-print { display: none !important; }
                  }
                  #membership-print-area { display: none; }
              `}</style>

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center no-print">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {sidebarItems.find((item) => item.id === activeSection)?.label}
                </h2>
                <p className="text-black-600">مراجعة وإدارة طلبات الشراكة مع الجمعيات</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="البحث في الجمعيات..."
                    value={partnershipSearchTerm}
                    onChange={(e) => setPartnershipSearchTerm(e.target.value)}
                    className="pr-10 w-56"
                  />
                </div>
                <Select dir="rtl" value={partnershipFilter} onValueChange={setPartnershipFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent >
                    <SelectItem value="all">جميع الطلبات</SelectItem>
                    <SelectItem value="pending">قيد المراجعة</SelectItem>
                    <SelectItem value="approved">مقبولة</SelectItem>
                  </SelectContent>
                </Select>
                {/* Export Button */}
                <Dialog open={exportFormatOpen} onOpenChange={setExportFormatOpen}>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 bg-transparent"
                    onClick={() => setExportFormatOpen(true)}
                    disabled={partnerships.filter((p) => p.status === "approved").length === 0}
                  >
                    <Download className="h-4 w-4" />
                    تصدير
                  </Button>
                  <DialogContent className="max-w-md w-[95vw] p-6" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>اختر صيغة التصدير</DialogTitle>
                      <DialogDescription>سيتم تصدير جميع الشراكات المقبولة</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col gap-2 bg-transparent border-2 hover:border-red-400 hover:bg-red-50"
                        onClick={() => {
                          setExportFormatOpen(false)
                          const approved = partnerships.filter((p) => p.status === "approved")
                          // Build printable HTML
                          const rows = approved.map((p) => `
<div style="page-break-inside:avoid;margin-bottom:32px;border:1px solid #e5e7eb;border-radius:8px;padding:20px">
                              <h2 style="font-size:18px;font-weight:700;color:#d97706;margin-bottom:12px;border-bottom:2px solid #d97706;padding-bottom:6px">${p.associationName}</h2>
                              <table style="width:100%;border-collapse:collapse;font-size:13px">
                                <tr style="background:#fef9f0"><td style="padding:6px 10px;font-weight:600;width:35%;border:1px solid #e5e7eb">المؤسسة المشرفة</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${p.institutionName}</td></tr>
                                <tr><td style="padding:6px 10px;font-weight:600;border:1px solid #e5e7eb">رئيس الجمعية</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${p.presidentName}</td></tr>
                                <tr style="background:#fef9f0"><td style="padding:6px 10px;font-weight:600;border:1px solid #e5e7eb">هاتف الرئيس</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${p.presidentPhone}</td></tr>
                                <tr><td style="padding:6px 10px;font-weight:600;border:1px solid #e5e7eb">الكاتب العام</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${p.clerkName}</td></tr>
                                <tr style="background:#fef9f0"><td style="padding:6px 10px;font-weight:600;border:1px solid #e5e7eb">هاتف الكاتب العام</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${p.clerkPhone}</td></tr>
                                <tr><td style="padding:6px 10px;font-weight:600;border:1px solid #e5e7eb">أمين المال</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${p.secretaryName}</td></tr>
                                <tr style="background:#fef9f0"><td style="padding:6px 10px;font-weight:600;border:1px solid #e5e7eb">هاتف أمين المال</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${p.secretaryPhone}</td></tr>
                                <tr><td style="padding:6px 10px;font-weight:600;border:1px solid #e5e7eb">البريد الإلكتروني</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${p.email}</td></tr>
                                <tr style="background:#fef9f0"><td style="padding:6px 10px;font-weight:600;border:1px solid #e5e7eb">رقم الهاتف</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${p.phone}</td></tr>
                                <tr><td style="padding:6px 10px;font-weight:600;border:1px solid #e5e7eb">تاريخ الموافقة</td><td style="padding:6px 10px;border:1px solid #e5e7eb">${p.reviewDate ? new Date(p.reviewDate).toLocaleDateString("ar-DZ") : "-"}</td></tr>
                              </table>
                            </div>
  `).join("")
                          const printWin = window.open("", "_blank", "width=900,height=700")
                          if (printWin) {
                            printWin.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>شراكات الرابطة الولائية</title><style>body{font-family:Arial,sans-serif;padding:30px;direction:rtl} h1{color:#d97706;text-align:center;margin-bottom:6px} .subtitle{text-align:center;color:#6b7280;margin-bottom:24px}</style></head><body><h1>الرابطة الولائية</h1><p class="subtitle">قائمة الشراكات المعتمدة — ${new Date().toLocaleDateString("ar-DZ")}</p>${rows}</body></html>`)
                            printWin.document.close()
                            printWin.focus()
                            setTimeout(() => printWin.print(), 500)
                          }
                        }}
                      >
                        <Printer className="h-8 w-8 text-red-500" />
                        <span className="text-sm font-medium">PDF / طباعة</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col gap-2 bg-transparent border-2 hover:border-blue-400 hover:bg-blue-50"
                        onClick={() => {
                          setExportFormatOpen(false)
                          const approved = partnerships.filter((p) => p.status === "approved")
                          const tableRows = approved.map((p) => `
  <h2>${p.associationName}</h2>
                            <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
                              <tr style="background:#fef9f0"><td><b>المؤسسة المشرفة</b></td><td>${p.institutionName}</td></tr>
                              <tr><td><b>رئيس الجمعية</b></td><td>${p.presidentName}</td></tr>
                              <tr style="background:#fef9f0"><td><b>هاتف الرئيس</b></td><td>${p.presidentPhone}</td></tr>
                              <tr><td><b>الكاتب العام</b></td><td>${p.clerkName}</td></tr>
                              <tr style="background:#fef9f0"><td><b>هاتف الكاتب العام</b></td><td>${p.clerkPhone}</td></tr>
                              <tr><td><b>أمين المال</b></td><td>${p.secretaryName}</td></tr>
                              <tr style="background:#fef9f0"><td><b>هاتف أمين المال</b></td><td>${p.secretaryPhone}</td></tr>
                              <tr><td><b>البريد الإلكتروني</b></td><td>${p.email}</td></tr>
                              <tr style="background:#fef9f0"><td><b>رقم الهاتف</b></td><td>${p.phone}</td></tr>
                              <tr><td><b>تاريخ الموافقة</b></td><td>${p.reviewDate ? new Date(p.reviewDate).toLocaleDateString("ar-DZ") : "-"}</td></tr>
                            </table><br/>
`).join("")
                          const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>شراكات</title><style>body{font-family:Arial;direction:rtl} table{border-collapse:collapse;width:100%} td{padding:6px 10px} h2{color:#d97706}</style></head><body><h1 style="text-align:center;color:#d97706">الرابطة الولائية — الشراكات المعتمدة</h1><p style="text-align:center;color:#6b7280">${new Date().toLocaleDateString("ar-DZ")}</p><hr/>${tableRows}</body></html>`
                          const blob = new Blob(["\ufeff" + html], { type: "application/msword" })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement("a")
                          a.href = url
                          a.download = `شراكات_الرابطة_${new Date().toISOString().slice(0, 10)}.doc`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        <FileDown className="h-8 w-8 text-blue-500" />
                        <span className="text-sm font-medium">Word (.doc)</span>
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">إجمالي الطلبات</p>
                      <p className="text-2xl font-bold text-gray-900">{dashboardStats?.associations.total ?? partnerships.filter(p => p.status !== "rejected").length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">قيد المراجعة</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {dashboardStats?.associations.pending ?? partnerships.filter((p) => p.status === "pending").length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">شراكات معتمدة</p>
                      <p className="text-2xl font-bold text-green-600">
                        {dashboardStats?.associations.approved ?? partnerships.filter((p) => p.status === "approved").length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Soft-deleted (rejected) Grace Period Zone ── */}
            {rejectedPartnerships.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    جمعيات مرفوضة مؤقتاً — سيتم حذفها نهائياً خلال {GRACE_DAYS} أيام
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {rejectedPartnerships.map((p) => {
                      const remaining = p.rejectedAt ? getRemainingDays(p.rejectedAt) : GRACE_DAYS
                      return (
                        <div key={p.id} className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{p.associationName}</p>
                              <p className="text-xs text-orange-600">
                                يتبقى <strong>{remaining}</strong> {remaining === 1 ? "يوم" : "أيام"} قبل الحذف النهائي
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300 bg-transparent"
                              onClick={() => handleUndoReject(p.id)}
                            >
                              <Undo2 className="h-4 w-4 ml-1" />
                              تراجع
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 border-red-300 bg-transparent"
                              onClick={() => setDeleteConfirmId(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Partnerships List ── */}
            <Card >
              <CardHeader className="p-6 pb-0">
                <CardTitle className="text-lg">قائمة الشراكات</CardTitle>
                <CardDescription>جميع طلبات الشراكة المقدمة من الجمعيات</CardDescription>
              </CardHeader>
              <CardContent >
                <div className="space-y-4">
                  {filteredPartnerships.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      <Link2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>لا توجد جمعيات تطابق البحث</p>
                    </div>
                  ) : (
                    filteredPartnerships.map((p) => (
                      <div
                        key={p.id}
                        className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${p.status === "pending" ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                          }`}
                        onClick={() => setSelectedPartnership(p)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            {/* Association Avatar */}
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center flex-shrink-0 border-2 border-amber-300">
                              <Building2 className="h-7 w-7 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <h4 className="font-bold text-gray-900">{p.associationName}</h4>
                                <Badge
                                  className={
                                    p.status === "pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-green-100 text-green-800"
                                  }
                                >
                                  {p.status === "pending" ? "قيد المراجعة" : "مقبولة"}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500 mb-2">{p.institutionName}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">الرئيس: {p.presidentName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span>{p.presidentPhone}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{p.email}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span>{p.phone}</span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 mt-2">
                                تاريخ التقديم: {new Date(p.submissionDate).toLocaleDateString("ar-DZ")}
                              </p>
                            </div>
                          </div>
                          {/* Action Buttons */}
                          <div className="flex gap-2 flex-shrink-0 mr-2" onClick={(e) => e.stopPropagation()}>
                            {p.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleApprovePartnership(p.id)}
                                  title="قبول"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 bg-transparent border-red-300"
                                  onClick={() => handleRejectPartnership(p.id)}
                                  title="رفض"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 border-red-200 bg-transparent"
                              onClick={() => setDeleteConfirmId(p.id)}
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Partnership Detail Dialog ── */}
            <Dialog open={!!selectedPartnership} onOpenChange={() => setSelectedPartnership(null)}>
              <DialogContent className="max-w-5xl md:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 md:p-8" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-amber-600" />
                    {selectedPartnership?.associationName}
                  </DialogTitle>
                  <DialogDescription>{selectedPartnership?.institutionName}</DialogDescription>
                </DialogHeader>
                {selectedPartnership && (
                  <div className="space-y-6">
                    {/* Contact Grid */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">معلومات القيادة</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <Label className="text-xs font-medium text-amber-700">رئيس الجمعية</Label>
                          <p className="text-sm font-semibold mt-1">{selectedPartnership.presidentName}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" />{selectedPartnership.presidentPhone}
                          </p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <Label className="text-xs font-medium text-blue-700">الكاتب العام</Label>
                          <p className="text-sm font-semibold mt-1">{selectedPartnership.clerkName}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" />{selectedPartnership.clerkPhone}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <Label className="text-xs font-medium text-green-700">أمين المال</Label>
                          <p className="text-sm font-semibold mt-1">{selectedPartnership.secretaryName}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" />{selectedPartnership.secretaryPhone}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <Label className="text-xs font-medium text-gray-600">معلومات التواصل</Label>
                          <p className="text-sm text-gray-800 flex items-center gap-1 mt-1">
                            <Mail className="h-3 w-3" />{selectedPartnership.email}
                          </p>
                          <p className="text-sm text-gray-800 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" />{selectedPartnership.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">حالة الطلب</Label>
                        <Badge
                          className={`mt-1 ${selectedPartnership.status === "pending"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                            : "bg-green-100 text-green-800"
                            }`}
                        >
                          {selectedPartnership.status === "pending" ? "قيد المراجعة" : "مقبولة"}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">تاريخ التقديم</Label>
                        <p className="text-sm mt-1">{new Date(selectedPartnership.submissionDate).toLocaleDateString("ar-DZ")}</p>
                      </div>
                      {selectedPartnership.reviewedBy && (
                        <>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">تمت المراجعة بواسطة</Label>
                            <p className="text-sm mt-1">{selectedPartnership.reviewedBy}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">تاريخ المراجعة</Label>
                            <p className="text-sm mt-1">{selectedPartnership.reviewDate ? new Date(selectedPartnership.reviewDate).toLocaleDateString("ar-DZ") : "-"}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {selectedPartnership.notes && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">ملاحظات</Label>
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-sm text-blue-800">{selectedPartnership.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* PDF Preview Link */}
                    {selectedPartnership.officeApprovalUrl && (
                      <div className="flex flex-col gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <Label className="text-sm font-medium text-gray-700">ملف اعتماد المكتب</Label>
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-red-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">مرفق بصيغة PDF</p>
                            <p className="text-xs text-gray-500">تم رفع هذا الملف مع طلب الانضمام</p>
                          </div>
                          <a
                            href={selectedPartnership.officeApprovalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" className="gap-2 cursor-pointer shadow-sm">
                              <ExternalLink className="h-4 w-4" />
                              عرض المستند
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Approve / Reject actions for pending */}
                    {selectedPartnership.status === "pending" && (
                      <div className="space-y-3 border-t pt-4">
                        <div>
                          <Label htmlFor="review-notes-dialog">ملاحظات المراجعة (اختياري)</Label>
                          <Textarea
                            id="review-notes-dialog"
                            placeholder="اكتب ملاحظاتك حول طلب الشراكة..."
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="text-red-600 hover:text-red-700 bg-transparent border-red-300"
                            onClick={() => handleRejectPartnership(selectedPartnership.id)}
                            isLoading={isAssociationActionLoading}
                          >
                            <XCircle className="ml-2 h-4 w-4" />
                            رفض الطلب
                          </Button>
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprovePartnership(selectedPartnership.id)}
                            isLoading={isAssociationActionLoading}
                          >
                            <CheckCircle className="ml-2 h-4 w-4" />
                            قبول الشراكة
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => setSelectedPartnership(null)}>
                        إغلاق
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation Dialog ── */}
            <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
              <DialogContent className="max-w-lg w-[95vw] p-6" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    تأكيد الحذف النهائي
                  </DialogTitle>
                  <DialogDescription>
                    هذا الإجراء لا يمكن التراجع عنه بعد التأكيد
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      ستقوم بحذف الجمعية التالية بشكل نهائي:
                    </p>
                    <p className="text-base font-bold text-red-900 mt-2 pr-6">
                      {partnerships.find((p) => p.id === deleteConfirmId)?.associationName}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    سيتم حذف جميع بيانات هذه الجمعية نهائياً ولن تتمكن من استعادتها لاحقاً.
                    هل أنت متأكد من المتابعة؟
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isAssociationActionLoading}>
                    إلغاء — ابقِ الجمعية
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => deleteConfirmId && handleDeletePartnership(deleteConfirmId)}
                    isLoading={isAssociationActionLoading}
                  >
                    <Trash2 className="ml-2 h-4 w-4" />
                    نعم، احذف نهائياً
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Load More — Associations */}
            {hasMoreAssoc && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={handleLoadMoreAssoc} isLoading={isLoadingMoreAssoc} className="gap-2">
                  تحميل المزيد من الجمعيات
                </Button>
              </div>
            )}
          </div>
        )}

        {activeSection === "news" && (
          <div className="space-y-6 " >
            {/* Header with Add Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {sidebarItems.find((item) => item.id === activeSection)?.label}
                </h2>
                <p className="text-black-600">إنشاء وإدارة أخبار ومقالات الجمعية</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="البحث في الأخبار..."
                    value={newsSearchTerm}
                    onChange={(e) => setNewsSearchTerm(e.target.value)}
                    className="pr-10 w-64"
                  />
                </div>
                <Select dir="rtl" value={newsFilter} onValueChange={setNewsFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent >
                    <SelectItem value="all">جميع المقالات</SelectItem>
                    <SelectItem value="published">منشورة</SelectItem>
                    <SelectItem value="draft">مسودات</SelectItem>
                    <SelectItem value="archived">مؤرشفة</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={isAddingNews} onOpenChange={setIsAddingNews}>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-600 hover:bg-amber-700">
                      <Plus className="ml-2 h-4 w-4" />
                      إضافة مقال جديد
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl md:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 md:p-8" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>إضافة مقال جديد</DialogTitle>
                      <DialogDescription>املأ البيانات التالية لإضافة مقال جديد</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="news-title">عنوان المقال</Label>
                          <Input
                            id="news-title"
                            value={newNews.title}
                            onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                            placeholder="عنوان المقال"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="news-excerpt">المقدمة</Label>
                          <Textarea
                            id="news-excerpt"
                            value={newNews.excerpt}
                            onChange={(e) => setNewNews({ ...newNews, excerpt: e.target.value })}
                            placeholder="مقدمة مختصرة عن المقال"
                            rows={2}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="news-content">محتوى المقال</Label>
                        <Textarea
                          id="news-content"
                          value={newNews.content}
                          onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                          placeholder="محتوى المقال الكامل"
                          rows={8}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="news-author">الكاتب</Label>
                          <Input
                            id="news-author"
                            value={newNews.author}
                            onChange={(e) => setNewNews({ ...newNews, author: e.target.value })}
                            placeholder="اسم الكاتب"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="news-status">الحالة</Label>
                          <Select dir="rtl"
                            value={newNews.status}
                            onValueChange={(value) =>
                              setNewNews({ ...newNews, status: value as "draft" | "published" | "archived" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent >
                              <SelectItem value="draft">مسودة</SelectItem>
                              <SelectItem value="published">منشور</SelectItem>
                              <SelectItem value="archived">مؤرشف</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>صورة المقال (يتم ضغطها تلقائياً)</Label>
                        <div className="flex items-center gap-3">
                          <label htmlFor="news-image" className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 border-dashed border-gray-300 flex-1 justify-center">
                            <Upload className="h-4 w-4 text-amber-600" />
                            {newNews.image && newNews.image !== "/placeholder.svg" ? "تغيير الصورة" : "رفع صورة"}
                          </label>
                          <input
                            id="news-image"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setNewsFile(file);
                                setNewNews({ ...newNews, image: URL.createObjectURL(file) });
                              }
                            }}
                          />
                          {newNews.image && newNews.image !== "/placeholder.svg" && (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                              <img src={newNews.image} alt="Preview" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => setNewNews({ ...newNews, image: "/placeholder.svg" })} className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-bl-lg">×</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="news-tags">الكلمات المفتاحية</Label>
                        <Input
                          id="news-tags"
                          value={newNews.tags?.join(", ")}
                          onChange={(e) =>
                            setNewNews({ ...newNews, tags: e.target.value.split(",").map((tag) => tag.trim()) })
                          }
                          placeholder="الكلمات المفتاحية مفصولة بفواصل"
                        />
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="checkbox"
                          id="news-featured"
                          checked={newNews.featured}
                          onChange={(e) => setNewNews({ ...newNews, featured: e.target.checked })}
                          className="rounded"
                        />
                        <Label htmlFor="news-featured" className="mr-2">مقال مميز</Label>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 space-x-reverse">
                      <Button variant="outline" onClick={() => setIsAddingNews(false)} disabled={isNewsActionLoading}>
                        إلغاء
                      </Button>
                      <Button onClick={handleAddNews} className="mr-2 bg-amber-600 hover:bg-amber-700" isLoading={isNewsActionLoading}>
                        إضافة المقال
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* News Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">إجمالي المقالات</p>
                      <p className="text-2xl font-bold text-gray-900">{dashboardStats?.news.total ?? newsArticles.length}</p>
                    </div>
                    <Newspaper className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">منشورة</p>
                      <p className="text-2xl font-bold text-green-600">
                        {dashboardStats?.news.published ?? newsArticles.filter((article) => article.status === "published").length}
                      </p>
                    </div>
                    <Globe className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">مسودات</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {dashboardStats?.news.draft ?? newsArticles.filter((article) => article.status === "draft").length}
                      </p>
                    </div>
                    <Edit className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">إجمالي المشاهدات</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {newsArticles.reduce((total, article) => total + article.views, 0)}
                      </p>
                    </div>
                    <EyeIcon className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* News List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNews.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد مقالات تطابق البحث</p>
                </div>
              ) : (
                filteredNews.map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img
                        src={article.image || "/placeholder.svg"}
                        alt={article.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Badge className={getNewsStatusColor(article.status)}>
                          {getNewsStatusText(article.status)}
                        </Badge>
                        {article.featured && <Badge className="bg-amber-100 text-amber-800">مميز</Badge>}
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg text-gray-900 line-clamp-2">{article.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">{article.excerpt}</p>

                        <div className="text-xs text-gray-500 space-y-1">
                          <div>بواسطة: {article.author}</div>
                          <div>{new Date(article.publishDate).toLocaleDateString("ar-SA")}</div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {article.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 md:gap-0 justify-between md:items-center pt-2 border-t">
                          <Button size="sm" variant="outline" onClick={() => setSelectedNews(article)}>
                            <EyeIcon className="h-4 w-4 ml-1" />
                            عرض
                          </Button>
                          <div className="flex space-x-2 space-x-reverse">
                            {article.status === "draft" && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handlePublishNews(article.id)}
                              >
                                <Globe className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleEditNews(article)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteNews(article.id)}
                              className="mr-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* News Delete Confirmation Dialog */}
            <Dialog open={!!newsDeleteConfirmId} onOpenChange={(open) => { if (!open) setNewsDeleteConfirmId(null) }}>
              <DialogContent className="max-w-md w-[95vw] p-6" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="h-5 w-5" />
                    تأكيد حذف المقال
                  </DialogTitle>
                  <DialogDescription>
                    هل أنت متأكد من حذف هذا المقال؟{" "}
                    <strong>{newsArticles.find((a) => a.id === newsDeleteConfirmId)?.title}</strong>؟
                    {" "}هذا الإجراء لا يمكن التراجع عنه.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setNewsDeleteConfirmId(null)} disabled={isNewsActionLoading}>إلغاء</Button>
                  <Button variant="destructive" onClick={handleDeleteNewsConfirmed} isLoading={isNewsActionLoading}>
                    <Trash2 className="ml-2 h-4 w-4" />
                    حذف المقال
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit News Dialog */}
            <Dialog open={!!editingNews} onOpenChange={() => setEditingNews(null)}>
              <DialogContent className="max-w-5xl md:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 md:p-8" dir="rtl">
                <DialogHeader>
                  <DialogTitle>تعديل المقال</DialogTitle>
                  <DialogDescription>تعديل بيانات المقال</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-news-title">عنوان المقال</Label>
                      <Input
                        id="edit-news-title"
                        value={newNews.title}
                        onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-news-category">التصنيف</Label>
                      <Select
                        value={newNews.category}
                        onValueChange={(value) => setNewNews({ ...newNews, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="أخبار">أخبار</SelectItem>
                          <SelectItem value="فعاليات">فعاليات</SelectItem>
                          <SelectItem value="تعليم">تعليم</SelectItem>
                          <SelectItem value="تدريب">تدريب</SelectItem>
                          <SelectItem value="إعلانات">إعلانات</SelectItem>
                          <SelectItem value="تطوع">تطوع</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-news-excerpt">المقدمة</Label>
                    <Textarea
                      id="edit-news-excerpt"
                      value={newNews.excerpt}
                      onChange={(e) => setNewNews({ ...newNews, excerpt: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-news-content">محتوى المقال</Label>
                    <Textarea
                      id="edit-news-content"
                      value={newNews.content}
                      onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                      rows={8}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-news-author">الكاتب</Label>
                      <Input
                        id="edit-news-author"
                        value={newNews.author}
                        onChange={(e) => setNewNews({ ...newNews, author: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-news-status">الحالة</Label>
                      <Select
                        value={newNews.status}
                        onValueChange={(value) =>
                          setNewNews({ ...newNews, status: value as "draft" | "published" | "archived" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">مسودة</SelectItem>
                          <SelectItem value="published">منشور</SelectItem>
                          <SelectItem value="archived">مؤرشف</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>صورة المقال (تحديث - يتم ضغطها تلقائياً)</Label>
                    <div className="flex items-center gap-3">
                      <label htmlFor="edit-news-image" className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 border-dashed border-gray-300 flex-1 justify-center">
                        <Upload className="h-4 w-4 text-amber-600" />
                        {newNews.image && newNews.image !== "/placeholder.svg" ? "تغيير الصورة" : "رفع صورة"}
                      </label>
                      <input
                        id="edit-news-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewsFile(file);
                            setNewNews({ ...newNews, image: URL.createObjectURL(file) });
                          }
                        }}
                      />
                      {newNews.image && newNews.image !== "/placeholder.svg" && (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                          <img src={newNews.image} alt="Preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setNewNews({ ...newNews, image: "/placeholder.svg" })} className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-bl-lg">×</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-news-tags">الكلمات المفتاحية</Label>
                    <Input
                      id="edit-news-tags"
                      value={newNews.tags?.join(", ")}
                      onChange={(e) =>
                        setNewNews({ ...newNews, tags: e.target.value.split(",").map((tag) => tag.trim()) })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      id="edit-news-featured"
                      checked={newNews.featured}
                      onChange={(e) => setNewNews({ ...newNews, featured: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="edit-news-featured">مقال مميز</Label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 space-x-reverse">
                  <Button variant="outline" onClick={() => setEditingNews(null)} disabled={isNewsActionLoading}>
                    إلغاء
                  </Button>
                  <Button onClick={handleUpdateNews} className="mr-2 bg-amber-600 hover:bg-amber-700" isLoading={isNewsActionLoading}>
                    حفظ التغييرات
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* News Detail Dialog */}
            <Dialog open={!!selectedNews} onOpenChange={() => setSelectedNews(null)}>
              <DialogContent className="max-w-5xl md:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 md:p-8" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Newspaper className="h-5 w-5" />
                    {selectedNews?.title}
                  </DialogTitle>
                  <DialogDescription>
                    بواسطة {selectedNews?.author}
                  </DialogDescription>
                </DialogHeader>
                {selectedNews && (
                  <div className="space-y-4">
                    <img
                      src={selectedNews.image || "/placeholder.svg"}
                      alt={selectedNews.title}
                      className="w-full h-64 object-cover rounded-lg"
                    />

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(selectedNews.publishDate).toLocaleDateString("ar-SA")}
                      </div>
                      <div className="flex items-center gap-1">
                        <EyeIcon className="h-4 w-4" />
                        {selectedNews.views} مشاهدة
                      </div>
                      <Badge className={getNewsStatusColor(selectedNews.status)}>
                        {getNewsStatusText(selectedNews.status)}
                      </Badge>
                      {selectedNews.featured && <Badge className="bg-amber-100 text-amber-800">مميز</Badge>}
                    </div>

                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{selectedNews.content}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedNews.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 md:gap-0 justify-between md:items-center pt-4 border-t">
                      <div className="flex gap-2">
                        {selectedNews.status === "draft" && (
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              handlePublishNews(selectedNews.id)
                              setSelectedNews(null)
                            }}
                          >
                            <Globe className="ml-2 h-4 w-4" />
                            نشر المقال
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => handleToggleFeatured(selectedNews.id)}>
                          {selectedNews.featured ? "إلغاء التمييز" : "جعل مميز"}
                        </Button>
                      </div>
                      <Button variant="outline" onClick={() => setSelectedNews(null)}>
                        إغلاق
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Load More — News */}
            {hasMoreNews && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={handleLoadMoreNews} isLoading={isLoadingMoreNews} className="gap-2">
                  تحميل المزيد من الأخبار
                </Button>
              </div>
            )}
          </div>
        )}


        {activeSection === "settings" && (
          <Card>
            <CardHeader className="border-b pt-2">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Settings className="h-6 w-6 text-amber-600" />
                إعدادات الحساب الإداري
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 flex flex-col items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <Settings className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold">تم نقل الإعدادات</h3>
                <p className="text-muted-foreground max-w-md">
                  تتم الآن إدارة حسابات المسؤولين وإعدادات الوصول من خلال لوحة تحكم Supabase مباشرة لضمان أقصى درجات الأمان.
                </p>
                <Button variant="outline" onClick={() => window.open('https://app.supabase.com', '_blank')}>
                  الانتقال إلى Supabase
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection !== "dashboard" &&
          activeSection !== "activities" &&
          activeSection !== "messages" &&
          activeSection !== "memberships" &&
          activeSection !== "news" &&
          activeSection !== "members" &&
          activeSection !== "settings" && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <Calendar className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  قسم {sidebarItems.find((item) => item.id === activeSection)?.label}
                </h3>
                <p className="text-gray-600">سيتم تطوير هذا القسم في المرحلة التالية</p>
              </CardContent>
            </Card>
          )}

        {/* --- Logout Confirmation Dialog --- */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent className="max-w-md w-[95vw] p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <LogOut className="h-5 w-5" />
                تأكيد تسجيل الخروج
              </DialogTitle>
              <DialogDescription>
                هل أنت متأكد من رغبتك في تسجيل الخروج من لوحة التحكم؟
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)} disabled={isLoggingOut}>إلغاء</Button>
              <Button variant="destructive" onClick={handleLogout} isLoading={isLoggingOut}>
                <LogOut className="ml-2 h-4 w-4 shrink-0" />
                تسجيل الخروج
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div >
  )
}
