import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  Image,
  Text,
} from "react-native";
import Swiper from "react-native-deck-swiper";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";  
import { fetchUsersForCompany, swipeusers, resetUsers } from "../store/companySlice";
import UserCard from "../components/UserCard";
import { useFocusEffect } from "@react-navigation/native";

const HireScreen = () => {
  const { colors: theme, theme: currentTheme, themes } = useTheme();
  const dispatch = useDispatch();
  const swiperRef = useRef(null);
  const { users, loading } = useSelector((state) => state.company);
  const { user: userData } = useSelector((state) => state.user);
  console.log(users)
  const [finished, setFinished] = useState(false);
  const [activeTheme, setActiveTheme] = useState(currentTheme);
  const swipeResetTimeout = useRef(null);

  // 🩷 LIKE / NOPE opacity
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;

  // 🌊 Animated wave refs
  const wavesRef = useRef(
    Array.from({ length: 3 }).map(() => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
      animation: null,
    }))
  );

  const activeColors = themes[activeTheme];

  // 🔹 Load jobs on mount
  useEffect(() => {
    dispatch(resetUsers());
    dispatch(fetchUsersForCompany());
  }, [dispatch]);

  // 🔹 Track theme changes
  useEffect(() => {
    setActiveTheme(currentTheme);
  }, [currentTheme]);

  // 🌊 Start waves
  const startWaves = useCallback(() => {
    wavesRef.current.forEach((wave, index) => {
      wave.scale.setValue(1);
      wave.opacity.setValue(1);

      const anim = Animated.loop(
        Animated.parallel([
          Animated.timing(wave.scale, {
            toValue: 2,
            duration: 3000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(wave.opacity, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      );

      const timeout = setTimeout(() => anim.start(), index * 600);
      wave.animation = { anim, timeout };
    });
  }, []);

  // 🌊 Stop waves
  const stopWaves = useCallback(() => {
    wavesRef.current.forEach((wave) => {
      if (wave.animation) {
        clearTimeout(wave.animation.timeout);
        wave.animation.anim.stop();
        wave.scale.setValue(1);
        wave.opacity.setValue(1);
        wave.animation = null;
      }
    });
  }, []);

  // 🫧 Handle tab focus/blur
  useFocusEffect(
    useCallback(() => {
      if (finished || users.length === 0) startWaves();
      return () => stopWaves();
    }, [finished, users, startWaves, stopWaves])
  );

  // 👈 Swipe handlers
  const handleSwipe = (cardIndex, direction) => {
    if (swipeResetTimeout.current) clearTimeout(swipeResetTimeout.current);
    const job = users[cardIndex];
   // if (job) dispatch(swipeusers({ job, direction }));
    resetLikeNopeOpacity();
  };

  const handleSwipedAll = () => {
    console.log("✅ All jobs swiped!");
    setFinished(true);
  };

  // ✨ Handle swiping for LIKE/NOPE opacity
  const handleSwiping = (x) => {
    if (swipeResetTimeout.current) clearTimeout(swipeResetTimeout.current);

    if (x > 0) {
      Animated.timing(likeOpacity, {
        toValue: Math.min(x / 120, 1),
        duration: 50,
        useNativeDriver: true,
      }).start();
      nopeOpacity.setValue(0);
    } else if (x < 0) {
      Animated.timing(nopeOpacity, {
        toValue: Math.min(Math.abs(x) / 120, 1),
        duration: 50,
        useNativeDriver: true,
      }).start();
      likeOpacity.setValue(0);
    } else {
      likeOpacity.setValue(0);
      nopeOpacity.setValue(0);
    }

    // 🛑 fallback: if no swipe is completed in 300ms after movement stops, reset opacity
    swipeResetTimeout.current = setTimeout(() => {
      resetLikeNopeOpacity();
    }, 300);
  };

  // ✨ Helper to reset opacities
  const resetLikeNopeOpacity = () => {
    Animated.timing(likeOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
    Animated.timing(nopeOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    return () => {
      if (swipeResetTimeout.current) clearTimeout(swipeResetTimeout.current);
    };
  }, []);

  // 🌀 Loading state
  if (loading && users.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: activeColors.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // 🎯 No jobs available or finished swiping
  if (users.length === 0 || finished) {
    return (
      <View style={[styles.container, { backgroundColor: activeColors.background }]}>
        <SafeAreaView style={styles.centerIcon}>
          {wavesRef.current.map((wave, index) => {
            const waveColors = [theme.primary, theme.secondary, theme.link];
            return (
              <Animated.View
                key={index}
                style={[
                  styles.wave,
                  {
                    transform: [{ scale: wave.scale }],
                    opacity: wave.opacity,
                    borderColor: waveColors[index % waveColors.length],
                  },
                ]}
              />
            );
          })}
          {userData.profilePic ? (
            <Image source={{ uri: userData.profilePic }} style={styles.avatar} />
          ) : (
            <Ionicons name="person-pin" size={100} color={theme.primary} />
          )}
        </SafeAreaView>
      </View>
    );
  }

  // 🧭 Jobs available → show Swiper
  return (
    <View style={[styles.container, { backgroundColor: activeColors.background }]}>
      {/* LIKE / NOPE labels */}
      <Animated.Text
        style={[
          styles.swipeText,
          styles.likeText,
          { opacity: likeOpacity, transform: [{ rotate: "-20deg" }] },
        ]}
      >
        LIKE
      </Animated.Text>

      <Animated.Text
        style={[
          styles.swipeText,
          styles.nopeText,
          { opacity: nopeOpacity, transform: [{ rotate: "20deg" }] },
        ]}
      >
        NOPE
      </Animated.Text>

      <SafeAreaView style={styles.swiperWrapper}>
        <Swiper
          ref={swiperRef}
          cards={users}
          renderCard={(job) => <UserCard user={job} />}
          onSwipedRight={(i) => handleSwipe(i, "right")}
          onSwipedLeft={(i) => handleSwipe(i, "left")}
          onSwipedAll={handleSwipedAll}
          onSwiping={(x) => handleSwiping(x)}
          cardIndex={0}
          backgroundColor="transparent"
          stackSize={1}
          animateCardOpacity
          disableTopSwipe
          disableBottomSwipe
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  swiperWrapper: { flex: 1, justifyContent: "center", alignItems: "center" },
  centerIcon: { flex: 1, justifyContent: "center", alignItems: "center" },
  wave: { position: "absolute", width: 280, height: 280, borderRadius: 140, borderWidth: 3 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginHorizontal: 6 },
  swipeText: {
    position: "absolute",
    top: 80,
    zIndex: 999,
    fontSize: 42,
    fontWeight: "900",
    padding: 10,
    borderWidth: 4,
    borderRadius: 10,
  },
  likeText: {
    left: 20,
    color: "#4CAF50",
    borderColor: "#4CAF50",
  },
  nopeText: {
    right: 20,
    color: "#F44336",
    borderColor: "#F44336",
  },
});

export default HireScreen;
