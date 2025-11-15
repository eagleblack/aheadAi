// src/context/JobThemeContext.js
import React, { createContext, useContext, useState } from "react";
import { themes } from "../themes/themes"; // your job card themes

const JobThemeContext = createContext();

export const JobThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState("theme1");

  const nextTheme = () => {
    const keys = Object.keys(themes);
    const nextIndex = (keys.indexOf(currentTheme) + 1) % keys.length;
    setCurrentTheme(keys[nextIndex]);
  };

  return (
    <JobThemeContext.Provider value={{ currentTheme, nextTheme }}>
      {children}
    </JobThemeContext.Provider>
  );
};

export const useJobTheme = () => useContext(JobThemeContext);
