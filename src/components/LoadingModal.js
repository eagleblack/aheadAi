import React from "react";
import { Modal, View, ActivityIndicator, Text } from "react-native";

export default function LoadingModal({ visible, text }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <View style={{
          backgroundColor: "#fff",
          padding: 30,
          borderRadius: 12,
          alignItems: "center"
        }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 10 }}>{text || "Processing..."}</Text>
        </View>
      </View>
    </Modal>
  );
}
