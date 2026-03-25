"use server"

import { getServiceRoleClient } from "@/lib/supabase/admin"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { CreateNewsDTO, UpdateNewsDTO } from "@/types/dto"
import { CreateNewsSchema, UpdateNewsSchema } from "@/types/dto"

// ============================================================
// Get All News (public — browser client)
// ============================================================
export async function getNews() {
    const db = getSupabaseBrowserClient()
    const { data, error } = await db
        .from("news")
        .select("id, title, excerpt, author, category, type, icon, color, bg_color, image, views, likes, featured, published_at, created_at")
        // NOTE: `content` is intentionally excluded from list queries to avoid over-fetching.
        // Full content is loaded lazily via getNewsItem() or fetchNewsContent() when the user opens an article.
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })

    if (error) throw new Error("[NewsService] Failed to fetch news: " + error.message)
    return data ?? []
}

// ============================================================
// Get Single News Item (public)
// ============================================================
export async function getNewsItem(id: string) {
    const db = getSupabaseBrowserClient()
    const { data, error } = await db
        .from("news")
        .select("id, title, excerpt, content, author, category, type, icon, color, bg_color, image, views, likes, featured, published_at, created_at")
        .eq("id", id)
        .single()
    if (error) throw new Error("[NewsService] News item not found: " + error.message)
    return data
}

// ============================================================
// Create News (admin only)
// ============================================================
export async function createNews(input: CreateNewsDTO) {
    const parsed = CreateNewsSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.errors[0].message)

    const db = getServiceRoleClient()
    const { data, error } = await db
        .from("news")
        .insert({
            ...parsed.data,
            published_at: parsed.data.published_at ?? new Date().toISOString(),
        })
        .select("id, title, excerpt, content, author, category, type, icon, color, bg_color, image, views, likes, featured, published_at, created_at")
        .single()

    if (error) throw new Error("[NewsService] Failed to create news: " + error.message)
    return data
}

// ============================================================
// Update News (admin only)
// ============================================================
export async function updateNews(id: string, input: UpdateNewsDTO) {
    const parsed = UpdateNewsSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.errors[0].message)

    const db = getServiceRoleClient()
    const { data, error } = await db
        .from("news")
        .update(parsed.data)
        .eq("id", id)
        .select("id, title, excerpt, content, author, category, type, icon, color, bg_color, image, views, likes, featured, published_at, created_at")
        .single()

    if (error) throw new Error("[NewsService] Failed to update news: " + error.message)
    return data
}

// ============================================================
// Delete News (admin only)
// ============================================================
export async function deleteNews(id: string) {
    const db = getServiceRoleClient()
    const { error } = await db.from("news").delete().eq("id", id)
    if (error) throw new Error("[NewsService] Failed to delete news: " + error.message)
}

// ============================================================
// Increment Views (fire and forget)
// ============================================================
export async function incrementNewsViews(id: string) {
    const db = getSupabaseBrowserClient()
    const { data } = await db.from("news").select("views").eq("id", id).single()
    if (data) {
        const serviceDb = getServiceRoleClient()
        await serviceDb.from("news").update({ views: data.views + 1 }).eq("id", id)
    }
}
