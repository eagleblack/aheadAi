import React from "react";
import { useTheme } from "../context/ThemeContext";
import ThemeWrapper from "../themes/ThemeWrapper"; // adjust the path
import { SafeAreaView } from "react-native-safe-area-context";

const JobScreen = () => {
  const { colors } = useTheme();


  return (
           <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    
    <ThemeWrapper /> 
    </SafeAreaView>
  );
};

export default JobScreen;
