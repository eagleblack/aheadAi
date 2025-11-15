import React, { useEffect, useRef } from "react";
import { Dimensions, Animated, Easing } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useJobTheme } from "../context/JobThemeContext";

const { width, height } = Dimensions.get("window");

const palettes = {
  theme1: ["#FF6FD8", "#3813C2", "#FF9A8B", "#FFCC00", "#00C9FF", "#FF3CAC", "#784BA0"],
  theme2: ["#00C9FF", "#92FE9D", "#70E1F5", "#FF6FD8", "#FF9A8B", "#FFD200", "#F7971E"],
};

// Predefined blob shapes (SVG paths)
const blobShapes = [
  "M60,0 C90,10 110,40 100,70 C90,100 50,110 20,90 C-10,70 -10,20 20,5 C35,-5 50,-5 60,0 Z",
  "M80,10 C110,20 130,60 120,90 C110,120 70,130 40,110 C10,90 0,40 30,20 C45,5 65,5 80,10 Z",
  "M50,0 C80,20 100,50 90,80 C80,110 40,120 10,100 C-20,80 -20,30 10,10 C25,-5 40,-5 50,0 Z",
];

// Spiral generator
const generateSpiral = (cx, cy, turns = 4, spacing = 6) => {
  let d = `M ${cx},${cy}`;
  let angle = 0;
  let radius = 2;
  for (let i = 0; i < turns * 40; i++) {
    angle += 0.25;
    radius += spacing / (2 * Math.PI * turns);
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    d += ` L ${x},${y}`;
  }
  return d;
};

const BlobBackground = () => {
  const { currentTheme } = useJobTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [currentTheme]);

  const colors = palettes[currentTheme] || palettes.theme1;
  const shapes = [];

  // Place blobs at corners
  blobShapes.forEach((d, i) => {
    const x = i === 0 ? 20 : i === 1 ? width - 120 : width / 2 - 60;
    const y = i === 2 ? height - 150 : 40;
    const color = colors[i % colors.length];
    shapes.push(
      <Path
        key={`blob-${i}`}
        d={d}
        fill={color}
        opacity={1}
        transform={`translate(${x},${y}) scale(2)`}
      />
    );
  });

  // Spirals
  for (let i = 0; i < 2; i++) {
    const x = width * (0.2 + 0.6 * Math.random());
    const y = height * (0.2 + 0.6 * Math.random());
    const color = colors[Math.floor(Math.random() * colors.length)];
    shapes.push(
      <Path
        key={`spiral-${i}`}
        d={generateSpiral(x, y, 3 + Math.random() * 3, 8)}
        stroke={color}
        strokeWidth={5}
        fill="none"
      />
    );
  }

  // Dots
  for (let i = 0; i < 12; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = 4 + Math.random() * 6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    shapes.push(<Circle key={`dot-${i}`} cx={cx} cy={cy} r={r} fill={color} />);
  }

  return (
    <Animated.View style={{ opacity: fadeAnim, position: "absolute" }}>
      <Svg height={height} width={width}>
        {shapes}
      </Svg>
    </Animated.View>
  );
};

export default BlobBackground;
