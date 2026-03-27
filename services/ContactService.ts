import { createSupabaseServerClient } from "@/lib/supabase/server"
import { handleSupabaseError } from "@/lib/utils/error-handler"
import { Resend } from "resend"

// Professional Email Reply
export async function sendProfessionalReply(to: string, subject: string, body: string) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("لم يتم إعداد مفتاح Resend في البيئة (RESEND_API_KEY).")
    }
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
        from: "رابطة الهواء الطلق لولاية سطيف  <info@lapalejsetif.com>",
        to: [to],
        subject: subject,
        html: `
            <div dir="rtl" style="margin: 0; padding: 40px 20px; background-color: #f3f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #064e3b 0%, #059669 100%); padding: 35px 20px; text-align: center;">
                        <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.15);">الرابطة الولائية للهواء الطلق ومبادلات الشباب لولاية سطيف</h2>
                        <p style="margin: 10px 0 0 0; color: #d1fae5; font-size: 15px; opacity: 0.9;">الإدارة العامة</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 35px; color: #374151; font-size: 16px; line-height: 1.8;">
                        <div style="white-space: pre-wrap;">${body}</div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f9fafb; padding: 25px 35px; text-align: center; border-top: 1px solid #f3f4f6;">
                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">
                            هذا الرد صادر عن الإدارة العامة للرابطة عبر المنصة الإلكترونية
                        </p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                            © ${new Date().getFullYear()} رابطة الهواء الطلق ومبادلات الشباب لولاية سطيف. جميع الحقوق محفوظة.
                        </p>
                    </div>
                </div>
            </div>
        `
    })

    if (error) {
        console.error("Error sending email:", error)
        throw new Error(error.message)
    }

    return true
}

export const ContactService = {
    async createContactMessage(data: {
        name: string
        email?: string
        phone: string
        subject: string
        message: string
        contactReason: string
    }) {
        const supabase = await createSupabaseServerClient()

        // Rate Limiting: No more than 5 messages from the same email in the last hour
        if (data.email) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

            const { createClient } = await import("@supabase/supabase-js")
            const serviceClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            const { count, error: countError } = await serviceClient
                .from("contact_messages")
                .select("*", { count: "exact", head: true })
                .eq("email", data.email)
                .gte("created_at", oneHourAgo)

            if (countError) throw countError

            if (count && count >= 5) {
                throw new Error("لقد تجاوزت الحد المسموح به من الرسائل (5 رسائل في الساعة). يرجى المحاولة لاحقاً.")
            }
        }

        // Insert the message
        const { error } = await supabase
            .from("contact_messages")
            .insert([
                {
                    name: data.name,
                    email: data.email || null,
                    phone: data.phone,
                    subject: data.subject,
                    message: data.message,
                    contactReason: data.contactReason,
                    status: "unread",
                },
            ])

        if (error) {
            console.error("Error inserting contact message:", error)
            throw new Error(handleSupabaseError(error))
        }

        return true
    },

    async getAllContactMessages() {
        const supabase = await createSupabaseServerClient()

        const { data, error } = await supabase
            .from("contact_messages")
            .select("*")
            .order("created_at", { ascending: false })

        if (error) {
            console.error("Error fetching contact messages:", error)
            throw new Error(handleSupabaseError(error))
        }

        return data
    },

    async replyToContactMessage(id: string, replyText: string) {
        const supabase = await createSupabaseServerClient()

        // First fetch the message to get the email
        const { data: message, error: fetchError } = await supabase
            .from("contact_messages")
            .select("email, subject, name")
            .eq("id", id)
            .single()

        if (fetchError) throw new Error(handleSupabaseError(fetchError))

        // Send the email if the user provided one
        if (message.email) {
            await sendProfessionalReply(
                message.email,
                `رد على رسالتك: ${message.subject}`,
                `مرحباً ${message.name}،\n\n${replyText}\n\nمع تحيات إدارة الرابطة الولائية.`
            )
        }

        // Update the database record
        const { data, error: updateError } = await supabase
            .from("contact_messages")
            .update({
                status: "replied",
                admin_reply: replyText,
                replied_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single()

        if (updateError) throw new Error(handleSupabaseError(updateError))

        return data
    },

    async markMessageRead(id: string) {
        const supabase = await createSupabaseServerClient()
        const { data, error } = await supabase
            .from("contact_messages")
            .update({ status: "read" })
            .eq("id", id)
            .select()
            .single()

        if (error) throw new Error(handleSupabaseError(error))
        return data
    },

    async deleteContactMessage(id: string) {
        const supabase = await createSupabaseServerClient()
        const { error } = await supabase
            .from("contact_messages")
            .delete()
            .eq("id", id)

        if (error) throw new Error(handleSupabaseError(error))
        return true
    }
}
