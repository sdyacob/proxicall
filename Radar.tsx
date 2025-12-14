import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { NearbyContact, Coordinates } from '../types';
import { RADAR_RADIUS_KM } from '../constants';
import { User } from 'lucide-react';

interface RadarProps {
  userLocation: Coordinates | null;
  contacts: NearbyContact[];
  onContactClick: (contact: NearbyContact) => void;
}

const Radar: React.FC<RadarProps> = ({ userLocation, contacts, onContactClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !userLocation) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const center = { x: width / 2, y: height / 2 };
    // Max radius in pixels (keep some padding)
    const maxRadiusPx = Math.min(width, height) / 2 - 20; 

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    // 1. Draw Radar Background
    // Outer Circle (5km)
    svg.append("circle")
      .attr("cx", center.x)
      .attr("cy", center.y)
      .attr("r", maxRadiusPx)
      .attr("fill", "rgba(16, 185, 129, 0.05)")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.5);

    // Mid Circle (2.5km)
    svg.append("circle")
      .attr("cx", center.x)
      .attr("cy", center.y)
      .attr("r", maxRadiusPx / 2)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "4 4")
      .attr("stroke-opacity", 0.3);

    // Crosshairs
    svg.append("line")
      .attr("x1", center.x).attr("y1", center.y - maxRadiusPx)
      .attr("x2", center.x).attr("y2", center.y + maxRadiusPx)
      .attr("stroke", "#10b981").attr("stroke-opacity", 0.2);
    
    svg.append("line")
      .attr("x1", center.x - maxRadiusPx).attr("y1", center.y)
      .attr("x2", center.x + maxRadiusPx).attr("y2", center.y)
      .attr("stroke", "#10b981").attr("stroke-opacity", 0.2);

    // 2. Plot User (Center)
    svg.append("circle")
      .attr("cx", center.x)
      .attr("cy", center.y)
      .attr("r", 6)
      .attr("fill", "#3b82f6") // Blue
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    // 3. Scanner Effect
    const scanGradient = svg.append("defs")
        .append("radialGradient")
        .attr("id", "scan-gradient")
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%");
    
    scanGradient.append("stop").attr("offset", "0%").attr("stop-color", "#10b981").attr("stop-opacity", 0);
    scanGradient.append("stop").attr("offset", "100%").attr("stop-color", "#10b981").attr("stop-opacity", 0.2);

    const scanner = svg.append("g")
      .attr("class", "radar-sweep")
      .style("transform-origin", `${center.x}px ${center.y}px`);
      
    scanner.append("path")
      .attr("d", d3.arc()({
        innerRadius: 0,
        outerRadius: maxRadiusPx,
        startAngle: 0,
        endAngle: Math.PI / 3 // 60 degree slice
      }) || "")
      .attr("fill", "url(#scan-gradient)")
      .attr("transform", `translate(${center.x},${center.y})`);


    // 4. Plot Contacts
    contacts.forEach((contact) => {
        // Calculate relative position based on lat/long difference
        // This is an approximation for visual radar
        const dLat = contact.location.latitude - userLocation.latitude;
        const dLon = contact.location.longitude - userLocation.longitude;
        
        // Scale factor: RADAR_RADIUS_KM maps to maxRadiusPx
        // We need the magnitude of distance to scale correctly
        // We already have distanceKm
        
        if (contact.distanceKm > RADAR_RADIUS_KM) return; // Don't plot outside range

        // Angle calculation
        const angle = Math.atan2(dLon, dLat) - Math.PI / 2; // Basic projection
        const distPx = (contact.distanceKm / RADAR_RADIUS_KM) * maxRadiusPx;

        const x = center.x + Math.cos(angle) * distPx;
        const y = center.y + Math.sin(angle) * distPx;

        const group = svg.append("g")
          .attr("cursor", "pointer")
          .on("click", () => onContactClick(contact));

        // Pulsing effect ring
        group.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 15)
          .attr("fill", "#10b981")
          .attr("opacity", 0.2)
          .append("animate")
          .attr("attributeName", "r")
          .attr("from", "5")
          .attr("to", "20")
          .attr("dur", "1.5s")
          .attr("repeatCount", "indefinite");
        
        group.append("animate")
            .attr("attributeName", "opacity")
            .attr("values", "0.6;0;0.6")
            .attr("dur", "1.5s")
            .attr("repeatCount", "indefinite");

        // Contact Dot
        group.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 5)
          .attr("fill", "#10b981")
          .attr("stroke", "white")
          .attr("stroke-width", 1);
        
        // Label
        group.append("text")
          .attr("x", x)
          .attr("y", y - 10)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .attr("font-size", "10px")
          .text(contact.name.split(' ')[0]);
    });

  }, [userLocation, contacts, onContactClick]);

  if (!userLocation) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-slate-500 bg-slate-800 rounded-full border border-slate-700">
        <span className="animate-pulse">Acquiring GPS Signal...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto">
      <svg 
        ref={svgRef} 
        className="w-full h-full bg-slate-900 rounded-full shadow-[0_0_50px_rgba(16,185,129,0.1)] border border-slate-800"
      />
    </div>
  );
};

export default Radar;
