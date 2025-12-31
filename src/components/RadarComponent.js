import React, { useEffect, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
} from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'

const { width } = Dimensions.get('window')

const SIZE = width * 0.8
const CENTER = SIZE / 2
const RINGS = 5
const DOT_COUNT = 12

export default function RadarScreen() {
  const rotation = useRef(new Animated.Value(0)).current

  // Start rotation
 useEffect(() => {
  Animated.loop(
    Animated.timing(rotation, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: true,
      easing: Animated.Easing, // optional but recommended
    }),
    {
      resetBeforeIteration: true, // 🔥 THIS IS THE KEY
    }
  ).start()
}, [])

  // Convert value → degrees
  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Generate dots once
  const dots = useMemo(() => {
    return Array.from({ length: DOT_COUNT }).map(() => ({
      x: Math.random() * SIZE,
      y: Math.random() * SIZE,
      r: Math.random() * 2 + 2,
    }))
  }, [])

  return (
    <View style={styles.container}>
      <View style={{position:'absolute',top:40}}>
        <Text allowFontScaling={false}  style={{color:'white',fontSize:20,fontWeight:800}}>No Jobs Available</Text>

      </View>

      <View style={styles.radar}>
        {/* Background grid */}
        <Svg width={SIZE} height={SIZE}>
          {/* Rings */}
          {Array.from({ length: RINGS }).map((_, i) => (
            <Circle
              key={i}
              cx={CENTER}
              cy={CENTER}
              r={(SIZE / 2 / RINGS) * (i + 1)}
              stroke="rgba(0,255,170,0.25)"
              strokeWidth={1}
              fill="none"
            />
          ))}

          {/* Cross lines */}
          <Line
            x1={CENTER}
            y1={0}
            x2={CENTER}
            y2={SIZE}
            stroke="rgba(0,255,170,0.15)"
            strokeWidth={1}
          />
          <Line
            x1={0}
            y1={CENTER}
            x2={SIZE}
            y2={CENTER}
            stroke="rgba(0,255,170,0.15)"
            strokeWidth={1}
          />

          {/* Dots */}
          {dots.map((d, i) => (
            <Circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill="#3CFFB0"
              opacity={0.8}
            />
          ))}
        </Svg>

        {/* Radar Sweep */}
       {/* Radar Sweep */}
<Animated.View
  style={[
    styles.sweepContainer,
    {
      transform: [{ rotate }],
    },
  ]}
>
  <Svg width={SIZE} height={SIZE}>
    <Line
      x1={CENTER}
      y1={CENTER}
      x2={CENTER}
      y2={0}
      stroke="rgba(60,255,176,0.9)"
      strokeWidth={2}
    />
  </Svg>
</Animated.View>

      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071B1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#0B2A2E',
    overflow: 'hidden',
  },
  sweepContainer: {
  position: 'absolute',
  width: SIZE,
  height: SIZE,
  top: 0,
  left: 0,
}
})
