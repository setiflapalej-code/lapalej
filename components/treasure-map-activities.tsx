"use client"

import { fetchAllData } from "../app/api/api";
import { Activity } from "../app/api/type";
import type { AssociationSession } from "@/types/auth"
import { registerWithParticipants } from "@/services/RegistrationService"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar, MapPin, Users, Camera, Video, Award, Clock, Star,
  ChevronLeft, ChevronRight, Play, CheckCircle, Building2, X, Plus,
  Search, Filter, Share
} from "lucide-react"

// فئات الفلتر
const filterCategories = [
  { value: "all", label: "الكل" },
  { value: "upcoming", label: "قادم" },
  { value: "completed", label: "مكتمل" },
  { value: "announcement_reg", label: "مع تسجيل" },
  { value: "special", label: "خاص" },
]

// حالة تحديد شكل البطاقة بناءً على حصة التحميل
const CARDS_PER_LOAD = 9

interface Props {
  session?: AssociationSession | null;
}

export function TreasureMapActivities({ session }: Props = {}) {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // فلترة
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")

  // تحميل المزيد
  const [displayedItems, setDisplayedItems] = useState(CARDS_PER_LOAD)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // تسجيل الجمعية
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [registeredActivityIds, setRegisteredActivityIds] = useState<Set<number>>(new Set())
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [registeringActivity, setRegisteringActivity] = useState<Activity | null>(null)
  const [regFormData, setRegFormData] = useState({ assocName: "", email: "", phone: "" })
  const [regSuccess, setRegSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [participantsList, setParticipantsList] = useState<{ id: string; name: string; birthdate: string; category: string }[]>([])
  const [currentParticipant, setCurrentParticipant] = useState({ name: "", birthdate: "", category: "" })

  useEffect(() => {
    if (session) {
      setIsLoggedIn(true)
      setRegFormData(prev => ({
        ...prev,
        assocName: session.associationName,
        email: session.email
      }))
    }
  }, [session])

  // جلب البيانات
  useEffect(() => {
    const loadActivities = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchAllData()
        if (data && data.activities && Array.isArray(data.activities)) {
          const normalized = data.activities.map((a: any) => ({
             ...a,
             images: typeof a.images === 'string' ? (a.images ? [a.images] : []) : (Array.isArray(a.images) ? a.images : [])
          }))
          setActivities(normalized)
        } else {
          throw new Error("البيانات المستلمة غير صحيحة")
        }
      } catch (err) {
        console.error("خطأ في جلب البيانات:", err)
        setError("حدث خطأ في تحميل البيانات")
        setActivities([])
      } finally {
        setIsLoading(false)
        setMounted(true)
      }
    }
    loadActivities()
  }, [])

  // التحقق من activityId في URL
  useEffect(() => {
    if (!mounted || activities.length === 0) return
    const activityId = searchParams.get("activityId")
    if (activityId) {
      const activity = activities.find((a) => a.id === parseInt(activityId))
      if (activity) {
        setSelectedActivity(activity)
        setCurrentImageIndex(0)
      }
    }
  }, [searchParams, activities, mounted])

  // تحميل المزيد - Intersection Observer
  useEffect(() => {
    if (!mounted || isLoadingMore) return
    const currentFilteredTotal = filteredActivities.length
    if (displayedItems >= currentFilteredTotal) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreItems()
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    )
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [mounted, isLoadingMore, displayedItems, searchTerm, selectedFilter])

  // الأنشطة المصفاة
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.location?.toLowerCase().includes(searchTerm.toLowerCase())

    if (selectedFilter === "all") return matchesSearch
    if (selectedFilter === "upcoming") return matchesSearch && activity.status === "upcoming"
    if (selectedFilter === "completed") return matchesSearch && activity.status === "completed"
    if (selectedFilter === "announcement_reg") {
      return matchesSearch && (
        activity.activityTemplate === "announcement_reg" ||
        activity.activityTemplate === "announcement_reg_participants"
      )
    }
    if (selectedFilter === "special") return matchesSearch && activity.activityTemplate === "special"
    return matchesSearch
  })

  // البطاقات المعروضة
  const currentActivities = filteredActivities.slice(0, displayedItems)
  const hasMore = displayedItems < filteredActivities.length

  // إعادة تعيين العرض عند تغيير الفلتر
  useEffect(() => {
    setDisplayedItems(CARDS_PER_LOAD)
  }, [searchTerm, selectedFilter])

  const loadMoreItems = async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    setDisplayedItems((prev) => Math.min(prev + CARDS_PER_LOAD, filteredActivities.length))
    setIsLoadingMore(false)
  }

  const nextImage = () => {
    if (selectedActivity?.images?.length) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedActivity.images!.length)
    }
  }

  const prevImage = () => {
    if (selectedActivity?.images?.length) {
      setCurrentImageIndex(
        (prev) => (prev - 1 + selectedActivity.images!.length) % selectedActivity.images!.length
      )
    }
  }

  const handleActivityCardClick = (activity: Activity) => {
    setSelectedActivity(activity)
    setCurrentImageIndex(0)
    setIsVideoPlaying(false)
    const url = new URL(window.location.href)
    url.searchParams.set("activityId", activity.id.toString())
    window.history.pushState({}, "", url.toString())
  }

  const handleCloseDialog = () => {
    setSelectedActivity(null)
    const url = new URL(window.location.href)
    url.searchParams.delete("activityId")
    window.history.pushState({}, "", url.toString())
  }

  const handleShare = async () => {
    if (!selectedActivity) return

    const url = window.location.href
    const shareData = {
      title: selectedActivity.title,
      text: selectedActivity.description || "اكتشف هذا النشاط من الرابطة الولائية",
      url: url
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.error("Error sharing:", err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        toast({
          title: "تم النسخ",
          description: "تم نسخ رابط النشاط بنجاح",
        })
      } catch (err) {
        console.error("Failed to copy:", err)
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming": return { label: "قادم", cls: "bg-primary text-primary-foreground" }
      case "completed": return { label: "مكتمل", cls: "bg-secondary text-secondary-foreground" }
      case "cancelled": return { label: "ملغى", cls: "bg-destructive text-destructive-foreground" }
      default: return { label: status, cls: "bg-muted text-muted-foreground" }
    }
  }

  // حالة التحميل
  if (isLoading || !mounted) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">الأنشطة والفعاليات</h1>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground text-lg">جاري تحميل الأنشطة...</p>
        </div>
      </div>
    )
  }

  // حالة الخطأ
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-lg text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 animate-fade-in">
            الأنشطة والفعاليات
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            اكتشف مجموعة رائعة من الأنشطة والتجارب التي تنظّمها الرابطة الولائية
          </p>
          <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
        </div>

        {/* إحصاءات سريعة */}
        <div className="flex justify-center gap-4 flex-wrap mb-10">
          <Badge variant="secondary" className="text-sm px-4 py-2">
            {activities.filter((a) => a.status === "upcoming").length} نشاط قادم
          </Badge>
          <Badge variant="outline" className="text-sm px-4 py-2">
            {activities.filter((a) => a.status === "completed").length} نشاط مكتمل
          </Badge>
          <Badge variant="default" className="text-sm px-4 py-2">
            {activities.length} نشاط إجمالاً
          </Badge>
        </div>

        {/* بحث وفلترة */}
        <div className="max-w-4xl mx-auto mb-10">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="ابحث في الأنشطة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 text-right"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              {filterCategories.map((cat) => (
                <Button
                  key={cat.value}
                  variant={selectedFilter === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter(cat.value)}
                  className="rounded-full !cursor-pointer"
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* شبكة البطاقات */}
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {selectedFilter === "all" ? "جميع الأنشطة" : filterCategories.find(c => c.value === selectedFilter)?.label}
            </h2>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              عرض {currentActivities.length} من {filteredActivities.length}
            </Badge>
          </div>

          {currentActivities.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">لا توجد أنشطة</h3>
              <p className="text-muted-foreground">
                {activities.length === 0
                  ? "لم يتم إضافة أي أنشطة حتى الآن"
                  : "لا توجد نتائج تطابق بحثك، جرّب مصطلح آخر"}
              </p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6">
              {currentActivities.map((activity, index) => {
                const statusBadge = getStatusBadge(activity.status)
                const imageUrl = activity.images && activity.images[0]
                  ? activity.images[0]
                  : "/placeholder.svg"

                const heights = ['h-64', 'h-80', 'h-96', 'h-72', 'h-60', 'h-88']
                const randomHeight = heights[index % heights.length]

                return (
                  <div key={activity.id} className="break-inside-avoid mb-6">
                    <Card
                      className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl group animate-fade-in rounded-2xl !pb-0 border-0"
                      style={{ animationDelay: `${(index % CARDS_PER_LOAD) * 0.05}s` }}
                      onClick={() => handleActivityCardClick(activity)}
                    >
                      {/* صورة البطاقة */}
                      <div className={`relative ${randomHeight} w-full overflow-hidden`}>
                        <img
                          src={imageUrl}
                          alt={activity.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading={index < CARDS_PER_LOAD ? "eager" : "lazy"}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* شارة الحالة */}
                        <Badge className={`absolute top-3 right-3 text-xs px-2 py-1 ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </Badge>

                        {/* أيقونات وسائط */}
                        {(activity.images && activity.images.length > 1 || activity.videos && activity.videos.length > 0) && (
                          <div className="absolute top-3 left-3 flex gap-1">
                            {activity.images && activity.images.length > 1 && (
                              <div className="bg-black/50 backdrop-blur-sm rounded-full p-1.5">
                                <Camera className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {activity.videos && activity.videos.length > 0 && (
                              <div className="bg-black/50 backdrop-blur-sm rounded-full p-1.5">
                                <Video className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* زر "اكتشف" عند التمرير */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button size="sm" className="text-sm !cursor-pointer animate-bounce-gentle">
                            عرض التفاصيل
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )
              })}
            </div>
          )}

          {/* تحميل المزيد */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-12">
              {isLoadingMore ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <span className="text-muted-foreground">جاري تحميل المزيد...</span>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <div className="animate-pulse flex gap-1 justify-center">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  <p className="mt-2 text-sm">مرر لأسفل لرؤية المزيد</p>
                </div>
              )}
            </div>
          )}

          {/* نهاية القائمة */}
          {!hasMore && filteredActivities.length > CARDS_PER_LOAD && (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">تم عرض جميع الأنشطة</h3>
                <p className="text-muted-foreground text-sm">
                  استكشفت جميع الـ {filteredActivities.length} نشاط المتاح
                </p>
              </div>
            </div>
          )}
        </div>
      </div >

      {/* Activity Detail Modal */}
      < Dialog open={!!selectedActivity
      } onOpenChange={handleCloseDialog} >
        <DialogContent className="w-[98vw] sm:max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] xl:max-w-[1200px] max-h-[98vh] overflow-y-auto overflow-x-hidden px-2 sm:px-6">
          {selectedActivity && (
            <>
              <DialogHeader className="px-1 sm:px-0 flex flex-row items-start justify-between gap-4 w-full pr-8">
                <DialogTitle className="text-xl xs:text-2xl sm:text-3xl font-bold text-right break-words flex-1 leading-tight">
                  {selectedActivity.title}
                </DialogTitle>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={handleShare}
                  title="مشاركة النشاط"
                >
                  <Share className="w-4 h-4" />
                </Button>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 px-1 sm:px-0 mt-4">
                {/* معرض الصور */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden shadow-lg">
                    <img
                      src={
                        selectedActivity.images && selectedActivity.images[currentImageIndex]
                          ? selectedActivity.images[currentImageIndex]
                          : "/placeholder.svg"
                      }
                      alt={selectedActivity.title}
                      className="w-full h-full object-cover transition-transform duration-500"
                    />

                    {selectedActivity.images && selectedActivity.images.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute left-1 sm:left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 p-1 sm:p-2 min-w-0"
                          onClick={prevImage}
                        >
                          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 p-1 sm:p-2 min-w-0"
                          onClick={nextImage}
                        >
                          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>

                        <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2 flex gap-0.5 sm:gap-1">
                          {selectedActivity.images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${index === currentImageIndex ? "bg-white" : "bg-white/50"
                                }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* فيديو */}
                  {selectedActivity.videos && selectedActivity.videos.length > 0 && (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black/10">
                      {!isVideoPlaying ? (
                        <div
                          className="w-full h-full flex items-center justify-center cursor-pointer bg-gradient-to-br from-primary/20 to-secondary/20"
                          onClick={() => setIsVideoPlaying(true)}
                        >
                          <div className="bg-primary text-primary-foreground rounded-full p-4 animate-pulse-glow">
                            <Play className="w-8 h-8" />
                          </div>
                        </div>
                      ) : (
                        <video
                          src={selectedActivity.videos[0]}
                          controls
                          autoPlay
                          className="w-full h-full object-cover"
                          onEnded={() => setIsVideoPlaying(false)}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* تفاصيل النشاط */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base min-w-0">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                      <span className="truncate">{selectedActivity.date}</span>
                    </div>
                    {selectedActivity.duration && (
                      <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base min-w-0">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-secondary flex-shrink-0" />
                        <span className="truncate">{selectedActivity.duration}</span>
                      </div>
                    )}
                    {selectedActivity.location && (
                      <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base min-w-0">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-accent flex-shrink-0" />
                        <span className="truncate">{selectedActivity.location}</span>
                      </div>
                    )}
                    {selectedActivity.participants > 0 && (
                      <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base min-w-0">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-chart-3 flex-shrink-0" />
                        <span className="truncate">{selectedActivity.participants} مشارك</span>
                      </div>
                    )}
                  </div>

                  {selectedActivity.description && (
                    <div>
                      <h4 className="font-semibold text-lg text-foreground mb-2">وصف النشاط</h4>
                      <p className="text-muted-foreground leading-relaxed text-sm sm:text-base break-words">
                        {selectedActivity.description}
                      </p>
                    </div>
                  )}

                  {selectedActivity.achievements && selectedActivity.achievements.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-lg text-foreground mb-2">الإنجازات المحققة</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedActivity.achievements.map((achievement, index) => (
                          <div key={index} className="flex items-start gap-2 min-w-0">
                            <Award className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-muted-foreground break-words">{achievement}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedActivity.highlights && selectedActivity.highlights.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-lg text-foreground mb-2">أبرز اللحظات</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedActivity.highlights.map((highlight, index) => (
                          <Badge key={index} variant="outline" className="text-xs px-2 py-1">
                            <Star className="w-3 h-3 ml-1 flex-shrink-0" />
                            {highlight}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedActivity.activityTemplate && selectedActivity.activityTemplate !== "announcement" && (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium w-fit ${selectedActivity.activityTemplate === "announcement_reg"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : selectedActivity.activityTemplate === "announcement_reg_participants"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-orange-50 text-orange-700 border border-orange-200"
                      }`}>
                      <Users className="w-4 h-4" />
                      {selectedActivity.activityTemplate === "announcement_reg" && "التسجيل متاح للجمعيات"}
                      {selectedActivity.activityTemplate === "announcement_reg_participants" && "التسجيل + إضافة مشاركين"}
                      {selectedActivity.activityTemplate === "special" && "نشاط خاص — تسجيل بفئات"}
                    </div>
                  )}

                  {selectedActivity.activityTemplate === "special" && selectedActivity.categories && selectedActivity.categories.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-base text-foreground mb-2">الفئات المتاحة</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedActivity.categories.map((cat, idx) => (
                          <span key={idx} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* زر التسجيل */}
                  {(selectedActivity.activityTemplate === "announcement_reg" ||
                    selectedActivity.activityTemplate === "announcement_reg_participants" ||
                    selectedActivity.activityTemplate === "special") && (
                      <div className="pt-3 border-t">
                        {!isLoggedIn ? (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center text-sm text-amber-700">
                            يجب تسجيل الدخول كجمعية للتسجيل في هذا النشاط
                          </div>
                        ) : registeredActivityIds.has(selectedActivity.id) ? (
                          <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm font-medium">تم تسجيل جمعيتك — بانتظار المراجعة</span>
                          </div>
                        ) : (
                          <Button
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => {
                              // ── Status Guard ──────────────────────────────────
                              // Only associations with 'approved' status may register.
                              if (session && session.status !== "approved") {
                                const messages: Record<string, string> = {
                                  pending: "لا يمكنك التسجيل في الأنشطة. طلب انضمام جمعيتك لا يزال قيد المراجعة من قِبل الإدارة.",
                                  rejected: "لا يمكنك التسجيل في الأنشطة. طلب جمعيتك تم رفضه من قِبل الإدارة.",
                                  suspended: "لا يمكنك التسجيل في الأنشطة. حساب جمعيتك موقوف حالياً.",
                                }
                                toast({
                                  title: "التسجيل غير متاح",
                                  description: messages[session.status] ?? "حساب جمعيتك غير مؤهل للتسجيل في الأنشطة.",
                                  variant: "destructive",
                                })
                                return
                              }
                              // ─────────────────────────────────────────────────
                              setRegisteringActivity(selectedActivity)
                              if (session) {
                                setRegFormData({ assocName: session.associationName, email: session.email, phone: "" })
                              } else {
                                setRegFormData({ assocName: "", email: "", phone: "" })
                              }
                              setParticipantsList([])
                              setCurrentParticipant({ name: "", birthdate: "", category: "" })
                              setRegSuccess(false)
                              setShowRegisterDialog(true)
                            }}
                          >
                            <Building2 className="w-4 h-4 ml-2" />
                            تسجيل جمعيتك في النشاط
                          </Button>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog >

      {/* نافذة التسجيل */}
      < Dialog
        open={showRegisterDialog}
        onOpenChange={(open) => {
          if (!open) setShowRegisterDialog(false)
        }}
      >
        <DialogContent className="max-w-lg w-[95vw] p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-600" />
              تسجيل الجمعية في النشاط
            </DialogTitle>
            <DialogDescription>
              تسجيل جمعيتك في نشاط: {registeringActivity?.title}
            </DialogDescription>
          </DialogHeader>
          {regSuccess ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">تم إرسال طلب التسجيل!</h3>
              <p className="text-sm text-muted-foreground">سيتم مراجعة طلبكم والرد عليه في أقرب وقت.</p>
              <Button className="mt-4" onClick={() => setShowRegisterDialog(false)}>إغلاق</Button>
            </div>
          ) : (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-amber-800 text-sm">
                سيتم إرسال طلب التسجيل باسم جمعيتكم المعتمدة: <strong className="font-bold">{regFormData.assocName}</strong>
              </div>

              {registeringActivity &&
                (registeringActivity.activityTemplate === "announcement_reg_participants" ||
                  registeringActivity.activityTemplate === "special") && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-amber-600" />
                      قائمة المشاركين
                    </h4>
                    {participantsList.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {participantsList.map((p) => (
                          <div key={p.id} className="flex items-center justify-between bg-muted p-2 rounded-lg text-sm">
                            <div className="flex gap-3">
                              <span className="font-medium">{p.name}</span>
                              <span className="text-muted-foreground">تاريخ الميلاد: {p.birthdate}</span>
                              {p.category && (
                                <span className="text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full text-xs">
                                  {p.category}
                                </span>
                              )}
                            </div>
                            <button
                              className="text-destructive hover:opacity-70"
                              onClick={() =>
                                setParticipantsList(participantsList.filter((item) => item.id !== p.id))
                              }
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-card border rounded-lg p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">الاسم</Label>
                          <input
                            className="w-full border rounded-md px-2 py-1.5 text-sm"
                            placeholder="الاسم الكامل"
                            value={currentParticipant.name}
                            onChange={(e) =>
                              setCurrentParticipant({ ...currentParticipant, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">تاريخ الميلاد</Label>
                          <input
                            className="w-full border rounded-md px-2 py-1.5 text-sm"
                            type="date"
                            value={currentParticipant.birthdate}
                            onChange={(e) =>
                              setCurrentParticipant({ ...currentParticipant, birthdate: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      {registeringActivity.activityTemplate === "special" &&
                        registeringActivity.categories &&
                        registeringActivity.categories.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-xs">الفئة</Label>
                            <select
                              className="w-full border rounded-md px-2 py-1.5 text-sm bg-background"
                              value={currentParticipant.category}
                              onChange={(e) =>
                                setCurrentParticipant({ ...currentParticipant, category: e.target.value })
                              }
                            >
                              <option value="">اختر الفئة...</option>
                              {registeringActivity.categories.map((cat, i) => (
                                <option key={i} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          if (currentParticipant.name && currentParticipant.birthdate) {
                            if (registeringActivity.participants && participantsList.length >= registeringActivity.participants) {
                              toast({
                                title: "الحد الأقصى",
                                description: `لقد وصلت للحد الأقصى المسموح به للمشاركين (${registeringActivity.participants})`,
                                variant: "destructive",
                              })
                              return
                            }
                            if (
                              registeringActivity.activityTemplate === "special" &&
                              !currentParticipant.category
                            ) {
                              toast({
                                title: "خطأ",
                                description: "يرجى اختيار فئة المشارك",
                                variant: "destructive",
                              })
                              return
                            }
                            setParticipantsList([
                              ...participantsList,
                              { ...currentParticipant, id: Date.now().toString() },
                            ])
                            setCurrentParticipant({ name: "", birthdate: "", category: "" })
                          } else {
                            toast({
                              title: "معلومات ناقصة",
                              description: "يرجى إدخال الاسم وتاريخ الميلاد",
                              variant: "destructive",
                            })
                          }
                        }}
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        إضافة مشارك للقائمة
                      </Button>
                    </div>
                  </div>
                )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowRegisterDialog(false)}>
                  إلغاء
                </Button>
                <Button
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!session?.associationId) {
                      toast({ title: "خطأ", description: "جلسة المستخدم مفقودة", variant: "destructive" })
                      return
                    }
                    if (registeringActivity) {
                      if (
                        (registeringActivity.activityTemplate === "announcement_reg_participants" ||
                          registeringActivity.activityTemplate === "special") &&
                        participantsList.length === 0
                      ) {
                        toast({
                          title: "لا يوجد مشاركين",
                          description: "يرجى إضافة مشارك واحد على الأقل",
                          variant: "destructive",
                        })
                        return
                      }

                      setIsSubmitting(true)
                      try {
                        await registerWithParticipants(
                          {
                            activity_id: registeringActivity.id.toString(),
                            participants: participantsList.length > 0 ? participantsList : undefined
                          },
                          session.associationId
                        )
                        setRegisteredActivityIds((prev) => new Set([...prev, registeringActivity.id]))
                        setRegSuccess(true)
                      } catch (err: any) {
                        toast({
                          title: "خطأ في التسجيل",
                          description: err.message || "حدث خطأ غير متوقع",
                          variant: "destructive",
                        })
                      } finally {
                        setIsSubmitting(false)
                      }
                    }
                  }}
                >
                  {isSubmitting ? "جاري الإرسال..." : "إرسال طلب التسجيل"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog >
    </div >
  )
}