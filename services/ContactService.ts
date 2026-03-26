import { createSupabaseServerClient } from "@/lib/supabase/server"
import { handleSupabaseError } from "@/lib/utils/error-handler"

// Placeholder email function
export async function sendReplyEmail(to: string, subject: string, content: string) {
    // TODO: connect the hosting's SMTP server later
    console.log("==============================")
    console.log(`[EMAIL SENT] To: ${to}`)
    console.log(`[EMAIL SENT] Subject: ${subject}`)
    console.log(`[EMAIL SENT] Content: ${content}`)
    console.log("==============================")
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

            // Need to use service_role client or secure context if RLS hides other people's messages from 'anon'
            // Wait, 'anon' cannot read messages due to RLS!
            // To perform rate limiting, we need to count. Since RLS blocks SELECT for anon, we must bypass RLS just for this check,
            // OR we can create a secure RPC function. 
            // The easiest way for now without a new migration is to use the service role client for this specific check.
            // Alternatively, we use `createSupabaseServerClient` but since RLS restricts SELECT to authenticated admins, it returns 0 for anon.
            // So we MUST use the service role client to check the count.

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
            await sendReplyEmail(
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
