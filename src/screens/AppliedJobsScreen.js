import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { fetchAppliedJobs, resetAppliedJobs } from "../store/appliedJobSlice";
import { useTheme } from "../context/ThemeContext";
import JobCardApplied from "../components/JobCardApplied";
import Icon from "@react-native-vector-icons/material-icons";


const AppliedJobsScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { appliedJobs, loading, hasMore, lastFetchedDoc } = useSelector(
    (state) => state.appliedJobs
  );

  useEffect(() => {
    dispatch(resetAppliedJobs());
    dispatch(fetchAppliedJobs({ startAfterDoc: null }));
  }, [dispatch]);

  const loadMore = () => {
    if (!loading && hasMore) {
      dispatch(fetchAppliedJobs({ startAfterDoc: lastFetchedDoc }));
    }
  };

  const onRefresh = useCallback(() => {
    dispatch(resetAppliedJobs());
    dispatch(fetchAppliedJobs({ startAfterDoc: null }));
  }, [dispatch]);

const renderJob = ({ item }) => {
  const job = item.jobInfo;
  if (!job) return null;
  return <JobCardApplied job={job} />;
};

  return (
    <View style={{ flex: 1, backgroundColor: colors.background,padding:12 }}>
         <View
                style={[
                  styles.header,
                  { borderBottomColor: colors.surface, backgroundColor: colors.background },
                ]}
              >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                  <Icon name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Applied Jobs
                </Text>
                <View style={{ width: 40 }} />
              </View>
      <FlatList
        data={appliedJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListFooterComponent={
          loading && appliedJobs.length > 0 ? (
            <ActivityIndicator
              size="small"
              style={{ marginVertical: 16 }}
              color={colors.primary}
            />
          ) : null
        }
        ListEmptyComponent={
          !loading && (
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <Text style={{ color: colors.text }}>No applied jobs yet</Text>
            </View>
          )
        }
      />
    </View>
  );
};

export default AppliedJobsScreen;



const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  backButton: {
    width: 40,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: "600" },
  followBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  followText: { fontWeight: "600" },
});
