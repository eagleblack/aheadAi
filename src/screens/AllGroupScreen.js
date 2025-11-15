// AllGroupsScreen.js
import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { Card, Divider, Button } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../context/ThemeContext";
import { joinGroup, subscribeToGroups } from "../store/groupChatSlice";

const AllGroupsScreen = ({navigation}) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const { discoverGroups } = useSelector((state) => state.groupChat);

  useEffect(() => {
    const subscribe = async () => {
      const { unsubscribeDiscover } = await dispatch(subscribeToGroups()).unwrap();
      return () => unsubscribeDiscover?.();
    };
    subscribe();
  }, [dispatch]);

  const handleJoin = (groupId) => {
    dispatch(joinGroup({ groupId }));
  };

  const renderGroup = ({ item }) => (
     <TouchableOpacity
          activeOpacity={0.85}
          style={styles.groupItem}
          onPress={() => navigation.navigate("GroupChats", { groupId: item.id })}
        >
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      <Card.Content style={styles.row}>
        <Image
          source={{ uri: item.logo }}
          style={[styles.logo, { borderColor: colors.background }]}
        />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <Text
            style={[styles.desc, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.description || " "}
          </Text>
          <View style={styles.memberRow}>
            <Icon
              name="groups"
              size={14}
              color={colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
              {item.memberCount || 0} members
            </Text>
          </View>
        </View>

       
      </Card.Content>
    </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Discover Groups
        </Text>
      </View>

      <FlatList
        data={discoverGroups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => (
          <Divider
            style={{
              marginVertical: 8,
              backgroundColor: colors.secondary,
              opacity: 0.4,
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="group-add" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Discoverable Groups
            </Text>
            <Text
              style={[styles.emptyMessage, { color: colors.textSecondary }]}
            >
              All groups you can join will appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  listContainer: { padding: 12 },
  card: { borderRadius: 12, elevation: 2 },
  row: { flexDirection: "row", alignItems: "center" },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600" },
  desc: { fontSize: 14, marginTop: 2 },
  memberRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  memberCount: { fontSize: 13 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: { fontSize: 16, textAlign: "center", lineHeight: 24 },
});

export default AllGroupsScreen;
