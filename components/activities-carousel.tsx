"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Calendar, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Activity } from "../app/api/type"

interface Props {
    /** Pre-fetched activities from the server (RSC). No loading state needed on first render. */
    initialActivities?: Activity[]
}

export function ActivitiesCarousel({ initialActivities = [] }: Props) {
    const router = useRouter()
    const [activities] = useState<Activity[]>(() => 
        initialActivities.map(a => ({
            ...a,
            images: typeof a.images === 'string' ? (a.images ? [a.images] : []) : (Array.isArray(a.images) ? a.images : [])
        }))
    )
    const [isMounted, setIsMounted] = useState(false)

    // Embla setup with right-to-left support (if the rest of the site is RTL, we should match it)
    // For Arabic, RTL direction is natural. If it feels backwards, we can remove `direction: "rtl"`.
    // Embla setup with right-to-left support
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: "start",
        containScroll: "trimSnaps",
        dragFree: true,
        direction: "rtl", // Assume Arabic site is RTL
        duration: 45 // Very smooth and elegant slower scroll (default is 25)
    })

    const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
    const [nextBtnDisabled, setNextBtnDisabled] = useState(true)

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev()
    }, [emblaApi])

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext()
    }, [emblaApi])

    const onSelect = useCallback((emblaApi: any) => {
        setPrevBtnDisabled(!emblaApi.canScrollPrev())
        setNextBtnDisabled(!emblaApi.canScrollNext())
    }, [])

    useEffect(() => {
        if (!emblaApi) return
        onSelect(emblaApi)
        emblaApi.on("reInit", onSelect).on("select", onSelect)
    }, [emblaApi, onSelect])

    // Mount animation control
    useEffect(() => {
        setIsMounted(true)
    }, [])

    const navigateToActivityPage = (activityId?: number) => {
        if (activityId) {
            router.push(`/activities?activityId=${activityId}`)
        } else {
            router.push('/activities')
        }
    }

    // Dynamic padding calculation to perfectly align the start of the carousel 
    // track with the title text above it.
    const titleContainerRef = React.useRef<HTMLDivElement>(null)
    const [edgePadding, setEdgePadding] = useState(16) // Default 1rem fallback

    useEffect(() => {
        const updatePadding = () => {
            if (titleContainerRef.current) {
                const rect = titleContainerRef.current.getBoundingClientRect()
                // Calculate distance from screen edge to container content
                // In RTL, right edge distance is (windowWidth - rect.right) + padding(16px).
                // In LTR, left edge distance is rect.left + padding(16px).
                // Taking the max ensures it accounts for whichever side is the "start" side safely.
                const edgeDistance = Math.max(rect.left, window.innerWidth - rect.right)
                setEdgePadding(edgeDistance + 16)
            }
        }

        updatePadding()
        const timeoutId = setTimeout(updatePadding, 100) // Ensure layout is settled

        window.addEventListener('resize', updatePadding)
        return () => {
            window.removeEventListener('resize', updatePadding)
            clearTimeout(timeoutId)
        }
    }, [])

    // Fallback if no data
    if (activities.length === 0) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">أنشطتنا المميزة</h2>
                    <div className="w-24 h-1 bg-primary mx-auto mt-6 rounded-full" />
                </div>
                <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">لا توجد أنشطة متاحة حالياً</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`relative w-full py-16 overflow-hidden transition-all duration-1000 ease-out ${isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

            {/* Header Area with Navigation Controls inline */}
            <div
                ref={titleContainerRef}
                className="container mx-auto px-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-6"
            >
                <div className="text-right flex-1">
                    <h2 className="text-4xl md:text-5xl font-bold text-foreground drop-shadow-sm">أنشطتنا المميزة</h2>
                    <p className="text-lg text-muted-foreground mt-4 max-w-2xl">
                        تصفح أحدث الأنشطة والفعاليات واسحب لاستكشاف المزيد
                    </p>
                </div>

                {/* Desktop Navigation Arrows (Apple style floating controls) */}
                <div className="hidden md:flex items-center gap-4 dir-ltr" dir="ltr">
                    {/* Note: In RTL context, Prev is Right arrow, Next is Left arrow */}
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full w-12 h-12 bg-background shadow-md border-border/50 hover:bg-secondary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed !cursor-pointer z-10"
                        onClick={scrollNext} /* Next visually moves left in RTL */
                        disabled={nextBtnDisabled}
                        aria-label="النشاط السابق"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full w-12 h-12 bg-background shadow-md border-border/50 hover:bg-secondary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed !cursor-pointer z-10"
                        onClick={scrollPrev} /* Prev visually moves right in RTL */
                        disabled={prevBtnDisabled}
                        aria-label="النشاط التالي"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                </div>
            </div>

            {/* Embla Carousel Viewport */}
            {/* The viewport container masks the overflow so cards hide gracefully at the screen edges */}
            <div className="overflow-hidden w-full pb-10" ref={emblaRef}>

                {/* The Drag Container */}
                {/* Dynamically padding left and right perfectly aligns the first and last cards with the container bounds */}
                <div
                    className="flex touch-pan-y gap-6 md:gap-8"
                    style={{ paddingLeft: `${edgePadding}px`, paddingRight: `${edgePadding}px` }}
                >
                    {activities.map((activity) => (

                        // The Card Slide
                        // Taller, more elegant portrait proportions
                        <div
                            key={activity.id}
                            className="flex-none w-[85vw] sm:w-[360px] md:w-[420px] lg:w-[460px] cursor-grab active:cursor-grabbing"
                        >
                            {/* Apple-style Interactive Card Container */}
                            <div
                                className="relative group h-[500px] md:h-[600px] w-full rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 ease-out border border-border/40 bg-zinc-100 dark:bg-zinc-900"
                                onClick={() => navigateToActivityPage(activity.id)}
                            >

                                {/* Background Image zooming on hover */}
                                <Image
                                    src={activity.images?.[0] ?? "/placeholder.svg"}
                                    alt={activity.title}
                                    fill
                                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                    sizes="(max-width: 640px) 85vw, (max-width: 1024px) 350px, 400px"
                                    // Draggable false prevents normal browser image drag interfering with Embla drag
                                    draggable={false}
                                />

                                {/* Constant Dark Gradient for Bottom Text Clarity */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                                {/* Slight hover overlay to dim the image making the button pop */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500 pointer-events-none" />

                                {/* Content Container locked to the bottom */}
                                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 flex flex-col justify-end text-white text-right h-full pointer-events-none">

                                    {/* Category/Date Meta Tag */}
                                    <div className="flex flex-wrap items-center justify-end gap-3 mb-3 text-secondary/90 font-medium text-sm">
                                        {activity.categories && activity.categories.length > 0 && (
                                            <span className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full">
                                                {activity.categories[0]}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            <span dir="ltr">{activity.date}</span>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-2xl md:text-3xl font-bold leading-tight drop-shadow-md mb-2 transition-transform duration-500 group-hover:-translate-y-2">
                                        {activity.title}
                                    </h3>

                                    {/* Description (Line clamped) */}
                                    <p className="text-white/80 line-clamp-2 text-sm md:text-base mt-2 transition-transform duration-500 group-hover:-translate-y-2">
                                        {activity.description || "استكشف تفاصيل هذا النشاط المميز والمشاركة فيه."}
                                    </p>

                                    {/* View Details Ghost Button - Fades in and slides up on hover */}
                                    <div className="mt-4 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out">
                                        <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm md:text-base bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20">
                                            التفاصيل والتسجيل
                                            <ArrowUpRight className="w-4 h-4" />
                                        </span>
                                    </div>

                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile-only Navigation Hints */}
            <div className="flex md:hidden justify-center items-center gap-2 mt-4">
                <div className="flex gap-1">
                    {Array.from({ length: Math.min(activities.length, 7) }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-primary/20" />
                    ))}
                </div>
                <span className="text-xs text-muted-foreground ml-2">اسحب للمزيد</span>
            </div>

        </div>
    )
}
