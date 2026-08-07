"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

type GreetingHeaderProps = {
  userName: string;
};

const getGreeting = () => {
  const hour = new Date().getHours() +15;
  
  if (hour >= 5 && hour < 12) {
    return {
      text: "Good Morning",
      gradient: "from-sky-400 via-blue-200 to-orange-100 dark:from-indigo-800 dark:via-purple-700 dark:to-orange-500",
      textColor: "text-slate-800 dark:text-white",
      subTextColor: "text-slate-700 dark:text-orange-100",
      cloudColor: "text-white dark:text-white/30",
      cloudOpacity: 0.9,
      isNight: false,
      celestial: "sun" as const,
      buildingFilter: "brightness(0.95) saturate(1.2) sepia(0.15)",
      buildingFilterDark: "brightness(0.50) saturate(0.8) sepia(0.4) ",
    };
  } else if (hour >= 12 && hour < 16) {
    return {
      text: "Good Afternoon",
      gradient: "from-blue-500 via-sky-400 to-blue-200 dark:from-blue-800 dark:via-sky-700 dark:to-cyan-600",
      textColor: "text-white",
      subTextColor: "text-blue-50 dark:text-sky-100",
      cloudColor: "text-white dark:text-white/30",
      cloudOpacity: 0.8,
      isNight: false,
      celestial: "sun" as const,
      buildingFilter: "brightness(0.85) saturate(1.1) sepia(0.15) hue-rotate(10deg)",
      buildingFilterDark: "brightness(0.60) saturate(0.8) sepia(0.4)",
    };
  } else if (hour >= 16 && hour < 19) {
    return {
      text: "Good Evening",
      gradient: "from-indigo-500 via-purple-500 to-orange-300 dark:from-purple-900 dark:via-pink-800 dark:to-orange-600",
      textColor: "text-white",
      subTextColor: "text-indigo-100 dark:text-pink-100",
      cloudColor: "text-pink-100 dark:text-pink-200/20",
      cloudOpacity: 0.6,
      isNight: false,
      celestial: "sun" as const,
      buildingFilter: "brightness(0.7) saturate(1.4) sepia(0.3) hue-rotate(-10deg)",
      buildingFilterDark: "brightness(0.45) saturate(1.1) sepia(0.5) hue-rotate(280deg)",
    };
  } else if (hour >= 19 && hour < 24) {
    return {
      text: "Good Night",
      gradient: "from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-indigo-900 dark:to-slate-900",
      textColor: "text-indigo-50",
      subTextColor: "text-indigo-200",
      cloudColor: "text-slate-600 dark:text-slate-600",
      cloudOpacity: 0.2,
      isNight: true,
      celestial: "moon" as const,
      buildingFilter: "brightness(0.2) saturate(0.5) sepia(0.3) hue-rotate(200deg)",
      buildingFilterDark: "brightness(0.12) saturate(0.4) sepia(0.3) hue-rotate(210deg)",
    };
  } else {
    return {
      text: "Good Night",
      gradient: "from-black via-slate-900 to-slate-800 dark:from-black dark:via-slate-900 dark:to-slate-800",
      textColor: "text-slate-50",
      subTextColor: "text-slate-400",
      cloudColor: "text-slate-700 dark:text-slate-700",
      cloudOpacity: 0.1,
      isNight: true,
      celestial: "moon" as const,
      buildingFilter: "brightness(0.15) saturate(0.4) sepia(0.2) hue-rotate(200deg)",
      buildingFilterDark: "brightness(0.1) saturate(0.3) sepia(0.2) hue-rotate(210deg)",
    };
  }
};

const CloudSVG = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
     <path d="M16.5 48C16.5 48 16.5 48 16.5 48C10.7 48 6 43.3 6 37.5C6 32.3 9.8 28 14.8 27.2C15.6 19.2 22.3 13 30.5 13C37.8 13 44 17.9 45.8 24.6C46.5 24.5 47.2 24.5 48 24.5C55.2 24.5 61 30.3 61 37.5C61 44.7 55.2 50.5 48 50.5L16.5 50.5L16.5 48Z" />
  </svg>
);

export default function GreetingHeader({ userName }: GreetingHeaderProps) {
  const [greeting, setGreeting] = useState(getGreeting());
  const [mounted, setMounted] = useState(false);
  const [stars, setStars] = useState<
    { width: string; height: string; top: string; left: string; duration: number }[]
  >([]);

  useEffect(() => {
    const timeout = setTimeout(() => setMounted(true), 0);
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!greeting.isNight) {
        setStars([]);
        return;
      }

      setStars(
        Array.from({ length: 15 }, () => ({
          width: `${Math.random() * 2 + 1}px`,
          height: `${Math.random() * 2 + 1}px`,
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          duration: 2 + Math.random() * 3,
        }))
      );
    }, 0);

    return () => clearTimeout(timeout);
  }, [greeting.isNight]);

  if (!mounted) return null;

  return (
    <div className={`relative overflow-hidden -mx-4 -mt-4 md:mx-0 md:mt-0 rounded-b-2xl md:rounded-3xl bg-linear-to-br ${greeting.gradient} p-8 md:p-10 mb-6 shadow-lg transition-colors duration-1000`}>
      
      {/* Celestial Body */}
      <motion.div 
        className="absolute top-8 right-8 md:right-16 z-[1] pointer-events-none"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {greeting.celestial === 'sun' ? (
           <div className="relative">
             <div className="w-16 h-16 md:w-24 md:h-24 bg-yellow-300 rounded-full blur-2xl opacity-60 animate-pulse absolute top-0 left-0" />
             <div className="w-16 h-16 md:w-24 md:h-24 bg-linear-to-br from-yellow-100 to-yellow-400 rounded-full shadow-lg relative" />
           </div>
        ) : (
           <div className="relative">
             <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-full blur-xl opacity-30 absolute top-0 left-0" />
             <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] relative" />
             {/* Craters */}
             <div className="absolute top-3 left-3 w-2 h-2 bg-slate-200 rounded-full opacity-50 z-20" />
             <div className="absolute bottom-4 right-4 w-3 h-3 bg-slate-200 rounded-full opacity-50 z-20" />
           </div>
        )}
      </motion.div>

      {/* Background Cloud (Behind Sun) */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
         <motion.div 
            className={`absolute top-12 right-16 md:right-28 w-40 h-24 ${greeting.cloudColor}`}
            style={{ opacity: greeting.cloudOpacity * 0.4 }}
            animate={{ x: [0, -15, 0, 15, 0] }}
            transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
         >
            <CloudSVG className="w-full h-full" />
         </motion.div>
      </div>

      {/* Stars for night */}
      {greeting.isNight && (
        <div className="absolute inset-0 z-[1] opacity-60 pointer-events-none">
           {stars.map((star, i) => (
             <motion.div
               key={i}
               className="absolute bg-white rounded-full"
               style={{ width: star.width, height: star.height, top: star.top, left: star.left }}
               animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.2, 1] }}
               transition={{ duration: star.duration, repeat: Infinity }}
             />
           ))}
        </div>
      )}

      {/* Foreground Clouds (In front of Sun) */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
         <motion.div 
            className={`absolute top-16 right-28 md:right-40 w-32 h-20 ${greeting.cloudColor}`}
            style={{ opacity: greeting.cloudOpacity }}
            animate={{ x: [0, -20, 0, 20, 0] }}
            transition={{ duration: 45, repeat: Infinity, ease: "easeInOut" }}
         >
            <CloudSVG className="w-full h-full" />
         </motion.div>
         
         <motion.div 
            className={`absolute top-24 right-12 md:right-24 w-48 h-28 ${greeting.cloudColor}`}
            style={{ opacity: greeting.cloudOpacity * 0.8 }}
            animate={{ x: [0, -12, 0, 12, 0] }}
            transition={{ duration: 50, repeat: Infinity, ease: "easeInOut", delay: 2 }}
         >
            <CloudSVG className="w-full h-full" />
         </motion.div>
      </div>

      {/* College Building Illustration */}
       <motion.div
         className="absolute -bottom-6 right-0 z-[5] pointer-events-none select-none"
       >
         <Image
           src="/ucek-illustration.png"
           alt="UCEK College Building"
           width={500}
           height={350}
           className="w-[140px] h-auto sm:w-[180px] md:w-[240px] lg:w-[280px] dark:hidden"
           style={{ filter: greeting.buildingFilter }}
           priority={false}
         />
         <Image
           src="/ucek-illustration.png"
           alt="UCEK College Building"
           width={500}
           height={350}
           className="w-[140px] h-auto sm:w-[180px] md:w-[240px] lg:w-[280px] hidden dark:block"
           style={{ filter: greeting.buildingFilterDark }}
           priority={false}
         />
       </motion.div>

      {/* Content */}
      <div className="relative z-10">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
            <h2 className={`text-xl md:text-4xl font-bold ${greeting.textColor} tracking-tight mb-1 sm:mb-2 drop-shadow-sm`}>
                {greeting.text}, {userName}!
            </h2>

            <p className={`text-xs md:text-base ${greeting.subTextColor} drop-shadow-sm flex gap-1`}>
                <span className="hidden sm:block">
                     {new Date().toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                    }) + " -"}
                </span>
                {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                })}
            </p>
        </motion.div>
      </div>
    </div>
  );
}
