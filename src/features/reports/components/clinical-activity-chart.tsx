"use client";

import * as React from "react";
import { DailyActivityTrend } from "@/types/reports";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

export interface ClinicalActivityChartProps {
  trends: DailyActivityTrend[];
  title?: string;
}

export function ClinicalActivityChart({
  trends,
  title = "Daily Clinical Activity Trend",
}: ClinicalActivityChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  if (!trends || trends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-xs text-[#7A746F]">
          No activity records in selected date range.
        </CardContent>
      </Card>
    );
  }

  // Calculate chart boundaries
  const maxVal = Math.max(
    ...trends.map((t) => Math.max(t.consultations, t.prescriptions, t.newPatients ?? t.patients ?? 0)),
    5
  );

  const chartWidth = 800;
  const chartHeight = 200;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const pointsCount = trends.length;
  const stepX = pointsCount > 1 ? innerWidth / (pointsCount - 1) : innerWidth;

  const getX = (idx: number) => paddingLeft + idx * stepX;
  const getY = (val: number) => paddingTop + innerHeight - (val / maxVal) * innerHeight;

  // Build SVG Path strings
  const consultationsPoints = trends.map((t, idx) => `${getX(idx)},${getY(t.consultations)}`).join(" ");
  const prescriptionsPoints = trends.map((t, idx) => `${getX(idx)},${getY(t.prescriptions)}`).join(" ");

  const consultationsArea =
    trends.length > 0
      ? `M ${getX(0)},${getY(trends[0].consultations)} ` +
        trends.slice(1).map((t, idx) => `L ${getX(idx + 1)},${getY(t.consultations)}`).join(" ") +
        ` L ${getX(trends.length - 1)},${paddingTop + innerHeight} L ${getX(0)},${paddingTop + innerHeight} Z`
      : "";

  // Sample labels for X axis (max 7-8 date labels)
  const labelInterval = Math.max(1, Math.floor(pointsCount / 6));

  const hoveredItem = hoveredIndex !== null && trends[hoveredIndex] ? trends[hoveredIndex] : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-bold text-[#201C1A]">
            {title}
          </CardTitle>
          <p className="text-xs text-[#7A746F]">
            Timeline of patient visits and prescriptions issued
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#DE4F3C]" />
            <span className="font-medium text-[#201C1A]">Consultations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#201C1A]" />
            <span className="font-medium text-[#7A746F]">Prescriptions</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto max-h-56 select-none"
          >
            <defs>
              <linearGradient id="crimsonGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DE4F3C" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#DE4F3C" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.5, 1].map((ratio) => {
              const y = paddingTop + innerHeight * (1 - ratio);
              const label = Math.round(maxVal * ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#EAE3D9"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#7A746F"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Area Fill for Consultations */}
            {consultationsArea && (
              <path d={consultationsArea} fill="url(#crimsonGradient)" />
            )}

            {/* Prescriptions Polyline */}
            <polyline
              fill="none"
              stroke="#201C1A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 2"
              points={prescriptionsPoints}
            />

            {/* Consultations Polyline */}
            <polyline
              fill="none"
              stroke="#DE4F3C"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={consultationsPoints}
            />

            {/* Interactive Points and Touch Area */}
            {trends.map((t, idx) => {
              const cx = getX(idx);
              const cyCons = getY(t.consultations);
              const cyPres = getY(t.prescriptions);
              const isHovered = hoveredIndex === idx;

              return (
                <g
                  key={t.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Invisible wide column for easy hover */}
                  <rect
                    x={cx - stepX / 2}
                    y={paddingTop}
                    width={stepX}
                    height={innerHeight}
                    fill="transparent"
                  />

                  {/* Vertical guide on hover */}
                  {isHovered && (
                    <line
                      x1={cx}
                      y1={paddingTop}
                      x2={cx}
                      y2={paddingTop + innerHeight}
                      stroke="#DE4F3C"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Circle nodes */}
                  {(isHovered || pointsCount <= 14) && (
                    <>
                      <circle
                        cx={cx}
                        cy={cyPres}
                        r={isHovered ? 4.5 : 2.5}
                        fill="#201C1A"
                      />
                      <circle
                        cx={cx}
                        cy={cyCons}
                        r={isHovered ? 5.5 : 3.5}
                        fill="#DE4F3C"
                        stroke="#FFF"
                        strokeWidth="1.5"
                      />
                    </>
                  )}

                  {/* X Axis Date labels */}
                  {(idx % labelInterval === 0 || idx === pointsCount - 1) && (
                    <text
                      x={cx}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      fill="#7A746F"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {t.date.slice(5)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating Hover Card */}
          {hoveredItem && (
            <div className="mt-2 p-2.5 rounded-lg border border-[#EAE3D9] bg-[#FAF5EE] flex flex-wrap items-center justify-between text-xs gap-3">
              <span className="font-mono font-semibold text-[#201C1A]">
                Date: {hoveredItem.date}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-[#DE4F3C] font-semibold">
                  Consultations: {hoveredItem.consultations}
                </span>
                <span className="text-[#201C1A] font-semibold">
                  Prescriptions: {hoveredItem.prescriptions}
                </span>
                <span className="text-[#7A746F]">
                  New Patients: {hoveredItem.newPatients}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
