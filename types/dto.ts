import { z } from "zod"

// =============================================
// AUTH
// =============================================

export const AdminLoginSchema = z.object({
    email: z.string().email("البريد الإلكتروني غير صالح"),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
})
export type AdminLoginDTO = z.infer<typeof AdminLoginSchema>

export const RegisterAssociationSchema = z.object({
    name: z.string().min(3, "اسم الجمعية مطلوب (3 أحرف على الأقل)"),
    email: z.string().email("البريد الإلكتروني غير صالح"),
    password: z
        .string()
        .min(7, "كلمة المرور يجب أن تكون 7 أحرف على الأقل")
        .regex(/^[a-zA-Z0-9]+$/, "كلمة المرور يجب أن تحتوي على أحرف وأرقام فقط"),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    wilaya: z.string().optional(),
    registration_number: z.string().optional(),
    description: z.string().optional(),
    institution_name: z.string().min(1, "اسم الهيئة مطلوب"),
    president_name: z.string().min(1, "اسم رئيس الجمعية مطلوب"),
    president_phone: z.string().optional(),
    secretary_name: z.string().min(1, "اسم الأمين العام مطلوب"),
    secretary_phone: z.string().optional(),
    clerk_name: z.string().min(1, "اسم الكاتب العام مطلوب"),
    clerk_phone: z.string().optional(),
    office_approval_url: z.string().optional(),
})
export type RegisterAssociationDTO = z.infer<typeof RegisterAssociationSchema>

export const LoginAssociationSchema = z.object({
    email: z.string().email("البريد الإلكتروني غير صالح"),
    password: z.string().min(1, "كلمة المرور مطلوبة"),
})
export type LoginAssociationDTO = z.infer<typeof LoginAssociationSchema>

// =============================================
// ACTIVITIES
// =============================================

export const CreateActivitySchema = z.object({
    title: z.string().min(3, "العنوان مطلوب"),
    description: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    location: z.string().optional(),
    wilaya: z.string().optional(),
    duration: z.string().optional(),
    status: z.string().default("upcoming"),
    template: z.enum([
        "announcement",
        "announcement_reg",
        "announcement_reg_participants",
        "special",
    ]).default("announcement"),
    allow_association_registration: z.boolean().default(false),
    allow_participant_registration: z.boolean().default(false),
    max_associations: z.number().int().nonnegative().optional(),
    max_participants: z.number().int().nonnegative().optional(),
    categories: z.array(z.string()).default([]),
    images: z.string().optional(),
    videos: z.array(z.string().url()).default([]),
    achievements: z.array(z.string()).default([]),
    highlights: z.array(z.string()).default([]),
})
export type CreateActivityDTO = z.infer<typeof CreateActivitySchema>
export const UpdateActivitySchema = CreateActivitySchema.partial()
export type UpdateActivityDTO = z.infer<typeof UpdateActivitySchema>

// =============================================
// NEWS
// =============================================

export const CreateNewsSchema = z.object({
    title: z.string().min(3, "العنوان مطلوب"),
    excerpt: z.string().optional(),
    content: z.string().min(10, "المحتوى مطلوب"),
    author: z.string().default("المنظمة"),
    category: z.string().default("عام"),
    type: z.string().default("news"),
    icon: z.string().default("newspaper"),
    color: z.string().default("#3B82F6"),
    bg_color: z.string().default("#EFF6FF"),
    image: z.string().optional(),
    featured: z.boolean().default(false),
    published_at: z.string().optional(),
})
export type CreateNewsDTO = z.infer<typeof CreateNewsSchema>
export const UpdateNewsSchema = CreateNewsSchema.partial()
export type UpdateNewsDTO = z.infer<typeof UpdateNewsSchema>

// =============================================
// REGISTRATIONS
// =============================================

export const CreateRegistrationSchema = z.object({
    activity_id: z.string().uuid("معرف النشاط غير صالح"),
    notes: z.string().optional(),
})
export type CreateRegistrationDTO = z.infer<typeof CreateRegistrationSchema>

export const AddParticipantSchema = z.object({
    registration_id: z.string().uuid().optional(),
    name: z.string().min(2, "الاسم مطلوب"),
    birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ ميلاد غير صالح").optional(),
    category: z.string().optional(),
    notes: z.string().optional(),
})
export type AddParticipantDTO = z.infer<typeof AddParticipantSchema>

export const RegisterWithParticipantsSchema = z.object({
    activity_id: z.string(), // Allowing string for parsing, will cast to int/uuid depending on DB
    notes: z.string().optional(),
    participants: z.array(z.object({
        name: z.string().min(2, "الاسم مطلوب"),
        birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ ميلاد غير صالح").optional(),
        category: z.string().optional(),
    })).optional(),
})
export type RegisterWithParticipantsDTO = z.infer<typeof RegisterWithParticipantsSchema>

export const UpdateRegistrationStatusSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "approved", "rejected", "cancelled"]),
    rejection_reason: z.string().optional(),
})
export type UpdateRegistrationStatusDTO = z.infer<typeof UpdateRegistrationStatusSchema>
