import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { auth } from './firebase';

// keep options at module level so Status can use same checklist list
export const CHECKLIST_OPTIONS = ['Disaster 1', 'Disaster 2', 'Disaster 3', 'Disaster 4'];

let COMPLETED_CACHE_BY_USER = {};

// helper to get current cache key
const getUserKey = () => {
  const u = auth?.currentUser;
  return u && u.uid ? u.uid : 'guest';
};

// helper for Status to read current completion state (current user only)
export const isAllChecklistCompleted = () => {
  const key = getUserKey();
  const map = COMPLETED_CACHE_BY_USER[key] || {};
  return CHECKLIST_OPTIONS.every((opt) => !!map[opt]);
};

const CheckListHome = () => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

  const navigation = useNavigation();
  const route = useRoute();

  const [selectedOption, setSelectedOption] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const userKey = getUserKey();
  const [completedMap, setCompletedMap] = useState(COMPLETED_CACHE_BY_USER[userKey] || {});

  useFocusEffect(
    useCallback(() => {
      const k = getUserKey();
      setCompletedMap(COMPLETED_CACHE_BY_USER[k] || {});

      const update = route.params?.completionUpdate;

      if (update?.key) {
        setCompletedMap((prev) => {
          const next = { ...prev, [update.key]: !!update.completed };

          const kk = getUserKey();
          COMPLETED_CACHE_BY_USER = { ...COMPLETED_CACHE_BY_USER, [kk]: next };

          return next;
        });

        navigation.setParams({ completionUpdate: undefined });
      }
    }, [route.params, navigation])
  );

  const handleConfirm = () => {
    if (!selectedOption) {
      setErrorMsg('Please select a check list');
      return;
    }

    setErrorMsg('');
    navigation.navigate('CheckList', { selected: selectedOption });
  };

  const handleSelect = (option) => {
    setSelectedOption(option);
    setErrorMsg('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          // back arrow goes to Home only
          onPress={() => navigation.navigate('Home')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>prep check list home</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Please select disaster check list type
        </Text>

        {CHECKLIST_OPTIONS.map((option, index) => {
          const isCompleted = !!completedMap[option];

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedOption === option && styles.selectedOption,
                isCompleted && styles.completedOption,
              ]}
              onPress={() => handleSelect(option)}
            >
              <View style={styles.optionRow}>
                <Text style={styles.optionText}>{option}</Text>

                {isCompleted && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {errorMsg !== '' && <Text style={styles.errorMsg}>{errorMsg}</Text>}

        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.cmfText}>Confirm selected check list</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM TAB FOOTER */}
      <View style={styles.bottomFooter}>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home-outline" size={22} color="#9CA3AF" />
          <Text style={styles.footerText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('InfoGuideHome')}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#9CA3AF"
          />
          <Text style={styles.footerText}>Info</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('AlertHome')}>
          <Ionicons name="alert-circle-outline" size={22} color="#9CA3AF" />
          <Text style={styles.footerText}>Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('Status')}
        >
          <Ionicons name="stats-chart-outline" size={22} color="#9CA3AF" />
          <Text style={styles.footerText}>Status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d1d1d1',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    paddingTop: 44,
    borderBottomWidth: 1,
    backgroundColor: '#2563eb',
  },

  backButton: {
    paddingRight: 12,
  },

  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },

  content: {
    flex: 1,
    paddingHorizontal: 30,
    marginTop: 20,
    alignItems: 'center',
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },

  optionButton: {
    backgroundColor: '#fff',
    width: '100%',
    paddingVertical: 16,
    marginBottom: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 14,
  },

  selectedOption: {
    borderColor: '#007bff',
  },

  confirmButton: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 16,
    marginTop: 10,
    alignItems: 'center',
    borderRadius: 4,
  },

  optionText: {
    fontSize: 16,
  },

  cmfText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  errorMsg: {
    color: 'red',
    marginBottom: 10,
    fontSize: 14,
  },

  bottomFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  footerItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerText: {
    fontSize: 12,
    marginTop: 4,
    color: '#9CA3AF',
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedOption: {
    borderColor: '#16a34a',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '700',
  },
});

export default CheckListHome;


