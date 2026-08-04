"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowRight,
    Bell,
    BookOpen,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Loader2,
    ShieldCheck,
    TrendingUp,
    Users,
    GraduationCap,
    BarChart3,
    Sparkles,
} from "lucide-react";
import Logo from "@/components/logo";
import Image from "next/image";
import { cn } from "@/lib/utils";

type PreviewItem = {
    title: string;
    subtitle: string;
    description: string;
    imagePath: string;
};

const platformHighlights = [
    {
        title: "Role-Based Dashboards",
        description:
            "Dedicated workflows for admins, teachers, students, and parents with focused views for each role.",
        icon: Users,
        tone: "primary" as const,
    },
    {
        title: "Attendance Intelligence",
        description:
            "Track attendance in real time, surface at-risk patterns, and monitor trends by class or department.",
        icon: TrendingUp,
        tone: "warning" as const,
    },
    {
        title: "Academic & Task Management",
        description:
            "Coordinate assignments, class updates, and progress checkpoints from one unified platform.",
        icon: BookOpen,
        tone: "primary" as const,
    },
    {
        title: "Smart Notifications",
        description:
            "Deliver timely reminders and updates so every stakeholder stays informed and aligned.",
        icon: Bell,
        tone: "danger" as const,
    },
    {
        title: "Calendar-Driven Planning",
        description:
            "Visualize key activities, academic events, and deadlines with an integrated calendar experience.",
        icon: CalendarDays,
        tone: "success" as const,
    },
    {
        title: "Secure Platform Access",
        description:
            "Protected sign-in and controlled access paths designed for school-wide usage and trust.",
        icon: ShieldCheck,
        tone: "primary" as const,
    },
];

const toneClasses = {
    primary: "text-primary bg-primary/10",
    warning: "text-amber-500 bg-amber-500/10",
    danger: "text-destructive bg-destructive/10",
    success: "text-emerald-500 bg-emerald-500/10",
};

const previewSections: PreviewItem[] = [
    {
        title: "Admin Overview",
        subtitle: "Control Center",
        description:
            "Monitor attendance health, announcements, and institution-wide metrics from a single command view.",
        imagePath: "/screenshots/admin-overview.jpeg",
    },
    {
        title: "Teacher Workspace",
        subtitle: "Daily Teaching Tools",
        description:
            "Take attendance quickly, manage classes, and stay on top of pending actions for each session.",
        imagePath: "/screenshots/teacher-workspace.jpeg",
    },
    {
        title: "Student Dashboard",
        subtitle: "Personal Progress",
        description:
            "View attendance summaries, marks snapshots, class schedule highlights, and important alerts.",
        imagePath: "/screenshots/student-dashboard.jpeg",
    },
    {
        title: "Parent Insights",
        subtitle: "Transparent Tracking",
        description:
            "Keep guardians connected with attendance updates and student progress in a clear, actionable format.",
        imagePath: "/screenshots/parent-insights.jpeg",
    },
    {
        title: "Assignments & Calendar",
        subtitle: "Execution Layer",
        description:
            "Plan deadlines, manage assignments, and align daily priorities with a streamlined academic timeline.",
        imagePath: "/screenshots/assignments-calendar.jpeg",
    },
    {
        title: "Notifications Hub",
        subtitle: "Communication Feed",
        description:
            "Broadcast the right updates to the right users at the right time without extra coordination overhead.",
        imagePath: "/screenshots/notifications-hub.jpeg",
    },
];

function PreviewCard({ item }: { item: PreviewItem }) {
    const [hasError, setHasError] = useState(false);

    return (
        <article className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40">
            {/* Image area — natural height, full width, fully visible */}
            <div className="relative w-full overflow-hidden border-b border-border bg-muted">
                {/* Subtitle badge */}
                <div className="absolute left-3 top-3 z-10 rounded-md border border-border/50 bg-background/80 px-2.5 py-1 text-xs font-medium tracking-wide text-foreground backdrop-blur-sm">
                    {item.subtitle}
                </div>
                {!hasError ? (
                    <Image
                        src={item.imagePath}
                        alt={`${item.title} preview`}
                        width={1280}
                        height={800}
                        className="w-full h-auto transition duration-500 group-hover:scale-[1.02]"
                        onError={() => setHasError(true)}
                    />
                ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-muted px-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Add screenshot at
                            <span className="ml-1 font-semibold text-foreground">public{item.imagePath}</span>
                        </p>
                    </div>
                )}
            </div>
            <div className="space-y-1.5 p-4">
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
        </article>
    );
}

export default function Home() {
    const { data: session, isPending } = authClient.useSession();
    const router = useRouter();

    useEffect(() => {
        if (session != null && !isPending) {
            router.replace("/dashboard");
        }
    }, [session, isPending, router]);

    if (isPending || session != null) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* ── Hero Section ── */}
            <section className="relative isolate overflow-hidden border-b border-border">
                {/* Campus background image */}
                <Image
                    src="/ucek.jpeg"
                    alt="UCEK Campus"
                    fill
                    priority
                    className="object-cover"
                />
                {/* Dark overlay matching dashboard bg */}
                <div className="absolute inset-0 bg-background/85 dark:bg-background/90" />
                {/* Subtle radial glow using primary color */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.65_0.25_292.717_/_0.15),transparent_55%),radial-gradient(ellipse_at_bottom_left,oklch(0.65_0.25_292.717_/_0.08),transparent_50%)]" />
                {/* Grid pattern overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(to right, currentColor 1px, transparent 1px)`,
                        backgroundSize: "48px 48px",
                    }}
                />

                <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 py-5 sm:px-8 lg:px-12">
                    {/* Navbar */}
                    <header className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <Logo className="h-8 w-8 sm:h-9 sm:w-9" />
                            <div className="hidden sm:flex items-center gap-2 rounded-md bg-card/80 border border-border/60 px-3 py-1.5 backdrop-blur-sm">
                                <Image
                                    src="/logo-ucek.svg"
                                    alt="UCEK Logo"
                                    width={28}
                                    height={28}
                                    className="dark:invert"
                                />
                                <div className="flex flex-col leading-tight">
                                    <span className="text-xs font-semibold text-foreground">University College of Engineering</span>
                                    <span className="text-[10px] text-muted-foreground">Kariavattom</span>
                                </div>
                            </div>
                        </div>
                        <Link href="/signin">
                            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                                Sign In
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </header>

                    {/* Hero Content */}
                    <div className="mt-12 max-w-3xl space-y-5 pb-16 pt-4 sm:mt-20 sm:space-y-6 sm:pb-24 sm:pt-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-primary sm:px-4 sm:text-xs sm:tracking-[0.2em]">
                            <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                            Attendance Management System — UCEK
                        </div>

                        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                            One platform to run{" "}
                            <span className="text-primary">attendance</span>,{" "}
                            academics, and communication at scale.
                        </h1>

                        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base sm:text-lg">
                            AMS brings administrators, teachers, students, and parents into a unified ecosystem with
                            real-time visibility, actionable insights, and reliable workflows for everyday academic operations.
                        </p>

                        <div className="flex flex-col gap-3 pt-1 xs:flex-row sm:flex-row sm:flex-wrap sm:items-center">
                            <Link href="/signin" className="w-full sm:w-auto">
                                <Button size="lg" className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                    Explore the Platform
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                            <a href="#feature-overview" className="w-full sm:w-auto">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full sm:w-auto border-border/60 bg-card/50 text-foreground backdrop-blur-sm hover:bg-card/80"
                                >
                                    View Features
                                </Button>
                            </a>
                        </div>
                    </div>
                </div>
            </section>



            <main className="mx-auto w-full max-w-7xl space-y-12 px-4 py-10 sm:space-y-16 sm:px-8 sm:py-14 lg:px-12 lg:py-20">
                {/* ── Features Section ── */}
                <section id="feature-overview" className="space-y-6 sm:space-y-8">
                    <div className="max-w-2xl space-y-2 sm:space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                            Core Capabilities
                        </p>
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl sm:text-4xl">
                            Built for complete academic operations, not just login.
                        </h2>
                        <p className="text-sm text-muted-foreground sm:text-base">
                            From daily attendance workflows to strategic performance monitoring, AMS helps institutions
                            execute faster with fewer blind spots.
                        </p>
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                        {platformHighlights.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={feature.title}
                                    className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md sm:p-5"
                                >
                                    <div
                                        className={cn(
                                            "mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg sm:mb-4 sm:h-9 sm:w-9",
                                            toneClasses[feature.tone]
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ── Platform Preview Section ── */}
                <section className="space-y-6 sm:space-y-8">
                    <div className="max-w-2xl space-y-2 sm:space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                            Platform Preview
                        </p>
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl sm:text-4xl">
                            See the pages your users interact with every day.
                        </h2>
                        <p className="text-sm text-muted-foreground sm:text-base">
                            Explore role-specific dashboards designed to mirror your institution's operational needs.
                        </p>
                    </div>

                    {/* Single column on mobile, 2 cols on md, 3 cols on xl */}
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {previewSections.map((item) => (
                            <PreviewCard key={item.title} item={item} />
                        ))}
                    </div>
                </section>

                {/* ── CTA Section ── */}
                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="relative p-6 sm:p-8">
                        {/* Decorative glow */}
                        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
                        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />

                        <div className="relative grid gap-6 sm:gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div className="space-y-2 sm:space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                    Ready To Start
                                </p>
                                <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl sm:text-3xl">
                                    Give your institution a smarter operational backbone.
                                </h3>
                                <p className="text-sm text-muted-foreground sm:text-base sm:max-w-2xl">
                                    Centralize attendance workflows, academic updates, and communication loops in one
                                    modern platform experience built for UCEK.
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                <Link href="/signin" className="w-full lg:w-auto">
                                    <Button size="lg" className="w-full lg:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                        Sign In Now
                                        <ClipboardCheck className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-border bg-card">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-8 lg:px-12">
                    {/* Mobile: stacked, centered */}
                    <div className="flex flex-col items-center gap-1 text-center sm:hidden">
                        <span className="text-xs font-medium text-foreground">AMS — UCEK</span>
                        <span className="text-[11px] text-muted-foreground">University College of Engineering, Kariavattom</span>
                        <span className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} UCEK. All rights reserved.</span>
                    </div>
                    {/* Desktop: single row, space-between */}
                    <div className="hidden sm:flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Logo className="h-7 w-7" />
                            <span className="text-xs text-muted-foreground">
                                AMS — University College of Engineering, Kariavattom
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} UCEK. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}