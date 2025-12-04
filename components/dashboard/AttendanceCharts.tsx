"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Pie, PieChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTheme } from "next-themes";

const subjectData = [
    { subject: 'Data Structures', attendanceRate: 92 },
    { subject: 'Algorithms', attendanceRate: 85 },
    { subject: 'Databases', attendanceRate: 95 },
    { subject: 'OS', attendanceRate: 88 },
    { subject: 'Networks', attendanceRate: 90 },
    { subject: 'Computation', attendanceRate: 81 },
];

const AttendanceCharts = () => {
  const { theme } = useTheme();

  // NOTE: Hardcoded colors are used here as a workaround.
  // The 'recharts' library has issues resolving CSS variables (`hsl(var(--...))`)
  // in its 'fill' properties at runtime, often defaulting to black.
  // By providing the direct oklch values, we ensure the correct colors are displayed.
  const lightColors = {
    primary: 'oklch(0.541 0.281 293.009)',
    destructive: 'oklch(0.577 0.245 27.325)',
    muted: 'oklch(0.967 0.001 286.375)',
    mutedForeground: 'oklch(0.552 0.016 285.938)',
  };

  const darkColors = {
    primary: 'oklch(0.606 0.25 292.717)',
    destructive: 'oklch(0.704 0.191 22.216)',
    muted: 'oklch(0.274 0.006 286.033)',
    mutedForeground: 'oklch(0.705 0.015 286.067)',
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  const dailyData = [
      { name: "Present", value: 450, fill: colors.primary },
      { name: "Absent", value: 35, fill: colors.destructive },
      { name: "Excused", value: 15, fill: colors.muted },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Daily Attendance Snapshot</CardTitle>
          <CardDescription>Today's attendance breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={dailyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  value,
                  index
                }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = 25 + innerRadius + (outerRadius - innerRadius);
                  const x = cx + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
                  const y = cy + radius * Math.sin(-(midAngle ?? 0) * RADIAN);

                  return (
                    <text
                      x={x}
                      y={y}
                      fill={colors.mutedForeground}
                      textAnchor={x > cx ? "start" : "end"}
                      dominantBaseline="central"
                      className="text-xs"
                    >
                      {dailyData[index].name} ({value})
                    </text>
                  );
                }}/>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Attendance by Subject</CardTitle>
          <CardDescription>Overall attendance rate by subject</CardDescription>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" stroke={colors.mutedForeground} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.mutedForeground} tickLine={false} axisLine={false} unit="%" />
                <Tooltip cursor={{ fill: colors.muted }} />
                <Bar dataKey="attendanceRate" fill={colors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceCharts;
