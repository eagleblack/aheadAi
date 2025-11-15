// context/ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors, midnightColors } from "../constants/colors";

// 1. Define all themes in a single object
const allThemes = {
  light: lightColors,
  dark: darkColors,
  midnight: midnightColors,
};
//aheadsubham_db_user
//mm3cPlITAwOl9Wh4

/*mongodb+srv://aheadsubham_db_user:mm3cPlITAwOl9Wh4@ahead-cluster01.dj96s4v.mongodb.net/?retryWrites=true&w=majority&appName=ahead-cluster01 */
// ----------------------------
const STORAGE_KEY = "selectedTheme";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light"); // default theme name

  // 2. Load saved theme on app start
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedTheme && allThemes[savedTheme]) {
          setTheme(savedTheme);
        }
      } catch (e) {
        console.log("Error loading theme:", e);
      }
    };
    loadTheme();
  }, []);

  // 3. Save theme whenever it changes
  const updateTheme = async (newTheme) => {
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newTheme);
    } catch (e) {
      console.log("Error saving theme:", e);
    }
  };

  // 4. Pick theme dynamically
  const colors = allThemes[theme] || allThemes.light;

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme: updateTheme, colors, themes: allThemes }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
