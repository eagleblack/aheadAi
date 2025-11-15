import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card } from "react-native-paper";
import Icon from "@react-native-vector-icons/material-icons";
import { useTheme } from "../context/ThemeContext"; // assuming your ThemeContext file path
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

const MindGrow = () => {
  const { colors } = useTheme(); // get current theme colors
   const navigation=useNavigation()
  return (

    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]} edges={['bottom','top']}>
         {/* 🔹 Header with Back + Title + Edit */}
         <View style={[styles.headerBar, { borderBottomColor: colors.surface }]}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={{flexDirection:'row',alignItems:'center'}}>
             <Icon name="arrow-back" size={24} color={colors.text} />
                  <Text style={[styles.headerTitle, { color: colors.text,marginLeft:10 }]}>Mind Grow</Text>
           </TouchableOpacity>
   
      
   
          
         </View>
           <View style={[styles.container, { backgroundColor: colors.background }]}>

      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content style={styles.cardContent}>
          <Icon name="lightbulb-outline" size={64} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>MindGrow</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Coming Soon! We're preparing something amazing for you. Stay tuned.
          </Text>
        </Card.Content>
      </Card>
           </View>

    </SafeAreaView>
  );   
};

export default MindGrow;

const styles = StyleSheet.create({
  container: {
    flex: 1,
   
    padding: 16,
  },
  card: {
    width: "100%",
    elevation: 4,
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  cardContent: {
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  header: {
    alignItems: "center",
    padding: 20,
    marginBottom: 10,
  },
});
