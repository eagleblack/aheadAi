import React from "react";
import { View, Text, FlatList } from "react-native";
import { Card } from "react-native-paper";

const BookingsSection = ({ bookings }) => {
  return (
    <View>
      <Text style={{ fontWeight: "bold", fontSize: 16, marginTop: 12 }}>Bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8, padding: 8 }}>
            <Text style={{ fontWeight: "bold" }}>{item.userUid ? `Booked by ${item.userUid}` : "Booked"}</Text>
            <Text>{item.date} {item.startTime}-{item.endTime}</Text>
            <Text style={{ color: "#666", marginTop: 6 }}>Booking id: {item.id}</Text>
          </Card>
        )}
        ListEmptyComponent={<Text style={{ color: "#666", marginVertical: 8 }}>No bookings yet</Text>}
      />
    </View>
  );
};

export default BookingsSection;
