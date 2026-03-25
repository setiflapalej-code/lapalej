"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
import type { Activity } from "../app/api/type"
import { Card } from "@/components/ui/card"

export function PhotoAlbumSection({ activities = [] }: { activities: Activity[] }) {
    const containerRef = useRef<HTMLDivElement>(null)

    // Extract all images from activities
    const extractedImages = activities
        .flatMap((activity) => typeof activity.images === 'string' ? (activity.images ? [activity.images] : []) : (activity.images || []))
        .filter(Boolean)

    // Ensure we have exactly 7 images, falling back to a placeholder
    const allImages = Array.from({ length: 7 }).map((_, i) => extractedImages[i] || "/placeholder.svg")

    // If there are zero extracted images, this will render 7 placeholders, which guarantees the experience.

    // Capture scroll progress exactly over the height of our massive container
    const { scrollYProgress } = useScroll({
        target: containerRef,
        // Start tracking when the top of the container hits the top of the viewport
        // Stop tracking when the bottom of the container hits the bottom of the viewport
        offset: ["start start", "end end"]
    })

    return (
        // The container height determines how long the user has to scroll to see all photos.
        // Length * 100vh makes each photo take exactly one screen height of scrolling.
        <section
            ref={containerRef}
            className="relative w-full"
            style={{ height: `${allImages.length * 100}vh` }}
        >
            <div className="sticky top-0 h-screen w-full flex flex-col items-center overflow-hidden py-12 md:py-16">

                {/* Section Header */}
                <div className="text-center mb-8 md:mb-12 z-50 shrink-0">
                    <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 md:mb-8 drop-shadow-sm">لقطات مضيئة</h2>
                    <div className="w-16 h-1 bg-primary mx-auto rounded-full mb-4 md:mb-8" />
                </div>

                {/* Stacked Photos Container */}
                <div className="relative w-full max-w-4xl flex-1 flex items-center justify-center mt-4 md:mt-8 mb-8 md:mb-12">
                    {allImages.map((src, index) => {
                        // Determine scroll thresholds for this specific photo.
                        // Example for 4 photos:
                        // Photo 0 flies away between 0% and 1/4 of scroll.
                        // Photo 1 flies away between 1/4 and 2/4 of scroll.
                        const start = index / allImages.length;
                        const end = (index + 1) / allImages.length;

                        // 1. Vertical Fly Away: The top card flies up off screen (-150vh) when its threshold is reached.
                        const yOffset = useTransform(scrollYProgress, [start, end], ["0vh", "-150vh"]);

                        // 2. Fly Away Rotation: It spins slightly aggressively as it gets tossed off-screen.
                        // Every photo gets a random resting tilt between -6 and +6 degrees to look messy like real photos.
                        const initialRotation = (index % 2 === 0 ? 1 : -1) * (3 + (index % 3));
                        const rotationY = useTransform(scrollYProgress, [start, end], [initialRotation, initialRotation * 5]);

                        // 3. Scale Shift: Cards buried deep in the stack are slightly smaller. 
                        // When the cards above them fly away, they pop up to scale 1.
                        const distanceToEnd = allImages.length - 1 - index;
                        const startingScale = 1 - (distanceToEnd * 0.04);
                        // This card grows to scale 1 as the card immediately *above* it flies away
                        const growStart = Math.max(0, start - (1 / allImages.length));
                        const scaleOffset = useTransform(scrollYProgress, [growStart, start], [startingScale, 1]);

                        // Prevent the very bottom card from flying away at the end so it stays on screen until you scroll past the section.
                        const isLast = index === allImages.length - 1;
                        const finalY = isLast ? "0vh" : yOffset;
                        const finalRotation = isLast ? initialRotation : rotationY;

                        return (
                            <motion.div
                                key={index}
                                className="absolute origin-bottom"
                                style={{
                                    y: finalY,
                                    rotate: finalRotation,
                                    scale: scaleOffset,
                                    zIndex: allImages.length - index, // Top index is rendered with highest z-index
                                }}
                            >
                                {/* Polaroid Frame Design */}
                                <Card className="p-3 md:p-4 bg-white rounded-md shadow-2xl border border-gray-100 flex flex-col items-center">
                                    <div className="relative w-[280px] h-[320px] md:w-[400px] md:h-[450px] lg:w-[500px] lg:h-[550px] overflow-hidden rounded-sm">
                                        <Image
                                            src={src}
                                            alt={`Activity Highlight ${index + 1}`}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 300px, (max-width: 1024px) 450px, 600px"
                                            priority={index < 2} // Load the top two immediately
                                        />
                                    </div>
                                    {/* The classic polaroid large bottom chin */}
                                    <div className="h-12 md:h-16 w-full bg-white flex items-center justify-center opacity-70">
                                        <span className="font-handwriting text-gray-400 text-sm md:text-base">
                                            {/* Optional nostalgic date/branding stamp */}
                                            منار الشباب {new Date().getFullYear()}
                                        </span>
                                    </div>
                                </Card>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
