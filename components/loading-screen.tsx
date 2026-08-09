"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";

// `hold` is terminal. This screen never takes itself down - whoever mounted it
// decides when it goes, which in practice means React unmounting the Suspense
// fallback the moment the segment resolves. A self-dismiss timer here could only
// ever be wrong in one of two directions: vanish early and uncover a blank page,
// or linger after the page is ready.
type Stage = "circle" | "check" | "text" | "hold";

// Tailwind's `md` breakpoint as a JS-readable signal. This is NOT what positions
// anything - layout stays CSS-driven so it is correct on the very first paint.
// It exists only to drop per-frame work that is invisible on mobile anyway.
const MOBILE_QUERY = "(max-width: 767.98px)";

function subscribeToMobile(onChange: () => void) {
    const mq = window.matchMedia(MOBILE_QUERY);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
}

function useIsMobile() {
    return useSyncExternalStore(
        subscribeToMobile,
        () => window.matchMedia(MOBILE_QUERY).matches,
        // Server + hydration snapshot is the desktop branch, so the SSR markup is
        // the full desktop one and desktop is byte-identical to before. On mobile
        // the extra nodes are already hidden by CSS, so pruning them one render
        // later is invisible.
        () => false
    );
}

// Intro timings, in seconds unless the name says otherwise. This is a loading
// screen, so the whole sequence has to be over well before it starts feeling like
// something you are waiting on rather than something covering a wait.
const RING = 0.36;
const CHECK = 0.15;
const WORDMARK = 0.2;
const WORDMARK_DELAY = 0.04;
// Holds the `text` stage exactly as long as the wordmark needs, so the idle pulse
// picks up the moment the letters land rather than cutting across them.
const TEXT_STAGE_MS = (WORDMARK + WORDMARK_DELAY) * 1000;

// Each clock mark lands as the sweep passes its position, so the delays are
// fractions of RING rather than fixed numbers - retuning the sweep keeps them
// in sync automatically. 12 o'clock is the sweep's origin, so it lands last.
const TICKS = [
    { d: "M635,105 L635,227", at: 1 }, // 12 o'clock
    { d: "M865,457 L987,457", at: 0.25 }, // 3 o'clock
    { d: "M635,687 L635,809", at: 0.5 }, // 6 o'clock
    { d: "M283,457 L405,457", at: 0.75 }, // 9 o'clock
];

// AMS wordmark bounding box measured directly from public/bg_logo.png
// (1216 x 1294): x=[120,1090] y=[898,1210]. Used to clip the mask to just
// the lettering so nothing else from the source artwork (icon, padding)
// bleeds in. The circle+check icon above it is drawn as vector shapes
// instead (see below), not cropped from the PNG.
const TEXT_BOX = { x: 120, y: 898, width: 970, height: 312 };

export default function LoadingScreen() {
    const reduceMotion = useReducedMotion();
    const isMobile = useIsMobile();
    const [stage, setStage] = useState<Stage>("circle");

    useEffect(() => {
        if (reduceMotion) setStage("hold");
    }, [reduceMotion]);

    useEffect(() => {
        if (stage !== "text") return;
        // Mobile doesn't render the wordmark, so the time it would spend sliding in
        // is a frozen frame - which reads as a stall, not as animation.
        const t = setTimeout(() => setStage("hold"), isMobile ? 0 : TEXT_STAGE_MS);
        return () => clearTimeout(t);
    }, [stage, isMobile]);

    const showText = stage === "text" || stage === "hold";
    const showCheck = stage === "check" || stage === "text" || stage === "hold";

    // Parked on one static frame, this reads as a hang rather than as work in
    // progress, so once the intro has landed it breathes until it is unmounted.
    // Opacity only - stays on the compositor, costs nothing on the phone.
    const pulse = !reduceMotion && stage === "hold";

    return (
        <div
            role="status"
            aria-label="Loading AMS"
            // will-change promotes the overlay to its own compositor layer on mobile.
            // The page is being streamed in underneath it, and without promotion every
            // paint down there drags the overlay into the same repaint. Desktop keeps
            // `auto` so its rendering path is untouched.
            className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-50 will-change-[opacity] md:will-change-auto dark:bg-black"
        >
            {/* On mobile the AMS wordmark is dropped and only the icon shows. The
                box is shortened to 1216x914 - the icon spans y=[83,831], so 914
                centers it exactly (914/2 = 457 = the ring's cy) - and the svg keeps
                its full 1216x1294 viewBox with preserveAspectRatio="xMidYMin slice",
                which crops the wordmark region off the bottom at unchanged scale.
                At md+ the box matches the viewBox exactly, so slice is a no-op and
                the desktop rendering is untouched. */}
            <motion.div
                className="relative aspect-1216/914 w-[min(38vw,170px)] md:aspect-1216/1294"
                animate={pulse ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
                transition={
                    pulse
                        ? { duration: 1.4, ease: "easeInOut", repeat: Infinity }
                        : { duration: 0 }
                }
            >
                {/* icon: vector circle + tick marks + checkmark, stays as the final mark */}
                <svg
                    viewBox="0 0 1216 1294"
                    preserveAspectRatio="xMidYMin slice"
                    className="absolute inset-0 h-full w-full text-foreground"
                >
                    <defs>
                        {/* Both masks are desktop-only. Masking is the expensive part of this
                            animation on a phone: the ring's pathLength changes every frame, and
                            a masked element has to be re-rasterised through an offscreen buffer
                            on every one of those frames. Mobile gets the same two visuals by
                            cheaper means - see the painted gap disc and the cropped-away
                            wordmark below. */}
                        {/* carves a circular gap where the checkmark's tail crosses the ring, so
                            the tail reads as passing through rather than merging into it. The
                            cutout starts fully transparent (ring reads as an unbroken sweep
                            while it's still drawing in) and only turns opaque as the checkmark
                            begins.
                            The 4 clock-position marks deliberately get NO gap: they are the
                            same currentColor as the ring and simply overlap it, so they read as
                            part of the circle. Cutting a gap for them left a sliver of
                            background showing on either side (the gaps were 64-70 units wide
                            against a 44-unit mark), which looked like a dark outline around
                            each mark.
                            NOTE: this mask is applied to the ring circle below, which has its
                            own transform="rotate(-90 635 457)" (needed so the draw-in animation
                            starts at 12 o'clock). SVG applies a mask in the masked element's own
                            local coordinate system, i.e. AFTER that rotation - so the gap here
                            is pre-rotated +90 deg around (635,457) to land where it visually
                            looks correct; its un-rotated position would be (892,219). */}
                        {!isMobile && (
                            <mask id="ring-tick-gaps" maskUnits="userSpaceOnUse" x="0" y="0" width="1216" height="1294">
                                <rect x="0" y="0" width="1216" height="1294" fill="white" />
                                {!reduceMotion ? (
                                    <motion.circle cx="873" cy="714" r="48" fill="black" initial={{ opacity: 0 }} animate={{ opacity: showCheck ? 1 : 0 }} transition={{ duration: 0.1 }} />
                                ) : (
                                    <circle cx="873" cy="714" r="48" fill="black" />
                                )}
                            </mask>
                        )}
                        {/* cutout of the AMS wordmark from the real artwork. Uses a pre-baked
                            luminance mask (public/bg_logo-alpha-mask.png: the original's alpha
                            channel painted as white-on-black) rather than masking the original
                            PNG directly by alpha - browser support for SVG mask-type="alpha" on
                            <mask> turned out inconsistent and rendered the letters as a uniform
                            gray instead of a crisp cutout. Standard luminance masking against
                            this derived asset is universally supported and pixel-exact. */}
                        {!isMobile && (
                            <mask id="ams-text-alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="1216" height="1294">
                                <image href="/bg_logo-alpha-mask.png" x="0" y="0" width="1216" height="1294" />
                            </mask>
                        )}
                    </defs>
                    <motion.circle
                        cx={635}
                        cy={457}
                        r={350}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={48}
                        strokeLinecap="round"
                        transform="rotate(-90 635 457)"
                        mask={isMobile ? undefined : "url(#ring-tick-gaps)"}
                        initial={{ pathLength: reduceMotion ? 1 : 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: RING, ease: "easeInOut" }}
                        onAnimationComplete={() =>
                            setStage((s) => (s === "circle" ? "check" : s))
                        }
                    />
                    {/* clock-face marks: drawn in the same currentColor as the ring and simply
                        overlapping it (no mask gap), so they read as part of the circle.
                        Each outer endpoint sits at radius 352, not 374: strokeLinecap="round"
                        adds a semicircular cap of strokeWidth/2 (22) BEYOND the endpoint, so
                        ending at 374 actually pushed the visible edge out to 396 - the marks
                        were poking past the circumference. At 352 the cap's edge lands exactly
                        on the ring's outer edge (374). Inner ends stay at radius 230, extruding
                        well into the dial's open interior. */}
                    {!reduceMotion &&
                        TICKS.map((tick) => (
                            <motion.path
                                key={tick.d}
                                d={tick.d}
                                stroke="currentColor"
                                strokeWidth={44}
                                strokeLinecap="round"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.08, delay: RING * tick.at }}
                            />
                        ))}
                    {reduceMotion &&
                        TICKS.map((tick) => (
                            <path
                                key={tick.d}
                                d={tick.d}
                                stroke="currentColor"
                                strokeWidth={44}
                                strokeLinecap="round"
                            />
                        ))}
                    {/* mobile stand-in for the #ring-tick-gaps mask: the backdrop here is a
                        flat opaque colour, so painting an opaque disc of that same colour
                        over the ring is indistinguishable from carving a hole through it -
                        except it's an ordinary filled shape rather than a mask, so the ring
                        never leaves the fast paint path while its pathLength animates.
                        (892,219) is the mask cutout's un-rotated position, i.e. where the
                        gap actually appears on screen; see the mask's note above. It must
                        paint after the ring and before the checkmark, hence its place here. */}
                    {isMobile && showCheck && (
                        <motion.circle
                            cx={892}
                            cy={219}
                            r={48}
                            className="fill-zinc-50 dark:fill-black"
                            initial={{ opacity: reduceMotion ? 1 : 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.1 }}
                        />
                    )}
                    {showCheck && (
                        <motion.path
                            d="M485,495 L605,585 L945,150"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={46}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: CHECK, ease: "easeOut" }}
                            onAnimationComplete={() =>
                                setStage((s) => (s === "check" ? "text" : s))
                            }
                        />
                    )}

                    {/* AMS wordmark: a tight, pixel-exact crop of just the lettering (no
                        icon/padding bleed) via the alpha mask above, filled with currentColor
                        so it's pixel-identical to the icon in both themes, and slid up as one
                        rigid <g> so the letters translate into place instead of being wiped
                        into view.
                        Belt and braces on mobile: `hidden` keeps it out of frame on the
                        first paint (before the media query is readable in JS), and the
                        isMobile guard then drops it from the DOM entirely, so the phone
                        never decodes the 1216x1294 mask PNG - a main-thread image decode
                        landing mid-animation is exactly the kind of thing that shows up
                        as a dropped frame. */}
                    {!isMobile && (
                        <motion.g
                            className="hidden md:block"
                            initial={{ opacity: 0, y: reduceMotion ? 0 : 150 }}
                            animate={
                                showText ? { opacity: 1, y: 0 } : { opacity: 0, y: 150 }
                            }
                            transition={{ duration: WORDMARK, ease: "easeOut", delay: WORDMARK_DELAY }}
                        >
                            <rect
                                {...TEXT_BOX}
                                fill="currentColor"
                                mask="url(#ams-text-alpha)"
                            />
                        </motion.g>
                    )}
        </svg>
    </motion.div>
        </div>
    );
}
